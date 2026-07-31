# ADR-004: API Rate Limiting 策略

## 狀態
已採用

## 背景
保護 API 端點免受 DDoS 攻擊和濫用。

## 決策
採用 NestJS `ThrottlerModule` + `ThrottlerGuard`（`APP_GUARD`）作為單一限流機制。

### 全域基準（`app.module.ts`）

| Throttler 名稱 | 限制 | 時間窗口 | 用途 |
|----------------|------|---------|------|
| `short` | 10 req | 1 sec | 突發洪泛保護 |
| `default` | 100 req | 60 sec | 未客製端點的基準配額 |

> ⚠️ **命名契約**：基準 throttler **必須**命名為 `default`，因為 `ThrottlerGuard`
> 是以「已設定的 throttler 名稱」去反射查詢 `@Throttle({ <name>: ... })` 的 metadata。
> 2026-08-01 前基準 throttler 名為 `long`，與全 repo 一致使用的
> `@Throttle({ default: ... })` 不匹配，導致**所有端點客製限流靜默失效**（見下方修正紀錄）。

### 敏感端點收緊基準（2026-08-01, BE-5）

| 類別 | 限制 | 代表端點 |
|------|------|---------|
| 密碼登入／註冊／OTP 發送與驗證／密碼重設・變更 | **5 / min** | `POST /auth/login`、`/auth/register`、`/auth/send-*-otp`、`/auth/verify-*-otp`、`/auth/forgot-password`、`/auth/reset-password`、`/auth/change-password`、`/auth/set-password` |
| OAuth／社群登入（token 交換，IdP 已先驗證） | **10 / min** | `/auth/{line,google}/{login,callback}`、`/auth/liff/login`、`/auth/firebase/login` |
| 匿名寫入（通報） | **10 / min** | `POST /intake`、`POST /reports`（後者 5/min） |
| 公開查詢類 | **30 / min** | `/public/*`、`/ncdr-alerts/*`、`/line-liff/config`、`/reports/{map,stats}` |
| 上傳／AI 推論（消耗儲存與計費額度） | **20 / min** | `POST /files/upload`、`POST /voice/:id/upload`、`/ai/vision/*`、`/ai/classify*` |
| 健康檢查（LB / uptime probe） | **120 / min** | `/health*` |

識別維度：`ThrottlerGuard` 預設 tracker 為來源 IP（`req.ips[0] ?? req.ip`），即 **per-IP**。

## 實作
- `app.module.ts`: `ThrottlerModule.forRoot([short, default])` + `APP_GUARD: ThrottlerGuard`
- 各 controller：以 `@Throttle({ default: { limit, ttl } })` 逐端點宣告並附理由註解
- 行為測試：`src/modules/auth/auth.controller.throttle.spec.ts`（超限回 429）

## 修正紀錄
- **2026-08-01（BE-5）**：修正 throttler 命名不匹配缺陷——基準 throttler `long` → `default`，
  使既有 18 處與新增的 `@Throttle` 宣告即刻生效；並依上表收緊敏感端點。
  副作用：回應標頭由 `X-RateLimit-*-long` 變為 `X-RateLimit-*`，與
  `security.config.ts` 的 CORS `exposedHeaders` 白名單一致。
- **已知待辦**：`common/guards/rate-limit.guard.ts` 與
  `common/guards/advanced-rate-limit.guard.ts` 為 **0 處使用的死碼**，
  本 ADR 原描述的「自訂 RateLimitGuard 多層防護」從未接線。待後續清除。

## 後果
- ✅ 防止 API 濫用；敏感端點（登入／OTP／上傳）有明確且**生效**的上限
- ✅ Response Header (`X-RateLimit-Limit` / `-Remaining` / `-Reset`) 顯示限制資訊
- ⚠️ 計數器為單機記憶體儲存（`ThrottlerStorageService`）。多實例部署時，
  有效上限約為「設定值 × 實例數」。若需跨實例精確限流，須改用 Redis storage。
- ⚠️ per-IP 識別：同一 NAT／企業出口後的多名使用者共用配額。
