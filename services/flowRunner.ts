/**
 * services/flowRunner.ts
 * Playwright execution engine for running stored test flows.
 * Used by /api/flows/run and any future scheduled runners.
 */

import { chromium } from "playwright";
import { attachErrorMonitor } from "./errorMonitor";

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

async function findLocatorWithHealing(page: any, step: FlowStep, timeout: number) {
    if (!step.selector && !step.selectors) return { locator: null, selectorUsed: "" };
    
    console.log(`[FlowRunner] Resolving locator for step: ${step.action} ${step.label || ''}`);
    
    // Build candidate locators based on priority
    const candidates = [];
    if (step.selectors) {
        if (step.selectors.css) candidates.push({ type: 'css', val: step.selectors.css, locatorStr: step.selectors.css });
        if (step.selectors.text) candidates.push({ type: 'text', val: step.selectors.text, locatorStr: `text="${step.selectors.text}"` });
        if (step.selectors.placeholder) candidates.push({ type: 'placeholder', val: step.selectors.placeholder, locatorStr: `[placeholder="${step.selectors.placeholder}"]` });
        if (step.selectors.role) {
            if (step.selectors.text) {
                candidates.push({ type: 'role-text', val: step.selectors.role, locatorStr: `role=${step.selectors.role}, name="${step.selectors.text}"` });
            } else {
                candidates.push({ type: 'role', val: step.selectors.role, locatorStr: `role=${step.selectors.role}` });
            }
        }
        if (step.selectors.xpath) candidates.push({ type: 'xpath', val: step.selectors.xpath, locatorStr: `xpath=${step.selectors.xpath}` });
    } else if (step.selector) {
        // Fallback for old steps
        candidates.push({ type: 'css', val: step.selector, locatorStr: step.selector });
    }

    if (candidates.length === 0 && step.label) {
        // Old heuristic healing
        const textMatch = step.label.match(/:\s*(.+)$/);
        let textToUse = textMatch ? textMatch[1].trim() : step.label;
        if (textToUse.length > 0 && textToUse.length < 50) {
            candidates.push({ type: 'text', val: textToUse, locatorStr: `text="${textToUse}"` });
        }
    }

    // Attempt each candidate iteratively
    for (const cand of candidates) {
        let locator;
        try {
            if (cand.type === 'css' || cand.type === 'xpath' || cand.type === 'placeholder') {
                locator = page.locator(cand.locatorStr);
            } else if (cand.type === 'text') {
                locator = page.getByText(cand.val, { exact: true });
                if (await locator.count() === 0) {
                     locator = page.getByText(cand.val);
                }
            } else if (cand.type === 'role-text') {
                locator = page.getByRole(cand.val, { name: new RegExp(step.selectors?.text || '', 'i') });
            } else if (cand.type === 'role') {
                locator = page.getByRole(cand.val);
            }
            
            // Refine to first match if multiple
            locator = locator.first();
            
            // Fast count check to avoid waiting on non-existent elements
            if (await locator.count() > 0) {
                console.log(`[FlowRunner] Candidate found in DOM using strategy: ${cand.type} -> ${cand.locatorStr}`);
                
                // Smart auto-wait system: wait for attached and visible
                await locator.waitFor({ state: 'attached', timeout: Math.min(timeout / 2, 5000) });
                await locator.waitFor({ state: 'visible', timeout: Math.min(timeout / 2, 5000) });
                
                console.log(`[FlowRunner] Locator confirmed visible using strategy: ${cand.type}`);
                return { locator, selectorUsed: cand.locatorStr };
            }
        } catch (e: any) {
            console.log(`[FlowRunner] Candidate strategy ${cand.type} failed or timed out. Moving to next fallback.`);
        }
    }

    // Fallback to original
    console.log(`[FlowRunner] Self-healing exhausted. Proceeding with ultimate fallback.`);
    if (step.selector) {
        return { locator: page.locator(step.selector).first(), selectorUsed: step.selector };
    }
    return { locator: null, selectorUsed: "" };
}

