import { test, expect } from '@playwright/test';
import { mockApiRoutes, setDevModeAuth, setTheme, setTacticalMode } from './fixtures/mock-api';

/**
 * R4 / FE-7: 視覺回歸基準（Visual Regression Baseline）
 *
 * 背景：R2/R3 完成了全站 77 頁的新設計語言套用；這個 spec 是「凍結」目前外觀
 * 成基準截圖，未來任何 PR 只要動到 shell/token/頁面版型，CI 跑
 * `npx playwright test visual-regression.spec.ts` 就會因像素差異而炸開，
 * 逼你意識到自己動了視覺（見 docs/architecture/DESIGN_LANGUAGE.md）。
 *
 * 涵蓋範圍（13 頁 × 3 態 × 2 尺寸 = 78 張）：
 * - 旗艦五頁：command-center／domains/core/dashboard／intake／geo/map／
 *   emergency/sos（應變工作檯，DESIGN_LANGUAGE §1 雙模式 IA 的「做應變」入口）
 * - 四種 archetype（DESIGN_LANGUAGE §7）各抽 2 頁代表：
 *     List   — /workforce/people（志工）、/logistics/inventory（物資庫存）
 *     Detail — /volunteers/:id（志工詳情）、/knowledge/manuals/:id（手冊詳情）
 *     Board  — /tasks（任務看板）、/rescue/triage/:id（檢傷看板）
 *     Map    — /geo/shelters、/rescue/search-rescue（DESIGN_LANGUAGE §7.4 舉例
 *              的地圖類頁面；/geo/map 已在旗艦五頁中，這裡選另外兩頁避免重複）
 * - 三態：light／dark（ThemeProvider data-theme）／tactical（災時模式，
 *   `data-app-mode="emergency"`，見 useAppMode.ts、tokens.css LAYER 8）
 * - 兩尺寸：desktop 1440×900（DESIGN_LANGUAGE §6 wide 斷點）、
 *   mobile 390×844（≤767 斷點：bottom nav + SOS FAB）
 *
 * 無後端環境：本 repo 這個 worktree 沒有可連的後端/DB，所以：
 * 1. 用 `e2e/fixtures/mock-api.ts` 的 `page.route` 攔截 `**​/api/v1/**`，
 *    回固定 fixture 讓頁面完整渲染（不卡 loading／不因 network error 整頁報錯）。
 * 2. 用 DevMode 認證繞過（`localStorage.devModeUser`，僅 Vite dev server /
 *    `import.meta.env.DEV` 有效，production build 會被 tree-shaking 移除，
 *    見 src/utils/devMode.ts）取代真實登入——這個 repo 目前沒有 E2E 可用的
 *    測試帳號/憑證機制（詳見 role-matrix.spec.ts 檔頭說明），DevMode 是唯一
 *    能讓 ProtectedRoute 顯示真實頁面內容而非登入頁的路徑。
 * 3. 用 `page.clock.install()` 凍結時間，避免頁面上的「更新於 HH:MM:SS」
 *    時間戳與 30 秒自動更新輪詢造成基準圖每次重跑都不同。
 *
 * 已知限制：`/geo/map` 用 `@react-google-maps/api`（真正的 Google Maps JS
 * SDK，不是 DESIGN_LANGUAGE 提到的 maplibre/pmtiles），需要有效的
 * `VITE_GOOGLE_MAPS_API_KEY` 才能載入真實地圖圖磚。這個 worktree 沒有可用
 * 金鑰，所以該頁基準圖裡地圖區塊會是 Google 官方的「This page can't load
 * Google Maps correctly」錯誤疊層——這是可重現的固定狀態，仍可用來抓外層
 * shell/sidebar/toolbar 的版面回歸，但不是「真實地圖」的視覺基準。
 *
 * 首次啟用／重新產生基準：
 *   1. `npm install`（含 @playwright/test、@axe-core/playwright）
 *   2. `npx playwright install chromium`（若尚未裝瀏覽器）
 *   3. `npx playwright test visual-regression.spec.ts --update-snapshots`
 *   4. `git add e2e/visual-regression.spec.ts-snapshots/` 一併 commit 基準圖
 * 之後的 PR 只要跑 `npx playwright test visual-regression.spec.ts`，
 * 有像素差異就會失敗並產生 diff 圖（見 playwright-report/）。
 *
 * 若環境連 `npm run dev` 都起不來（例如完全離線、node_modules 未安裝成功）：
 * 這個 spec 仍會被收進 `npx playwright test --list`，但 `webServer` 啟動
 * 會直接失敗並清楚報錯——不會誤判成「測試通過」。要暫時整批跳過，
 * 在下面 `test.describe` 之前加一行 `test.describe.configure({ mode: 'skip' })`
 * 或對外層 describe 加 `.skip`，並在 PR 說明啟用條件。
 */

