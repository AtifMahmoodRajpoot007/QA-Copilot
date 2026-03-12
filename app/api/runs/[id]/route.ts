import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FlowRun from "@/models/FlowRun";

export const maxDuration = 10;

/**
 * GET /api/runs/[id]
 * Returns a single FlowRun document by ID (includes screenshot and full step results).
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await connectToDatabase();
        const run = await FlowRun.findById(id).lean();
        if (!run) {
            return NextResponse.json({ error: "Run not found" }, { status: 404 });
        }
        return NextResponse.json({ run });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
