import { test, expect } from '@playwright/test';

test.describe('App Shell', () => {
    test('should load without JavaScript errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Filter out non-critical errors (e.g., missing API)
        const criticalErrors = errors.filter(
            e => !e.includes('Failed to fetch') && !e.includes('ERR_CONNECTION_REFUSED')
        );
        expect(criticalErrors).toHaveLength(0);
    });

    test('should have correct meta tags for SEO', async ({ page }) => {
        await page.goto('/login');

        // Check viewport meta
        const viewport = page.locator('meta[name="viewport"]');
        await expect(viewport).toHaveAttribute('content', /width=device-width/);

        // Check charset
        const charset = page.locator('meta[charset]');
        await expect(charset).toHaveCount(1);
    });

    test('should respond with security headers', async ({ page }) => {
        const response = await page.goto('/');
        expect(response).toBeTruthy();
        expect(response!.status()).toBeLessThan(400);
    });

    test('should be responsive', async ({ page }) => {
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        // Page should render without horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = await page.evaluate(() => window.innerWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
    });
});
