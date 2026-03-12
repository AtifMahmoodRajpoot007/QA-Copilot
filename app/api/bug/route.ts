import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { callLLM } from "@/lib/gemini";
import { BUG_REPORT_PROMPT } from "@/lib/prompts";
import BugReport from "@/models/BugReport";

export async function POST(req: NextRequest) {
    try {
        const { description, userId = "anonymous" } = await req.json();

        if (!description || description.trim().length < 10) {
            return NextResponse.json(
                { error: "Please provide a detailed bug description (at least 10 characters)." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const prompt = BUG_REPORT_PROMPT(description.trim());
        const rawResponse = await callLLM(prompt);
        const parsed = JSON.parse(rawResponse);

        const doc = await BugReport.create({
            userId,
            rawBugDescription: description.trim(),
            structuredBugReport: parsed,
        });

        return NextResponse.json({
            id: doc._id,
            rawBugDescription: doc.rawBugDescription,
            enhancedReport: doc.structuredBugReport,
            createdAt: doc.createdAt
        });
    } catch (error: any) {
        console.error("[api/bug]", error);
        return NextResponse.json(
            { error: error.message || "Failed to enhance bug report." },
            { status: 500 }
        );
    }
}
