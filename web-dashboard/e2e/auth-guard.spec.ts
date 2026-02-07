import { test, expect } from '@playwright/test';

/**
 * Auth Guard tests — protected routes should redirect unauthenticated users to /login
 */
test.describe('Auth Guards', () => {
    // Level 1 protected routes
    const level1Routes = [
        '/dashboard',
        '/command-center',
        '/events',
        '/training',
        '/notifications',
        '/activities',
        '/leaderboard',
        '/community',
        '/incidents',
    ];

    // Level 2+ protected routes
    const level2Routes = [
        '/tasks',
        '/volunteers',
        '/resources',
        '/approvals',
        '/reports/admin',
    ];

    // Level 3+ protected routes
    const level3Routes = [
        '/reports/export',
        '/analytics',
        '/governance/iam',
        '/governance/audit',
    ];

    for (const route of level1Routes) {
        test(`${route} redirects to login when unauthenticated`, async ({ page }) => {
            await page.goto(route);
            await page.waitForLoadState('domcontentloaded');

            // Should redirect to login or show login content
            const url = page.url();
            const hasLogin = url.includes('login') || url.includes('auth');
            const loginForm = page.locator('[class*="login"], [class*="Login"], form');
            const loginVisible = await loginForm.count() > 0;

            expect(hasLogin || loginVisible).toBeTruthy();
        });
    }

    for (const route of level2Routes) {
        test(`${route} requires auth`, async ({ page }) => {
            await page.goto(route);
            await page.waitForLoadState('domcontentloaded');

            const url = page.url();
            expect(url).toContain('login');
        });
    }

    for (const route of level3Routes) {
        test(`${route} requires elevated auth`, async ({ page }) => {
            await page.goto(route);
            await page.waitForLoadState('domcontentloaded');

            const url = page.url();
            expect(url).toContain('login');
        });
    }
});
