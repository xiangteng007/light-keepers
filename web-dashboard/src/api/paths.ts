/**
 * API 路徑常數表 — legacy 後端前綴相容層
 *
 * ## 為什麼需要這個檔案
 *
 * 後端在 `backend/src/main.ts` 設定 `app.setGlobalPrefix(process.env.API_PREFIX || 'api/v1')`，
 * 但有 **23 個 controller 在 `@Controller()` 內又硬寫了一次 `api/` 前綴**，例如：
 *
 * ```ts
 * @Controller('api/drill')          // → 實際路徑 /api/v1/api/drill
 * @Controller('api/v1/clusters')    // → 實際路徑 /api/v1/api/v1/clusters
 * ```
 *
 * 後端前綴清理**不在 FE-4（3.1/3.2）範圍**（會動到 23 個 controller 與其 e2e）。
 * 在後端修好之前，前端仍必須打得到這些端點，因此本檔把「多出來的那一段前綴」
 * 集中成常數，避免 51 頁遷移時各自把 `/api/...` 硬寫進呼叫點。
 *
 * ## 用法
 *
 * `src/api/client.ts` 的 axios `baseURL` 已經是 `${VITE_API_URL}/api/v1`，
 * 所以呼叫 legacy 端點時只要把「重複的那一段」接在前面：
 *
 * ```ts
 * import api from '@/api/client';
 * import { LEGACY, legacyPath } from '@/api/paths';
 *
 * // 一般端點（後端沒有硬寫前綴）——直接寫業務路徑
 * await api.get('/volunteer-points/ranking');
 *
 * // legacy 端點——用常數，不要硬寫 '/api/drill'
 * await api.get(`${LEGACY.drill}/scenarios`);
 * await api.get(legacyPath('missions/123/sitrep'));
 * ```
 *
 * ## 後端修好之後怎麼收尾
 *
 * 當 23 個 controller 的 `api/` 前綴被移除時，只需要把本檔的
 * `LEGACY_PREFIX` / `LEGACY_V1_PREFIX` 改成空字串，**所有呼叫點不用動**。
 * 這就是「路徑常數表」相對於各頁硬寫字串的唯一理由。
 */

/** 後端 global prefix（與 `backend/src/main.ts` 的 `API_PREFIX` 對應，client baseURL 已含此段） */
export const GLOBAL_PREFIX = '/api/v1';

/**
 * controller 硬寫 `api/` 造成的重複前綴。
 * 後端清理完成後改為 `''` 即可一次修正所有呼叫點。
 */
export const LEGACY_PREFIX = '/api';

/**
 * controller 硬寫 `api/v1/` 造成的重複前綴（比 LEGACY_PREFIX 更嚴重，重複整個版本段）。
 * 後端清理完成後改為 `''`。
 */
export const LEGACY_V1_PREFIX = '/api/v1';

/**
 * 組出 legacy `api/*` 端點的 client 相對路徑。
 * @example legacyPath('drill/scenarios') // → '/api/drill/scenarios'
 */
export const legacyPath = (path: string): string =>
    `${LEGACY_PREFIX}/${path.replace(/^\/+/, '')}`;

/**
 * 組出 legacy `api/v1/*` 端點的 client 相對路徑。
 * @example legacyV1Path('clusters') // → '/api/v1/clusters'
 */
export const legacyV1Path = (path: string): string =>
    `${LEGACY_V1_PREFIX}/${path.replace(/^\/+/, '')}`;

/**
 * 23 個硬寫前綴 controller 的 route root（相對於 client baseURL）。
 *
 * 掃描指令（可重跑驗證）：
 * `grep -rn "@Controller(['\`\"]api/" backend/src --include=*.ts`
 */
export const LEGACY = {
    // --- `api/*`（重複一層 `api`，實際路徑 /api/v1/api/...） ---
    /** aar.controller.ts — `api/missions/:sessionId/aar` */
    missions: legacyPath('missions'),
    /** drill.controller.ts */
    drill: legacyPath('drill'),
    /** expense-reimbursement.controller.ts */
    expenses: legacyPath('expenses'),
    /** fatigue-detection.controller.ts */
    fatigue: legacyPath('fatigue'),
    /** mesh.controller.ts */
    mesh: legacyPath('mesh'),
    /** mood-tracker.controller.ts */
    care: legacyPath('care'),
    /** performance-report.controller.ts */
    performance: legacyPath('performance'),
    /** public-audit.controller.ts */
    publicTransparency: legacyPath('public/transparency'),
    /** public-finance.controller.ts */
    publicFinance: legacyPath('public/finance'),
    /** tccip-climate.controller.ts */
    climate: legacyPath('climate'),
    /** trend-prediction.controller.ts */
    trends: legacyPath('trends'),
    /** voice-call.controller.ts */
    voice: legacyPath('voice'),
    /** water-resources.controller.ts */
    water: legacyPath('water'),

    // --- `api/v1/*`（重複整個版本段，實際路徑 /api/v1/api/v1/...） ---
    /** cluster-coordination.controller.ts */
    clusters: legacyV1Path('clusters'),
    /** data-privacy.controller.ts */
    privacy: legacyV1Path('privacy'),
    /** donor-reporting.controller.ts */
    donors: legacyV1Path('donors'),
    /** humanitarian-standards.controller.ts */
    humanitarianStandards: legacyV1Path('humanitarian-standards'),
    /** interoperability.controller.ts */
    interop: legacyV1Path('interop'),
    /** staff-security.controller.ts */
    staffSecurity: legacyV1Path('staff-security'),
} as const;

/**
 * mission session 底下的 legacy 子資源（aar / iap / sitrep / map-dispatch）。
 * 四個 controller 都掛在 `api/missions/:sessionId/*`。
 */
export const missionPath = (sessionId: string, sub: 'aar' | 'iap' | 'sitrep' | 'map'): string =>
    `${LEGACY.missions}/${sessionId}/${sub}`;
