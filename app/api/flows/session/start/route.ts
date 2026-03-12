import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";
import { sessionStore, generateSessionId, cleanOldSessions, RecordingSession } from "@/lib/sessionStore";
import { FlowStep } from "@/types";

export const maxDuration = 60;

/**
 * Best-effort CSS selector generator for a DOM element.
 * Injected into the page via CDP.
 */
const SELECTOR_GENERATOR = `
function getSelector(el) {
    if (!el) return null;
    if (el.id) return '#' + el.id;
    if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
    if (el.getAttribute('name')) return el.tagName.toLowerCase() + '[name="' + el.getAttribute('name') + '"]';
    if (el.getAttribute('type') && (el.tagName === 'INPUT' || el.tagName === 'BUTTON'))
        return el.tagName.toLowerCase() + '[type="' + el.getAttribute('type') + '"]';
    if (el.getAttribute('placeholder'))
        return '[placeholder="' + el.getAttribute('placeholder') + '"]';
    if (el.className && typeof el.className === 'string' && el.className.trim()) {
        const cls = el.className.trim().split(/\\s+/).slice(0, 2).join('.');
        const tag = el.tagName.toLowerCase();
        const candidates = document.querySelectorAll(tag + '.' + cls.replace(/\\s+/g, '.'));
        if (candidates.length === 1) return tag + '.' + cls.replace(/\\s+/g, '.');
    }
    // nth-child fallback
    const parent = el.parentElement;
    if (parent) {
        const children = Array.from(parent.children);
        const idx = children.indexOf(el) + 1;
        const tag = el.tagName.toLowerCase();
        return getSelector(parent) + ' > ' + tag + ':nth-child(' + idx + ')';
    }
    return el.tagName.toLowerCase();
}
`;

const INJECT_SCRIPT = `
(function() {
    if (window.__qaRecorderInjected) return;
    window.__qaRecorderInjected = true;
    window.__qaRecordedEvents = [];
    
    ${SELECTOR_GENERATOR}
    
    // Track clicks
    document.addEventListener('click', function(e) {
        var el = e.target;
        var sel = getSelector(el);
        var label = (el.textContent || el.value || el.placeholder || el.getAttribute('aria-label') || el.tagName).trim().substring(0, 60);
        window.__qaRecordedEvents.push({
            type: 'click',
            selector: sel,
            label: 'Click: ' + label,
            ts: Date.now()
        });
    }, true);
    
    // Track input fills (debounced)
    var _fillTimer = null;
    document.addEventListener('input', function(e) {
        var el = e.target;
        if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
        var sel = getSelector(el);
        var label = (el.placeholder || el.name || el.id || 'Input').substring(0, 40);
        // debounce: update or push
        var events = window.__qaRecordedEvents;
        if (events.length > 0) {
            var last = events[events.length - 1];
            if (last.type === 'fill' && last.selector === sel) {
                last.value = el.value;
                last.ts = Date.now();
                return;
            }
        }
        window.__qaRecordedEvents.push({
            type: 'fill',
            selector: sel,
            value: el.value,
            label: 'Fill ' + label + ': ' + el.value.substring(0, 30),
            ts: Date.now()
        });
    }, true);
    
    // Track select changes
    document.addEventListener('change', function(e) {
        var el = e.target;
        if (el.tagName !== 'SELECT') return;
        var sel = getSelector(el);
        window.__qaRecordedEvents.push({
            type: 'select',
            selector: sel,
            value: el.value,
            label: 'Select: ' + el.value,
            ts: Date.now()
        });
    }, true);
})();
`;

export async function POST(req: NextRequest) {
    try {
        cleanOldSessions();
        const { url } = await req.json();
        if (!url?.trim()) return NextResponse.json({ error: "URL is required" }, { status: 400 });

        const sessionId = generateSessionId();
        const browser = await chromium.launch({ 
            headless: false,
            args: ["--ignore-certificate-errors", "--ignore-ssl-errors"]
        }); // visible browser
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            viewport: { width: 1280, height: 800 },
        });
        const page = await context.newPage();

        // Inject recorder on every page load
        await context.addInitScript(INJECT_SCRIPT);

        // Track navigation events
        const navSteps: any[] = [];
        page.on("framenavigated", (frame) => {
            if (frame === page.mainFrame()) {
                navSteps.push({ type: "navigate", url: frame.url(), ts: Date.now() });
            }
        });

        // Navigate to the starting URL
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

        // Take initial screenshot
        const buf = await page.screenshot({ fullPage: false });
        const screenshot = buf.toString("base64");

        const session: RecordingSession = {
            browser,
            context,
            page,
            steps: [{ step: 1, action: "navigate", label: `Navigate to ${url}`, url }],
            latestScreenshot: screenshot,
            createdAt: Date.now(),
        };
        sessionStore.set(sessionId, session);

        // Start background polling to collect events from the page
        const pollInterval = setInterval(async () => {
            if (!sessionStore.has(sessionId)) {
                clearInterval(pollInterval);
                return;
            }
            try {
                const s = sessionStore.get(sessionId)!;
                // Inject script if not already
                await s.page.evaluate(INJECT_SCRIPT).catch(() => {});

                // Pull events
                const events = await s.page.evaluate(() => {
                    const evs = (window as any).__qaRecordedEvents || [];
                    (window as any).__qaRecordedEvents = [];
                    return evs;
                }).catch(() => []);

                // Add nav steps
                while (navSteps.length > 0) {
                    const nav = navSteps.shift();
                    // skip the initial navigation
                    if (nav.url === url) continue;
                    s.steps.push({
                        step: s.steps.length + 1,
                        action: "navigate",
                        label: `Navigate to ${nav.url}`,
                        url: nav.url,
                    });
                }

                // Convert events to FlowStep objects
                for (const ev of events) {
                    const step: FlowStep = {
                        step: s.steps.length + 1,
                        action: ev.type as FlowStep["action"],
                        label: ev.label,
                        selector: ev.selector,
                        value: ev.value,
                        url: ev.url,
                    };
                    s.steps.push(step);
                }

                // Take screenshot
                const scBuf = await s.page.screenshot({ fullPage: false }).catch(() => null);
                if (scBuf) s.latestScreenshot = scBuf.toString("base64");
            } catch (_) {}
        }, 1500);

        // Store interval ref for cleanup
        (session as any).__interval = pollInterval;

        return NextResponse.json({ sessionId, screenshot, message: "Browser launched — interact with it to record steps." });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to start session" }, { status: 500 });
    }
}
