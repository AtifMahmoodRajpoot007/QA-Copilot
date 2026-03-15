/**
 * lib/browserOverlay.ts
 * Utilities for injecting visual feedback into the browser during automation.
 */

import { Page } from "playwright";

/**
 * Injects a Picture-in-Picture (PIP) overlay into the page.
 */
export async function injectPIPOverlay(page: Page, mode: "run" | "record", title: string) {
    await page.evaluate(({ mode, title }) => {
        if (document.getElementById('qa-pip-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'qa-pip-overlay';
        Object.assign(overlay.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '240px',
            padding: '12px',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '13px',
            zIndex: '2147483647',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none',
            transition: 'all 0.3s ease'
        });

        const header = document.createElement('div');
        header.innerHTML = `<span style="color: ${mode === 'run' ? '#10b981' : '#ef4444'}; font-weight: bold; margin-right: 6px;">●</span> ${mode === 'run' ? 'EXECUTING TEST' : 'RECORDING'}`;
        header.style.fontSize = '10px';
        header.style.textTransform = 'uppercase';
        header.style.letterSpacing = '0.05em';
        header.style.marginBottom = '8px';
        header.style.opacity = '0.7';

        const content = document.createElement('div');
        content.id = 'qa-pip-content';
        content.innerText = title;
        content.style.fontWeight = '600';
        content.style.lineHeight = '1.4';

        overlay.appendChild(header);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
    }, { mode, title });
}

/**
 * Updates the text in the PIP overlay.
 */
export async function updatePIPOverlay(page: Page, content: string, status?: string) {
    await page.evaluate(({ content, status }) => {
        const contentEl = document.getElementById('qa-pip-content');
        if (contentEl) {
            contentEl.innerText = content;
        }
    }, { content, status });
}

/**
 * Injects a click highlighter script that shows ripples on click.
 */
export async function injectClickHighlighter(page: Page) {
    await page.evaluate(() => {
        if ((window as any).__qaHighlighterInjected) return;
        (window as any).__qaHighlighterInjected = true;

        const style = document.createElement('style');
        style.innerHTML = `
            .qa-click-ripple {
                position: fixed;
                width: 40px;
                height: 40px;
                background: rgba(239, 68, 68, 0.4);
                border: 2px solid #ef4444;
                border-radius: 50%;
                pointer-events: none;
                z-index: 2147483647;
                transform: translate(-50%, -50%) scale(0);
                animation: qa-ripple 0.6s ease-out;
            }
            @keyframes qa-ripple {
                to { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
            }
            .qa-element-highlight {
                outline: 3px solid #10b981 !important;
                outline-offset: 3px !important;
                box-shadow: 0 0 15px rgba(16, 185, 129, 0.5) !important;
                transition: outline 0.2s ease;
            }
        `;
        document.head.appendChild(style);

        (window as any).showClickRipple = (x: number, y: number) => {
            const ripple = document.createElement('div');
            ripple.className = 'qa-click-ripple';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            document.body.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        };
    });
}

/**
 * Highlights a specific element by selector.
 */
export async function highlightElement(page: Page, selector: string) {
    await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
            el.classList.add('qa-element-highlight');
            setTimeout(() => el.classList.remove('qa-element-highlight'), 1500);
            
            const rect = el.getBoundingClientRect();
            if ((window as any).showClickRipple) {
                (window as any).showClickRipple(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
        }
    }, selector).catch(() => {});
}

/**
 * Attempts to bring the browser window to the foreground.
 */
export async function forceFocus(page: Page) {
    try {
        await page.bringToFront();
    } catch (_) {}
}
