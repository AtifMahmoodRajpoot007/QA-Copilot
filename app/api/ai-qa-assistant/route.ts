import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { callLLM, callLLMWithImage } from "@/lib/gemini";
import { AI_TESTING_AGENT_PROMPT } from "@/lib/prompts";
import connectToDatabase from "@/lib/mongodb";
import { sessionStore } from "@/lib/sessionStore";
import { injectPIPOverlay, injectClickHighlighter, highlightElement, updatePIPOverlay } from "@/lib/browserOverlay";
import QAAssistantSession from "@/models/QAAssistantSession";

export const maxDuration = 300; // 5 minutes for agentic loop

const GET_INTERACTIVE_DOM = `
(() => {
    const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"], [onclick], .btn, .button');
    let dom = '';
    let counter = 1;
    
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
        
        const rect = el.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) return;
        
        const inViewport = (
            rect.top >= -1000 &&
            rect.left >= -1000 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 1000 &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth) + 1000
        );
        if (!inViewport) return;

        el.setAttribute('data-playwright-id', counter.toString());
        const pid = ' data-playwright-id="' + counter + '"';
        counter++;

        const tag = el.tagName.toLowerCase();
        const id = el.id ? ' id="' + el.id + '"' : '';
        const role = el.getAttribute('role') ? ' role="' + el.getAttribute('role') + '"' : '';
        const type = el.getAttribute('type') ? ' type="' + el.getAttribute('type') + '"' : '';
        const name = el.getAttribute('name') ? ' name="' + el.getAttribute('name') + '"' : '';
        const ariaLabel = el.getAttribute('aria-label') ? ' aria-label="' + el.getAttribute('aria-label') + '"' : '';
        const title = el.getAttribute('title') ? ' title="' + el.getAttribute('title') + '"' : '';
        const placeholder = el.getAttribute('placeholder') ? ' placeholder="' + el.getAttribute('placeholder') + '"' : '';
        
        let text = (el.textContent || '').trim().replace(/\\s+/g, ' ').substring(0, 60);
        if (text) text = '>' + text + '</' + tag + '>';
        else text = ' />';
        
        dom += '<' + tag + pid + id + role + type + name + ariaLabel + title + placeholder + text + '\\n';
    });
    
    return dom.substring(0, 15000);
})()
`;

