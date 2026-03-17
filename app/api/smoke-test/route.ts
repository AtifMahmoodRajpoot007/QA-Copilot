import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import connectToDatabase from "@/lib/mongodb";
import SmokeTestReport from "@/models/SmokeTestReport";

export const maxDuration = 60; // Increase timeout for browser automation

export async function POST(req: NextRequest) {
    try {
        const { buildUrl, login } = await req.json();

        if (!buildUrl) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        await connectToDatabase();

        const browser = await chromium.launch({ 
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        });
        const context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport: { width: 1280, height: 720 }
        });
        const page = await context.newPage();

        const consoleErrors = new Set<string>();
        const networkErrors = new Set<string>();
        const criticalApiChecks: string[] = [];
        const testedPages: string[] = [];
        const redirectChecks: string[] = [];

        // Listen for console errors
        page.on("console", (msg) => {
            if (msg.type() === "error") {
                consoleErrors.add(msg.text());
            }
        });

        // Listen for failed network requests and monitor critical APIs
        page.on("requestfailed", (request) => {
            const url = request.url();
            const failure = request.failure()?.errorText || "Unknown error";
            if (!url.includes("favicon") && !url.includes("analytics")) {
                networkErrors.add(`${url} failed: ${failure}`);
            }
        });

        page.on("response", (response) => {
            const status = response.status();
            const url = response.url();

            // Monitor critical APIs (e.g., login, user, settings, dashboard)
            if (url.includes("/api/") && !url.includes("analytics")) {
                criticalApiChecks.push(`${url.split('?')[0]}: ${status}`);
            }

            if (status >= 400 && !url.includes("favicon")) {
                networkErrors.add(`${url} returned ${status}`);
            }
        });

        // 1. Measure Homepage Performance
        const startTime = Date.now();
        let homepageStatus: "PASS" | "FAIL" = "PASS";
        try {
            await page.goto(buildUrl, { waitUntil: "networkidle", timeout: 30000 });
        } catch (e) {
            homepageStatus = "FAIL";
        }
        const pageLoadTimeMs = Date.now() - startTime;

        // Dynamic Tested Pages tagging
        const landedUrl = page.url().toLowerCase();
        const isLandedOnLogin = landedUrl.includes("login") || landedUrl.includes("signin");
        
        if (isLandedOnLogin) {
            if (!testedPages.includes("login")) testedPages.push("login");
        } else if (homepageStatus === "PASS") {
            if (!testedPages.includes("homepage")) testedPages.push("homepage");
        }

        // Check for redirects
        const finalUrl = page.url();
        if (finalUrl.replace(/\/$/, "") !== buildUrl.replace(/\/$/, "")) {
            let label = "PASS";
            if (finalUrl.toLowerCase().includes("login") || finalUrl.toLowerCase().includes("signin")) {
                label = "INFO (Redirected to Login)";
            }
            redirectChecks.push(`${buildUrl} -> ${finalUrl}: ${label}`);
        }

        // 2. Perform UI Element Checks (Removed as per user request for reliability)
        const uiChecks: Record<string, "PASS" | "FAIL"> = {};
        
        let loginStatus: "PASS" | "FAIL" | "N/A" = "N/A";

        if (login?.email && login?.password) {
            loginStatus = "FAIL";
            
            try {
                // Navigate to login if not already there
                const currentUrl = page.url().toLowerCase();
                const isLoginPage = currentUrl.includes("login") || currentUrl.includes("signin") || await page.$("input[type='password']");
                
                if (!isLoginPage) {
                    const loginLink = await page.$(
                        "a[href*='login'], a[href*='signin'], a:has-text('Log In'), a:has-text('Sign In'), button:has-text('Log In'), button:has-text('Sign In')"
                    );
                    if (loginLink) {
                        await loginLink.click();
                        await page.waitForLoadState("networkidle");
                    } else {
                        // Try common login paths if no link found
                        for (const path of ["/login", "/signin", "/auth/login"]) {
                            try {
                                const targetUrl = new URL(path, buildUrl).toString();
                                await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 10000 });
                                if (await page.$("input[type='password']")) break;
                            } catch {}
                        }
                    }
                }

                if (!testedPages.includes("login") && page.url().toLowerCase().includes("login")) {
                    testedPages.push("login");
                }

                // Interaction logic
                const emailSelectors = [
                    "input[type='email']",
                    "input[name='email']",
                    "input[name='username']",
                    "input[placeholder*='Email' i]",
                    "input[placeholder*='Username' i]",
                    "#email",
                    "#username"
                ];
                
                const passwordSelectors = [
                    "input[type='password']",
                    "input[name='password']",
                    "#password"
                ];

                const submitSelectors = [
                    "button[type='submit']",
                    "button:has-text('Log In')",
                    "button:has-text('Sign In')",
                    "input[type='submit']",
                    ".login-button",
                    "#login-button"
                ];

                let emailInput = null;
                for (const s of emailSelectors) {
                    emailInput = await page.$(s);
                    if (emailInput) break;
                }

                let passwordInput = null;
                for (const s of passwordSelectors) {
                    passwordInput = await page.$(s);
                    if (passwordInput) break;
                }

                let submitButton = null;
                for (const s of submitSelectors) {
                    submitButton = await page.$(s);
                    if (submitButton) break;
                }

                if (emailInput && passwordInput && submitButton) {
                    await emailInput.fill(login.email);
                    await passwordInput.fill(login.password);
                    await submitButton.click();

                    // Wait for navigation or state change
                    try {
                        await page.waitForNavigation({ waitUntil: "networkidle", timeout: 15000 });
                    } catch (e) {
                        await page.waitForLoadState("networkidle");
                    }

                    const afterUrl = page.url().toLowerCase();
                    const pageContent = await page.content().then(c => c.toLowerCase());
                    
                    // Comprehensive success detection
                    const urlChanged = afterUrl !== currentUrl && !afterUrl.includes("login") && !afterUrl.includes("signin");
                    const hasLogoutUI = pageContent.includes("logout") || pageContent.includes("sign out") || pageContent.includes("log out");
                    const hasDashboard = afterUrl.includes("dashboard") || afterUrl.includes("home") || pageContent.includes("welcome");
                    const loginFormMissing = !(await page.$("input[type='password']"));

                    if (urlChanged || hasLogoutUI || (hasDashboard && loginFormMissing)) {
                        loginStatus = "PASS";
                        if (!testedPages.includes("dashboard")) testedPages.push("dashboard");
                    }
                }
            } catch (error) {
                console.error("Login test execution failed:", error);
            }
        }

        await browser.close();

        // 3. Save to Database
        const reportData = {
            buildUrl,
            homepageStatus,
            loginStatus,
            consoleErrors: Array.from(consoleErrors).slice(0, 50),
            networkErrors: Array.from(networkErrors).slice(0, 50),
            uiChecks,
            pageLoadTimeMs,
            redirectChecks,
            criticalApiChecks: criticalApiChecks.slice(0, 20),
            testedPages,
        };

        const savedReport = await SmokeTestReport.create(reportData);
        return NextResponse.json(savedReport);
    } catch (error: any) {
        console.error("[api/smoke-test]", error);
        return NextResponse.json({ error: error.message || "Failed to run smoke test" }, { status: 500 });
    }
}