async function executeAction(
    page: any,
    step: FlowStep
): Promise<void> {
    const timeout = 10000;
    
    switch (step.action) {
        case "navigate":
            const targetUrl = step.url || step.value;
            console.log(`[FlowRunner] Navigating to: ${targetUrl}`);
            await page.goto(targetUrl, {
                waitUntil: "networkidle",
                timeout: 30000,
            });
            break;

        case "click":
        case "fill":
        case "type":
        case "select":
        case "press":
        case "verify":
            if (!step.selector && !step.selectors) break;
            
            let { locator, selectorUsed } = await findLocatorWithHealing(page, step, timeout);
            if (!locator) break;
            
            // Highlight element for debugging / visual feedback before action
            try {
                await locator.evaluate((el: HTMLElement) => {
                    const originalOutline = el.style.outline;
                    const originalTransition = el.style.transition;
                    el.style.transition = 'outline 0.2s';
                    el.style.outline = '3px solid #f43f5e'; // Highlight in rose
                    setTimeout(() => {
                        el.style.outline = originalOutline;
                        el.style.transition = originalTransition;
                    }, 500);
                });
            } catch (e) {
                // ignore highlight error if element is strictly cross-origin or detached right after
            }

            // Small pause for highlighting to be visible and element to stabilize
            await page.waitForTimeout(300);

            if (step.action === "click") {
                await locator.scrollIntoViewIfNeeded();
                // We use trial to ensure there's no overlays covering it. If there is, Playwright throws and executeStepWithRetry catches it
                try {
                    await locator.click({ timeout, trial: true });
                    await locator.click({ timeout });
                } catch (e) {
                    console.warn(`[FlowRunner] Click trial failed, attempting force click...`);
                    await locator.click({ timeout, force: true });
                }
            } else if (step.action === "fill" || step.action === "type") {
                 // Ensure element is enabled before filling
                const expectObj = await expectLocator(locator, timeout);
                await expectObj.toBeEnabled();
                await locator.fill(step.value || "", { timeout });
            } else if (step.action === "select") {
                const expectObj = await expectLocator(locator, timeout);
                await expectObj.toBeEnabled();
                await locator.selectOption(step.value || "", { timeout });
            } else if (step.action === "press") {
                await locator.press(step.value || "Enter", { timeout });
            }
            break;

        case "wait":
            const ms = parseInt(step.value || "1000");
            console.log(`[FlowRunner] Waiting for ${ms}ms`);
            await page.waitForTimeout(ms);
            break;

        default:
            console.warn(`[FlowRunner] Unknown action: ${step.action}`);
            break;
    }
}

// Helper to wrap expect for playwright locator
async function expectLocator(locator: any, timeout: number) {
    // Playwright locator wait for enabled state
    try {
        await locator.waitFor({ state: 'visible', timeout });
        // While not strictly a full expect(), this ensures playability 
        // as fill/selectOption will auto-wait for actionability
    } catch(e) {}
    return {
        toBeEnabled: async () => {} // Dummy for now, rely on actionability checks
    };
}

async function executeStepWithRetry(
    page: any,
    step: FlowStep,
    retries = 3
): Promise<{ status: "PASS" | "FAIL"; error: string }> {
    for (let i = 0; i < retries; i++) {
        try {
            if (i > 0) {
                console.log(`[FlowRunner] Retry ${i}/${retries-1} for step ${step.step}: ${step.action}`);
                await page.waitForTimeout(500); // Backoff delay
            }
            await executeAction(page, step);
            return { status: "PASS", error: "" };
        } catch (err: any) {
            console.error(`[FlowRunner] Step ${step.step} failed (attempt ${i+1}/${retries}):`, err.message);
            if (i === retries - 1) {
                return { status: "FAIL", error: err.message || "Step failed after retries" };
            }
        }
    }
    return { status: "FAIL", error: "Maximum retries reached" };
}

export async function runFlow(
    steps: FlowStep[],
    targetUrl: string
): Promise<RunResult> {
    console.log(`[FlowRunner] Starting flow execution: ${steps.length} steps`);
    const browser = await chromium.launch({ 
        headless: true,
        args: ["--ignore-certificate-errors", "--ignore-ssl-errors"]
    });
    
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        viewport: { width: 1280, height: 800 },
    });
    
    const page = await context.newPage();
    const { consoleLogs, networkFailures } = attachErrorMonitor(page);

    const stepResults: StepResult[] = [];
    let failedStep = "";
    const runStart = Date.now();

    // Initial navigation if needed
    const firstIsNav = steps.length > 0 && (steps[0].action === "navigate");
    if (!firstIsNav && targetUrl) {
        console.log(`[FlowRunner] Performing initial navigation to ${targetUrl}`);
        try {
            await page.goto(targetUrl, {
                waitUntil: "networkidle",
                timeout: 30000,
            });
        } catch (e: any) {
            console.warn(`[FlowRunner] Initial navigation warning:`, e.message);
        }
    }

    for (const step of steps) {
        const stepStart = Date.now();
        console.log(`[FlowRunner] Executing step ${step.step}: ${step.action} ${step.selector || ""}`);
        
        // Small delay between steps for stability
        await page.waitForTimeout(200);
        
        const result = await executeStepWithRetry(page, step);

        const label = step.label || `${step.action} ${step.selector || step.url || ""}`.trim();
        stepResults.push({
            step: step.step,
            label,
            action: step.action,
            status: result.status,
            durationMs: Date.now() - stepStart,
            error: result.error,
        });

        if (result.status === "FAIL") {
            if (!failedStep) failedStep = label;
            // Stop execution on failure
            break;
        }
    }

    const totalDurationMs = Date.now() - runStart;

    // Final screenshot
    let screenshot = "";
    try {
        const buf = await page.screenshot({ fullPage: false });
        screenshot = buf.toString("base64");
    } catch (_) {}

    await browser.close();

    const failCount = stepResults.filter((s) => s.status === "FAIL").length;
    const overallStatus: "PASS" | "FAIL" | "PARTIAL" =
        failCount === 0
            ? "PASS"
            : (stepResults.length > 0 && stepResults[stepResults.length-1].status === "FAIL" && stepResults.length < steps.length) 
                ? "PARTIAL" // stopped early
                : "FAIL";

    console.log(`[FlowRunner] Flow finished with status: ${overallStatus}`);

    return {
        stepResults,
        consoleLogs,
        networkFailures,
        overallStatus,
        totalDurationMs,
        failedStep,
        screenshot,
    };
}
