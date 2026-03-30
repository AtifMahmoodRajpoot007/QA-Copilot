import { NextRequest, NextResponse } from "next/server";
import { launchBrowser } from "@/lib/browserLauncher";
import { createLogger } from "@/lib/logger";
import { sessionStore, generateSessionId, cleanOldSessions, RecordingSession } from "@/lib/sessionStore";
import { FlowStep } from "@/types";

export const maxDuration = 60;

/**
 * Best-effort CSS selector generator for a DOM element.
 * Injected into the page via CDP.
 */
const SELECTOR_GENERATOR = `
class SmartRecorder {
    static isDynamicID(id) {
        if (!id) return true;
        // Strip out likely dynamic hashes or numbers
        if (/[0-9]{3,}/.test(id)) return true;
        if (/radix|headlessui|mantine|chakra/.test(id)) return true;
        if (/^[:\\\\-]/.test(id)) return true;
        return false;
    }

    static getCssSafeDescendants(el) {
        let css = '';
        if (el.getAttribute('data-testid')) {
            return '[data-testid="' + el.getAttribute('data-testid') + '"]';
        }
        if (el.getAttribute('data-test-id')) {
            return '[data-test-id="' + el.getAttribute('data-test-id') + '"]';
        }
        if (el.id && !this.isDynamicID(el.id)) {
            try { return '#' + CSS.escape(el.id); } catch(e) { return '#' + el.id; }
        }
        if (el.getAttribute('name')) {
            return el.tagName.toLowerCase() + '[name="' + el.getAttribute('name') + '"]';
        }
        
        // Use single reliable classes
        if (el.className && typeof el.className === 'string') {
            const safeClasses = el.className.split(/\\s+/).filter(c => !this.isDynamicID(c) && !c.includes('hover') && !c.includes('active') && !c.includes('focus') && c.length > 2);
            if (safeClasses.length > 0) {
                return el.tagName.toLowerCase() + '.' + safeClasses.slice(0,2).join('.');
            }
        }
        return el.tagName.toLowerCase();
    }

    static getSelectors(el) {
        if (!el) return { css: null };
        let selectors = {
            css: null,
            text: null,
            placeholder: null,
            role: null,
            xpath: null
        };

        // 1. Primary CSS without nth-child
        let targetCss = this.getCssSafeDescendants(el);
        if (el.parentElement && el.tagName.toLowerCase() !== 'body' && el.tagName.toLowerCase() !== 'html') {
            const parentCss = this.getCssSafeDescendants(el.parentElement);
            // Only combine if tag alone is too generic
            if (['div', 'span', 'p'].includes(el.tagName.toLowerCase())) {
                 selectors.css = parentCss + ' > ' + targetCss;
            } else {
                 selectors.css = targetCss;
            }
        } else {
             selectors.css = targetCss;
        }

        // 2. Text Content (Exact)
        let text = el.textContent || el.innerText;
        if (text && text.trim().length > 0 && text.trim().length < 60 && !text.includes('\\n')) {
            selectors.text = text.trim();
        } else if (el.value && typeof el.value === 'string') {
            selectors.text = el.value.trim();
        }

        // 3. Placeholder
        selectors.placeholder = el.getAttribute('placeholder') || null;

        // 4. Role
        let role = el.getAttribute('role');
        if (!role) {
            if (el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && ['submit', 'button'].includes(el.type))) role = 'button';
            if (el.tagName === 'A') role = 'link';
            if (el.tagName === 'INPUT' && el.type === 'checkbox') role = 'checkbox';
        }
        selectors.role = role || null;

        // 5. XPath (Stable fallback)
        try {
            function buildXPath(element) {
                if (element.id && !SmartRecorder.isDynamicID(element.id)) return 'id("' + element.id + '")';
                if (element === document.body) return element.tagName.toLowerCase();
                let idx = 1;
                let siblings = element.parentNode ? element.parentNode.childNodes : [];
                for (let i = 0; i < siblings.length; i++) {
                    let sibling = siblings[i];
                    if (sibling === element) return buildXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + idx + ']';
                    if (sibling.nodeType === 1 && sibling.tagName === element.tagName) idx++;
                }
            }
            selectors.xpath = buildXPath(el);
        } catch(e) {}

        return selectors;
    }
}
window.SmartRecorder = SmartRecorder;
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
        
        var selectors = window.SmartRecorder.getSelectors(el);
        var label = (el.textContent || el.value || el.placeholder || el.getAttribute('aria-label') || el.tagName).trim().substring(0, 60);
        window.__qaRecordedEvents.push({
            type: 'click',
            selector: selectors.css,
            selectors: selectors,
            label: 'Click: ' + label,
            ts: Date.now()
        });
    }, true);
    
    // Track input fills (debounced)
    var _fillTimer = null;
    document.addEventListener('input', function(e) {
        var el = e.target;
        if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
        var selectors = window.SmartRecorder.getSelectors(el);
        var label = (el.placeholder || el.name || el.id || 'Input').substring(0, 40);
        // debounce: update or push
        var events = window.__qaRecordedEvents;
        if (events.length > 0) {
            var last = events[events.length - 1];
            if (last.type === 'fill' && last.selector === selectors.css) {
                last.value = el.value;
                last.ts = Date.now();
                return;
            }
        }
        window.__qaRecordedEvents.push({
            type: 'fill',
            selector: selectors.css,
            selectors: selectors,
            value: el.value,
            label: 'Fill ' + label + ': ' + el.value.substring(0, 30),
            ts: Date.now()
        });
    }, true);
    
    // Track select changes
    document.addEventListener('change', function(e) {
        var el = e.target;
        if (el.tagName !== 'SELECT') return;
        var selectors = window.SmartRecorder.getSelectors(el);
        window.__qaRecordedEvents.push({
            type: 'select',
            selector: selectors.css,
            selectors: selectors,
            value: el.value,
            label: 'Select: ' + el.value,
            ts: Date.now()
        });
    }, true);

    // Floating stop button removed as per requirements
})();
`;

export async function POST(req: NextRequest) {
    try {
        cleanOldSessions();
        const { url } = await req.json();
        if (!url?.trim()) return NextResponse.json({ error: "URL is required" }, { status: 400 });

        const sessionId = generateSessionId();
        const log = createLogger("Recording");
        const { browser, isHeaded } = await launchBrowser("recording");
        log.info("Browser launched", { headed: isHeaded });
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
            viewport: { width: 1600, height: 900 },
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

        // Start CDP Screencast
        const client = await context.newCDPSession(page);
        await client.send('Page.startScreencast', { format: 'jpeg', quality: 60 });
        client.on('Page.screencastFrame', async (payload) => {
            const s = sessionStore.get(sessionId);
            if (s) s.latestScreenshot = payload.data;
            await client.send('Page.screencastFrameAck', { sessionId: payload.sessionId }).catch(()=>{});
        });

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
                        selectors: ev.selectors || {},
                        value: ev.value,
                        url: ev.url,
                    };
                    s.steps.push(step);
                }

                // Screencast is handled via CDP, no need to take blocking screenshots here.
            } catch (_) { }
        }, 400); // 🚀 Faster polling loop for near-instant recording feedback

        // Store interval ref for cleanup
        (session as any).__interval = pollInterval;

        return NextResponse.json({ sessionId, screenshot, message: "Browser launched — interact with it to record steps." });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || "Failed to start session" }, { status: 500 });
    }
}