interface TargetPage {
    id: string;
    path: string;
    archetype: 'flagship' | 'list' | 'detail' | 'board' | 'map';
    label: string;
}

const PAGES: TargetPage[] = [
    // ── 旗艦五頁 ──────────────────────────────────────────────
    { id: 'command-center', path: '/command-center', archetype: 'flagship', label: '指揮中心／戰情總覽' },
    { id: 'core-dashboard', path: '/domains/core/dashboard', archetype: 'flagship', label: '核心營運儀表板' },
    { id: 'intake', path: '/intake', archetype: 'flagship', label: '災情通報（30 秒通報流）' },
    { id: 'geo-map', path: '/geo/map', archetype: 'flagship', label: '統一地圖' },
    { id: 'emergency-sos', path: '/emergency/sos', archetype: 'flagship', label: '緊急應變工作檯' },

    // ── List archetype × 2 ───────────────────────────────────
    { id: 'workforce-people', path: '/workforce/people', archetype: 'list', label: '志工列表' },
    { id: 'logistics-inventory', path: '/logistics/inventory', archetype: 'list', label: '物資庫存列表' },

    // ── Detail archetype × 2 ─────────────────────────────────
    { id: 'volunteer-detail', path: '/volunteers/demo-1', archetype: 'detail', label: '志工詳情' },
    { id: 'manual-detail', path: '/knowledge/manuals/eq-1', archetype: 'detail', label: '手冊詳情' },

    // ── Board archetype × 2 ──────────────────────────────────
    { id: 'tasks-board', path: '/tasks', archetype: 'board', label: '任務看板' },
    { id: 'triage-board', path: '/rescue/triage/demo-1', archetype: 'board', label: '檢傷分類看板' },

    // ── Map archetype × 2（geo/map 已列旗艦，這裡取另外兩頁）───
    { id: 'geo-shelters', path: '/geo/shelters', archetype: 'map', label: '避難所地圖頁' },
    { id: 'search-rescue', path: '/rescue/search-rescue', archetype: 'map', label: '搜救地圖頁' },
];

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
] as const;

const VISUAL_STATES = [
    { name: 'light', theme: 'light' as const, tactical: false },
    { name: 'dark', theme: 'dark' as const, tactical: false },
    { name: 'tactical', theme: 'dark' as const, tactical: true },
] as const;

// 凍結時間：讓「更新於 HH:MM:SS」「近 7 日趨勢」之類的相對時間文字每次產生一致。
const FROZEN_TIME = new Date('2026-08-01T09:00:00+08:00');

test.describe('R4 視覺回歸基準 (Visual Regression Baseline)', () => {
    for (const target of PAGES) {
        test.describe(`${target.label} [${target.archetype}] — ${target.path}`, () => {
            for (const viewport of VIEWPORTS) {
                for (const state of VISUAL_STATES) {
                    test(`${target.id} · ${state.name} · ${viewport.name}`, async ({ page }) => {
                        await page.clock.install({ time: FROZEN_TIME });
                        await mockApiRoutes(page);
                        await setDevModeAuth(page);
                        await setTheme(page, state.theme);
                        await setTacticalMode(page, state.tactical);
                        await page.setViewportSize({ width: viewport.width, height: viewport.height });

                        await page.goto(target.path);
                        await page.waitForLoadState('domcontentloaded');
                        await page
                            .waitForLoadState('networkidle', { timeout: 15000 })
                            .catch(() => {
                                /* 部分頁面有長輪詢/websocket，networkidle 可能不會觸發 — 用固定等待兜底 */
                            });
                        await page.waitForTimeout(400);

                        await expect(page).toHaveScreenshot(
                            `${target.id}--${state.name}--${viewport.name}.png`,
                            {
                                fullPage: true,
                                animations: 'disabled',
                                maxDiffPixelRatio: 0.02,
                            }
                        );
                    });
                }
            }
        });
    }
});
