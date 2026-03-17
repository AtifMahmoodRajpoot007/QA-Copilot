/**
 * services/flowRunner.ts
 * Playwright execution engine for running stored test flows.
 * Used by /api/flows/run and any future scheduled runners.
 */

import { chromium } from "playwright-core";
import { launchBrowser } from "@/lib/playwright";
import { attachErrorMonitor } from "./errorMonitor";

export interface FlowStep {
    step: number;
    action: string;
    label?: string;
    url?: string;
    selector?: string;
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

async function executeStep(
    page: any,
    step: FlowStep
): Promise<{ status: "PASS" | "FAIL"; error: string }> {
    try {
        switch (step.action) {
            case "navigate":
                await page.goto(step.url || step.value, {
                    waitUntil: "domcontentloaded",
                    timeout: 20000,
                });
                break;
            case "click":
                await page.waitForSelector(step.selector!, { timeout: 10000 });
                await page.click(step.selector!);
                await page.waitForTimeout(500);
                break;
            case "fill":
            case "type":
                await page.waitForSelector(step.selector!, { timeout: 10000 });
                await page.fill(step.selector!, step.value || "");
                break;
            case "select":
                await page.waitForSelector(step.selector!, { timeout: 10000 });
                await page.selectOption(step.selector!, step.value || "");
                break;
            case "press":
                if (step.selector) {
                    await page.waitForSelector(step.selector, { timeout: 10000 });
                    await page.press(step.selector, step.value || "Enter");
                } else {
                    await page.keyboard.press(step.value || "Enter");
                }
                break;
            case "verify":
                await page.waitForSelector(step.selector!, { timeout: 10000 });
                break;
            case "wait":
                await page.waitForTimeout(parseInt(step.value || "1000"));
                break;
            default:
                // Unknown action — skip silently
                break;
        }
        return { status: "PASS", error: "" };
    } catch (err: any) {
        return { status: "FAIL", error: err.message || "Step failed" };
    }
}

export async function runFlow(
    steps: FlowStep[],
    targetUrl: string
): Promise<RunResult> {
    const browser = await launchBrowser();
    const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // Attach error monitors
    const { consoleLogs, networkFailures } = attachErrorMonitor(page);

    const stepResults: StepResult[] = [];
    let failedStep = "";
    const runStart = Date.now();

    // Initial navigation if first step is not "navigate"
    const firstIsNav = steps.length > 0 && steps[0].action === "navigate";
    if (!firstIsNav && targetUrl) {
        try {
            await page.goto(targetUrl, {
                waitUntil: "domcontentloaded",
                timeout: 20000,
            });
        } catch (_) {}
    }

    for (const step of steps) {
        const stepStart = Date.now();
        let result = await executeStep(page, step);

        // Single retry on failure
        if (result.status === "FAIL") {
            await page.waitForTimeout(1500);
            result = await executeStep(page, step);
        }

        const label =
            step.label ||
            `${step.action} ${step.selector || step.url || ""}`.trim();
        stepResults.push({
            step: step.step,
            label,
            action: step.action,
            status: result.status,
            durationMs: Date.now() - stepStart,
            error: result.error,
        });

        if (result.status === "FAIL" && !failedStep) {
            failedStep = label;
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
            : failCount === stepResults.length
            ? "FAIL"
            : "PARTIAL";

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
