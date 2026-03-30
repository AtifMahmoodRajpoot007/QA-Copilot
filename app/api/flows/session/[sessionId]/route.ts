import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";

/**
 * Handles polling for events and stopping a recording session.
 */

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = await params;
    const session = sessionStore.get(sessionId);
    if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({
        steps: session.steps,
        stepResults: (session as any).stepResults,
        runStatus: (session as any).runStatus,
        latestScreenshot: session.latestScreenshot,
        consoleLogs: (session as any).consoleLogs,
        networkFailures: (session as any).networkFailures,
        createdAt: session.createdAt
    });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
    const { sessionId } = await params;
    const session = sessionStore.get(sessionId);
    if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { action } = await req.json();

    if (action === "stop") {
        try {
            // Clean up interval
            if ((session as any).__interval) {
                clearInterval((session as any).__interval);
            }
            // Close browser
            await session.browser.close();
            // Don't delete yet, return the final steps
            const steps = session.steps;
            const screenshot = session.latestScreenshot;
            sessionStore.delete(sessionId);
            
            return NextResponse.json({ steps, screenshot, message: "Session stopped" });
        } catch (err: any) {
            return NextResponse.json({ error: err.message || "Failed to stop session" }, { status: 500 });
        }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
