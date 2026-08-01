import type { Page } from '@playwright/test';

/**
 * R4 / FE-7: 視覺回歸與 a11y 掃描用的 API route mock。
 *
 * 這個環境沒有後端可跑（隔離 worktree、無 DB/服務可連），所以用
 * Playwright `page.route` 攔截所有 `**​/api/v1/**` 呼叫，回固定 fixture，
 * 讓頁面能完整渲染（不卡 loading、不因 network error 整頁報錯）。
 *
 * 設計原則（讀過 src/api/services/**​/*.ts 後歸納）：
 * - 本專案幾乎所有 react-query queryFn 都寫成
 *   `getXxx().then(r => r.data?.data ?? [])` 或 `?? null` 的防禦寫法，
 *   所以「回一個空殼但形狀正確的 envelope」對絕大多數頁面就足夠安全渲染。
 * - 對視覺上最關鍵的幾類端點（志工列表、物資列表、任務看板）給實際幾筆假資料，
 *   讓 List/Board archetype 的截圖基準不是純空狀態，而是有卡片可比對版型。
 * - 其餘一律落到通用 catch-all：GET 回 `{ success:true, data:[], count:0 }`，
 *   寫入類方法（POST/PUT/PATCH/DELETE）回 `{ success:true }`。
 */

const GENERIC_GET_BODY = { success: true, data: [], count: 0, total: 0 };
const GENERIC_WRITE_BODY = { success: true };

const now = new Date().toISOString();

const VOLUNTEERS_FIXTURE = {
    success: true,
    count: 3,
    data: [
        { id: 'vol-1', name: '陳志明', phone: '0912-345-678', region: '台北市', skills: ['醫療', '無線電'], status: 'available', serviceHours: 128, taskCount: 12, createdAt: now, updatedAt: now },
        { id: 'vol-2', name: '林雅婷', phone: '0922-111-222', region: '新北市', skills: ['駕駛', '物資調度'], status: 'busy', serviceHours: 64, taskCount: 5, createdAt: now, updatedAt: now },
        { id: 'vol-3', name: '王大明', phone: '0933-888-999', region: '桃園市', skills: ['搜救'], status: 'offline', serviceHours: 256, taskCount: 21, createdAt: now, updatedAt: now },
    ],
};

const RESOURCES_FIXTURE = {
    success: true,
    count: 3,
    data: [
        { id: 'res-1', name: '瓶裝水', category: 'water', status: 'available', quantity: 480, unit: '箱', minQuantity: 100, location: '一號倉', createdAt: now, updatedAt: now },
        { id: 'res-2', name: '急救包', category: 'medical', status: 'low', quantity: 32, unit: '組', minQuantity: 50, location: '二號倉', createdAt: now, updatedAt: now },
        { id: 'res-3', name: '睡袋', category: 'shelter', status: 'available', quantity: 150, unit: '個', minQuantity: 80, location: '三號倉', createdAt: now, updatedAt: now },
    ],
};

const TASK_KANBAN_FIXTURE = {
    success: true,
    data: {
        pending: [
            { id: 'task-1', title: '物資盤點', status: 'pending', priority: 'high', createdAt: now },
            { id: 'task-2', title: '避難所巡查', status: 'pending', priority: 'medium', createdAt: now },
        ],
        inProgress: [
            { id: 'task-3', title: '志工排班確認', status: 'in_progress', priority: 'high', createdAt: now },
        ],
        completed: [
            { id: 'task-4', title: '早班簽到彙整', status: 'completed', priority: 'low', createdAt: now },
        ],
    },
};

const REPORT_STATS_FIXTURE = {
    success: true,
    data: { total: 42, pending: 5, confirmed: 30, rejected: 7, byType: { fire: 10, flood: 8, medical: 24 } },
};
const TASK_STATS_FIXTURE = {
    success: true,
    data: { pending: 6, inProgress: 3, completed: 21, overdue: 1 },
};
const VOLUNTEER_STATS_FIXTURE = {
    success: true,
    data: { total: 86, available: 40, busy: 22, offline: 24, totalServiceHours: 4820 },
};
const RESOURCE_STATS_FIXTURE = {
    success: true,
    data: { total: 662, byCategory: { water: 480, medical: 32, shelter: 150 }, lowStock: 2, expiringSoon: 1 },
};
const REPORT_TREND_FIXTURE = {
    success: true,
    data: { labels: ['一', '二', '三', '四', '五', '六', '日'], datasets: [{ label: '通報數', data: [3, 5, 2, 8, 6, 4, 7] }] },
};
const HOTSPOTS_FIXTURE = {
    success: true,
    data: { hotspots: [], totalReports: 0, generatedAt: now },
};
const NCDR_ALERTS_FIXTURE = { success: true, data: [], total: 0 };

const VOLUNTEER_DETAIL_FIXTURE = {
    success: true,
    data: {
        id: 'demo-1',
        name: '陳志明',
        email: 'demo@example.com',
        phone: '0912-345-678',
        region: '台北市',
        address: '台北市中正區示範路 1 號',
        skills: ['醫療', '無線電', '駕駛'],
        status: 'available',
        serviceHours: 128,
        taskCount: 12,
        emergencyContact: '陳太太',
        emergencyPhone: '0987-654-321',
        notes: '',
        createdAt: now,
        updatedAt: now,
    },
};

// EmergencyResponsePage：/mission-sessions 回傳「裸陣列」（非 {success,data} envelope）
const MISSION_SESSIONS_FIXTURE = [
    { id: 'mission-1', title: '0731 豪雨應變場次', status: 'active', commanderName: '林指揮官', createdAt: now, startedAt: now },
    { id: 'mission-2', title: '例行演練場次', status: 'completed', commanderName: '王指揮官', createdAt: now },
];

