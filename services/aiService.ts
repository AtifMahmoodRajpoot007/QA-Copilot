/**
 * services/aiService.ts
 * Wraps Gemini callLLM with test-case-to-flow conversion prompt logic.
 */

import { callLLM } from "@/lib/gemini";

export interface FlowStepResult {
    step: number;
    action: "navigate" | "click" | "fill" | "select" | "press" | "wait";
    label: string;
    selector?: string;
    value?: string;
    url?: string;
}

export async function convertTestCaseToFlowSteps(
    testSteps: string,
    targetUrl: string
): Promise<FlowStepResult[]> {
    const prompt = `You are a QA automation expert. Convert the following plain-text manual test steps into structured JSON flow steps that can be executed by a browser automation tool (Playwright).

Target base URL: ${targetUrl || "not specified"}

Manual test steps:
${testSteps}

Rules:
1. Return a JSON array only. No markdown, no extra text.
2. Each step must have: step (number), action (one of: navigate, click, fill, select, press, wait), label (human readable description).
3. For "navigate" steps: add a "url" field (relative or absolute).
4. For "click" steps: add a "selector" field (CSS selector like #id, .class, [type="submit"], button, a[href*="login"]).
5. For "fill" steps: add a "selector" and "value" fields.
6. For "select" steps: add a "selector" and "value" fields.
7. For "press" steps: add a "selector" and "value" (key name like "Enter") fields.
8. For "wait" steps: add a "value" field in milliseconds (e.g. "1000").
9. Use semantic, robust selectors: prefer #id, [name="x"], [type="x"], [placeholder="x"] over nth-child.
10. Keep step numbers sequential starting from 1.

Example output:
[
  { "step": 1, "action": "navigate", "label": "Navigate to login page", "url": "/login" },
  { "step": 2, "action": "fill", "label": "Enter email", "selector": "input[type='email']", "value": "user@example.com" },
  { "step": 3, "action": "fill", "label": "Enter password", "selector": "input[type='password']", "value": "password123" },
  { "step": 4, "action": "click", "label": "Click login button", "selector": "button[type='submit']" }
]

Now convert the provided steps:`;

    const raw = await callLLM(prompt);
    const steps: FlowStepResult[] = JSON.parse(raw);

    if (!Array.isArray(steps)) {
        throw new Error("AI did not return a valid JSON array of steps");
    }

    return steps;
}
