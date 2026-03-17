import { chromium, Browser } from "playwright-core";

/**
 * lib/playwright.ts
 * Centralized browser connection utility for remote execution.
 * Optimized for Vercel/Serverless environments by strictly using remote WebSocket connections.
 */

/**
 * Connects to a remote browser via WebSocket (e.g. Browserless.io).
 * Mandatory for Vercel deployments.
 */
export async function launchBrowser(): Promise<Browser> {
    const wsEndpoint = process.env.BROWSER_WSE_ENDPOINT;

    if (!wsEndpoint) {
        throw new Error(
            "CRITICAL ERROR: Missing BROWSER_WSE_ENDPOINT. Please configure a remote browser WebSocket URL " +
            "(e.g., from Browserless.io) in your environment variables to run tests."
        );
    }

    console.log('Connecting to remote browser at:', wsEndpoint);
    
    try {
        return await chromium.connect(wsEndpoint);
    } catch (error: any) {
        console.error('Failed to connect to remote browser:', error.message);
        throw new Error(`Remote browser connection failed: ${error.message}`);
    }
}