// TriagePage：/triage/missions/:id/victims、/triage/missions/:id/stats 皆回「裸物件/裸陣列」
const TRIAGE_VICTIMS_FIXTURE = [
    { id: 'v-1', braceletId: 'B001', missionSessionId: 'demo-1', triageLevel: 'RED', canWalk: false, breathing: true, hasRadialPulse: true, canFollowCommands: true, transportStatus: 'PENDING', createdAt: now },
    { id: 'v-2', braceletId: 'B002', missionSessionId: 'demo-1', triageLevel: 'YELLOW', canWalk: true, breathing: true, hasRadialPulse: true, canFollowCommands: true, transportStatus: 'IN_TRANSIT', createdAt: now },
    { id: 'v-3', braceletId: 'B003', missionSessionId: 'demo-1', triageLevel: 'GREEN', canWalk: true, breathing: true, hasRadialPulse: true, canFollowCommands: true, transportStatus: 'ARRIVED', createdAt: now },
];
const TRIAGE_STATS_FIXTURE = {
    total: 3, black: 0, red: 1, yellow: 1, green: 1, pendingTransport: 1, inTransit: 1, arrived: 1,
};

/**
 * Regex-based overrides — 比對整個 pathname，優先於下方的子字串比對。
 * 用於「單一資源」或「裸陣列/裸物件（無 {success,data} envelope）」端點，
 * 這類形狀跟通用 catch-all 不相容，錯用會讓頁面直接 crash
 * （例如 `/volunteers/:id` 若吃到列表 fixture，`volunteer.name.charAt` 就會炸）。
 */
const REGEX_OVERRIDES: Array<{ pattern: RegExp; body: unknown }> = [
    { pattern: /\/mission-sessions\/?$/, body: MISSION_SESSIONS_FIXTURE },
    { pattern: /\/triage\/missions\/[^/]+\/victims$/, body: TRIAGE_VICTIMS_FIXTURE },
    { pattern: /\/triage\/missions\/[^/]+\/stats$/, body: TRIAGE_STATS_FIXTURE },
    { pattern: /\/volunteers\/(?!stats|pending|approved)[^/]+$/, body: VOLUNTEER_DETAIL_FIXTURE },
];

/**
 * URL pathname（不含 query string）子字串比對 → 回應 body。
 * 由上而下比對，較具體的路徑（如 /volunteers/stats）必須排在
 * 較籠統的路徑（如 /volunteers）之前，否則會被籠統規則先攔截。
 */
const PATH_OVERRIDES: Array<{ match: string; body: unknown }> = [
    { match: '/tasks/kanban', body: TASK_KANBAN_FIXTURE },
    { match: '/tasks/stats', body: TASK_STATS_FIXTURE },
    { match: '/volunteers/stats', body: VOLUNTEER_STATS_FIXTURE },
    { match: '/resources/stats', body: RESOURCE_STATS_FIXTURE },
    { match: '/resources/low-stock', body: { success: true, data: [], count: 0 } },
    { match: '/reports/stats', body: REPORT_STATS_FIXTURE },
    { match: '/reports/analysis/trend', body: REPORT_TREND_FIXTURE },
    { match: '/reports/analysis/hotspots', body: HOTSPOTS_FIXTURE },
    { match: '/ncdr-alerts', body: NCDR_ALERTS_FIXTURE },
    { match: '/volunteers', body: VOLUNTEERS_FIXTURE },
    { match: '/resources', body: RESOURCES_FIXTURE },
];

export async function mockApiRoutes(page: Page): Promise<void> {
    await page.route('**/api/v1/**', async (route) => {
        const request = route.request();
        const method = request.method();
        const url = new URL(request.url());

        if (method !== 'GET') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(GENERIC_WRITE_BODY),
            });
            return;
        }

        const regexOverride = REGEX_OVERRIDES.find((o) => o.pattern.test(url.pathname));
        const pathOverride = PATH_OVERRIDES.find((o) => url.pathname.includes(o.match));
        const body = regexOverride?.body ?? pathOverride?.body ?? GENERIC_GET_BODY;
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });
    });

    // 避免地圖/離線相關背景請求（PMTiles、WebSocket 升級失敗等）拖慢渲染或噴一堆 console error。
    await page.route('**/*.pmtiles', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/octet-stream', body: Buffer.alloc(0) });
    });
}

/**
 * DevMode 認證繞過（僅 Vite dev server / `import.meta.env.DEV` 有效，
 * 見 src/utils/devMode.ts —— production build 會被 tree-shaking 移除，
 * 不是正式環境後門）。E2E 沒有可用的登入憑證機制（見 role-matrix.spec.ts
 * 開頭說明），這是目前唯一能讓 ProtectedRoute 顯示真實頁面內容的方式。
 */
export async function setDevModeAuth(page: Page): Promise<void> {
    await page.addInitScript(() => {
        window.localStorage.setItem('devModeUser', 'true');
    });
}

/** 設定亮/暗主題（ThemeProvider storageKey，見 src/context/ThemeProvider.tsx） */
export async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
    await page.addInitScript((t) => {
        window.localStorage.setItem('light-keepers-theme', t);
    }, theme);
}

/**
 * 設定戰術（災時）模式覆寫（useAppMode override key，
 * 見 src/components/layout/useAppMode.ts）。掛載點為 AppShellLayout 根節點
 * `data-app-mode="emergency"`，由 tokens.css LAYER 8 接手換色。
 */
export async function setTacticalMode(page: Page, enabled: boolean): Promise<void> {
    await page.addInitScript((on) => {
        if (on) {
            window.localStorage.setItem('lk-app-mode-override', 'emergency');
        } else {
            window.localStorage.removeItem('lk-app-mode-override');
        }
    }, enabled);
}
