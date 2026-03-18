import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";
import FlowRun from "@/models/FlowRun";
import { sessionStore, generateSessionId, LiveRunSession } from "@/lib/sessionStore";
import { injectPIPOverlay, updatePIPOverlay, injectClickHighlighter, highlightElement, forceFocus } from "@/lib/browserOverlay";
import { attachErrorMonitor } from "@/services/errorMonitor";

export const maxDuration = 90;

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ flowId: string }> }
) {
    try {
        const { flowId } = await params;
        await connectToDatabase();

        const flow = await TestFlow.findById(flowId).lean() as any;
        if (!flow) {
            return NextResponse.json({ error: "Flow not found" }, { status: 404 });
        }

        const sessionId = generateSessionId();

        const browser = await chromium.launch({ 
            headless: false,
            args: [
                "--start-maximized",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--ignore-certificate-errors", 
                "--ignore-ssl-errors"
            ]
        });
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            viewport: null, 
        });

        // Block heavy/analytics resources to speed up page loads during execution
        await context.route("**/*", (route) => {
            const req = route.request();
            const type = req.resourceType();
            const url = req.url();
            const blockedTypes = ['media', 'other'];
            const blockList = ['google-analytics', 'doubleclick', 'facebook', 'hotjar', 'mixpanel'];
            
            if (blockedTypes.includes(type) || blockList.some(domain => url.includes(domain))) {
                route.abort();
            } else {
                route.continue();
            }
        });
        const page = await context.newPage();

        const { consoleLogs, networkFailures } = attachErrorMonitor(page);
        await forceFocus(page);
        await injectPIPOverlay(page, "run", "Starting: " + flow.name);
        await injectClickHighlighter(page);

        const session: LiveRunSession = {
            browser,
            context,
            page,
            flowName: flow.name,
            steps: flow.steps,
            stepResults: [],
            runStatus: "RUNNING",
            latestScreenshot: "",
            consoleLogs,
            networkFailures,
            createdAt: Date.now(),
        };
        sessionStore.set(sessionId, session);

        (async () => {
            const stepResults: any[] = [];
            let overallStatus: "PASS" | "FAIL" | "PARTIAL" = "PASS" as const;
            let failedStep = "";
            const runStart = Date.now();

            try {
                if (flow.targetUrl) {
                    await page.goto(flow.targetUrl, { waitUntil: "commit", timeout: 15000 }).catch(() => {});
                }

                for (const step of flow.steps) {
                    if (!sessionStore.has(sessionId)) break;

                    const label = step.label || (step.action + " " + (step.selector || ""));
                    await updatePIPOverlay(page, "Step " + step.step + ": " + step.action, label);

                    const stepStart = Date.now();
                    let stepStatus: "PASS" | "FAIL" = "PASS";
                    let stepError = "";

                    try {
                        let finalLocator = null;
                        
                        // Smart Locator Resolution (Role -> Placeholder -> Text -> CSS)
                        if (step.action !== "navigate" && step.action !== "wait") {
                            const locatorsToTry = [];
                            if (step.selectors) {
                                if (step.selectors.role) {
                                    locatorsToTry.push(page.getByRole(step.selectors.role as any, { name: step.selectors.text ? new RegExp(step.selectors.text, 'i') : undefined }));
                                }
                                if (step.selectors.placeholder) locatorsToTry.push(page.getByPlaceholder(new RegExp(step.selectors.placeholder, 'i')));
                                if (step.selectors.text) locatorsToTry.push(page.getByText(step.selectors.text, { exact: false }));
                            }
                            if (step.selector) locatorsToTry.push(page.locator(step.selector));

                            for (const loc of locatorsToTry) {
                                try {
                                    if (await loc.first().count() > 0) {
                                        await loc.first().waitFor({ state: 'attached', timeout: 2000 });
                                        finalLocator = loc.first();
                                        break;
                                    }
                                } catch (e) { }
                            }

                            if (!finalLocator && step.selector) {
                                finalLocator = page.locator(step.selector).first();
                            }

                            if (finalLocator) {
                                await finalLocator.waitFor({ state: 'visible', timeout: 8000 });
                                await highlightElement(page, step.selector || "");
                            }
                        }

                        // Smart Action Conversion
                        let finalAction = step.action;
                        if (finalAction === "click" && step.value && (step.label?.toLowerCase().includes("input") || step.label?.toLowerCase().includes("fill") || step.selectors?.role === 'textbox' || step.label?.includes("@"))) {
                            // Automatically convert clicks with values to fill natively
                            finalAction = "fill";
                        }

                        switch (finalAction) {
                            case "navigate": 
                                await page.goto(step.url || step.value, { waitUntil: "commit", timeout: 15000 }).catch(() => {});
                                await page.waitForLoadState('domcontentloaded');
                                break;
                            case "click": 
                                if (finalLocator) await finalLocator.click({ timeout: 5000 }); 
                                else await page.click(step.selector!, { timeout: 5000 });
                                break;
                            case "fill": 
                            case "type": 
                                if (finalLocator) await finalLocator.fill(step.value || "", { timeout: 5000 });
                                else await page.fill(step.selector!, step.value || "", { timeout: 5000 });
                                break;
                            case "select": 
                                if (finalLocator) await finalLocator.selectOption(step.value || "", { timeout: 5000 });
                                else await page.selectOption(step.selector!, step.value || "", { timeout: 5000 });
                                break;
                            case "wait": 
                                await page.waitForTimeout(parseInt(step.value || "1000")); 
                                break;
                        }
                    } catch (e: any) {
                        stepStatus = "FAIL";
                        stepError = e.message;
                    }

                    stepResults.push({
                        step: step.step,
                        label,
                        action: step.action,
                        status: stepStatus,
                        durationMs: Date.now() - stepStart,
                        error: stepError
                    });

                    session.stepResults = [...stepResults];
                    
                    const scBuf = await page.screenshot({ fullPage: false }).catch(() => null);
                    if (scBuf) session.latestScreenshot = scBuf.toString("base64");

                    if (stepStatus === "FAIL") {
                        overallStatus = "FAIL";
                        failedStep = label;
                        break; 
                    }
                }
            } catch (err) {
                overallStatus = "FAIL";
            }

            session.runStatus = overallStatus;
            
            const finalScreenshot = session.latestScreenshot;
            await FlowRun.create({
                flowId: flow._id,
                flowName: flow.name,
                stepResults,
                consoleLogs,
                networkFailures,
                overallStatus,
                totalDurationMs: Date.now() - runStart,
                failedStep,
                screenshot: finalScreenshot,
            });

            await page.waitForTimeout(2000);
            await browser.close().catch(() => {});
            sessionStore.delete(sessionId);
        })();

        return NextResponse.json({
            sessionId,
            message: "Live execution started."
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Run failed" }, { status: 500 });
    }
}
