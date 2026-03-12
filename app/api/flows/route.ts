import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";

export const maxDuration = 30;

export async function GET() {
    try {
        await connectToDatabase();
        const flows = await TestFlow.find({}).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ flows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, targetUrl, steps, description } = await req.json();
        if (!name?.trim()) return NextResponse.json({ error: "Flow name is required" }, { status: 400 });
        if (!targetUrl?.trim()) return NextResponse.json({ error: "Target URL is required" }, { status: 400 });
        if (!steps?.length) return NextResponse.json({ error: "At least one step is required" }, { status: 400 });

        await connectToDatabase();
        const flow = await TestFlow.create({ name, targetUrl, steps, description: description || "" });
        return NextResponse.json({ flow }, { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
