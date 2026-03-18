/**
 * services/flowRunner.ts
 * A fully replicated Testim-style Executor for playback stability.
 * Replaces the procedural runner with a robust, self-healing class architecture.
 */

import { Page, Locator } from "playwright";
import { launchBrowser } from "@/lib/browserLauncher";
import { createLogger } from "@/lib/logger";
import { attachErrorMonitor } from "./errorMonitor";

const log = createLogger("FlowRunner");

export interface FlowStep {
    step: number;
    action: string;
    label?: string;
    url?: string;
    selector?: string;
    selectors?: {
        css?: string;
        text?: string;
        role?: string;
        placeholder?: string;
        xpath?: string;
    };
    value?: string;
}

export interface StepResult {
    step: number;
    label: string;
    action: string;
    status: "PASS" | "FAIL";
    durationMs: number;
    error: string;
}

export interface RunResult {
    stepResults: StepResult[];
    consoleLogs: string[];
    networkFailures: string[];
    overallStatus: "PASS" | "FAIL" | "PARTIAL";
    totalDurationMs: number;
    failedStep: string;
    screenshot: string;
}

class TestimExecutor {
    private page: Page;
    private maxRetries = 3;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Highlights an element briefly to visually debug actions
     */
    private async highlightElement(locator: Locator) {
        try {
            await locator.evaluate((el: HTMLElement) => {
                const originalOutline = el.style.outline;
                const originalTransition = el.style.transition;
                el.style.transition = 'outline 0.2s';
                el.style.outline = '4px solid #3b82f6'; // Blue debug highlight
                setTimeout(() => {
                    el.style.outline = originalOutline;
                    el.style.transition = originalTransition;
                }, 400);
            });
            await this.page.waitForTimeout(200); // Visual pause
        } catch (e) {
            // Ignore cross-origin context issues or fast unmounts
        }
    }

    /**
     * Resolves the best locator using multiple strategies sequentially and rigorously.
     */
    private async resolveSmartLocator(step: FlowStep, timeoutMs: number): Promise<{ locator: Locator | null, strategyUsed: string }> {
        if (!step.selector && !step.selectors) return { locator: null, strategyUsed: "" };

        console.log(`[TestimExecutor] Locating element phase for step: ${step.action} - ${step.label || ''}`);
        const candidates: Array<{ type: string, str: string, getLoc: () => Locator }> = [];

        // Build priority queue
        if (step.selectors) {
            if (step.selectors.css) {
                 candidates.push({ type: 'Smart CSS', str: step.selectors.css, getLoc: () => this.page.locator(step.selectors!.css!) });
            }
            if (step.selectors.text) {
                candidates.push({ type: 'Exact Text', str: step.selectors.text, getLoc: () => this.page.getByText(step.selectors!.text!, { exact: true }) });
                candidates.push({ type: 'Partial Text', str: step.selectors.text, getLoc: () => this.page.getByText(step.selectors!.text!) });
            }
            if (step.selectors.placeholder) {
                candidates.push({ type: 'Placeholder', str: step.selectors.placeholder, getLoc: () => this.page.getByPlaceholder(step.selectors!.placeholder!) });
            }
            if (step.selectors.role) {
                candidates.push({ 
                    type: 'Role + Name', 
                    str: `${step.selectors.role} named ${step.selectors.text || ''}`, 
                    getLoc: () => this.page.getByRole(step.selectors!.role as any, { name: new RegExp(step.selectors!.text || '', 'i') }) 
                });
            }
            if (step.selectors.xpath) {
                candidates.push({ type: 'XPath Fallback', str: step.selectors.xpath, getLoc: () => this.page.locator(`xpath=${step.selectors!.xpath}`) });
            }
        } else if (step.selector) {
            candidates.push({ type: 'Legacy String', str: step.selector, getLoc: () => this.page.locator(step.selector!) });
        }

        // Test each candidate
        for (const cand of candidates) {
            try {
                const locator = cand.getLoc().first();
                // Ensure it exists without waiting too long
                if (await locator.count() > 0) {
                    console.log(`[TestimExecutor] 🔍 Strategy Success: ${cand.type} -> ${cand.str}`);
                    // Ensure the element is structurally ready
                    await locator.waitFor({ state: 'attached', timeout: timeoutMs });
                    return { locator, strategyUsed: cand.type };
                }
            } catch (e) {
                // Ignore timeout strings and move on
            }
        }
        
        console.warn(`[TestimExecutor] ⚠️ All smart strategies failed for step: ${step.label}`);
        return { locator: null, strategyUsed: "Failed" };
    }

    /**
     * The core action wrapper. Combines smart retries, waiting, execution, and verification.
     */
    private async safeExecute(step: FlowStep): Promise<void> {
        const baseTimeout = Math.min(10000, 3000 + (step.action === 'navigate' ? 20000 : 0));
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    const backoff = 300 * Math.pow(2, attempt - 2); // 300ms, 600ms, etc.
                    console.log(`[TestimExecutor] Retry ${attempt}/${this.maxRetries} for step ${step.step} in ${backoff}ms...`);
                    await this.page.waitForTimeout(backoff);
                }

