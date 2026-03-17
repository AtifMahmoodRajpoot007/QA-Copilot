import { test, chromium, expect } from '@playwright/test';

test('auth flow with stable selectors', async () => {
    // 1. Linux headless execution flags
    const browser = await chromium.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        ]
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://social-experience.rtdemolab.com/auth', { waitUntil: 'domcontentloaded' });

    // 2. Click "Continue with email" using exact text/role instead of fragile DOM paths
    const continueBtn = page.getByRole('button', { name: /continue with email/i });
    await continueBtn.waitFor({ state: 'visible', timeout: 10000 });
    await continueBtn.click();

    // 3. Select the input field via its Placeholder or semantic Role, wait for it, and use .fill()
    const emailInput = page.getByPlaceholder(/example@email\.com/i).first(); 
    // Alt: const emailInput = page.getByRole('textbox', { name: /email/i });
    
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('example@email.com'); // Automatically waits for actionability, replaces clicking

    await browser.close();
});
