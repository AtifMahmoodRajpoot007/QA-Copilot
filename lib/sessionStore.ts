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

export interface LiveRunSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
    flowName: string;
    steps: FlowStep[];
    stepResults: any[];
    runStatus: "RUNNING" | "PASS" | "FAIL" | "PARTIAL";
    latestScreenshot: string;
    consoleLogs: string[];
    networkFailures: string[];
    createdAt: number;
}

// Global store
const g = global as any;
if (!g.__qaSessions) {
    g.__qaSessions = new Map<string, any>();
}

export const sessionStore: Map<string, any> = g.__qaSessions;

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
