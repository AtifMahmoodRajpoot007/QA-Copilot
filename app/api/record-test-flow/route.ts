import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import connectToDatabase from "@/lib/mongodb";
import RegressionScript from "@/models/RegressionScript";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { action, steps, name, url } = await req.json();

        if (action === "save") {
            await connectToDatabase();

            // Generate the Playwright script code from steps
            let scriptCode = `import { test, expect } from '@playwright/test';\n\ntest('${name || "Recorded Test Flow"}', async ({ page }) => {\n`;

            steps.forEach((step: any) => {
                if (step.action === "goto") {
                    scriptCode += `  await page.goto('${step.value}');\n`;
                } else if (step.action === "click") {
                    scriptCode += `  await page.click('${step.selector}');\n`;
                } else if (step.action === "fill") {
                    scriptCode += `  await page.fill('${step.selector}', '${step.value}');\n`;
                } else if (step.action === "select") {
                    scriptCode += `  await page.selectOption('${step.selector}', '${step.value}');\n`;
                } else if (step.action === "press") {
                    scriptCode += `  await page.press('${step.selector}', '${step.value}');\n`;
                }
            });

            scriptCode += `});`;

            const savedScript = await RegressionScript.create({
                name: name || "Untitled Script",
                url: url,
                steps: steps,
                generatedScript: scriptCode
            });

            return NextResponse.json({ script: savedScript });
        }

        // Heuristic: If we are just "testing" a step or starting a session
        // Since we are stateless in a Next.js API route, we execute all steps to get to the current state
        if (action === "execute") {
            const browser = await chromium.launch({ 
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu"
                ]
            });
            const page = await browser.newPage();

            let screenshot = "";
            let pageTitle = "";

            try {
                for (const step of steps) {
                    if (step.action === "goto") {
                        await page.goto(step.value, { waitUntil: "networkidle" });
                    } else if (step.action === "click") {
                        await page.click(step.selector);
                        await page.waitForLoadState("networkidle");
                    } else if (step.action === "fill") {
                        await page.fill(step.selector, step.value);
                    }
                }

                const screenshotBuffer = await page.screenshot();
                screenshot = screenshotBuffer.toString("base64");
                pageTitle = await page.title();
            } finally {
                await browser.close();
            }

            return NextResponse.json({ screenshot, pageTitle });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        console.error("[api/record-test-flow]", error);
        return NextResponse.json({ error: error.message || "Action failed" }, { status: 500 });
    }
}
