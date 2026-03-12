import { NextRequest, NextResponse } from "next/server";
import { chromium, Page } from "playwright";
import { callLLM } from "@/lib/gemini";
import { AI_TESTING_AGENT_PROMPT } from "@/lib/prompts";
import connectToDatabase from "@/lib/mongodb";
import QAAssistantSession from "@/models/QAAssistantSession";

export const maxDuration = 120; // 2 minutes max duration for agentic loop

const GET_INTERACTIVE_DOM = `
(() => {
    // Basic DOM Simplifier targeting interactive elements
    const elements = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]');
    let dom = '';
    let counter = 1;
    
    elements.forEach(el => {
        // Skip hidden elements
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
        
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
        el.setAttribute('data-playwright-id', counter.toString());
        const pid = \` data-playwright-id="\${counter}"\`;
        counter++;

        // Build simple description
        const tag = el.tagName.toLowerCase();
        const id = el.id ? \` id="\${el.id}"\` : '';
        const role = el.getAttribute('role') ? \` role="\${el.getAttribute('role')}"\` : '';
        const testId = el.getAttribute('data-testid') ? \` data-testid="\${el.getAttribute('data-testid')}"\` : '';
        const type = el.getAttribute('type') ? \` type="\${el.getAttribute('type')}"\` : '';
        const name = el.getAttribute('name') ? \` name="\${el.getAttribute('name')}"\` : '';
        
        let text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('value') || '').trim().replace(/\\s+/g, ' ').substring(0, 50);
        if (text) text = \`>\${text}</\${tag}>\`;
        else text = ' />';
        
        dom += \`<\${tag}\${pid}\${id}\${role}\${testId}\${type}\${name}\${text}\\n\`;
    });
    
    return dom.substring(0, 3500); // hard cap the string size
})()
`;

export async function POST(req: NextRequest) {
    try {
        const { url, instruction, userId = "demo-user" } = await req.json();

        if (!url || !instruction) {
            return NextResponse.json({ error: "URL and instruction are required" }, { status: 400 });
        }

        await connectToDatabase();

        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--ignore-ssl-errors']
        });
        
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            viewport: { width: 1280, height: 800 }
        });
        
        const page = await context.newPage();
        
        const steps: any[] = [];
        let status: "pass" | "fail" = "pass";
        let errorMessage = "";
        const startTime = Date.now();

        try {
            await page.goto(url, { waitUntil: "networkidle", timeout: 25000 });
            await page.waitForTimeout(1500); // let things settle
            
            let actionHistory = "";
            let currentUrl = url;

            // Agent Loop - max 10 steps
            for (let i = 0; i < 10; i++) {
                // Get DOM state
                const domSnapshot = await page.evaluate(GET_INTERACTIVE_DOM).catch(() => "Unable to read DOM") as string;
                currentUrl = page.url();

                // Build prompt
                const prompt = AI_TESTING_AGENT_PROMPT(String(instruction), String(currentUrl), String(domSnapshot), actionHistory);
                
                // Call Gemini
                let actionObj;
                try {
                    const responseText = await callLLM(prompt);
                    actionObj = JSON.parse(responseText);
                } catch (e) {
                    throw new Error("Failed to parse Agent decision from AI server.");
                }

                if (actionObj.action === "finish") {
                    status = "pass";
                    steps.push({
                        action: "finish",
                        reasoning: actionObj.reasoning || "Task completed successfully.",
                        screenshot: await page.screenshot({ fullPage: false }).then(b => `data:image/png;base64,${b.toString('base64')}`).catch(() => "")
                    });
                    break;
                }
                
                if (actionObj.action === "fail") {
                    status = "fail";
                    errorMessage = "Agent declared failure: " + actionObj.reasoning;
                    steps.push({
                        action: "fail",
                        reasoning: errorMessage,
                        screenshot: await page.screenshot({ fullPage: false }).then(b => `data:image/png;base64,${b.toString('base64')}`).catch(() => "")
                    });
                    break;
                }

                // Execute action
                if (actionObj.action === "click") {
                    if (!actionObj.elementId) throw new Error("Agent attempted to click without an elementId.");
                    await page.click(`[data-playwright-id="${actionObj.elementId}"]`, { timeout: 10000 });
                } else if (actionObj.action === "fill") {
                    if (!actionObj.elementId) throw new Error("Agent attempted to fill without an elementId.");
                    await page.fill(`[data-playwright-id="${actionObj.elementId}"]`, actionObj.value || "", { timeout: 10000 });
                } else if (actionObj.action === "navigate") {
                    if (!actionObj.value) throw new Error("Agent attempted to navigate without a URL.");
                    await page.goto(actionObj.value, { waitUntil: "networkidle", timeout: 15000 });
                }
                
                await page.waitForTimeout(1500); // allow transitions
                await page.waitForLoadState("networkidle").catch(() => {}); // ensure SPA loaders finish

                // Take screenshot AFTER action
                const screenshotBuf = await page.screenshot({ fullPage: false }).catch(() => null);
                const screenshotB64 = screenshotBuf ? `data:image/png;base64,${screenshotBuf.toString('base64')}` : "";

                // Append to action history for the next prompt iteration
                actionHistory += `Step ${i + 1}: ${actionObj.action} on elementId ${actionObj.elementId || actionObj.value || 'page'}. Reason: ${actionObj.reasoning}\n`;

                // Store step
                steps.push({
                    action: actionObj.action,
                    selector: actionObj.elementId || "",
                    value: actionObj.value || "",
                    url: currentUrl,
                    reasoning: actionObj.reasoning || "",
                    screenshot: screenshotB64
                });
            }
            
            // If looped 10 times without finishing
            if (steps.length === 10 && steps[steps.length - 1].action !== "finish") {
                status = "fail";
                errorMessage = "Maximum 10 steps reached without finishing the instruction.";
            }

        } catch (error: any) {
            status = "fail";
            errorMessage = error.message;
            
            // Take final failure screenshot
            const sc = await page.screenshot({ fullPage: false }).catch(() => null);
            if (sc) {
                steps.push({
                    action: "error",
                    reasoning: "Execution encountered an error: " + errorMessage,
                    screenshot: `data:image/png;base64,${sc.toString('base64')}`
                });
            }
        } finally {
            await page.close();
            await browser.close();
        }

        const totalDurationMs = Date.now() - startTime;

        const results = {
            status,
            errorMessage,
            steps,
            totalDurationMs
        };

        // Save session
        const session = await QAAssistantSession.create({
            userId,
            url,
            instruction,
            results,
        });

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("[api/ai-qa-assistant agent]", error);
        return NextResponse.json({ error: error.message || "Agent execution failed" }, { status: 500 });
    }
}
