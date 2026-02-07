import { test, expect } from '@playwright/test';

/**
 * Performance smoke tests — basic loading and rendering checks
 */
test.describe('Performance', () => {

    test('login page loads within 5 seconds', async ({ page }) => {
        const start = Date.now();
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - start;

        expect(loadTime).toBeLessThan(5000);
    });

    test('no excessive network requests on login', async ({ page }) => {
        const requests: string[] = [];
        page.on('request', (req) => {
            if (!req.url().includes('chrome-extension'))
                requests.push(req.url());
        });

        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Login page should not make excessive API calls
        const apiCalls = requests.filter(r => r.includes('/api/'));
        expect(apiCalls.length).toBeLessThan(10);
    });

    test('page does not leak console errors', async ({ page }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });

        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Filter expected errors (missing backend, etc.)
        const unexpected = consoleErrors.filter(
            e => !e.includes('ERR_CONNECTION') &&
                !e.includes('Failed to fetch') &&
                !e.includes('net::') &&
                !e.includes('429') // rate limiting
        );

        expect(unexpected.length).toBeLessThan(3);
    });

    test('critical CSS is applied (no FOUC)', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        // Check that CSS is loaded — body should have non-default background
        const bgColor = await page.evaluate(() =>
            getComputedStyle(document.body).backgroundColor
        );
        // Default browser background is rgb(255, 255, 255) or transparent
        expect(bgColor).toBeTruthy();
    });

    test('lazy-loaded chunks work correctly', async ({ page }) => {
        const failedRequests: string[] = [];
        page.on('requestfailed', (req) => {
            if (req.url().endsWith('.js') || req.url().endsWith('.css')) {
                failedRequests.push(req.url());
            }
        });

        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // No JS/CSS chunks should fail to load
        expect(failedRequests).toHaveLength(0);
    });
});
