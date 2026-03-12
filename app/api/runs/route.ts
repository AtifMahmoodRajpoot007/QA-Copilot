import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FlowRun from "@/models/FlowRun";

export const maxDuration = 30;

/**
 * GET /api/runs
 * Returns all flow runs sorted by newest, with summary fields.
 */
export async function GET() {
    try {
        await connectToDatabase();
        const runs = await FlowRun.find({})
            .sort({ createdAt: -1 })
            .select("-screenshot -stepResults.error") // exclude heavy fields for list view
            .lean();

        return NextResponse.json({ runs });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
