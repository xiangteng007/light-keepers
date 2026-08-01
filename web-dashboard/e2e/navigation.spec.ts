import { test, expect } from '@playwright/test';

/**
 * Navigation tests — verify route redirects work correctly
 *
 * R1 / FE-7 IA 收斂：重複入口統一為 canonical 路徑 + redirect
 * （對照 docs/audit/ROUTE_IA_RECONCILIATION.md §4a 與 routes/*.routes.tsx）
 *
 * 受保護路徑的 redirect 鏈可能停在 /login（未登入），因此斷言接受
 * 「canonical 或 login」；公開路徑則必須抵達 canonical。
 */

/** 公開 canonical redirect（不經 auth，必達目標） */
const PUBLIC_REDIRECTS: Array<[string, string]> = [
    ['/geo/map-ops', '/geo/map'],
    ['/geo/tactical-map', '/geo/map'],
    ['/geo/alerts', '/hub/geo-alerts'],
    ['/geo/weather', '/hub/weather'],
    ['/mental-health', '/community/mental-health'],
];

/** 受保護 canonical redirect（未登入時允許停在 /login） */
const PROTECTED_REDIRECTS: Array<[string, string]> = [
    ['/dashboard', '/command-center'],
    ['/report', '/intake'],
    ['/notifications', '/hub/notifications'],
    ['/reports', '/analytics/reports'],
    ['/reports/admin', '/analytics/reports'],
    ['/analytics', '/hub/analytics'],
    ['/volunteers', '/workforce/people'],
    ['/workforce/mobilization', '/workforce/people'],
    ['/leaderboard', '/workforce/performance'],
    ['/resources', '/logistics/inventory'],
    ['/donations', '/logistics/donations'],
    ['/permissions', '/governance/iam'],
    ['/admin/audit-logs', '/governance/audit'],
    ['/audit', '/governance/audit'],
    ['/reunification', '/rescue/reunification'],
    ['/rescue/shelters', '/geo/shelters'],
    ['/logistics/approvals', '/approvals'],
    ['/domains/community/center', '/community/hub'],
    ['/command/ic', '/ics'],
];

test.describe('Route Redirects (R1 IA convergence)', () => {

    test('root "/" redirects authenticated to /command-center', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        // Either redirects to login (unauthenticated) or command-center (authenticated)
        const url = page.url();
        const isValid = url.includes('login') || url.includes('command-center');
        expect(isValid).toBeTruthy();
    });

    for (const [from, to] of PUBLIC_REDIRECTS) {
        test(`${from} redirects to ${to}`, async ({ page }) => {
            await page.goto(from);
            await page.waitForLoadState('domcontentloaded');

            expect(page.url()).toContain(to);
        });
    }

    for (const [from, to] of PROTECTED_REDIRECTS) {
        test(`${from} redirects to ${to} (or login when unauthenticated)`, async ({ page }) => {
            await page.goto(from);
            await page.waitForLoadState('domcontentloaded');

            const url = page.url();
            const isValid = url.includes('login') || url.includes(to);
            expect(isValid).toBeTruthy();
        });
    }

    test('/manuals/:id redirects to /knowledge/manuals/:id preserving the param', async ({ page }) => {
        await page.goto('/manuals/demo-123');
        await page.waitForLoadState('domcontentloaded');

        const url = page.url();
        const isValid = url.includes('login') || url.includes('/knowledge/manuals/demo-123');
        expect(isValid).toBeTruthy();
    });
});

test.describe('Placeholder shells (建置中)', () => {
    // 假 widget 空殼路由改掛「頁面建置中」placeholder；未登入時會先被導向 login，
    // 這裡只驗證路由存在且不產生空白畫面
    for (const path of ['/resource-matching', '/ai-summary', '/drills', '/accounts', '/tenants', '/settings', '/features']) {
        test(`${path} responds (placeholder or login)`, async ({ page }) => {
            await page.goto(path);
            await page.waitForLoadState('domcontentloaded');

            const body = page.locator('body');
            await expect(body).not.toBeEmpty();
        });
    }
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
