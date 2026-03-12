import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { callLLM } from "@/lib/gemini";
import { TEST_CASE_PROMPT } from "@/lib/prompts";
import TestCase from "@/models/TestCase";

export async function POST(req: NextRequest) {
    try {
        const { requirement, projectName, moduleName } = await req.json();

        if (!requirement || requirement.trim().length < 10) {
            return NextResponse.json(
                { error: "Please provide a detailed requirement (at least 10 characters)." },
                { status: 400 }
            );
        }


        await connectToDatabase();

        const prompt = TEST_CASE_PROMPT(requirement.trim());
        const rawResponse = await callLLM(prompt);
        const parsed = JSON.parse(rawResponse);

        if (!parsed.testCases || !Array.isArray(parsed.testCases)) {
            throw new Error("Invalid LLM response: missing testCases array");
        }

        const doc = await TestCase.create({
            projectName: projectName?.trim() || "General",
            moduleName: moduleName?.trim() || "",
            requirementInput: requirement.trim(),
            generatedTestCases: parsed.testCases,
        });
        return NextResponse.json({
            id: doc._id,
            requirementInput: doc.requirementInput,
            testCases: doc.generatedTestCases,
            createdAt: doc.createdAt
        });
    } catch (error: any) {
        console.error("[api/testcase]", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate test cases." },
            { status: 500 }
        );
    }
}
