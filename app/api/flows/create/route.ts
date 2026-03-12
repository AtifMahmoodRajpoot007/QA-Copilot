import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";

export const maxDuration = 30;

/**
 * POST /api/flows/create
 * Richer alias for POST /api/flows. Accepts: flowName, sourceType, requirement, url, steps.
 */
export async function POST(req: NextRequest) {
    try {
        const { flowName, name, sourceType, requirement, url, targetUrl, steps, description } =
            await req.json();

        const resolvedName = (flowName || name || "").trim();
        const resolvedUrl = (url || targetUrl || "").trim();

        if (!resolvedName) {
            return NextResponse.json({ error: "flowName is required" }, { status: 400 });
        }
        if (!resolvedUrl) {
            return NextResponse.json({ error: "url is required" }, { status: 400 });
        }
        if (!steps?.length) {
            return NextResponse.json({ error: "At least one step is required" }, { status: 400 });
        }

        await connectToDatabase();
        const flow = await TestFlow.create({
            name: resolvedName,
            targetUrl: resolvedUrl,
            steps,
            sourceType: sourceType || "recorded",
            requirement: requirement || "",
            description: description || requirement || "",
        });

        return NextResponse.json({ flow }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
