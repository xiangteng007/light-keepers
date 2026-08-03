import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * R5 / T6-T4: axe AA 全站掃描（WCAG 2.1 AA）
 *
 * 與 R4 的 a11y-audit.spec.ts（mock API + DevMode 認證）不同，這份 spec 走
 * 「真 dev 棧」：vite localhost:5173 + backend localhost:3100，用真帳號
 * 換 accessToken 塞 localStorage（key 見 src/api/client.ts TOKEN_KEY）。
 *
 * 啟用條件：需要 LK_E2E_TOKEN 環境變數（登入 throttle 5 次/分鐘，
 * 見 backend/src/modules/auth/auth.controller.ts @Throttle，所以 token
 * 由外部先換好傳入，不在測試裡逐 worker 登入）：
 *
 *   TOKEN=$(curl -s -X POST http://localhost:3100/api/v1/auth/login \
 *     -H 'Content-Type: application/json' \
 *     -d '{"email":"owner-preview@lightkeepers.local","password":"Preview!0802"}' | jq -r .accessToken)
 *   LK_E2E_TOKEN=$TOKEN npx playwright test r5-a11y.spec.ts
 *
 * 未設 LK_E2E_TOKEN 時整批 skip（不誤判成通過，也不在無後端環境炸開）。
 *
 * Gate 規則與 R4 相同：critical / serious 違規數必須為 0；
 * moderate / minor 完整附在 testInfo.attach 的 JSON 供稽核，不擋 gate。
 */

const TOKEN = process.env.LK_E2E_TOKEN ?? '';

interface Target {
    id: string;
    path: string;
    label: string;
    mode: 'normal' | 'emergency';
    /** 公開頁（/login）不塞 token，否則會被導回首頁 */
    isPublic?: boolean;
}

const TARGETS: Target[] = [
    { id: 'login', path: '/login', label: '登入頁', mode: 'normal', isPublic: true },
    { id: 'command-center', path: '/command-center', label: '指揮中心（平時）', mode: 'normal' },
    { id: 'intake', path: '/intake', label: '災情通報', mode: 'normal' },
    { id: 'rescue-triage', path: '/rescue/triage', label: '檢傷分類', mode: 'normal' },
    { id: 'geo-map', path: '/geo/map', label: '統一地圖', mode: 'normal' },
    { id: 'tasks', path: '/tasks', label: '任務看板', mode: 'normal' },
    { id: 'events', path: '/events', label: '事件列表', mode: 'normal' },
    { id: 'hub-analytics', path: '/hub/analytics', label: '數據分析', mode: 'normal' },
    { id: 'command-center-emergency', path: '/command-center', label: '指揮中心（災時）', mode: 'emergency' },
];

const GATE_IMPACTS = new Set(['critical', 'serious']);

test.describe('R5 axe AA 全站掃描（真 dev 棧）', () => {
    test.skip(!TOKEN, '需要 LK_E2E_TOKEN（見檔頭說明）');

    for (const target of TARGETS) {
        test(`${target.label} [${target.id}]`, async ({ page }, testInfo) => {
            if (!target.isPublic) {
                await page.addInitScript((token) => {
                    window.localStorage.setItem('accessToken', token);
                    window.localStorage.setItem('rememberMe', 'true');
                }, TOKEN);
            }
            await page.addInitScript((mode) => {
                if (mode === 'emergency') {
                    window.localStorage.setItem('lk-app-mode-override', 'emergency');
                } else {
                    window.localStorage.removeItem('lk-app-mode-override');
                }
            }, target.mode);

            await page.setViewportSize({ width: 1440, height: 900 });
            await page.goto(target.path);
            await page.waitForLoadState('domcontentloaded');
            await page
                .waitForLoadState('networkidle', { timeout: 15000 })
                .catch(() => {
                    /* websocket/長輪詢頁面 networkidle 可能不觸發，用固定等待兜底 */
                });
            await page.waitForTimeout(600);

            const results = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
                .analyze();

            await testInfo.attach(`axe-r5-${target.id}.json`, {
                body: JSON.stringify(
                    {
                        page: target.id,
                        path: target.path,
                        mode: target.mode,
                        violations: results.violations,
                    },
                    null,
                    2
                ),
                contentType: 'application/json',
            });

            const gateViolations = results.violations.filter((v) =>
                GATE_IMPACTS.has(v.impact ?? 'unknown')
            );

            expect(
                gateViolations,
                gateViolations
                    .map(
                        (v) =>
                            `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} 元素)\n` +
                            v.nodes
                                .slice(0, 5)
                                .map((n) => `    ${n.target.join(' ')} — ${n.failureSummary?.split('\n')[0] ?? ''}`)
                                .join('\n') +
                            `\n    ${v.helpUrl}`
                    )
                    .join('\n')
            ).toEqual([]);
        });
    }
});
