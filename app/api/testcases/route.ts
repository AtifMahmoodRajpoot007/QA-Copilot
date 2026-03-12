import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import TestCase from "@/models/TestCase";

export async function GET() {
    try {
        await connectToDatabase();

        const testCases = await TestCase.find({})
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ testCases });
    } catch (error: any) {
        console.error("[api/testcases]", error);
        return NextResponse.json(
            { error: "Failed to fetch test cases." },
            { status: 500 }
        );
    }
}
