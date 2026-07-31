# Stub 模組處置報告（BE-4 / 工作項 4.2）

> **決策依據**: `docs/FULL_SYSTEM_REDESIGN_PLAN.md` D10 — 純 stub 模組**刪除**
> **重建日期**: 2026-08-01（基準 commit `a95d424`，清單重新掃描，未沿用先前 41 個名單）
> **基準測試**: `npx jest` = 366 suites / 3,613 tests 全綠

---

## 1. 判定口徑

一個模組被判定為**純 stub**，須同時滿足：

| 條件 | 說明 |
|------|------|
| (a) 無 HTTP 出口 | 無 controller；**或** controller 存在但端點從未被 `web-dashboard/src` 呼叫 |
| (b) 無持久化 | 無 `*.entity.ts`、無 `TypeOrmModule.forFeature`、service 無 `Repository` / `DataSource` |
| (c) 假實作 | service 狀態僅存在於 `Map` / 陣列字面值；或僅呼叫外部 LLM 後不落地；或核心邏輯是 `TODO` / `Math.random()` |
| (d) 無核心依賴 | `app.module.ts` 以外沒有具備真實出口的模組 import 它 |

**基礎設施模組排除在候選之外**（設計上就沒有 controller/entity）：
`cache`、`database`、`realtime`、`sentry`、`shared`、`health`、`public`。

### 掃描方法

以 AST 層級的相對路徑解析建立依賴圖（`import ... from '../x/...'` 會被解析成絕對路徑再對應回模組），
**不是**單純字串比對 `modules/<name>/`。這點很重要——字串比對會漏掉同層相對匯入，
第一次掃描就因此誤判 `line-notify` 為孤兒（見 §4）。

---

## 2. 判定統計

| 判定 | 數量 |
|------|:----:|
| 🔴 刪除 | **35** |
| 🟡 凍結（保留程式碼，移出 app.module ＋ 檔頭標記） | **1** |
| 🟢 保留（證實有真實消費者） | **2** |
| 合計候選 | 38 |

掃描母體：`backend/src/modules` 共 119 個模組 → 78 個無 entity → 排除基礎設施與有真實 controller 者
→ 36 個「零 controller ＋ 零 entity」候選，另納入 2 個「有 controller 但前端零呼叫」者（`rag-knowledge`、`fire-119`）。

---

## 3. 🔴 刪除清單（35 個 / 129 檔 / 17,848 行 / 40 支 spec）

