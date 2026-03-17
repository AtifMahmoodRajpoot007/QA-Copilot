const { execSync } = require('child_process');

/**
 * Custom Playwright installation script for production environments.
 * Skips installation on Vercel to prevent build failures due to 'apt-get' restrictions.
 */

if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
    console.log('Detected Vercel environment. Skipping Playwright browser installation during build.');
    console.log('To run Playwright on Vercel, please provide a BROWSER_WSE_ENDPOINT in your environment variables.');
    process.exit(0);
}

try {
    console.log('Installing Playwright Chromium browser and local dependencies...');
    // We use PLAYWRIGHT_BROWSERS_PATH=0 to bundle the browser in the node_modules
    // which is safer for many VPS/Docker environments that wipe home cache.
    execSync('npx playwright install chromium --with-deps', { 
        stdio: 'inherit',
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: '0' }
    });
    console.log('Playwright installation successful.');
} catch (error) {
    console.error('Playwright installation failed. This might be normal in some restricted environments.');
    console.error('Error details:', error.message);
    // Exit with 0 anyway to not break the main build process
    process.exit(0);
}
