import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FlowRun from "@/models/FlowRun";
import { callLLM } from "@/lib/gemini";

export const maxDuration = 60;

/**
 * POST /api/automated-tests/analyze
 *
 * Runs AI root-cause analysis on a failed FlowRun.
 * Loads the run from DB, sends logs to Gemini, stores analysis, returns text.
 *
 * Body: { runId: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { runId } = await req.json();

        if (!runId) {
            return NextResponse.json({ error: "runId is required" }, { status: 400 });
        }

        await connectToDatabase();
        const run = await FlowRun.findById(runId).lean() as any;

        if (!run) {
            return NextResponse.json({ error: "Run not found" }, { status: 404 });
        }

        // Build diagnostic context for the AI
        const failedSteps = run.stepResults
            ?.filter((s: any) => s.status === "FAIL")
            .map((s: any) => `  Step ${s.step} [${s.action}] "${s.label}": ${s.error}`)
            .join("\n") || "  None";

        const consoleErrors = run.consoleLogs?.length
            ? run.consoleLogs.slice(0, 10).join("\n")
            : "  None";

        const networkErrors = run.networkFailures?.length
            ? run.networkFailures.slice(0, 10).join("\n")
            : "  None";

        const prompt = `You are a senior QA automation engineer. Analyze this failed automated test execution and provide:

1. Root cause — the most likely reason for the failure
2. Which step failed and why
3. Whether it's an application bug, selector issue, timing issue, or network problem
4. Concrete suggestions to fix the issue

Test Flow: ${run.flowName}
Overall Status: ${run.overallStatus}
First Failed Step: ${run.failedStep || "Unknown"}
Total Duration: ${(run.totalDurationMs / 1000).toFixed(1)}s

Failed Steps:
${failedSteps}

Console Errors:
${consoleErrors}

Network Failures:
${networkErrors}

Provide a clear, actionable analysis in 3–5 sentences. Be direct and specific.`;

        const analysis = await callLLM(prompt);

        // Persist the analysis to the run document
        await FlowRun.findByIdAndUpdate(runId, { aiAnalysis: analysis });

        return NextResponse.json({ analysis, runId });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Analysis failed" }, { status: 500 });
    }
}

/**
 * GET /api/automated-tests/analyze?runId=xxx
 * Returns stored AI analysis for a run (no re-generation).
 */
export async function GET(req: NextRequest) {
    try {
        const runId = req.nextUrl.searchParams.get("runId");
        if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

        await connectToDatabase();
        const run = await FlowRun.findById(runId).select("aiAnalysis flowName overallStatus").lean() as any;
        if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

        return NextResponse.json({ analysis: run.aiAnalysis || "", runId });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
