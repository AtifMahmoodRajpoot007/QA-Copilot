import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import QAAssistantSession from "@/models/QAAssistantSession";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        await connectToDatabase();

        // Fetch the latest 20 sessions for the demo user
        const sessions = await QAAssistantSession.find({ userId: "demo-user" })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return NextResponse.json({ sessions });
    } catch (error: any) {
        console.error("Error fetching AI Assistant history:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
