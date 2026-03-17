import { chromium, Browser, BrowserContext, Page } from "playwright";

/**
 * lib/playwright.ts
 * Centralized browser launch utility for local and production environments.
 * Supports remote browser connection (Browserless.io) for serverless deployments.
 */

// Production path enforcement for local browser bundling
if (process.env.NODE_ENV === "production" && !process.env.BROWSER_WSE_ENDPOINT) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = "0";
}

/**
 * Launches a local browser OR connects to a remote one if BROWSER_WSE_ENDPOINT is set.
 */
export async function launchBrowser(options: { headless?: boolean } = {}): Promise<Browser> {
    const wse = process.env.BROWSER_WSE_ENDPOINT;

    if (wse) {
        console.log('Connecting to remote browser at:', wse);
        return await chromium.connectOverCDP(wse);
    }

    console.log('Launching local chromium instance...');
    return await chromium.launch({
        headless: options.headless !== false, // Default to true
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--start-maximized",
            "--ignore-certificate-errors",
            "--ignore-ssl-errors",
        ]
    });
}
