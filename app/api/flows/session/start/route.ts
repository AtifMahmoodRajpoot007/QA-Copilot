import { NextRequest, NextResponse } from "next/server";
import { launchBrowser } from "@/lib/browserLauncher";
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

    // --- Injected Stop Button ---
    function injectStopButton() {
        if (document.getElementById('__qa_stop_container')) return;
        if (!document.body) {
            setTimeout(injectStopButton, 50);
            return;
        }

        const container = document.createElement('div');
        container.id = '__qa_stop_container';
        container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; display: flex; align-items: center; gap: 14px; font-family: system-ui, -apple-system, sans-serif; pointer-events: none; opacity: 0; transform: translateX(20px); transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);';
        
        const stopBtn = document.createElement('button');
        stopBtn.id = '__qa_stop_btn';
        stopBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2" ry="2"></rect></svg>';
        stopBtn.style.cssText = 'width: 56px; height: 56px; border-radius: 50%; background: #ef4444; border: 3px solid white; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); pointer-events: auto; padding: 0; outline: none; margin: 0; position: relative;';
        
        const tooltip = document.createElement('div');
        tooltip.innerText = 'Click to stop';
        tooltip.style.cssText = 'background: #1e293b; color: white; padding: 10px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); opacity: 0; transform: translateX(10px); transition: all 0.3s ease; pointer-events: none; white-space: nowrap; position: relative; display: flex; align-items: center;';
        
        // Tooltip arrow
        const arrow = document.createElement('div');
        arrow.style.cssText = 'position: absolute; right: -6px; top: 50%; transform: translateY(-50%); width: 12px; height: 12px; background: #1e293b; rotate: 45deg; border-radius: 2px;';
        tooltip.appendChild(arrow);
        
        // Tooltip first, then button to keep it on the left
        container.appendChild(tooltip);
        container.appendChild(stopBtn);
        
        document.body.appendChild(container);

        // Slide in animation
        requestAnimationFrame(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateX(0)';
        });

        // Initial tooltip display for 2 seconds - ONLY IF NOT ALREADY SHOWN IN THIS SESSION
        let hideTimeout;
        const alreadyShown = sessionStorage.getItem('__qa_tooltip_shown');
        
        if (!alreadyShown) {
            setTimeout(() => {
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateX(0)';
                sessionStorage.setItem('__qa_tooltip_shown', 'true');
                hideTimeout = setTimeout(() => {
                    tooltip.style.opacity = '0';
                    tooltip.style.transform = 'translateX(10px)';
                }, 2000);
            }, 600);
        }
        
        stopBtn.addEventListener('mouseenter', () => {
            clearTimeout(hideTimeout);
            stopBtn.style.transform = 'scale(1.1) rotate(90deg)';
            stopBtn.style.background = '#dc2626';
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateX(0)';
        });
        
        stopBtn.addEventListener('mouseleave', () => {
            stopBtn.style.transform = 'scale(1) rotate(0deg)';
            stopBtn.style.background = '#ef4444';
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateX(10px)';
        });
        
        stopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            stopBtn.style.transform = 'scale(0.9)';
            if (window.__qaStopRecordingSession) {
                window.__qaStopRecordingSession();
                stopBtn.style.background = '#991b1b';
                tooltip.innerText = 'Stopping...';
                tooltip.style.opacity = '1';
                tooltip.style.transform = 'translateX(0)';
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
        const { browser, isHeaded } = await launchBrowser("recording");
        console.log(`[Recording] Browser launched (headed: ${isHeaded})`);
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
                        selectors: ev.selectors || {},
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
