/**
 * services/errorMonitor.ts
 * Attaches console + network error listeners to a Playwright page.
 * Returns collected arrays that fill in as the page runs.
 */

import type { Page } from "playwright-core";

export interface ErrorCollector {
    consoleLogs: string[];
    networkFailures: string[];
}

export function attachErrorMonitor(page: Page): ErrorCollector {
    const consoleLogs: string[] = [];
    const networkFailures: string[] = [];

    page.on("console", (msg) => {
        if (["error", "warning"].includes(msg.type())) {
            consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
        }
    });

    page.on("requestfailed", (req) => {
        const failure = req.failure()?.errorText || "Unknown";
        networkFailures.push(`Request Failed: ${req.url()} — ${failure}`);
    });

    page.on("response", (res) => {
        if (res.status() >= 400) {
            networkFailures.push(`HTTP ${res.status()}: ${res.url()}`);
        }
    });

    return { consoleLogs, networkFailures };
}
