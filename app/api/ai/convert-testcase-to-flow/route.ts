import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";
import { convertTestCaseToFlowSteps } from "@/services/aiService";

export const maxDuration = 60;

/**
 * POST /api/ai/convert-testcase-to-flow
 * Body: { testSteps: string, targetUrl: string, flowName?: string, requirement?: string }
 * Returns: { flow, steps }
 */
export async function POST(req: NextRequest) {
    try {
        const { testSteps, targetUrl, flowName, requirement } = await req.json();

        if (!testSteps?.trim()) {
            return NextResponse.json({ error: "testSteps is required" }, { status: 400 });
        }
        if (!targetUrl?.trim()) {
            return NextResponse.json({ error: "targetUrl is required" }, { status: 400 });
        }

        // Convert using AI
        const steps = await convertTestCaseToFlowSteps(testSteps, targetUrl);

        // Save the generated flow to MongoDB
        await connectToDatabase();
        const flow = await TestFlow.create({
            name: flowName?.trim() || `Generated Flow ${new Date().toLocaleDateString()}`,
            targetUrl,
            steps,
            sourceType: "generated",
            requirement: requirement?.trim() || "",
            description: requirement?.trim() || "",
        });

        return NextResponse.json({ flow, steps }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Conversion failed" }, { status: 500 });
    }
}
