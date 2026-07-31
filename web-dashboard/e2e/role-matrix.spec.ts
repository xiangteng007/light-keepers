import { test, expect } from '@playwright/test';

/**
 * FE-5: Role Matrix Smoke (L1 / L3 / L5)
 *
 * Intent: for each of L1 (VOLUNTEER), L3 (DIRECTOR), and L5 (OWNER), verify
 * the end-to-end shape of "log in as that role -> role-appropriate sidebar
 * items appear -> a page gated at that role's level loads without a 403".
 *
 * Why these are skipped:
 * This repo's e2e suite (see login.spec.ts, auth-guard.spec.ts) only ever
 * exercises the *unauthenticated* path — every existing spec either checks
 * the OAuth button markup or asserts an anonymous redirect to /login. There
 * is no working credential path for automated login:
 *   - LoginPage.tsx (src/pages/LoginPage.tsx) only offers Google/LINE OAuth
 *     buttons (see handleGoogleLogin/handleLineLogin) — no email+password
 *     form Playwright can fill in, and driving a real OAuth consent screen
 *     from CI is both unreliable and out of scope for a smoke test.
 *   - The only auth bypass in the app is the client-side `devModeUser`
 *     localStorage flag (src/context/AuthContext.tsx, DEV_USER), but it is
 *     hard-coded to a single fixed Level 5 (系統擁有者/OWNER) identity — it
 *     cannot mint an L1 or L3 session, so it cannot cover this matrix.
 *   - There is no seeded test-account fixture (no E2E_TEST_* credentials in
 *     .env.example, no backend "mint a session for role X" endpoint, and no
 *     Playwright storageState fixtures checked in).
 *
 * To unskip these tests, one of the following fixtures needs to exist:
 *   1. Backend test-only endpoint (guarded by NODE_ENV=test or similar)
 *      that issues a valid accessToken + refresh cookie for a given role
 *      level, taking e.g. E2E_LOGIN_ENDPOINT + a shared test secret; the
 *      test would POST to it, seed the returned token into localStorage
 *      (`accessToken`) before navigating, then reload.
 *   2. Three seeded real accounts (one per level) with real credentials
 *      exposed via env vars (E2E_L1_EMAIL/E2E_L1_PASSWORD, ...L3..., ...L5)
 *      plus a working password-based login form to drive.
 *   3. Extending the existing devModeUser bypass to accept a role level,
 *      e.g. `localStorage.setItem('devModeUser', 'true')` +
 *      `localStorage.setItem('devModeRoleLevel', '1')`, read by
 *      AuthContext's DEV_USER construction — this is the lowest-effort
 *      option but touches business code (AuthContext.tsx), which is out of
 *      scope for this test-only change.
 *
 * Once a fixture lands, replace `loginAs()` below with the real mechanism
 * and remove `.skip` from each case.
 */

// Pages gated at each level per src/config/page-policy.ts (ROLE_LEVELS).
const ROLE_MATRIX = [
    {
        level: 1,
        name: 'VOLUNTEER (L1)',
        landingPage: '/dashboard',
        // Sidebar items expected to be visible at this level (indicative —
        // confirm against src/components/layout/useSidebarConfig.ts once
        // this test is unskipped, sidebar labels may have since changed).
        expectedSidebarItem: '任務' /* Tasks/Events, requiredLevel: VOLUNTEER */,
    },
    {
        level: 3,
        name: 'DIRECTOR (L3)',
        landingPage: '/analytics',
        expectedSidebarItem: '分析' /* Analytics, requiredLevel: DIRECTOR */,
    },
    {
        level: 5,
        name: 'OWNER (L5)',
        landingPage: '/governance/iam',
        expectedSidebarItem: '治理' /* Governance/IAM, requiredLevel: OWNER */,
    },
];

/**
 * Placeholder login helper — intentionally unimplemented. See file header
 * for why: no working credential fixture exists yet in this repo.
 */
async function loginAs(_level: number): Promise<void> {
    throw new Error(
        'loginAs() has no fixture yet — see role-matrix.spec.ts header for what is needed before unskipping.'
    );
}

test.describe('Role Matrix Smoke (L1 / L3 / L5)', () => {
    for (const role of ROLE_MATRIX) {
        test.skip(
            `${role.name}: login -> sidebar shows role item -> ${role.landingPage} loads without 403`,
            async ({ page }) => {
                await loginAs(role.level);
                await page.goto(role.landingPage);
                await page.waitForLoadState('domcontentloaded');

                // 1. Role-appropriate sidebar item is visible.
                await expect(
                    page.locator('.sidebar, .v3-nav-item').filter({ hasText: role.expectedSidebarItem })
                ).toBeVisible();

                // 2. The gated page rendered its own content, not the
                // ProtectedRoute inline 403 ("access-denied") panel.
                await expect(page.locator('.access-denied')).toHaveCount(0);
                const url = page.url();
                expect(url).not.toContain('/login');
            }
        );
    }
});
