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

        // Launch visible browser
        const browser = await chromium.launch({ 
            headless: false,
            args: ["--ignore-certificate-errors", "--ignore-ssl-errors", "--start-maximized"]
        });
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            viewport: null, // use full screen
        });
        const page = await context.newPage();

        // Initial setup
        const { consoleLogs, networkFailures } = attachErrorMonitor(page);
        await forceFocus(page);
        await injectPIPOverlay(page, "run", `Starting: ${flow.name}`);
        await injectClickHighlighter(page);

        // Store session
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

        // Start execution in "background" from API perspective (fire and forget)
        (async () => {
            const stepResults: any[] = [];
            let overallStatus: "PASS" | "FAIL" | "PARTIAL" = "PASS";
            let failedStep = "";
            const runStart = Date.now();

            try {
                // Navigate to target URL first if needed
                if (flow.targetUrl) {
                    await page.goto(flow.targetUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
                }

                for (const step of flow.steps) {
                    if (!sessionStore.has(sessionId)) break; // stop if session ended

                    const label = step.label || `${step.action} ${step.selector || ""}`;
                    await updatePIPOverlay(page, `Step ${step.step}: ${step.action}`, label);
                    
                    if (step.selector) {
                        await highlightElement(page, step.selector);
                        await page.waitForTimeout(500);
                    }

                    const stepStart = Date.now();
                    let stepStatus: "PASS" | "FAIL" = "PASS";
                    let stepError = "";

                    try {
                        // Action execution logic (simplified for inline but robust)
                        switch (step.action) {
                            case "navigate": await page.goto(step.url || step.value, { waitUntil: "load", timeout: 30000 }); break;
                            case "click": await page.click(step.selector!, { timeout: 10000 }); break;
                            case "fill": 
                            case "type": await page.fill(step.selector!, step.value || "", { timeout: 10000 }); break;
                            case "select": await page.selectOption(step.selector!, step.value || ""); break;
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
                    
                    // Take live screenshot
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
            
            // Persist final result to DB
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

            // Close browser after a small delay so user can see completion
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
