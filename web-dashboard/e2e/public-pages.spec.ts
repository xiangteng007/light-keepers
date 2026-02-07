import { test, expect } from '@playwright/test';

/**
 * Public pages — accessible without authentication
 * Covers: login, forgot-password, showcase, intake, mental-health,
 *         manuals, geo (map/alerts/weather/shelters), hub public pages
 */
test.describe('Public Pages', () => {

    test('login page renders correctly', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        // Should have at least one interactive element
        const buttons = page.locator('button');
        await expect(buttons.first()).toBeVisible();
    });

    test('forgot-password page renders', async ({ page }) => {
        await page.goto('/forgot-password');
        await page.waitForLoadState('domcontentloaded');

        // Should show a form or content
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('showcase page renders without errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        await page.goto('/showcase');
        await page.waitForLoadState('domcontentloaded');

        const criticalErrors = errors.filter(
            e => !e.includes('Failed to fetch') && !e.includes('ERR_CONNECTION')
        );
        expect(criticalErrors).toHaveLength(0);
    });

    test('intake / report page renders', async ({ page }) => {
        await page.goto('/intake');
        await page.waitForLoadState('domcontentloaded');

        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('manuals page renders', async ({ page }) => {
        await page.goto('/knowledge/manuals');
        await page.waitForLoadState('domcontentloaded');

        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('mental health page renders', async ({ page }) => {
        await page.goto('/mental-health');
        await page.waitForLoadState('domcontentloaded');

        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });
});

test.describe('Geo Pages (Public)', () => {

    test('geo/map page loads', async ({ page }) => {
        await page.goto('/geo/map');
        await page.waitForLoadState('domcontentloaded');
        // Map page should exist (even if Google Maps API is unavailable)
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('geo/alerts page loads', async ({ page }) => {
        await page.goto('/geo/alerts');
        await page.waitForLoadState('domcontentloaded');
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('geo/weather page loads', async ({ page }) => {
        await page.goto('/geo/weather');
        await page.waitForLoadState('domcontentloaded');
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('geo/shelters page loads', async ({ page }) => {
        await page.goto('/geo/shelters');
        await page.waitForLoadState('domcontentloaded');
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });
});

test.describe('Hub Public Pages', () => {

    test('hub/geo-alerts page loads', async ({ page }) => {
        await page.goto('/hub/geo-alerts');
        await page.waitForLoadState('domcontentloaded');
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('hub/weather page loads', async ({ page }) => {
        await page.goto('/hub/weather');
        await page.waitForLoadState('domcontentloaded');
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('hub/offline page loads', async ({ page }) => {
        await page.goto('/hub/offline');
        await page.waitForLoadState('domcontentloaded');
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });
});
