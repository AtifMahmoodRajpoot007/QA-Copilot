import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestFlow from "@/models/TestFlow";
import mongoose from "mongoose";

export const maxDuration = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }
        await connectToDatabase();
        const flow = await TestFlow.findById(id).lean();
        if (!flow) return NextResponse.json({ error: "Flow not found" }, { status: 404 });
        return NextResponse.json({ flow });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }
        await connectToDatabase();
        await TestFlow.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }
        const body = await req.json();
        await connectToDatabase();
        const updated = await TestFlow.findByIdAndUpdate(id, body, { new: true }).lean();
        if (!updated) return NextResponse.json({ error: "Flow not found" }, { status: 404 });
        return NextResponse.json({ flow: updated });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
