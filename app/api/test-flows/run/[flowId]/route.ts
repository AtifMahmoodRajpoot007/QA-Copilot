import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";
import FlowRun from "@/models/FlowRun";
import { runFlow } from "@/services/flowRunner";

export const maxDuration = 90;

/**
 * POST /api/test-flows/run/[flowId]
 *
 * Loads a flow from MongoDB by ID and executes it via the Playwright runner.
 * This is the spec-compliant endpoint that runs by flowId, not by passing steps in the body.
 */
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ flowId: string }> }
) {
    try {
        const { flowId } = await params;
        await connectToDatabase();

        const flow = await TestFlow.findById(flowId).lean() as any;
        if (!flow) {
            return NextResponse.json({ error: "Flow not found" }, { status: 404 });
        }

        if (!flow.steps?.length) {
            return NextResponse.json({ error: "Flow has no steps" }, { status: 400 });
        }

        // Execute using the Playwright service
        const result = await runFlow(flow.steps, flow.targetUrl);

        // Persist the run
        const run = await FlowRun.create({
            flowId: flow._id,
            flowName: flow.name,
            stepResults: result.stepResults,
            consoleLogs: result.consoleLogs,
            networkFailures: result.networkFailures,
            overallStatus: result.overallStatus,
            totalDurationMs: result.totalDurationMs,
            failedStep: result.failedStep,
            screenshot: result.screenshot,
            aiAnalysis: "",
        });

        return NextResponse.json({
            runId: run._id.toString(),
            flowName: flow.name,
            ...result,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Run failed" }, { status: 500 });
    }
}
