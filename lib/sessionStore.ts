/**
 * Server-side session store for live Playwright recording sessions.
 * Uses a global variable to persist across hot reloads in dev mode.
 */

import { Browser, BrowserContext, Page } from "playwright";
import { FlowStep } from "@/types";

export interface RecordingSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    steps: FlowStep[];
    latestScreenshot: string;
    createdAt: number;
}

// Global store (persists in Node.js process memory)
const g = global as any;
if (!g.__recordingSessions) {
    g.__recordingSessions = new Map<string, RecordingSession>();
}

export const sessionStore: Map<string, RecordingSession> = g.__recordingSessions;

export function generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Auto-cleanup sessions older than 10 minutes
export function cleanOldSessions() {
    const now = Date.now();
    for (const [id, session] of sessionStore.entries()) {
        if (now - session.createdAt > 10 * 60 * 1000) {
            try { session.browser.close(); } catch (_) {}
            sessionStore.delete(id);
        }
    }
}
