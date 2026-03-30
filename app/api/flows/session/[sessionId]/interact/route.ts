import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/sessionStore";
import { createLogger } from "@/lib/logger";

const log = createLogger("SessionInteract");

export async function POST(req: NextRequest, context: { params: Promise<{ sessionId: string }> }) {
    try {
        const params = await context.params;
        const { sessionId } = params;
        const session = sessionStore.get(sessionId);
        
        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        const body = await req.json();
        const { type, x, y, width, height, key, text, deltaY } = body;
        const page = session.page;

        if (type === "click") {
            // Map the frontend image coordinates to the actual browser viewport
            // Use fixed 1600x900 as defined in session init for zero-latency mapping
            const targetX = (x / width) * 1600;
            const targetY = (y / height) * 900;
            
            await page.mouse.click(targetX, targetY);
            log.info("Remote click", { sessionId, targetX, targetY });
            
        } else if (type === "type") {
            if (text) {
                await page.keyboard.type(text);
                log.info("Remote type", { sessionId, textLength: text.length });
            }
        } else if (type === "press") {
            if (key) {
                await page.keyboard.press(key);
                log.info("Remote press", { sessionId, key });
            }
        } else if (type === "scroll") {
            if (deltaY) {
                await page.mouse.wheel(0, deltaY);
                log.info("Remote scroll", { sessionId, deltaY });
            }
        }

        // The CDP screencast handles updating session.latestScreenshot continuously.
        // Return the latest known screenshot immediately for instant frontend update.
        return NextResponse.json({ success: true, screenshot: session.latestScreenshot || null });
    } catch (err: any) {
        log.error("Interaction failed", { error: err.message });
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
