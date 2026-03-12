import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { callLLM } from "@/lib/gemini";
import { REGRESSION_PROMPT } from "@/lib/prompts";
import RegressionAnalysis from "@/models/RegressionAnalysis";
import RegressionScript from "@/models/RegressionScript";

export async function POST(req: NextRequest) {
    try {
        const { prSummary, userId = "anonymous" } = await req.json();

        if (!prSummary || prSummary.trim().length < 10) {
            return NextResponse.json(
                { error: "Please provide a detailed PR summary or file list (at least 10 characters)." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Fetch available flow scripts to help the AI suggest existing ones
        const scripts = await RegressionScript.find({}, { name: 1 });
        const scriptNames = scripts.map(s => s.name);

        const prompt = REGRESSION_PROMPT(prSummary.trim(), scriptNames);
        const rawResponse = await callLLM(prompt);
        const parsed = JSON.parse(rawResponse);

        const doc = await RegressionAnalysis.create({
            userId,
            inputText: prSummary.trim(),
            analysisOutput: parsed,
        });

        return NextResponse.json({
            id: doc._id,
            inputText: doc.inputText,
            analysis: doc.analysisOutput,
            createdAt: doc.createdAt
        });
    } catch (error: any) {
        console.error("[api/regression]", error);
        return NextResponse.json(
            { error: error.message || "Failed to analyze regression." },
            { status: 500 }
        );
    }
}
