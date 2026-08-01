/**
 * R4 / FE-7: 硬編 hex 色防復發 gate
 *
 * 背景：R2/R3 把可達頁面的硬編色（~350 處）換成語義 token
 * （見 docs/architecture/DESIGN_LANGUAGE.md、docs/FULL_SYSTEM_REDESIGN_PLAN.md
 * 執行進度表 Phase 2 「2.5 首批 20 頁換皮」與 Phase R「R3 全站批次套用」）。
 * 這個測試是防止「新頁/新 diff 又寫回硬編 hex」的靜態守護，不是重跑一次換皮。
 *
 * 規則：
 * 1. 掃描 `src/pages/**​/*.css`（含 CSS module）。
 * 2. 允許 `var(--token-name, #hex)` fallback 寫法——這是「以 token 為主、
 *    hex 僅作未定義時的安全退回值」，語意上不是硬編色。
 * 3. 允許 CSS 註解內的 hex（歷史記錄/說明用途，不生效於樣式）。
 * 4. 扣除以上兩者後，若檔案仍有「裸」hex（不經 var() 包裝），該檔案必須出現在
 *    下方白名單，且白名單條目要附理由——理由只能是：
 *      a) 品牌/裝飾色，已在檔案內以行內註解逐一標明「非語義 token / 保留字面值」
 *         （例：LoginPage.css 的 LINE 官方綠、LeaderboardPage.css 的獎牌漸層色）
 *      b) 孤兒／未接線頁面——不在任何路由的實際渲染路徑上（含被 placeholder
 *         路由蓋掉、或完全未被任何 route/LazyPages 匯入），處置待
 *         `docs/audit/PAGE_REMOVAL_PROPOSAL.md` owner 圈選；一旦該頁面被接上
 *         真實路由或內容，須移出白名單並換色。
 * 5. 白名單以外的裸 hex＝測試失敗，列出檔案＋行號＋色碼，要求改用語義 token
 *    （對照 `docs/architecture/DESIGN_LANGUAGE.md` §3、§8）。
 *
 * 新增頁面時：一律使用 `var(--token, ...)`；若真的沒有語義對應（品牌色等），
 * 用行內註解標明理由，並在下方白名單登記。
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// import.meta.url 在部分 vitest transform 情境下不是合法 file:// URL，
// 改以本檔案在 src/test/design/ 下的固定相對位置往上找 src/pages/，較穩健。
const THIS_DIR = (() => {
    try {
        return dirname(fileURLToPath(import.meta.url));
    } catch {
        return join(process.cwd(), 'src', 'test', 'design');
    }
})();
const PAGES_DIR = join(THIS_DIR, '..', '..', 'pages');

/**
 * 白名單：已註記例外的檔案（相對於 `src/pages/`，使用 POSIX 分隔符）。
 * 每筆都附理由；理由分類見檔案頂部說明的 a) / b)。
 */