                // Wait for network to be idle to respect dynamic spinners/loaders
                await this.page.waitForLoadState("domcontentloaded", { timeout: baseTimeout }).catch(() => {});

                if (step.action === "navigate") {
                    const targetUrl = step.url || step.value;
                    if (!targetUrl) throw new Error("No URL provided for navigation.");
                    console.log(`[TestimExecutor] Navigating to: ${targetUrl}`);
                    await this.page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
                    return; // Done
                }

                if (step.action === "wait") {
                    const ms = parseInt(step.value || "1000");
                    await this.page.waitForTimeout(ms);
                    return; // Done
                }

                if (!step.selector && !step.selectors) {
                    console.warn(`[TestimExecutor] Step missing selector info. Skipping. Action: ${step.action}`);
                    return;
                }

                // Safe locator resolution iteration
                const { locator, strategyUsed } = await this.resolveSmartLocator(step, baseTimeout / 2);
                if (!locator) throw new Error(`Could not resolve element for step ${step.step} using any strategy.`);

                // Step 2: Ensure actionable state
                await locator.waitFor({ state: 'visible', timeout: 5000 });
                if (["click", "fill", "type", "select"].includes(step.action)) {
                    // It will throw if it is disabled, catching into retry loop
                    const isEnabled = await locator.isEnabled();
                    if (!isEnabled) throw new Error("Element is disabled.");
                }

                await this.highlightElement(locator);
                await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});

                // Step 3: Action Execution
                if (step.action === "click") {
                     // Trial click bypasses overlays checking
                     try {
                         await locator.click({ timeout: 5000, trial: true });
                         await locator.click({ timeout: 5000 });
                     } catch(e) {
                         console.warn("[TestimExecutor] Normal click blocked by overlay. Running force click.");
                         await locator.click({ force: true, timeout: 5000 });
                     }
                } else if (step.action === "fill" || step.action === "type") {
                     await locator.fill(step.value || "", { timeout: 5000 });
                } else if (step.action === "select") {
                     await locator.selectOption(step.value || "", { timeout: 5000 });
                } else if (step.action === "press") {
                     await locator.press(step.value || "Enter", { timeout: 5000 });
                }

                return; // Success! Exit the retry loop.
            } catch (err: any) {
                console.error(`[TestimExecutor] Error in attempt ${attempt}:`, err.message);
                if (attempt === this.maxRetries) {
                    throw err; // Bubble up final failure
                }
            }
        }
    }

    public async runFlowSteps(steps: FlowStep[], targetUrl: string): Promise<RunResult> {
        const stepResults: StepResult[] = [];
        let failedStep = "";
        const runStart = Date.now();
        
        // Initial setup flow
        if (steps.length > 0 && steps[0].action !== "navigate" && targetUrl) {
            console.log(`[TestimExecutor] Performing initial navigation to ${targetUrl}`);
            await this.page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 }).catch(e => console.warn(e));
        }

        for (const step of steps) {
            console.log(`\n--- [TestimExecutor] Executing step ${step.step}: ${step.action} ---`);
            const stepStart = Date.now();
            let status: "PASS" | "FAIL" = "PASS";
            let error = "";

            await this.page.waitForTimeout(150); // Small intelligent delay between steps

            try {
                await this.safeExecute(step);
            } catch (err: any) {
                status = "FAIL";
                error = err.message || "Failed after retries";
            }

            const label = step.label || `${step.action} ${step.url || ""}`.trim();
            stepResults.push({ step: step.step, label, action: step.action, status, durationMs: Date.now() - stepStart, error });

            if (status === "FAIL") {
                failedStep = label;
                break; // Stop execution on failure
            }
        }

        let screenshot = "";
        try { screenshot = (await this.page.screenshot({ fullPage: false })).toString("base64"); } catch (_) {}

        const failCount = stepResults.filter((s) => s.status === "FAIL").length;
        let overallStatus: "PASS" | "FAIL" | "PARTIAL" = "PASS";
        if (failCount > 0) {
            overallStatus = (stepResults.length < steps.length) ? "PARTIAL" : "FAIL";
        }

        return {
            stepResults,
            consoleLogs: [], // Passed from outside
            networkFailures: [], // Passed from outside
            overallStatus,
            totalDurationMs: Date.now() - runStart,
            failedStep,
            screenshot,
        };
    }
}

export async function runFlow(steps: FlowStep[], targetUrl: string): Promise<RunResult> {
    log.info("Booting Testim-style Executor Engine", { targetUrl, steps: steps.length });
    const { browser } = await launchBrowser("background");
    
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        viewport: { width: 1280, height: 800 },
    });
    
    const page = await context.newPage();
    const { consoleLogs, networkFailures } = attachErrorMonitor(page);

    const executor = new TestimExecutor(page);
    const result = await executor.runFlowSteps(steps, targetUrl);

    // Patch on monitors
    result.consoleLogs = consoleLogs;
    result.networkFailures = networkFailures;

    await browser.close();
    log.info("Executor finished", { status: result.overallStatus, steps: result.stepResults.length });
    
    return result;
}
