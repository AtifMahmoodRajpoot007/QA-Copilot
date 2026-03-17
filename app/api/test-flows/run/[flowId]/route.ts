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
            args: ["--ignore-certificate-errors", "--ignore-ssl-errors", "--start-maximized"]
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
                    
                    if (step.selector) {
                        // Smart wait for element rather than simple timeout
                        await page.waitForSelector(step.selector, { state: 'visible', timeout: 5000 }).catch(() => {});
                        await highlightElement(page, step.selector);
                    }

                    const stepStart = Date.now();
                    let stepStatus: "PASS" | "FAIL" = "PASS";
                    let stepError = "";

                    try {
                        switch (step.action) {
                            case "navigate": await page.goto(step.url || step.value, { waitUntil: "commit", timeout: 15000 }).catch(() => {}); break;
                            case "click": await page.click(step.selector!, { timeout: 5000 }); break;
                            case "fill": 
                            case "type": await page.fill(step.selector!, step.value || "", { timeout: 5000 }); break;
                            case "select": await page.selectOption(step.selector!, step.value || "", { timeout: 5000 }); break;
                            case "wait": await page.waitForTimeout(parseInt(step.value || "1000")); break;
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