const WHITELIST: Record<string, string> = {
    // a) 品牌／裝飾色，檔內已逐一行內註解
    'LoginPage.css': 'LINE 官方品牌綠 #06C755，檔內 :590 已註記「依品牌規範保留原色，不套用 app token」',
    'LeaderboardPage.css': '表揚徽章金/銀/銅/特殊漸層與慶祝色塊為品牌裝飾色，非 success/warning/danger/info 語義；檔內逐處以行內註解標明「保留字面值」',

    // b) 孤兒／未接線頁面（不在任何路由的實際渲染路徑上）— 見 docs/audit/PAGE_REMOVAL_PROPOSAL.md
    'AccountPage.css': '孤兒：頂層重複版，/account 實際渲染 pages/account/AccountPage.tsx（PAGE_REMOVAL_PROPOSAL §2）',
    'AttendancePage.css': '孤兒：待 owner 決策是否接上（PAGE_REMOVAL_PROPOSAL §5）；/domains/workforce/attendance 走 domains/workforce/AttendancePage.tsx',
    'CommandPostMapPage.css': '孤兒：未被任何路由或 LazyPages 匯入（PAGE_REMOVAL_PROPOSAL §5，功能未知）',
    'DroneControlPage.css': '孤兒：/domains/air-ops/drone-control 路由掛 placeholder，元件從未實際渲染（PAGE_REMOVAL_PROPOSAL §3）',
    'OrgChartPage.css': '孤兒：假資料版，真版 domains/workforce/OrgChartPage.tsx 已掛 /domains/workforce/org-chart（PAGE_REMOVAL_PROPOSAL §1）',
    'PackageLibraryPage.css': '孤兒：未被任何路由或 LazyPages 匯入（PAGE_REMOVAL_PROPOSAL §5，功能未知）',
    'PublicSearchPage.css': '孤兒：未被任何路由或 LazyPages 匯入（PAGE_REMOVAL_PROPOSAL §5，功能未知）',
    'ShiftCalendarPage.css': '孤兒：/workforce/shifts 實際渲染 domains/workforce/ShiftCalendarPage（PAGE_REMOVAL_PROPOSAL §1）',
    'TwoFactorSetupPage.css': '孤兒：未被任何路由或 LazyPages 匯入',
    'security/TwoFactorSetupPage.css': '孤兒：未被任何路由或 LazyPages 匯入（與頂層版重複）',
    'placeholder-pages.css': '孤兒：無任何頁面 import 此檔（各頁已各自獨立 CSS，見檔內註解）',
    'admin/DashboardEditorPage.css': '孤兒：整包 pages/admin/* 從未接線（PAGE_REMOVAL_PROPOSAL §4）',
    'admin/DrillCenterPage.css': '孤兒：整包 pages/admin/* 從未接線（PAGE_REMOVAL_PROPOSAL §4）',
    'admin/FeatureFlagsPage.css': '孤兒：整包 pages/admin/* 從未接線（PAGE_REMOVAL_PROPOSAL §4）',
    'admin/GeofencingPage.css': '孤兒：整包 pages/admin/* 從未接線（PAGE_REMOVAL_PROPOSAL §4）',
    'admin/SchedulerPage.css': '孤兒：整包 pages/admin/* 從未接線（PAGE_REMOVAL_PROPOSAL §4）',
    'admin/SystemSettingsPage.css': '孤兒：整包 pages/admin/* 從未接線（PAGE_REMOVAL_PROPOSAL §4）',
    'admin/WebhookManagementPage.css': '孤兒：整包 pages/admin/* 從未接線，亦與 governance/WebhooksPage 重疊（PAGE_REMOVAL_PROPOSAL §2/§4）',
    'analytics/AnalyticsDashboardPage.css': '孤兒：功能重疊，AnalyticsPage.tsx 才是 /hub/analytics 實際渲染版（PAGE_REMOVAL_PROPOSAL §2）',
    'c2/DrillsPage.css': '孤兒：/drills 路由掛 placeholder，元件從未實際渲染（PAGE_REMOVAL_PROPOSAL §3）',
    'care/MyMoodPage.css': '孤兒：未被任何路由或 LazyPages 匯入',
    'command/AARPlaybackPage.css': '孤兒：未被任何路由或 LazyPages 匯入',
    'command/IAPManagerPage.css': '孤兒：未被任何路由或 LazyPages 匯入',
    'command/SITREPViewerPage.css': '孤兒：未被任何路由或 LazyPages 匯入',
    'command/TaskDispatchPage.css': '孤兒：/domains/mission-command/task-dispatch 路由掛 placeholder，元件從未實際渲染（PAGE_REMOVAL_PROPOSAL §3）',
    'domains/workforce/PersonnelManagementPage.css': '孤兒：/domains/workforce/personnel 路由掛 placeholder，元件從未實際渲染（PAGE_REMOVAL_PROPOSAL §3）',
    'geo/TacticalMapPage.css': '孤兒：/geo/tactical-map 已是 /geo/map 的 redirect，此檔為轉址前舊實作（PAGE_REMOVAL_PROPOSAL §1）',
    'monitor/MeshMonitorPage.css': '孤兒：未被任何路由或 LazyPages 匯入',
    'notifications/NotificationCenterPage.css': '孤兒：功能重疊，NotificationsPage.tsx 才是 /hub/notifications 實際渲染版（PAGE_REMOVAL_PROPOSAL §2）',
    'public/TransparencyPage.css': '孤兒：未被任何路由或 LazyPages 匯入',
    'resources/ResourceOverviewPage.css': '孤兒：/domains/logistics/resource-overview 路由掛 placeholder，元件從未實際渲染（PAGE_REMOVAL_PROPOSAL §3）',
    'voice/VoiceCallPage.css': '孤兒：未被任何路由或 LazyPages 匯入',
    'weather/WeatherPage.css': '孤兒：功能重疊，ForecastPage.tsx 才是 /hub/weather 實際渲染版（PAGE_REMOVAL_PROPOSAL §2）',
};

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const COMMENT_PATTERN = /\/\*[\s\S]*?\*\//g;
// 允許：var(--any-token-name, #hex) —— token-first、hex 僅作未定義安全退回值
const VAR_FALLBACK_HEX_PATTERN = /var\(\s*--[\w-]+\s*,\s*#[0-9a-fA-F]{3,8}\s*\)/g;

function listCssFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            out.push(...listCssFiles(full));
        } else if (entry.endsWith('.css')) {
            out.push(full);
        }
    }
    return out;
}

