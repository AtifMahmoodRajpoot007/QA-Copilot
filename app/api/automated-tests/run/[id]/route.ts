import { NextRequest, NextResponse } from "next/server";
import { launchBrowser } from "@/lib/browserLauncher";
import { createLogger } from "@/lib/logger";
import { sessionStore, generateSessionId, LiveRunSession } from "@/lib/sessionStore";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";
import FlowRun from "@/models/FlowRun";
import { attachErrorMonitor } from "@/services/errorMonitor";
import mongoose from "mongoose";

// Note: Using the underlying class logic from flowRunner if possible
// For now, I'll use a slightly adapted version for the session-based run

export const maxDuration = 120;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const log = createLogger("LiveRun");
    try {
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        await connectToDatabase();
        const flow = await TestFlow.findById(id).lean();
        if (!flow) return NextResponse.json({ error: "Flow not found" }, { status: 404 });

        const sessionId = generateSessionId();
        const { browser } = await launchBrowser("background");
        const context = await browser.newContext({
            viewport: { width: 1600, height: 900 },
            ignoreHTTPSErrors: true,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        });
        
        const page = await context.newPage();
        const { consoleLogs, networkFailures } = attachErrorMonitor(page);

        // Start CDP Screencast to stream live execution immediately to the user
        const client = await context.newCDPSession(page);
        await client.send('Page.startScreencast', { format: 'jpeg', quality: 60 });
        client.on('Page.screencastFrame', async (payload) => {
            const s = sessionStore.get(sessionId);
            if (s) s.latestScreenshot = payload.data;
            await client.send('Page.screencastFrameAck', { sessionId: payload.sessionId }).catch(()=>{});
        });

        // Map steps to the expected type
        const steps = (flow.steps || []).map((s: any) => ({
            step: s.step,
            action: s.action,
            label: s.label,
            url: s.url,
            selector: s.selector,
            selectors: s.selectors,
            value: s.value
        }));

        const session: LiveRunSession = {
            browser,
            context,
            page,
            flowName: flow.name,
            steps: steps as any,
            stepResults: [],
            runStatus: "RUNNING",
            latestScreenshot: "",
            consoleLogs,
            networkFailures,
            createdAt: Date.now(),
        };
        sessionStore.set(sessionId, session);

        // Start background execution
        (async () => {
            try {
                // Initial navigation if needed
                if (flow.targetUrl) {
                    await page.goto(flow.targetUrl, { timeout: 30000 }).catch(() => {});
                }

                // Simple execution loop with session updates
                for (let i = 0; i < steps.length; i++) {
                    if (!sessionStore.has(sessionId)) break;
                    
                    const step = steps[i];
                    const start = Date.now();
                    let status: "PASS" | "FAIL" = "PASS";
                    let error = "";

                    try {
                        // Action execution relying on native Playwright auto-waiting instead of forced networkidle delays
                        if (step.action === "navigate") {
                            await page.goto(step.url || step.value || "", { timeout: 15000 });
                        } else if (step.action === "click") {
                            const selector = step.selector || (step.selectors ? (step.selectors.css || step.selectors.xpath) : null);
                            if (selector) {
                                await page.click(selector, { timeout: 10000 });
                            }
                        } else if (step.action === "fill" || step.action === "type") {
                            const selector = step.selector || (step.selectors ? (step.selectors.css || step.selectors.xpath) : null);
                            if (selector) {
                                await page.fill(selector, step.value || "", { timeout: 10000 });
                            }
                        } else if (step.action === "wait") {
                            await page.waitForTimeout(parseInt(step.value || "1000"));
                        }
                    } catch (e: any) {
                        status = "FAIL";
                        error = e.message;
                    }

                    const result = {
                        step: step.step,
                        label: step.label || step.action,
                        action: step.action,
                        status,
                        durationMs: Date.now() - start,
                        error
                    };
                    session.stepResults.push(result);

                    // Screencast handles session.latestScreenshot continuously, no need for blocking .screenshot() here.

                    if (status === "FAIL") {
                        session.runStatus = "FAIL";
                        break;
                    }
                }

                if (session.runStatus === "RUNNING") {
                    session.runStatus = "PASS";
                }

                // Persist result
                await FlowRun.create({
                    flowId: flow._id,
                    flowName: flow.name,
                    overallStatus: session.runStatus,
                    totalDurationMs: Date.now() - session.createdAt,
                    stepResults: session.stepResults,
                    consoleLogs: session.consoleLogs,
                    networkFailures: session.networkFailures,
                    screenshot: session.latestScreenshot,
                    failedStep: session.runStatus === "FAIL" ? session.stepResults[session.stepResults.length - 1]?.label : undefined
                });

                log.info("Live run finished", { id, status: session.runStatus });

            } catch (err: any) {
                log.error("Live run crashed", { id, error: err.message });
                session.runStatus = "FAIL";
            }
        })();

        return NextResponse.json({ sessionId, message: "Execution started" });

    } catch (err: any) {
        log.error("Failed to start live run", { id: (params as any).id, error: err.message });
        return NextResponse.json({ error: err.message || "Failed to start" }, { status: 500 });
    }
}
