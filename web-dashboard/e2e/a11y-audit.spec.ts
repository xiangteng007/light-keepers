import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockApiRoutes, setDevModeAuth, setTheme, setTacticalMode } from './fixtures/mock-api';

/**
 * R4 / FE-7: a11y (WCAG 2.1 AA) 掃描
 *
 * 對 visual-regression.spec.ts 涵蓋的同一組 13 頁 × 3 態（light/dark/tactical）
 * 跑 axe-core 掃描（`wcag2a`/`wcag2aa`/`wcag21aa` 規則集，對應
 * DESIGN_LANGUAGE.md §8 「對比 ≥4.5:1／大字 ≥3:1／焦點可見／狀態不得只用顏色」）。
 *
 * 兩個用途：
 * 1. 防復發 gate：每個 case 斷言 impact = critical/serious 的違規數為 0——
 *    這批已在 R4 全部修掉（見 docs/audit/A11Y_AUDIT_R4.md），這裡鎖住不再回歸。
 * 2. 完整稽核輸出：每個 case 用 `testInfo.attach()` 附上完整 axe 結果
 *    （含 moderate/minor），供 `docs/audit/A11Y_AUDIT_R4.md` 產生／更新報告用
 *    （見該檔案頂部的重產步驟）。moderate/minor 不在此 gate 範圍內，是待辦。
 *
 * Mock/認證/凍結時間機制與 visual-regression.spec.ts 相同，見該檔案與
 * `e2e/fixtures/mock-api.ts` 的說明（DevMode 認證繞過、API route mock、
 * page.clock 凍結時間）。
 *
 * 掃描視窗固定 desktop（1440×900）——對比度/ARIA/landmark 類規則與視窗尺寸
 * 無關；行動端專屬的觸控目標尺寸（≥44px，DESIGN_LANGUAGE §6）axe 沒有對應
 * 規則，留待人工/E2E 走查（app-shell.spec.ts 等）覆蓋。
 */

interface TargetPage {
    id: string;
    path: string;
    label: string;
}

const PAGES: TargetPage[] = [
    { id: 'command-center', path: '/command-center', label: '指揮中心／戰情總覽' },
    { id: 'core-dashboard', path: '/domains/core/dashboard', label: '核心營運儀表板' },
    { id: 'intake', path: '/intake', label: '災情通報（30 秒通報流）' },
    { id: 'geo-map', path: '/geo/map', label: '統一地圖' },
    { id: 'emergency-sos', path: '/emergency/sos', label: '緊急應變工作檯' },
    { id: 'workforce-people', path: '/workforce/people', label: '志工列表' },
    { id: 'logistics-inventory', path: '/logistics/inventory', label: '物資庫存列表' },
    { id: 'volunteer-detail', path: '/volunteers/demo-1', label: '志工詳情' },
    { id: 'manual-detail', path: '/knowledge/manuals/eq-1', label: '手冊詳情' },
    { id: 'tasks-board', path: '/tasks', label: '任務看板' },
    { id: 'triage-board', path: '/rescue/triage/demo-1', label: '檢傷分類看板' },
    { id: 'geo-shelters', path: '/geo/shelters', label: '避難所地圖頁' },
    { id: 'search-rescue', path: '/rescue/search-rescue', label: '搜救地圖頁' },
];

const VISUAL_STATES = [
    { name: 'light', theme: 'light' as const, tactical: false },
    { name: 'dark', theme: 'dark' as const, tactical: false },
    { name: 'tactical', theme: 'dark' as const, tactical: true },
] as const;

const FROZEN_TIME = new Date('2026-08-01T09:00:00+08:00');
const GATE_IMPACTS = new Set(['critical', 'serious']);

test.describe('R4 a11y 掃描 (WCAG 2.1 AA)', () => {
    for (const target of PAGES) {
        for (const state of VISUAL_STATES) {
            test(`${target.label} [${target.id}] · ${state.name}`, async ({ page }, testInfo) => {
                await page.clock.install({ time: FROZEN_TIME });
                await mockApiRoutes(page);
                await setDevModeAuth(page);
                await setTheme(page, state.theme);
                await setTacticalMode(page, state.tactical);
                await page.setViewportSize({ width: 1440, height: 900 });

                await page.goto(target.path);
                await page.waitForLoadState('domcontentloaded');
                await page
                    .waitForLoadState('networkidle', { timeout: 15000 })
                    .catch(() => {});
                await page.waitForTimeout(400);

                const results = await new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
                    .analyze();

                await testInfo.attach(`axe-${target.id}-${state.name}.json`, {
                    body: JSON.stringify(
                        {
                            page: target.id,
                            path: target.path,
                            state: state.name,
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
                                `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} 元素) — ${v.helpUrl}`
                        )
                        .join('\n')
                ).toEqual([]);
            });
        }
    }
});
