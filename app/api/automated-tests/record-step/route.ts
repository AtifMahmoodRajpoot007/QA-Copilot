import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";

export const maxDuration = 10;

/**
 * POST /api/automated-tests/record-step
 *
 * Appends a single recorded step to an existing TestFlow document.
 * If no flowId is provided, creates a new draft flow.
 *
 * Body: {
 *   flowId?: string,        // existing flow to append to (optional)
 *   flowName?: string,      // name if creating a new flow
 *   targetUrl?: string,
 *   step: {
 *     action: string,
 *     selector?: string,
 *     text?: string,
 *     value?: string,
 *     url?: string,
 *     timestamp?: number,
 *   }
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { flowId, flowName, targetUrl, step, createdBy } = body;

        if (!step || !step.action) {
            return NextResponse.json({ error: "step.action is required" }, { status: 400 });
        }

        await connectToDatabase();

        // Normalize the step — assign step number if not provided
        const normalizedStep = {
            action: step.action,
            label: step.text || `${step.action} ${step.selector || step.url || ""}`.trim(),
            selector: step.selector || "",
            selectors: step.selectors || {},
            value: step.value || step.text || "",
            url: step.url || "",
            step: step.stepNumber || 1,
        };

        if (flowId) {
            // Append to existing flow — calculate next step number
            const existing = await TestFlow.findById(flowId);
            if (!existing) {
                return NextResponse.json({ error: "Flow not found" }, { status: 404 });
            }
            normalizedStep.step = existing.steps.length + 1;
            existing.steps.push(normalizedStep);
            await existing.save();
            return NextResponse.json({ flow: existing, stepAdded: normalizedStep });
        } else {
            // Create a new flow with this first step
            normalizedStep.step = 1;
            const flow = await TestFlow.create({
                name: flowName || `Recorded Flow — ${new Date().toLocaleDateString()}`,
                targetUrl: targetUrl || step.url || "",
                steps: [normalizedStep],
                sourceType: "recorded",
                createdBy: createdBy || "QA Engineer",
            });
            return NextResponse.json({ flow, stepAdded: normalizedStep }, { status: 201 });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