| # | 模組 | 行數 | 檔 | spec | app.module | 假實作證據 |
|:-:|------|-----:|---:|:----:|:----------:|------------|
| 1 | `ai-platform` | 3,640 | 20 | 4 | 未註冊 | 孤兒 AI 平台層（orchestrator / model-router / token-budget / 4 agents / HITL gateway），**零 importer**；真實 AI 路徑是 `ai-queue`（自帶 `providers/gemini.provider.ts`） |
| 2 | `blockchain` | 575 | 3 | 1 | 已註冊 | 假鏈：`Map` 存區塊，`Math.random()` ×3 產雜湊 |
| 3 | `chatbot-assistant` | 808 | 4 | 1 | 已註冊 | 對話狀態存 `Map`，回覆走關鍵字表 |
| 4 | `citizen-app` | 492 | 3 | 1 | 已註冊 | 3 處 TODO，`Map` ×2 |
| 5 | `crowd-reporting` | 511 | 3 | 1 | 已註冊 | 呼叫 Gemini 後結果不落地，`Map` ×2 |
| 6 | `damage-simulation` | 431 | 3 | 1 | 已註冊 | 純記憶體；唯一 importer 是同批刪除的 `simulation-engine` |
| 7 | `device-management` | 274 | 3 | 1 | 已註冊 | 裝置清單存 `Map` |
| 8 | `disaster-summary` | 314 | 3 | 1 | 已註冊 | 呼叫 Gemini 產摘要，不儲存、無端點 |
| 9 | `document-ocr` | 253 | 3 | 1 | 已註冊 | 同上（Gemini vision），無出口 |
| 10 | `drone-ops` | 1,054 | 5 | 2 | 已註冊 | 無人機/機群狀態存 `Map` ×4；無 controller（前端 `DroneControlPage` 呼叫的 `/drone-ops/*` 目前就是 404，見 §5） |
| 11 | `i18n-api` | 225 | 3 | 1 | 已註冊 | 翻譯表存 `Map`；另含 `src/test/i18n-api.service.spec.ts`（模組外 spec，一併刪） |
| 12 | `image-recognition` | 188 | 3 | 1 | 已註冊 | 3 處 TODO，回傳寫死座標 |
| 13 | `iot` | 267 | 2 | 1 | 未註冊 | `LoRaMeshService`，無 `.module.ts`、零 importer |
| 14 | `media-streaming` | 368 | 3 | 1 | 已註冊 | 串流 session 存 `Map` ×2 |
| 15 | `micro-task` | 384 | 3 | 1 | 已註冊 | 任務存 `Map` ×2 |
| 16 | `multi-eoc` | 582 | 3 | 1 | 已註冊 | EOC 狀態存 `Map` ×3；e2e 打 `/multi-eoc/*` 現已收 404（spec 內建 404 容錯） |
| 17 | `permissions` | 468 | 2 | 1 | 未註冊 | `NgoCoordinatorService`，無 `.module.ts`、零 importer |
| 18 | `power-bi` | 279 | 3 | 1 | 已註冊 | 4 處 TODO，含 `TODO: reportId`；無端點 |
| 19 | `predictive-maintenance` | 334 | 3 | 1 | 已註冊 | 純記憶體 |
| 20 | `privacy` | 1,004 | 6 | 2 | 未註冊 | 零 importer。**真正在用的是 `system/data-privacy.controller.ts`**，與本模組無關 |
| 21 | `ptt` | 344 | 3 | 1 | 已註冊 | 頻道存 `Map` ×2，TURN 設定未接線 |
| 22 | `qr-scanner` | 242 | 3 | 1 | 已註冊 | 純函式，無狀態無出口；實際在用的是 `equipment-qr`（14 端點） |
| 23 | `rag-knowledge` | 285 | 5 | 2 | 已註冊 | **有 controller 但前端零呼叫**：`api/paths.ts` 宣告 `knowledge` 卻無人使用。6 筆寫死文件 ＋ 關鍵字檢索，`addDocument` 寫進揮發性陣列 |
| 24 | `resource-matching` | 566 | 3 | 1 | 已註冊 | 媒合資料存 `Map` ×5，無 controller |
| 25 | `resource-optimization` | 445 | 3 | 1 | 已註冊 | 同上 |
| 26 | `rewards` | 348 | 3 | 1 | 已註冊 | 獎勵表寫死；`volunteer-points` 才是有端點的那個 |
| 27 | `simulation-engine` | 350 | 4 | 1 | 未註冊 | 零 importer，僅轉呼叫 `damage-simulation` |
| 28 | `speech-to-text` | 182 | 3 | 1 | 已註冊 | 1 處 TODO，未接 GCP STT |
| 29 | `supply-chain` | 215 | 1 | 0 | 未註冊 | 只有一個 `blockchain/supply-tracking.ts` 型別檔，無 module / service / provider |
| 30 | `timeline-visualization` | 309 | 3 | 1 | 已註冊 | 純記憶體 |
| 31 | `translation` | 371 | 3 | 1 | 已註冊 | 快取存 `Map`，前端已自帶 i18n（`src/i18n/`） |
| 32 | `unified-reporting` | 367 | 4 | 1 | 未註冊 | 零 importer；`reports` / `reporting-engine` 才是實作 |
| 33 | `unified-resources` | 371 | 4 | 1 | 未註冊 | 零 importer；只是 24/25 兩個 stub 的門面 |
| 34 | `voice-assistant` | 417 | 3 | 1 | 已註冊 | 寫死指令表；實作在 `voice`（9 端點） |
| 35 | `volunteer-certification` | 585 | 3 | 1 | 已註冊 | 證照存 `Map` ×3 |

