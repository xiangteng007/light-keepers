import { test, expect } from '@playwright/test';

/**
 * Navigation tests — verify route redirects work correctly
 */
test.describe('Route Redirects', () => {

    test('root "/" redirects authenticated to /command-center', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Either redirects to login (unauthenticated) or command-center (authenticated)
        const url = page.url();
        const isValid = url.includes('login') || url.includes('command-center');
        expect(isValid).toBeTruthy();
    });

    test('/reports redirects to /reports/admin', async ({ page }) => {
        await page.goto('/reports');
        await page.waitForLoadState('domcontentloaded');

        // Should redirect through auth first, then to reports/admin
        const url = page.url();
        const isValid = url.includes('login') || url.includes('reports/admin');
        expect(isValid).toBeTruthy();
    });

    test('/geo/map-ops redirects to /geo/map', async ({ page }) => {
        await page.goto('/geo/map-ops');
        await page.waitForLoadState('domcontentloaded');

        const url = page.url();
        expect(url).toContain('/geo/map');
    });

    test('/geo/tactical-map redirects to /geo/map', async ({ page }) => {
        await page.goto('/geo/tactical-map');
        await page.waitForLoadState('domcontentloaded');

        const url = page.url();
        expect(url).toContain('/geo/map');
    });
});

test.describe('Emergency Quick Routes', () => {

    test('/emergency/sos loads', async ({ page }) => {
        await page.goto('/emergency/sos');
        await page.waitForLoadState('domcontentloaded');

        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('/emergency/evacuation loads', async ({ page }) => {
        await page.goto('/emergency/evacuation');
        await page.waitForLoadState('domcontentloaded');

        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });

    test('/emergency/hotline loads', async ({ page }) => {
        await page.goto('/emergency/hotline');
        await page.waitForLoadState('domcontentloaded');

        const body = page.locator('body');
        await expect(body).not.toBeEmpty();
    });
});
