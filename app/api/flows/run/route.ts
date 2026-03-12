import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";
import FlowRun from "@/models/FlowRun";
import { runFlow } from "@/services/flowRunner";

export const maxDuration = 90;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { steps, targetUrl, flowId, flowName } = body;

        if (!steps?.length) {
            return NextResponse.json({ error: "No steps provided" }, { status: 400 });
        }

        // Run using the service
        const result = await runFlow(steps, targetUrl || "");

        // Persist to MongoDB
        let runId = "";
        try {
            await connectToDatabase();
            const run = await FlowRun.create({
                flowId: flowId || "000000000000000000000000",
                flowName: flowName || "Unnamed Flow",
                stepResults: result.stepResults,
                consoleLogs: result.consoleLogs,
                networkFailures: result.networkFailures,
                overallStatus: result.overallStatus,
                totalDurationMs: result.totalDurationMs,
                failedStep: result.failedStep,
                screenshot: result.screenshot,
            });
            runId = run._id.toString();
        } catch (dbErr: any) {
            console.error("[flows/run] DB error:", dbErr.message);
        }

        return NextResponse.json({ runId, ...result });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Run failed" }, { status: 500 });
    }
}
