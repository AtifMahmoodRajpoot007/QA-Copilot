import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const { testSteps, targetUrl } = await req.json();
        if (!testSteps?.trim()) {
            return NextResponse.json({ error: "Test steps are required" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are a test automation expert. Convert the following manual test steps into structured JSON flow steps.

Target URL: ${targetUrl || "unknown"}

Manual test steps:
${testSteps}

Return a JSON array of flow steps. Each step must have:
- step: number (sequential)
- action: one of "navigate", "click", "fill", "select", "press", "wait"
- label: human-readable description of the action
- url: (only for navigate action) the URL path or full URL
- selector: (for click, fill, select, press) a CSS selector or descriptive selector like "button[type=submit]", "input[name=email]", etc.
- value: (for fill, select, press) the input value or key

Guidelines:
- For login pages, use selectors like: input[type=email], input[name=email], input[type=password], button[type=submit]
- For navigation, use the target URL with relative or absolute path
- Make selectors as standard and descriptive as possible
- Add a "navigate" step at the start if not present
- Be practical — generate realistic selectors

Return ONLY valid JSON array, no markdown, no explanation:
[{"step":1,"action":"navigate","label":"Open login page","url":"${targetUrl || "/login"}"},...]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Clean potential markdown
        const jsonStr = text.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, "").trim();
        const steps = JSON.parse(jsonStr);

        return NextResponse.json({ steps });
    } catch (err: any) {
        console.error("[flows/convert]", err);
        return NextResponse.json({ error: "Conversion failed: " + (err.message || "Unknown error") }, { status: 500 });
    }
}