export async function POST(req: NextRequest) {
    try {
        const { url, instruction } = await req.json();
        if (!url || !instruction) {
            return NextResponse.json({ error: "URL and instruction are required" }, { status: 400 });
        }

        const sessionId = Math.random().toString(36).substring(7);
        const browser = await chromium.launch({ 
            headless: true, 
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ] 
        });
        
        const context = await browser.newContext({ viewport: null });
        
        // Block heavy/analytics resources to speed up page loads for AI Agent
        await context.route("**/*", (route) => {
            const req = route.request();
            const type = req.resourceType();
            const url = req.url();
            const blockList = ['google-analytics', 'doubleclick', 'facebook', 'hotjar', 'mixpanel'];
            
            if (blockList.some(domain => url.includes(domain))) {
                route.abort();
            } else {
                route.continue();
            }
        });

        const page = await context.newPage();

        sessionStore.set(sessionId, {
            id: sessionId,
            browser,
            page,
            steps: [],
            stepResults: [],
            runStatus: "RUNNING",
            latestScreenshot: null,
            consoleLogs: [],
            networkFailures: [],
            createdAt: Date.now()
        } as any);

        const runAgent = async () => {
            try {
                // Use commit instead of networkidle to prevent strict network timeouts on modern SPA apps
                await page.goto(url, { waitUntil: "commit", timeout: 20000 }).catch(() => {});
                await injectPIPOverlay(page, "run", "AI Agent Active");
                await injectClickHighlighter(page);
                
                let actionHistory = "";
                const session = sessionStore.get(sessionId) as any;

                for (let i = 0; i < 30; i++) {
                    const domSnapshot = await page.evaluate(GET_INTERACTIVE_DOM).catch(() => "Unable to read DOM");
                    const currentUrl = page.url();

                    const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 50 }).catch(() => null);
                    const base64Screenshot = screenshotBuffer ? screenshotBuffer.toString("base64") : "";
                    session.latestScreenshot = base64Screenshot;
                    
                    // Renamed from Thinking to Agent Step to see if build updates
                    await updatePIPOverlay(page, "Agent Step " + (i + 1));
                    const prompt = AI_TESTING_AGENT_PROMPT(instruction, currentUrl, domSnapshot as string, actionHistory);
                    
                    const responseText = await callLLMWithImage(prompt, base64Screenshot, "image/jpeg");
                    let actionObj;
                    try {
                        actionObj = JSON.parse(responseText);
                    } catch (e) {
                         // Fallback if LLM returns bad JSON
                         actionObj = { action: "fail", reasoning: "LLM returned invalid JSON" };
                    }

                    if (actionObj.action === "finish") {
                        session.runStatus = "PASS";
                        session.steps.push({ step: i + 1, action: "finish", reasoning: actionObj.reasoning });
                        await updatePIPOverlay(page, "Task Finished 👌");
                        break;
                    }
                    
                    if (actionObj.action === "fail") {
                        session.runStatus = "FAIL";
                        session.steps.push({ step: i + 1, action: "fail", reasoning: actionObj.reasoning });
                        await updatePIPOverlay(page, "Task failed: " + actionObj.reasoning);
                        break;
                    }

                    session.steps.push({ 
                        step: i + 1, 
                        action: actionObj.action, 
                        selector: actionObj.elementId || "", 
                        value: actionObj.value || "", 
                        reasoning: actionObj.reasoning || "" 
                    });

                    await updatePIPOverlay(page, actionObj.action + ": " + actionObj.reasoning);

                    try {
                        let stepNote = "";
                        if (actionObj.action === "click" && actionObj.elementId) {
                            const selector = '[data-playwright-id="' + actionObj.elementId + '"]';
                            await page.waitForSelector(selector, { state: "visible", timeout: 3000 }).catch(() => {});
                            await highlightElement(page, selector);
                            await page.click(selector, { timeout: 4000 });
                            stepNote = "Clicked element " + actionObj.elementId;
                        } else if (actionObj.action === "fill" && actionObj.elementId) {
                            const selector = '[data-playwright-id="' + actionObj.elementId + '"]';
                            await page.waitForSelector(selector, { state: "visible", timeout: 3000 }).catch(() => {});
                            await highlightElement(page, selector);
                            await page.fill(selector, actionObj.value || "", { timeout: 4000 });
                            stepNote = "Filled element " + actionObj.elementId + " with '" + actionObj.value + "'";
                        } else if (actionObj.action === "navigate" && actionObj.value) {
                            await page.goto(actionObj.value, { waitUntil: "commit", timeout: 20000 }).catch(() => {});
                            await page.waitForLoadState("domcontentloaded", { timeout: 2000 }).catch(() => {});
                            await injectClickHighlighter(page);
                            stepNote = "Navigated to " + actionObj.value;
                        } else if (actionObj.action === "scroll_down") {
                            await page.evaluate(() => window.scrollBy(0, 500));
                        } else if (actionObj.action === "scroll_up") {
                            await page.evaluate(() => window.scrollBy(0, -500));
                        } else if (actionObj.action === "wait") {
                            await page.waitForTimeout(2000);
                            stepNote = "Waited 2 seconds";
                        }
                        
                        const isFinished = 
                            actionObj.action === "finish" || 
                            actionObj.action === "fail" || 
                            actionObj.action === "wait" || 
                            actionObj.action === "scroll_down" || 
                            actionObj.action === "scroll_up";
                            
                        if (!isFinished) {
                           // Try to let the page settle briefly after clicks/fills but do not wait statically
                           await page.waitForLoadState("domcontentloaded", { timeout: 1000 }).catch(() => {});
                        }
                        
                        actionHistory += "Step " + (i + 1) + ": " + actionObj.action + ". " + stepNote + "\\n";
                        
                    } catch (actionErr: any) {
                        actionHistory += "Step " + (i + 1) + ": " + actionObj.action + " failed: " + actionErr.message + "\\n";
                        await updatePIPOverlay(page, "Retrying...");
                        await page.waitForTimeout(500); // Only static wait on failure
                    }
                }

                if (session.runStatus === "RUNNING") session.runStatus = "FAIL";
                
            } catch (err: any) {
                const session = sessionStore.get(sessionId) as any;
                if (session) {
                    session.runStatus = "FAIL";
                    session.consoleLogs.push(err.message);
                }
            } finally {
                const session = sessionStore.get(sessionId) as any;
                if (session) {
                    await connectToDatabase();
                    await QAAssistantSession.create({
                        userId: "demo-user",
                        url,
                        instruction,
                        results: {
                            status: session.runStatus.toLowerCase(),
                            steps: session.steps.map((s: any) => ({
                                action: s.action,
                                selector: s.selector,
                                value: s.value,
                                reasoning: s.reasoning,
                                screenshot: session.latestScreenshot ? "data:image/png;base64," + session.latestScreenshot : null
                            })),
                            totalDurationMs: Date.now() - session.createdAt
                        }
                    }).catch(err => {});
                }

                await new Promise(r => setTimeout(r, 2000));
                await browser.close().catch(() => {});
            }
        };
        runAgent();

        return NextResponse.json({ sessionId });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
