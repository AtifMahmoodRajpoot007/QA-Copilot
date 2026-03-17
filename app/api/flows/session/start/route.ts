import { NextRequest, NextResponse } from "next/server";
import { launchBrowser } from "@/lib/playwright";
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
    if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
    if (el.getAttribute('data-test-id')) return '[data-test-id="' + el.getAttribute('data-test-id') + '"]';
    if (el.getAttribute('name')) return el.tagName.toLowerCase() + '[name="' + el.getAttribute('name') + '"]';
    if (el.getAttribute('aria-label')) return el.tagName.toLowerCase() + '[aria-label="' + el.getAttribute('aria-label') + '"]';
    if (el.id) {
        // Skip dynamic-looking or very long auto-generated IDs
        if (!el.id.includes('radix-') && !el.id.match(/[0-9]{3,}/)) {
            try { return '#' + CSS.escape(el.id); } catch(e) { return '#' + el.id; }
        }
    }
    if (el.getAttribute('type') && (el.tagName === 'INPUT' || el.tagName === 'BUTTON'))
        return el.tagName.toLowerCase() + '[type="' + el.getAttribute('type') + '"]';
    if (el.getAttribute('placeholder'))
        return '[placeholder="' + el.getAttribute('placeholder') + '"]';
        
    // Text fallback for buttons/links
    if ((el.tagName === 'BUTTON' || el.tagName === 'A') && el.textContent && el.textContent.trim().length < 30) {
        return el.tagName.toLowerCase() + ':has-text("' + el.textContent.trim().replace(/"/g, '\\\\"') + '")';
    }
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
        // Ignore clicks on our injected stop button
        if (el.id === '__qa_stop_btn' || el.closest('#__qa_stop_btn') || el.closest('#__qa_stop_container')) return;
        
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

    // --- Injected Stop Button ---
    function injectStopButton() {
        if (document.getElementById('__qa_stop_container')) return;
        if (!document.body) {
            setTimeout(injectStopButton, 50);
            return;
        }

        const container = document.createElement('div');
        container.id = '__qa_stop_container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; display: flex; align-items: center; gap: 12px; font-family: system-ui, -apple-system, sans-serif; pointer-events: none;';
        
        const stopBtn = document.createElement('button');
        stopBtn.id = '__qa_stop_btn';
        stopBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2" ry="2"></rect></svg>';
        stopBtn.style.cssText = 'width: 56px; height: 56px; border-radius: 50%; background: #ef4444; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s, background 0.2s; pointer-events: auto; padding: 0; outline: none; margin: 0;';
        const tooltip = document.createElement('div');
        tooltip.innerText = 'Click to Stop Recording';
        tooltip.style.cssText = 'background: white; color: #ef4444; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 2px solid #ef4444; opacity: 1; transition: opacity 0.3s; pointer-events: none; white-space: nowrap;';
        
        container.appendChild(tooltip);
        container.appendChild(stopBtn);
        
        document.body.appendChild(container);

        // Initial tooltip display for ~2 seconds
        let hideTimeout = setTimeout(() => {
            tooltip.style.opacity = '0';
        }, 2000);
        
        stopBtn.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
            stopBtn.style.transform = 'scale(1.1)';
            stopBtn.style.background = '#dc2626';
            tooltip.style.opacity = '1';
        });
        
        stopBtn.addEventListener('mouseleave', () => {
            stopBtn.style.transform = 'scale(1)';
            stopBtn.style.background = '#ef4444';
            tooltip.style.opacity = '0';
        });
        
        stopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.__qaStopRecordingSession) {
                window.__qaStopRecordingSession();
                stopBtn.style.background = '#991b1b';
                tooltip.innerText = 'Stopping...';
                tooltip.style.opacity = '1';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectStopButton);
    } else {
        injectStopButton();
    }


})();
`;

export async function POST(req: NextRequest) {
    try {
        cleanOldSessions();
        const { url } = await req.json();
        if (!url?.trim()) return NextResponse.json({ error: "URL is required" }, { status: 400 });

        const sessionId = generateSessionId();
        const browser = await launchBrowser(); // visible browser
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            viewport: null, // allows resizing to full window
        });

        // Expose function so the injected browser button can stop the session
        await context.exposeFunction('__qaStopRecordingSession', async () => {
            const s = sessionStore.get(sessionId);
            if (!s) return;
            // Stop polling
            if ((s as any).__interval) clearInterval((s as any).__interval);
            // Close the Playwright browser
            await s.browser.close().catch(() => { });
            // Delete session. Next poll from the frontend will get 404 and gracefully end the recording
            sessionStore.delete(sessionId);
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

        // Navigate to the starting URL (wait for 'commit' which is much faster than domcontentloaded)
        await page.goto(url, { waitUntil: "commit", timeout: 15000 }).catch(() => {});

        // Take initial screenshot
        const buf = await page.screenshot({ fullPage: false }).catch(() => null);
        const screenshot = buf ? buf.toString("base64") : null;

        const session: RecordingSession = {
            browser,
            context,
            page,
            steps: [{ step: 1, action: "navigate", label: `Navigate to ${url}`, url }],
            latestScreenshot: screenshot || "",
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
                await s.page.evaluate(INJECT_SCRIPT).catch(() => { });

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

                // Take screenshot occasionally to not lag the polling thread
                if (Math.random() > 0.5) {
                    const scBuf = await s.page.screenshot({ fullPage: false, type: 'jpeg', quality: 50 }).catch(() => null);
                    if (scBuf) s.latestScreenshot = scBuf.toString("base64");
                }
            } catch (_) { }
        }, 400); // 🚀 Faster polling loop for near-instant recording feedback

        // Store interval ref for cleanup
        (session as any).__interval = pollInterval;

        return NextResponse.json({ sessionId, screenshot, message: "Browser launched — interact with it to record steps." });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to start session" }, { status: 500 });
    }
}
