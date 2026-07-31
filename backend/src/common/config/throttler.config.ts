/**
 * 全域 Rate Limiting 設定（SSOT）
 *
 * @see docs/adr/ADR-004-rate-limiting.md
 *
 * ⚠️ 命名契約 —— 請勿更動 `default` 這個名稱
 * -------------------------------------------------
 * `ThrottlerGuard` 是以「**已設定的 throttler 名稱**」去反射查詢
 * `@Throttle({ <name>: { limit, ttl } })` 所寫入的 metadata：
 *
 *     Reflect.getMetadata('THROTTLER:LIMIT' + throttler.name, handler)
 *
 * （見 @nestjs/throttler v6 `throttler.guard.ts` / `throttler.decorator.ts`）
 *
 * 全 repo 的 `@Throttle` 皆宣告為 `{ default: ... }`。若此處基準 throttler
 * 未命名為 `default`，名稱查不到就會靜默 fallback 回全域值 ——
 * **所有端點的客製限流會全部失效且無任何錯誤訊息**。
 * 2026-08-01 前此項名為 `long`，即為此缺陷（BE-5 修正）。
 *
 * 回歸測試：`src/modules/auth/auth.controller.throttle.spec.ts`
 */
export const THROTTLER_CONFIG = [
    {
        /** 突發保護：任何端點 1 秒內最多 10 次（防單機洪泛） */
        name: 'short',
        ttl: 1000,
        limit: 10,
    },
    {
        /**
         * 基準配額：未以 `@Throttle` 客製的端點皆適用。
         * 名稱必須為 'default'，理由見檔頭。
         */
        name: 'default',
        ttl: 60000,
        limit: 100,
    },
] as const;

/**
 * 敏感端點限流基準（BE-5, 2026-08-01）—— 供 `@Throttle` 引用時對照。
 * 實際數值仍寫在各 controller 的 `@Throttle` 宣告中（就近可讀性優先）。
 */
export const THROTTLE_TIER = {
    /** 密碼登入／註冊／OTP／密碼重設・變更 */
    CREDENTIAL: { limit: 5, ttl: 60000 },
    /** OAuth／社群登入 token 交換、匿名通報寫入 */
    OAUTH_OR_ANON_WRITE: { limit: 10, ttl: 60000 },
    /** 上傳、AI 推論（消耗儲存與外部計費額度） */
    UPLOAD: { limit: 20, ttl: 60000 },
    /** 公開查詢類 */
    PUBLIC_READ: { limit: 30, ttl: 60000 },
    /** 健康檢查（LB / uptime probe） */
    HEALTH: { limit: 120, ttl: 60000 },
} as const;
