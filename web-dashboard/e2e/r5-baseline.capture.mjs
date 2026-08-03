/**
 * R5 / T6-T4: 截圖基準重產腳本（真 dev 棧）
 *
 * 對 r5-a11y.spec.ts 同一組 8 條主要路由，產出
 * 3 寬（360 / 768 / 1440）× 2 模式（平時 normal / 災時 emergency）＝ 48 張
 * fullPage 截圖到 e2e/__screenshots__/r5-baseline/。
 *
 * 與 R4 的 visual-regression.spec.ts（mock API＋toHaveScreenshot 像素 gate）
 * 定位不同：這裡走真 backend（localhost:3100）＋真登入，資料非確定性，
 * 所以不做像素斷言，只產「參考基準」供人工比對／設計走查。
 * R4 的像素 gate 基準仍在 e2e/visual-regression.spec.ts-snapshots/。
 *
 * 用法（dev 棧需已起：vite 5173＋backend 3100）：
 *   TOKEN=$(curl -s -X POST http://localhost:3100/api/v1/auth/login \
 *     -H 'Content-Type: application/json' \
 *     -d '{"email":"owner-preview@lightkeepers.local","password":"Preview!0802"}' | jq -r .accessToken)
 *   LK_E2E_TOKEN=$TOKEN node e2e/r5-baseline.capture.mjs
 */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.LK_E2E_TOKEN ?? '';
if (!TOKEN) {
    console.error('需要 LK_E2E_TOKEN（見檔頭說明）');
    process.exit(1);
}

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '__screenshots__', 'r5-baseline');

const PAGES = [
    { id: 'login', path: '/login', isPublic: true },
    { id: 'command-center', path: '/command-center' },
    { id: 'intake', path: '/intake' },
    { id: 'rescue-triage', path: '/rescue/triage' },
    { id: 'geo-map', path: '/geo/map', extraWait: 2500 },
    { id: 'tasks', path: '/tasks' },
    { id: 'events', path: '/events' },
    { id: 'hub-analytics', path: '/hub/analytics' },
];

const WIDTHS = [
    { width: 360, height: 740 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
];

const MODES = ['normal', 'emergency'];

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
let count = 0;
for (const target of PAGES) {
    for (const mode of MODES) {
        for (const vp of WIDTHS) {
            const ctx = await browser.newContext({
                viewport: { width: vp.width, height: vp.height },
                reducedMotion: 'reduce',
            });
            const page = await ctx.newPage();
            if (!target.isPublic) {
                await page.addInitScript((token) => {
                    window.localStorage.setItem('accessToken', token);
                    window.localStorage.setItem('rememberMe', 'true');
                }, TOKEN);
            }
            await page.addInitScript((m) => {
                if (m === 'emergency') window.localStorage.setItem('lk-app-mode-override', 'emergency');
                else window.localStorage.removeItem('lk-app-mode-override');
            }, mode);

            await page.goto(`${BASE_URL}${target.path}`);
            await page.waitForLoadState('domcontentloaded');
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(600 + (target.extraWait ?? 0));

            const file = path.join(OUT_DIR, `${target.id}--${mode}--w${vp.width}.png`);
            await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
            count += 1;
            console.log(`[${String(count).padStart(2)}/48] ${path.basename(file)}`);
            await ctx.close();
        }
    }
}
await browser.close();
console.log(`done: ${count} 張 → ${OUT_DIR}`);