/** 找出「裸」hex（扣除註解與 var() fallback 之後仍存在的 hex），回傳含行號的清單 */
function findBareHex(source: string): Array<{ line: number; match: string }> {
    const withoutComments = source.replace(COMMENT_PATTERN, (m) => ' '.repeat(m.length));
    const withoutVarFallback = withoutComments.replace(
        VAR_FALLBACK_HEX_PATTERN,
        (m) => ' '.repeat(m.length)
    );

    const violations: Array<{ line: number; match: string }> = [];
    const lines = withoutVarFallback.split('\n');
    lines.forEach((lineText, idx) => {
        const matches = lineText.match(HEX_PATTERN);
        if (matches) {
            for (const m of matches) {
                violations.push({ line: idx + 1, match: m });
            }
        }
    });
    return violations;
}

describe('Design guard: no new hardcoded hex in src/pages/**/*.css (R4)', () => {
    const cssFiles = listCssFiles(PAGES_DIR);

    it('found the expected page CSS files to scan (sanity check)', () => {
        // 防止路徑寫錯導致測試永遠綠燈卻沒掃到東西
        expect(cssFiles.length).toBeGreaterThan(50);
    });

    it('every whitelist entry still points at a real, hex-containing file', () => {
        const stale: string[] = [];
        for (const rel of Object.keys(WHITELIST)) {
            const full = join(PAGES_DIR, rel);
            let exists = false;
            try {
                exists = statSync(full).isFile();
            } catch {
                exists = false;
            }
            if (!exists) {
                stale.push(`${rel} (檔案不存在，白名單條目已過期，請移除)`);
                continue;
            }
            const violations = findBareHex(readFileSync(full, 'utf-8'));
            if (violations.length === 0) {
                stale.push(`${rel} (已無裸 hex，白名單條目可移除)`);
            }
        }
        expect(stale, `過期的白名單條目:\n${stale.join('\n')}`).toEqual([]);
    });

    it('no bare hardcoded hex outside the documented whitelist', () => {
        const failures: string[] = [];

        for (const full of cssFiles) {
            const rel = relative(PAGES_DIR, full).split('\\').join('/');
            if (rel in WHITELIST) continue;

            const violations = findBareHex(readFileSync(full, 'utf-8'));
            if (violations.length > 0) {
                for (const v of violations) {
                    failures.push(`src/pages/${rel}:${v.line} → ${v.match}`);
                }
            }
        }

        expect(
            failures,
            `發現未加白名單的硬編 hex（改用語義 token，或若為品牌/孤兒頁例外，請在本檔 WHITELIST 登記理由）:\n${failures.join('\n')}`
        ).toEqual([]);
    });
});