---

## 4. 🟢 保留（2）— 依賴圖攔下來的案例

### `line-notify`
- 第一次以字串比對 `modules/line-notify/` 掃描時判定為「零 importer」。
- **實際上** `line-bot.module.ts:19` 以同層相對路徑 `../line-notify/line-notify.service` 匯入
  `LineNotifyService`，並在 `providers`（:46）與 `exports`（:56）註冊。
- `line-bot` 是核心模組（2 controller / 15 端點 / 3 entity / TypeORM）。
- Service 本身是**真實** LINE Notify HTTP client（`fetch` → `https://notify-api.line.me/api/notify`），非假資料。
- → **保留**。這是把依賴圖從字串比對改成路徑解析後才抓到的誤刪案例。

### `realtime-chat`
- 零 controller、零 entity，表面符合 stub 特徵。
- **實際上** `realtime.module.ts:12-13` 將 `ChatGateway` / `ChatService` 併入 `RealtimeModule`
  （`@Global()`、已在 `app.module`），並 `exports: [ChatService]`。
- `ChatGateway` 是 WebSocket 出口 → **不符合「無 HTTP 出口」**。
- → **保留**。

---

## 5. 🟡 凍結（1）

### `fire-119`
- 有 controller（5 端點）、有守衛、有 e2e 覆蓋，但 `web-dashboard/src` 零呼叫。
- `fire-119.service.ts` 在未設定時回傳結構化的 `FIRE119_NOT_CONFIGURED` ＋ `pendingSpecs`
  （「需與消防署洽談 API 合作」），是**待外部機關規格**的整合轉接層，不是被遺棄的假模組。
- 但 `fire-119-deep.service.ts:463-476` 在未設定時會產生 `Math.random()` 的假案件
  （隨機台北座標、假 CAD 編號）並經 HTTP 送出——把示範資料當成真實 119 派遣資料外送，風險高。
- → **凍結**：保留程式碼與 spec，從 `app.module` 移除註冊（關閉 HTTP 出口），檔頭加標記。
  待消防署 API 規格確定後重新掛回。

---

## 6. 影響與待辦（carry-over）

1. **前端呼叫不存在的端點**（刪除前後行為不變，兩者今日都是 404）：
   - `web-dashboard/src/pages/DroneControlPage.tsx` → `/drone-ops/drones`、`/drone-ops/drones/:id/missions`、`/drone-ops/drones/:id/rth`
   - `web-dashboard/src/pages/UnifiedResourcesPage.tsx` → `/resource-matching/statistics`、`/resource-matching/leaderboard`

   兩頁**目前皆無示範資料 banner**（工作項 3.3 的 banner 尚未落到本分支）。`UnifiedResourcesPage`
   會顯示錯誤訊息，`DroneControlPage` 只 `console.error` 後留空白。建議 3.3 補上。

2. **`api/paths.ts` 殘留**：`knowledge`（指向已刪的 `rag-knowledge.controller.ts`）為宣告後未使用的
   常數，可於前端清理批次移除。

3. **e2e**：`test/e2e/cross-agency.e2e-spec.ts`、`governance-scalability.e2e-spec.ts` 會打
   `/multi-eoc/*`、`/privacy/*`、`/fire-119/*`。這些端點**在刪除前就已不存在**（對應模組本來就沒有
   controller），spec 內建 `if (response.status === 404)` 容錯，故不受本次變更影響。
   e2e 走獨立設定（`test/jest-e2e.json`），不在 `npx jest` 範圍內。

4. **可回復性**：所有刪除內容可由 git history 取回。`ai-platform` 的 `GeminiClientService` /
   `ModelRouterService` / `TokenBudgetService` 屬可重用的真實程式碼，Phase M 若要做本地 LLM 切換，
   建議從 `ai-queue/providers/` 出發而非復原本模組。
