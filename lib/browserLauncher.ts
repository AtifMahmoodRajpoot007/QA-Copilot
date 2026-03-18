import { chromium, type Browser, type LaunchOptions } from "playwright";
import os from "os";
import fs from "fs";

// ═══════════════════════════════════════════════════════════════════
// Cross-Platform Browser Launcher for QA-Copilot
// Automatically detects OS and configures Playwright accordingly.
// ═══════════════════════════════════════════════════════════════════

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
                console.log(`[BrowserLauncher] Using CHROME_PATH from env: ${envPath}`);
                return envPath;
            }
        } catch { /* skip */ }
        console.warn(`[BrowserLauncher] CHROME_PATH env set but file not found: ${envPath}`);
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
                console.log(`[BrowserLauncher] Found system Chrome: ${p}`);
                return p;
            }
        } catch { /* skip */ }
    }

    console.log("[BrowserLauncher] No system Chrome found, using Playwright bundled Chromium.");
    return undefined; // Playwright will use its own bundled Chromium
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
 *
 * On Windows:
 *   - recording/execution → headed (headless: false) with system Chrome
 *   - background → headless with system Chrome
 *
 * On Linux:
 *   - If DISPLAY is available (Xvfb) → headed allowed for recording/execution
 *   - If no DISPLAY → always headless, regardless of mode
 *   - background → always headless
 */
export async function launchBrowser(mode: LaunchMode = "background"): Promise<LaunchResult> {
    const systemChrome = findSystemChrome();
    const displayAvailable = hasDisplay();

    // Determine if we should launch headed
    const wantsHeaded = mode === "recording" || mode === "execution";
    const canBeHeaded = isWindows || displayAvailable;
    const headless = !(wantsHeaded && canBeHeaded);

    // Build launch arguments
    const args: string[] = [
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",
    ];

    // Linux stability flags
    if (isLinux) {
        args.push(
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        );
    }

    // Add --start-maximized only in headed mode
    if (!headless) {
        args.push("--start-maximized");
    }

    const launchOptions: LaunchOptions = {
        headless,
        args,
    };

    // Use system Chrome if found
    if (systemChrome) {
        launchOptions.executablePath = systemChrome;
    }

    const platform = `${os.platform()} (${os.arch()})`;
    console.log(`[BrowserLauncher] Platform: ${platform}`);
    console.log(`[BrowserLauncher] Mode: ${mode} | Headed: ${!headless} | Display: ${displayAvailable}`);
    if (systemChrome) console.log(`[BrowserLauncher] Executable: ${systemChrome}`);

    try {
        const browser = await chromium.launch(launchOptions);
        console.log(`[BrowserLauncher] ✅ Browser launched successfully.`);
        return { browser, isHeaded: !headless, platform };
    } catch (error: any) {
        // If headed launch failed on Linux (no X server), auto-fallback to headless
        if (!headless && isLinux && error.message?.includes("XServer")) {
            console.warn(`[BrowserLauncher] ⚠️ Headed launch failed (no X server), falling back to headless...`);
            launchOptions.headless = true;
            launchOptions.args = launchOptions.args?.filter(a => a !== "--start-maximized");
            const browser = await chromium.launch(launchOptions);
            console.log(`[BrowserLauncher] ✅ Browser launched in headless fallback mode.`);
            return { browser, isHeaded: false, platform };
        }
        throw error;
    }
}
