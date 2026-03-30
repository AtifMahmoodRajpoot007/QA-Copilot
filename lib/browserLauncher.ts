import { chromium, type Browser, type LaunchOptions } from "playwright";
import os from "os";
import fs from "fs";
import { createLogger } from "@/lib/logger";

// ═══════════════════════════════════════════════════════════════════
// Cross-Platform Browser Launcher for QA-Copilot
// Automatically detects OS and configures Playwright accordingly.
// ═══════════════════════════════════════════════════════════════════

const log = createLogger("BrowserLauncher");

const isWindows = os.platform() === "win32";
const isLinux = os.platform() === "linux";

// Check if a DISPLAY server (X11/Xvfb) is available on Linux
function hasDisplay(): boolean {
    if (isWindows) return true;
    return !!process.env.DISPLAY;
}

// Resolve system Chrome/Chromium executable path
function findSystemChrome(): string | undefined {
    // 1. Check env override first (set CHROME_PATH in .env.local)
    const envPath = process.env.CHROME_PATH;
    if (envPath) {
        try {
            if (fs.existsSync(envPath)) {
                log.info("Using CHROME_PATH from env", { path: envPath });
                return envPath;
            }
        } catch { /* skip */ }
        log.warn("CHROME_PATH env set but file not found", { path: envPath });
    }

    // 2. Auto-detect common system paths
    const candidates = isWindows
        ? [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        ]
        : [
            "/usr/bin/chromium-browser",
            "/usr/bin/chromium",
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/snap/bin/chromium",
        ];

    for (const p of candidates) {
        try {
            if (p && fs.existsSync(p)) {
                log.info("Found system Chrome", { path: p });
                return p;
            }
        } catch { /* skip */ }
    }

    log.info("No system Chrome found, using Playwright bundled Chromium");
    return undefined;
}

/**
 * Launch mode type:
 * - "recording"  → Needs visible (headed) browser for user interaction
 * - "execution"  → Needs visible browser to watch test steps run
 * - "background" → Headless always (smoke tests, AI agent, etc.)
 */
export type LaunchMode = "recording" | "execution" | "background";

export interface LaunchResult {
    browser: Browser;
    isHeaded: boolean;
    platform: string;
}

/**
 * Launch a Playwright browser with cross-platform support.
 */
export async function launchBrowser(mode: LaunchMode = "background"): Promise<LaunchResult> {
    const systemChrome = findSystemChrome();
    const displayAvailable = hasDisplay();

    const wantsHeaded = mode === "recording" || mode === "execution";
    const canBeHeaded = isWindows || displayAvailable;
    
    // FORCE_HEADLESS is ignored here to ensure local same-tab experience works as requested
    const headless = true;

    const args: string[] = [
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
    ];

    const launchOptions: LaunchOptions = { 
        headless: true, 
        args 
    };

    // We prefer Playwright bundled Chromium for predictable headless behavior
    if (process.env.USE_SYSTEM_CHROME === "true" && systemChrome) {
        launchOptions.executablePath = systemChrome;
    }

    const platform = `${os.platform()} (${os.arch()})`;
    console.error(`[BrowserLauncher] Launching with headless: ${launchOptions.headless}, executable: ${launchOptions.executablePath || 'bundled'}`);
    log.info("Launching browser", { platform, mode, headed: !launchOptions.headless, display: displayAvailable, executable: systemChrome || "playwright-bundled" });

    try {
        const browser = await chromium.launch(launchOptions);
        log.info("Browser launched successfully", { mode, headed: !headless });
        return { browser, isHeaded: !headless, platform };
    } catch (error: any) {
        if (!headless && isLinux && error.message?.includes("XServer")) {
            log.warn("Headed launch failed (no X server), falling back to headless", { error: error.message });
            launchOptions.headless = true;
            launchOptions.args = launchOptions.args?.filter(a => a !== "--start-maximized");
            const browser = await chromium.launch(launchOptions);
            log.info("Browser launched in headless fallback mode");
            return { browser, isHeaded: false, platform };
        }
        log.error("Browser launch failed", { error: error.message, mode, platform });
        throw error;
    }
}
