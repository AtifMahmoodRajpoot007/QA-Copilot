import { chromium, Browser, BrowserContext, Page } from "playwright";

/**
 * Ensures Playwright environment variables are set correctly for production.
 * This helps the library find browsers installed in the project-local path.
 */
if (process.env.NODE_ENV === "production") {
    // If we used PLAYWRIGHT_BROWSERS_PATH=0 during install, we must use it at runtime too.
    process.env.PLAYWRIGHT_BROWSERS_PATH = "0";
}

export async function launchBrowser(options: { headless?: boolean } = {}): Promise<Browser> {
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
