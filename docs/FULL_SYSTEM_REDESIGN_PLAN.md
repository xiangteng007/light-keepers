# Light Keepers（希望防災）前後端優化與重新設計 — 設計總綱與執行計畫

> **版本**: v1.2（規劃階段，不含任何程式/schema 變更）
> **日期**: 2026-07-31
> **v1.2 變更**: Owner 已拍板 D2/D7/D9/D10（見 §5 決策記錄）；因 Google 服務租約到期，新增 **INF-1 本地 NAS 搬遷＋本地 LLM** 主題與 Phase M 搬遷期。
> **v1.3 變更**: 整合「專案深度調查」session（worktree `project-deep-investigation-55b1c1`）的**執行驗證報告**——該調查實跑測試與 deploy workflow 檢查，發現生產環境緊急風險（§1.6），新增 **Phase E 緊急止血期** 與對應工作項。
> **定位**: 本文件是「優化＋重新設計」的總綱與分工計畫，後續由 OPUS（架構/正確性）與 SONNET（UI/機械性）分工執行。
> **資料來源**: ① 既有深度調查（`docs/audit/00–05`、`docs/architecture/*`、`docs/NEXT_STEPS.md`、ADR-001~005）② 2026-07-31 後端逐模組深掃 ③ 2026-07-31 前端逐頁深掃。三份來源已全部整合，無待補項。

---

## 執行進度（2026-07-31 更新）

| 期別 | 狀態 | 明細 |
|------|------|------|
| **Phase E** | ✅ **全部完成** | E.1 JWT+deploy 閘門、E.2 憑證出 git（實際 11 檔，含 GCP 私鑰/DB 密碼/Gemini Key）、E.3 復原 17 個死模組＋後端 ESLint、E.4 LINE webhook、E.5 CI 阻擋式閘門、E.6 critical 漏洞歸零 |
| **Phase 0** | ✅ 全部完成 | 0.1 devModeUser 後門（7 處）/token key/路徑 bug、0.3 前端測試 88 tests、0.4 ErrorBoundary、0.5 BASELINE_METRICS；0.2 併入 E.5＋後續 gate 工作 |
| **Phase 1** | 🔄 進行中 | ✅ 1.1 SYNC_TABLES production 硬禁用（cloudbuild 源頭同步清除——**證實生產原本開著 synchronize**）、✅ 1.3 重複 entity 收斂、✅ 1.4 授權盤點（實際 43 裸 controller/361 端點）、✅ 1.5a+1.5b 共 55 controller/383 端點定級補 guard、🔄 1.6 guard 收斂執行中、⏸ 1.2 baseline migration **等 D7/D15 窗口**（範圍已擴充：損壞 migration＋稽核靜默失敗） |
| **Phase 2** | 🔄 進行中 | ✅ 2.1 四方對帳表（127 路由/43 孤兒/38 組重複/5 權限矛盾；**mission-command 與 triage 線上是 mock、真版是孤兒**）、✅ 2.3 token 5→1（修「全站變深棕」洩漏＋字級不一致；發現 JSX Tailwind class 全 no-op）、✅ 2.4 死依賴清理（leaflet×3、@line/liff、9 檔）、✅ 2.6+2.7 WidgetContent 2479 行→16 個 domain chunk（首屏 −62 kB）＋PageWrapper 明確化、✅ 2.5 首批 20 頁換皮（~350 硬編色→token；修復 AttendancePage 無樣式與 6 個無效 token 引用）、⏸ 2.2 路由收斂**等 owner 對 D2 圈選表態** |
| **Phase 3** | ✅ **全部完成** | 3.1 API client 收斂方案＋ESLint 防護欄、3.2 B1–B7 批次遷移（148 呼叫點、legacy client 刪除、違規歸零）、3.3 mock 頁處置（mission-command/triage 換掛真版）、3.4 離線層收斂（**修復三個 P0 資料遺失 bug**，單一 Dexie outbox）、3.5 DTO 化（37 DTO）、3.6 個資遮罩＋mood-tracker IDOR 修補 |
| **Phase 4** | ✅ 可派項完成 | 4.1 單租戶降級（D9）＋限流收緊（**發現既有 18 個 @Throttle 全部因命名不匹配靜默失效**，登入實跑 100/min，已修）、4.2 刪除 35 個 stub 模組（D10；17,848 行、依賴圖攔下 line-notify/realtime-chat 兩個誤刪、fire-119 凍結）、4.5 console→Logger（45 處）＋no-console gate＋strictFunctionTypes；⏸ 4.3 Map 狀態遷移（刪除後範圍縮小，併入後續）、⏸ 4.4 i18n 等 D11 |
| 待 Phase 4 處理（Phase 3 發現） | 📌 | ① `international-standards`/`reporting-engine`/`scalability` 三模組**從未註冊進 app.module**（1.5 的 guard 與 3.5 的 DTO 保護的是 404 端點）；註冊前須先解 `reporting-engine` 與 `reports` 的 `@Controller('reports')` 前綴衝突 ② 23 個 controller 雙前綴（`/api/v1/api/*`）完整清單在 3.3 回報 ③ `ReportSchedulePage` 前端 404（呼叫 `/report-schedules`，後端是 `reports/scheduler`）④ 3 個死檔 service（orgChartApi/shiftCalendarApi/payrollApi） |
| **Phase M 前置** | ✅ 紙上作業就緒 | M.0 compose env 修復；M.1 NAS 生產棧（`infra/nas/`：五服務 compose＋備份 job＋還原演練腳本＋部署手冊）；M.2 本地 LLM provider（hybrid fallback＋對測工具）；M.3 搬遷腳本（DB/GCS，dry-run 驗證）；✅ M.3b storage 抽象層接管（三 service 全遷、per-feature bucket 綁定、local 簽章 URL 向前相容方案；**已知缺口**：local 模式的 write 直傳 URL 無落點（nginx 405），影響 field-reports 附件直傳，列 README §8 後續）；⏸ 實際搬遷等 D15 租約日＋owner 架 Ollama/Tunnel |
| 驗證基準 | — | 後端 357 suites / 3,499 tests 全綠；前端 vitest 88/88；tsc 雙側乾淨；coverage 門檻生效（52%/32%，實測 58.5%/37.4%） |

| **Phase C1（民防）** | ✅ **全部完成** | C1.1 災型擴充（air_raid/explosion/terror_attack/cbrn＋MCI 正交旗標；LLM 對測新類別 100%、既有零回歸、整體 96.9%；migration 已寫待 D7 執行）、C1.2 防空避難處所（entity/匯入器/月更 job/公開端點×2/地圖圖層）、C1.3 雙目標備份（Mac mini rsync＋加密雲選配、RPO≤24h/RTO≤4h 入 RUNBOOK、戰備期月演練切換條件） |
| **Phase R（FABLE 重設計）** | 🔄 | ✅ R1 完成（DESIGN_LANGUAGE.md、雙模式 Shell、權限單一來源、24 redirect、5 權限修正、14 假 widget 頁改 placeholder、132/132 tests）；🔄 R2 旗艦頁重設計執行中；📋 待 owner 圈選 docs/audit/PAGE_REMOVAL_PROPOSAL.md（36 孤兒檔處置） |

**等 Owner 的動作**：①憑證輪換（`docs/security/CREDENTIAL_ROTATION_CHECKLIST.md`）②git 歷史清理確認 ③D7/D15 排窗口 ④D12–D14（NAS 規格/LLM 選型/通道）⑤下次部署將強制全員重新登入（JWT 更換）。

---

## 1. 專案現況總評

### 1.1 專案是什麼

Light Keepers（希望防災）是社團法人協會用的**災難應變/救災動員平台**：災情通報（intake/reports）→ 事件與任務場次（events/mission-sessions, ICS）→ 志工動員與派遣（volunteers/task-dispatch）→ 現場回報與戰術地圖（field-reports/tactical-maps）→ 資源後勤（resources/shelters/donations）→ 復盤報表（AAR/analytics）。整合 LINE Bot/LIFF、FCM 推播、NCDR 示警、Gemini AI 佇列、離線同步（PWA + RxDB + Capacitor 行動殼）。

### 1.2 技術棧（repo 實況，2026-07）

| 層 | 技術 |
|----|------|
| 後端 | NestJS 11 + TypeORM 0.3 + PostgreSQL/PostGIS + Socket.io + @nestjs/throttler + Swagger；`src/` 1,183 個 ts 檔、119 模組、122 controllers、259 services、~120 張表 |
| 整合 | LINE Bot SDK、Firebase Admin/FCM、Google Generative AI（Gemini）、GCS、Sentry、Resend/nodemailer |
| 前端 | React 19 + Vite 7 + react-router 7（8 個 route group、126 條路由、137 個頁面檔）+ lucide-react + chart.js + maplibre/pmtiles + i18next + react-query 5 + RxDB/idb 離線 + vite-plugin-pwa + Capacitor 8 |
| 部署 | GCP Cloud Run（cloudbuild.yaml, asia-east1）＋ vercel.json 並存；docker-compose 本地 |
| 測試 | 後端 355 spec（33,724 行、3,492 it）＋ e2e 13 支；前端 vitest 僅 4 檔、Playwright 8 spec（57 tests） |

### 1.3 健康度快照（三份調查交叉驗證後）

| 指標 | 數值 | 評註 |
|------|------|------|
| 後端模組 | 119 個目錄（`app.module` 只 import 112 → 有孤立模組；docs 舊記 175 為不同口徑） | 其中 **41 個模組無 controller 也無 entity**＝純記憶體 stub |
| 授權缺口 | **31 個 controller 無角色檢查**（GlobalAuthGuard 擋匿名，但任何登入者可用，含 SITREP/IAP/map-dispatch 等作戰資料）；**38 處 `@Body() xxx: any`** 令 ValidationPipe 失效 | 🔴 最高風險 |
| Schema 治理 | migration 僅 9 支 vs ~120 張表（多數表靠 synchronize 生出）；`SYNC_TABLES=true` 可在**任何環境（含 production）**開 synchronize（`database.module.ts:65` 無 NODE_ENV 阻擋）；兩個 migration 目錄其一永不執行；`audit_logs` 有 **3 個 entity class 對同一張表**、`attendance_records` 有 2 個 | 🔴 |
| 秘密管理 | JWT secret 在 5 處重複註冊且皆有硬編碼 fallback `'light-keepers-jwt-secret-2024'` | 🔴 |
| 多租戶 | ADR-001 宣稱隔離，實況：TenantGuard **0 處使用**、120 張表僅 4 張有 `tenantId`、guard 內 `roleLevel >= 6` 判斷是死碼（上限為 5） | 🔴 名實不符 |
| 前端 API 層 | **4 套 client 並存**：`api/client.ts`（完整，含 401 mutex refresh，僅 8 頁＋services 用）、`utils/api.ts`（16 頁，無 refresh）、`services/api.ts`（4 頁，token key 讀 `'token'` 而非 `'accessToken'`＝**實質無認證**）、**31 頁裸 `fetch('/api/…')`**（缺 `VITE_API_URL` 與 `/v1` 前綴，**production 必壞**，無 auth header）；另有 `/api/v1/api/aar` 路徑重複 bug | 🔴 |
| 前端後門 | `PageWrapper.tsx:29-32` 與 `client.ts:60` 有 `localStorage devModeUser` 後門（前者直接給 SystemOwner 等級） | 🔴 |
| 路由/IA | 126 條路由：**16 條空殼**（PageWrapper 無內容）、**27 個孤兒頁**（寫了沒接路由）、至少 **6 組功能有 2–3 個重複入口**（三代路由並存：legacy / 分域 / domains） | 🟡 |
| 設計系統 | 4 套 token 檔競爭、**兩套元件庫**（`design-system/` vs `components/ui/`，Button/Card/Badge/Modal 各兩份，採用率極低）、188 個 css 檔僅 16 個 module 化、~156 個 css 含硬編 hex；tailwind config 是死檔（無依賴）；leaflet 全家是死依賴（0 使用） | 🟡 |
| i18n | 13 語系檔存在，但 `useTranslation` 在 **0/137 頁**使用、i18n 只註冊 3 語 → 多語形同虛設 | 🟡 |
| 巨檔 | `WidgetContent.tsx` **2,479 行**且被 AppShellLayout 靜態 import（進不了 code-split）；頁面 >500 行者 14 檔 | 🟡 |
| Mock 殘留 | commit 3aae110 稱「all pages 遷真 API」不成立：仍有 12+ 頁硬編 mock；`domains/workforce/*` mock 版與 `pages/*` 真版**同名並存** | 🟡 |
| 測試 | 後端 spec 量大但多為淺層（mock 全依賴測非 undefined）；41 個 stub 模組的 spec 測的是假資料＝**假安全感**；jest `coverageThresholds` 拼字錯誤（正確為 `coverageThreshold`）→ 門檻從未生效；前端單元測試僅 4 檔 | 🟡 |
| 品質雜項 | 412 處 `console.log`、323 處 `: any`、tsconfig 未開 `strict`、234 處 catch 中大量「吞錯回 mock」 | 🟢-🟡 |

### 1.4 既有深度調查已接手的結論（不重做）

1. **缺口分析（audit/01）**: 7 功能域 MoSCoW 缺口，P0=11 項 92h（SITREP、IAP 簽核、志工條件篩選、案件去重、SLA、簽到簽退、Guard 全檢、敏感遮罩…）；本計畫沿用其編號（A-M1 等）。
2. **12 週路線圖（audit/05）**: 三階段結構沿用，工作項重排（見 §3）。
3. **STUB 模組分析 v2**: 早期「刪 75 個空殼」97% 誤判——但本次深掃用「無 controller 且無 entity」新口徑找到 **41 個真 stub**（純記憶體 Map、無 HTTP 出口、無持久化），與 v2 的「service 行數」口徑並不矛盾：**行數多不代表有出口**。去留屬 owner 決策（D10）。
4. **企業級架構審查**: ICS/NIMS 表單、統一離線策略、API 版本策略、國際人道標準——列入 owner 決策（D5）。
5. **NEXT_STEPS（2026-01-16）**: soft-delete 尚欠 DispatchTask/MissionSession 轉換、includeDeleted RBAC、restore endpoint（migration `1768494672978-AddDeletedAtColumns` 已存在，僅 4 entity 有 `@DeleteDateColumn`）。
6. **近期已完成**（git log 驗證）: roleLevel 改讀 DB、credentials 出 git、CORS 修正、bundle manualChunks、services.ts 拆域、E2E 基建、81 頁 lazy 化。

### 1.5 執行驗證發現（「專案深度調查」session，2026-07-31）——生產環境緊急項

此調查與 §1.3 的靜態深掃互補：它**實際執行**了測試套件、deploy workflow 分析與模組圖遞移閉包驗證。發現如下，全部進入 Phase E：

**🔴 P0 — 生產環境目前可被完全接管**

1. **正式環境 JWT 用硬編碼字串簽章**：`deploy.yml:47-48` 的 `--set-env-vars`/`--set-secrets` **漏掉 JWT_SECRET**（staging 的 `deploy-staging.yml:44` 有掛）→ production 落入 `shared-auth.module.ts:52` 的 fallback `'light-keepers-jwt-secret-2024'`（repo 公開可見）。任何人可自簽 `{"roleLevel":5,"roles":["owner"]}` token 取得 OWNER 權限，通過所有 guard。**陷阱**：`--set-secrets` 是整組取代語意，手動去 Cloud Run 補值會在下次 push 被清掉，必須改 workflow。修復含輪換 Secret Manager 的值。
2. **真實個資與憑證在 git HEAD**：`backend/users.json`（11 筆真實使用者 email＋Firebase scrypt hash＋salt）、`backend/create-owner.js`（硬編碼 owner 密碼與 DB 密碼）、`fix-schema.js` 等——先前 42325df 未涵蓋。即使現在刪除，歷史仍在：**密碼與 hash 視為已洩漏，須輪換＋通知使用者重設**。

**🟠 P1 — 已上線但實際壞掉**

3. **16 個後端模組被 import 但從未註冊**：`app.module.ts` 被網頁編輯器壓掉換行，模組名被吃進 `//` 註解（如 `:305`）→ `/donations/*`（前端 DonationsPage 的 13 個端點全 404）、`/tactical-maps/*`、`/fire-119/*` 等端點根本不存在。後端無 ESLint、未開 `noUnusedLocals`，所以沒被擋下。
4. **LINE Bot webhook 生產環境全死**：`line-bot.controller.ts:30` 的 `@Post('webhook')` 沒有 `@Public()`，default-deny 全域 guard 使 LINE 的 POST 一律 401。且簽章驗證用 `JSON.stringify(body)` 而非 raw body、比對非 constant-time。
5. **CI 紅燈照樣部署**：main 上 `forecast.service.spec.ts` 確定性失敗（4 tests，mock 錯方法名）；`deploy.yml` 是獨立 workflow 無 `needs:`，E2E `continue-on-error: true`、lint `|| true`、audit `|| true` —— 四道關卡實際都不擋。
6. **依賴漏洞 84 個**（4 critical / 22 high，`ws` 等）。

**🟡 P2 — 系統性（併入既有主題執行）**

7. Schema 補充事實（併 BE-2）：7 支 TypeORM migration 之外還有 **6 支裸 `.sql`**在 TypeORM 管理外；**staging `SYNC_TABLES=true` vs production false → 兩邊 schema 必然發散**；deploy 無 migration job。
8. **`docs/proof/` 稽核產物給假信心**（併 XC-2/XC-3）：`scan-routes-guards.ps1` 是靜態掃描，把 16 個死模組的路由算成「已保護」；proof 報告引用的行號/數量已與 repo 脫節但狀態仍 PASS。需改讀 NestJS 實際路由表（`app.getHttpAdapter().getInstance()._router`）並重產 proof。
9. **授權邏輯從未被測過**（併 FE-5/XC-3）：controller spec 一律 `overrideGuard(...).useValue({canActivate:()=>true})`；需補不 override guard 的真實授權測試。
10. **前端 51% 檔案不可達**（強化 FE-1 數據）：從 `main.tsx` 遞移分析，411 檔中 **209 不可達**（含 30 個 Page）；`context/` vs `contexts/`、兩份 liff service 均 0 引用。
11. **docker-compose 本地跑不起來**（直接影響 Phase M）：`docker-compose.yml:36` 傳 `DATABASE_URL`，但 backend 只讀 `DB_HOST`/`DB_USERNAME`/… → 容器內 fallback localhost 連不到 postgres。NAS 搬遷前必修（工作項 M.0）。

### 1.6 做得不錯、應保留的部分

Helmet+CSP、CORS 白名單、全域 ValidationPipe（設定正確，被 `any` 繞過是另一回事）、default-deny GlobalAuthGuard、Outbox pattern、AI 佇列的 circuit breaker/rate limiter、Storage 抽象層（local/GCS）；前端 81 頁 lazy + manualChunks、PWA 快取策略、CommandPalette、`api/client.ts` 的 401 mutex refresh 設計。**重設計不是砍掉重練，是收斂到既有的最佳實作。**

---

## 2. 優化 / 重設計主題

每主題：問題 → 建議方向 → 影響範圍 → 風險 → 驗收。

### 前端

#### FE-1 路由/IA 三方對帳與收斂
- **問題**: 126 條路由中 16 條空殼、27 個孤兒頁、6+ 組重複入口（`/volunteers` ↔ `/workforce/people` ↔ `/domains/workforce/personnel` 等三代並存）；`page-policy.ts` 自稱 single source of truth 但 requiredLevel 實際散在 route JSX 與 `useSidebarConfig` 三處。
- **方向**: 先產出「route × page × sidebar × requiredLevel」四方對帳表 → owner 圈選去留 → 收斂為單代路由＋權限單一來源（page-policy 真正接管）。
- **影響**: `src/routes/*`、`useSidebarConfig`、`LazyPages.tsx`；不動後端。
- **風險**: 低（純前端可回滾）；舊 URL 需留 redirect。
- **驗收**: 空殼路由清零；孤兒頁清零（接上或刪除）；每功能唯一入口＋redirect；權限僅一處定義；navigation e2e 更新通過。

#### FE-2 設計系統收斂（4 套 token → 1、2 套元件庫 → 1）
- **問題**: token 檔 4 套競爭（design-tokens.css / tokens/ / theme.css / design-system/variables.css）＋孤兒 css；`design-system/` 與 `components/ui/` 元件庫重疊且採用率極低；188 css 檔僅 16 個 module 化；~156 檔硬編 hex；tailwind 死檔、leaflet 死依賴。
- **方向**: 擇定單一 token 來源與單一元件庫（建議以 `design-system/` 為底、合併 `components/ui/` 可取部分）；刪死檔死依賴；新頁一律 module.css＋tokens；existing 頁批次換皮。
- **影響**: 前端全域；不動 API。
- **風險**: 低-中（視覺回歸）；Playwright 截圖比對＋分批 PR。
- **驗收**: token 檔唯一；元件庫唯一且 Button/Card/Badge/Modal 無重複；硬編 hex 檔數 -80%；`npm ls` 無死依賴。

#### FE-3 巨型元件拆分與效能
- **問題**: `WidgetContent.tsx` 2,479 行且靜態 import 進 AppShellLayout（所有 widget 程式碼進首屏 bundle）；`PageWrapper` 雙模式（children vs widget）是空殼頁根因；14 個頁面 >500 行。
- **方向**: widget registry 化＋動態 import；PageWrapper 模式明確化（widget 頁必須有 config，否則 build error）；巨頁拆 container/presentational。
- **影響**: layout 層與大頁。
- **風險**: 低（行為不變重構）；e2e 護航。
- **驗收**: 無單檔 >800 行；WidgetContent 進 code-split（首屏 JS 減量以 visualizer 佐證）；e2e 全綠。

#### FE-4 API 層統一（4 套 → 1）＋錯誤/狀態慣例
- **問題**: 見 §1.3——4 套 client、broken token key、31 頁裸 fetch production 必壞、`/api/v1/api/*` 路徑重複 bug、react-query 僅 12 檔使用、錯誤處理各頁自造。
- **方向**: 一律收斂到 `src/api/client.ts`；裸 fetch 與 `utils/api.ts`、`services/api.ts` 批次遷移；react-query 定為資料存取標準（loading/error/retry 統一）；修 path 重複 bug；移除 devModeUser 後門（另列 SEC 項）。
- **影響**: 31＋16＋4 頁的資料層改寫；離線 outbox 三套檔（offlineSync/offline-sync/offlineOutbox）收斂屬其中子項。
- **風險**: 中——觸碰認證與離線正確性；離線部分先補測試再動。
- **驗收**: 全站僅一個 client 出口（ESLint rule 禁 import 舊路徑與裸 fetch）；壞掉的 31 頁在 production build 下實測可用；離線寫入 e2e 通過。

#### FE-5 前端測試防護網
- **問題**: 單元測試 4 檔；頁面級/元件級 0；換皮期間無回歸保障。
- **方向**: 關鍵 hook/元件補 vitest；Playwright 擴充角色矩陣（L0–L5 smoke path）＋視覺快照；CI gate 化。
- **風險**: 無（純新增）。
- **驗收**: 核心 flow（登入→通報→派遣→回報）e2e 化；CI 必過。

#### FE-6 i18n 決策與收斂
- **問題**: 0/137 頁使用 useTranslation；13 語系檔只註冊 3 語；兩套 locales 目錄並存；頁面文字全硬編繁中。
- **方向**: 待 owner 決策（D11）：若多語是真需求→從版型元件開始逐層接；若不是→刪 10 個死語系檔與重複目錄，明文降級為 zh-TW 單語＋en 備援。
- **風險**: 低。
- **驗收**: 依決策而定；至少死資產清零。

### 後端

#### BE-1 授權完整性（Guard 100%＋DTO 驗證＋敏感遮罩）
- **問題**: 31 個 controller 無角色檢查（SITREP/IAP/map-dispatch/audit 等高價值目標在列）；38 處 `@Body() any` 繞過 ValidationPipe；guard 疊床架屋（14 個 guard、新舊三版並存）；敏感遮罩（F-M2）未實作；`@Public()` 23 處需逐一附 reason。
- **方向**: 掃描產清單 → 逐端點定 `@RequiredLevel`（正確性判斷）→ 補 DTO 消滅 `any` body → `SensitiveDataInterceptor` 依 roleLevel 遮罩 → guard 收斂至 shared/ 新版一套、刪舊版 → guard 覆蓋率進 CI gate。
- **影響**: 全部 controllers、`common/`、`shared/`。**不碰 DB schema。**
- **風險**: 中-高——權限過嚴會弄斷前端；需與 FE-4 成對驗證。
- **驗收**: 靜態掃描 0 個裸 controller（public 白名單附 reason）；`@Body() any` 清零；遮罩有 spec；全 e2e 通過。

#### BE-2 Schema 治理（本次深掃新增的最高優先後端項）
- **問題**: ① `SYNC_TABLES` 可在 production 開 synchronize＋`autoLoadEntities`（一個環境變數即可改壞正式 schema）；**且 staging 實際就開著 `SYNC_TABLES=true` 而 production 為 false → 兩環境 schema 必然發散** ② migration 僅 9 支 vs ~120 張表，另有 **6 支裸 `.sql` 在 `backend/migrations/`（TypeORM 管理外）**；deploy workflow 完全不跑 migration ③ `src/database/migrations/` 2 支永不執行 ④ `audit_logs` 3 個 entity class 對同一張表、`attendance_records` 2 個——TypeORM schema 衝突隱患 ⑤ JWT secret fallback（Phase E.1 已排除後，此處負責制度化：secret 一律注入、缺值 fail-fast）。
- **方向**: (a) `SYNC_TABLES` 在 `NODE_ENV=production` 硬性禁用＋啟動時 fail-fast；(b) 以 `migration:generate` 對現行 DB 做 **baseline migration**；(c) 廢棄第二 migration 目錄（內容併入或標記棄用）；(d) 重複 entity 收斂為一份（先確認欄位聯集，不動資料）；(e) JWT secret 收斂為單一注入點、無 fallback、缺值即拒絕啟動。
- **影響**: database module、entities、部署設定。(a)(e) 是純程式；(b) **碰正式 DB 的操作流程**（生成 baseline 需對照正式 schema）。
- **風險**: 高（正確性關鍵）但動作本身保守——baseline 不改表，只是把現況固化成可版控的 migration。
- **驗收**: production 環境變數審查通過；`migration:run` 可在乾淨 DB 重建全 schema；重複 entity 清零；漏設 JWT_SECRET 時啟動失敗。

#### BE-3 API 治理（分頁、N+1、版本策略）
- **問題**: 部分 list 端點無分頁；N+1 存在；`/api/v1/` 無演進策略；DTO 覆蓋率低（122 controllers 僅 31 個 dto 檔，與 BE-1 的 `any` 問題同源）。
- **方向**: 統一 `PaginatedResponse` DTO＋上限；query log 驅動修 N+1；版本策略寫 ADR。
- **影響**: API 形狀改變 → **前後端成對 PR**。
- **風險**: 中-高（breaking）。
- **驗收**: list 端點 100% 有分頁；熱點端點 P95 < 500ms。

#### BE-4 Stub 模組與狀態儲存治理
- **問題**: 41 個模組無 controller 無 entity（blockchain 假鏈、image-recognition 回假座標、rag-knowledge 關鍵字假 RAG…）；**70 個 service 用 `private Map<>` 存狀態**——Cloud Run 多實例下狀態遺失/不一致；`incident-event.handler` 7 個 handler 全 TODO＝事件匯流排空轉；大量 catch 吞錯回 mock。
- **方向**: ✅ **已拍板（D10）：刪除**。執行程序：先產 app.module import 依賴圖確認無隱性依賴 → 分批刪除（每批一 PR＋CI 綠燈）→ 對應 spec/路由/文件一併清；核心模組中殘存的 Map 狀態遷往 DB/Redis；吞錯回 mock 的 catch 改為顯式錯誤。附帶效益：Gemini 依賴面大幅縮小（10+ 處 → 3 處），直接降低 Phase M 本地 LLM 切換成本。
- **影響**: 最多可砍 1/3 維護面積；不碰核心業務表。
- **風險**: 中——「測試通過」不代表功能真實，砍之前要確認無隱性依賴（app.module import 圖分析）。
- **驗收**: 每個 stub 有處置標記；production 路徑上無記憶體 Map 當持久層；catch-return-mock 清零。

#### BE-5 後端品質債
- **問題**: jest `coverageThresholds` 拼字錯誤（門檻從未生效）、412 個 console.log、323 個 `: any`、tsconfig 未開 strict、rate limit 僅全域兩檔（登入/OTP 未收緊）、`app.module.ts` 399 行 112 imports、重複命名 service 10+ 組（`resources`/`unified-resources`、`reports`/`unified-reporting` 新舊並存）。
- **方向**: 拼字修正＋門檻逐步調升；console.log → CloudLogger 批次替換；strict 分包開啟；敏感端點 `@Throttle` 收緊；重複 service 收斂（僅在有證據時）。
- **風險**: 低-中。
- **驗收**: coverage 門檻生效且 CI 必過；console.log 清零；auth 端點有獨立限流。

### 資料

#### DA-1 索引與查詢效能
- **問題**: 49/108 entity 有 @Index；composite 不足；PostGIS 查詢（去重、距離）需 GiST。
- **方向**: 慢查詢驅動出一批索引 migration。
- **風險**: 低（僅加索引，可 revert）；正式 DB 執行需窗口（D7）。
- **驗收**: 目標查詢 explain 走索引。

#### DA-2 多租戶：名實對齊（新增，取代原「Resources 簡化」的優先位）
- **問題**: ADR-001 與 tenants 模組存在，但隔離實質未實施（4/120 表有 tenantId、TenantGuard 零使用、守衛條件是死碼）。這不只是債，是**安全模型的根本矛盾**。
- **方向**: ✅ **已拍板（D9）：走 (a) 單租戶降級**——正式承認單一協會使用，廢 TenantGuard 死碼、ADR-001 標 superseded、tenants 模組降為組織資料管理；不做核心表加 tenantId 的大工程。
- **風險**: 低（刪死碼＋文件對齊，不碰資料）。
- **驗收**: ADR 更新；實作與文件一致。

#### DA-3 Resources domain 簡化（E-M1，降級為評估項）
- **問題**: Resources 40+ entities＋`unified-resources` 並存。
- **方向**: 先 dead-entity 使用率分析，有證據才動；任何合併附遷移＋回滾。
- **風險**: 高（碰正式資料模型）；分析先行。
- **驗收**: 分析報告；動刀另立案。

### 基礎設施

#### INF-1 本地 NAS 搬遷＋本地 LLM（雲端可回遷）— 因 Google 租約到期新增
- **背景**: 現行綁定 GCP：Cloud Run（運行）、Cloud SQL（DB，`database.module.ts:52` 走 `/cloudsql/` unix socket）、GCS（檔案）、Gemini（AI）、Cloud Logging/Error Reporting、cloudbuild CI。租約到期後需搬到本地 NAS，並保留將來回雲的可能。
- **可行性評估（依 repo 實況）**: **高**。理由：
  1. **運行層**: `docker-compose.yml` 已有本地棧骨架（postgis:15 + backend + pgadmin），NAS 只要能跑 Docker（Synology/QNAP/自組皆可）即可沿用；前端 build 出靜態檔由 nginx 容器或 NAS Web Station 服務。⚠️ 但 compose 目前**實際跑不起來**（§1.5-11：傳 `DATABASE_URL` 而 backend 只讀 `DB_HOST` 等）→ 列為搬遷前置修復（工作項 M.0）。
  2. **DB**: 連線純 env 驅動（`DB_HOST` 支援一般 host），Cloud SQL → NAS PostGIS 容器只是 `pg_dump`/restore＋改 env；Phase 1 的 baseline migration 完成後，重建 schema 也有版控保障。
  3. **檔案**: 已有 `storage.interface.ts` 抽象層＋GCS/local 雙 provider，切回 local driver＋GCS 檔案批次下載到 NAS volume 即可。
  4. **AI**: Gemini 走 provider pattern（`ai-queue/providers/gemini.provider.ts`）；新增一個 **OpenAI-compatible provider** 指向本地推論服務（Ollama / vLLM，中文場景建議 Qwen 系列或 gemma），即可無痛切換。**且 D10 刪除 41 個 stub 後，Gemini 實際使用者只剩 ai-queue、line-bot 災情分類、manuals 少數幾處**，搬遷面大幅縮小。
  5. **回雲可能性**: 全程維持「Docker image＋env 組態＋migration＋storage/LLM provider 抽象」四原則，未來回任何雲（GCP/AWS/自建 k8s）都是換 env 與 provider，不改業務碼。
- **不受租約影響、可繼續用的外部服務**（皆為免費/獨立計費，與 GCP 租約無關）: LINE Bot/LIFF、FCM 推播、Google OAuth 登入、NCDR 示警來源。但 **LINE webhook 與 FCM 需要後端有對外可達的 HTTPS 端點** → NAS 需固定網域＋反向代理（建議 Cloudflare Tunnel 免開 port，或 nginx＋Let's Encrypt）。
- **需替換/降級的部分**: Cloud Logging/Error Reporting → winston 本地檔＋Sentry（自架或免費額度）；cloudbuild → GitHub Actions（build image push 到 NAS 可拉的 registry）；Cloud Run 自動擴縮 → 單機容器（協會規模可接受，尖峰另議）。
- **影響範圍**: `infra/`、docker-compose、env 組態、storage/LLM provider、資料搬遷腳本；**業務程式碼近乎不動**。
- **風險**: 中——資料搬遷（DB＋檔案）需一次性停機窗口與備援演練；NAS 單點故障需備份策略（每日 pg_dump＋檔案快照，異地一份）；本地 LLM 品質需以現有 line-bot 災情分類案例做對測驗收。
- **驗收**: NAS 上全棧啟動且 e2e 綠燈；LINE webhook/FCM 實測可達；本地 LLM 對測通過既有分類案例 ≥ 現行準確率的 90%；演練「從備份完整還原」一次；文件化回雲程序。
- **D12 落地後的目標拓撲（2026-08-01 更新）**:
  ```
  Internet ─ Cloudflare Tunnel（D14 建議）─┐
                                           ▼
  NAS AS5404T（ADM Docker，NVMe RAID 10）: nginx → backend(NestJS) → PostGIS
      │  HDD RAID 6：每日 pg_dump＋uploads 快照（異地一份→Mac mini 或雲端冷儲存）
      │
      └─ 內網 2.5GbE ─→ RTX 5090 工作站：Ollama serve（Qwen2.5-32B/14B）
                          backend 的 LLM provider 以 OpenAI-compatible API 呼叫
                          工作站離線時 fallback：佇列暫存或雲端 API（依 D13 混合策略）
  Mac mini：備援/中轉（既有 ST/iCloud 用途不變，可兼任備份第二副本）
  ```
  N5105＋16GB 承載評估：NestJS＋PostGIS＋nginx 對協會規模（百人級並發）足夠；AI 推論、PDF 大量產出等重活不落在 NAS。

### 民防韌性（Civil Defense Readiness）— 2026-08-01 依 D16 決策新增

> **背景**：平台現況為純天災導向。Owner 拍板擴充涵蓋**戰爭/恐攻/大型複合災難**。
> **既有可轉用資產**：ICS 指揮流程（情境無關）、避難所/尋親/檢傷/物資邏輯、離線 outbox（斷網通報不丟）、NAS 本地化（去境外雲依賴）——後兩項恰為戰時韌性核心且已完工。

#### CD-1 災型分類與告警擴充
- **內容**: 災型 enum 增列 空襲/砲擊/爆炸/恐攻/CBRN（化生放核）；intake 表單、地圖圖標、LLM 分類器 prompt 與對測資料同步擴充；告警源除 NCDR 外評估介接災防告警（PWS 飛彈警報屬廣播接收端，平台側做「收到警報→一鍵啟動戰時模式」的人工觸發）。
- **風險**: 低-中（enum 加值向後相容；碰 intake schema）。
- **驗收**: 新災型全流程可通報/派遣/結案；LLM 分類對新類別對測 ≥90%。

#### CD-2 防空避難設施資料介接
- **內容**: 介接內政部警政署「防空避難處所」開放資料（政府資料開放平台 CSV）→ 新增設施類型於 PublicResources；地圖圖層與離線地圖包（PMTiles）納入；與現有收容所明確區分（防空=短時躲避、收容=長期安置）。
- **風險**: 低（唯讀公開資料，加 entity 欄位/種子資料）。
- **驗收**: 地圖可查最近防空避難處所（含離線）；資料定期更新 job。

#### CD-3 大量傷患事件（MCI）流程
- **內容**: 現有單人檢傷升級為 MCI 級聯——START/JumpSTART 傷票（含離線填寫）、分流站管理、傷患追蹤（掛牌編號→後送→醫院）、醫院容量看板（人工回報起步）。
- **風險**: 高（新 entity 群＋核心流程，正確性攸關人命）。
- **驗收**: 演練情境：50 傷患從掛牌到後送全程可追；斷網下傷票可填、恢復後同步。

#### CD-4 通訊降級計畫（Degraded Comms）
- **內容**: 定義四級降級模式並逐級實作——L0 正常（LINE+FCM）／L1 無雲（NAS 本地全功能，已具）／L2 無網際網路（內網 WiFi＋離線 outbox，已具局部；補「基地台模式」文件與演練）／L3 無電力（紙本 SOP/傷票/通訊錄一鍵匯出 PDF，平時預印）。LoRa/mesh **先做 spike 評估報告**（硬體成本/覆蓋/法規）再決定投資（D17）。SMS fallback 評估（D18，需費用）。
- **風險**: 中（多為文件/匯出/演練；mesh 只做評估不實作）。
- **驗收**: 各級降級有書面 SOP＋年度演練腳本；L3 紙本包可一鍵產出。

#### CD-5 跨機關協調與政府體系介接
- **內容**: 既有 `interoperability-adapters`（EDXL DTO 已在 3.5 定型）擴充 CAP（Common Alerting Protocol）收發；與縣市 EOC/全民防衛動員體系的介接**視 owner 洽談結果**定 scope（D19）；先完成技術面（標準格式收發＋沙盒驗證）。
- **風險**: 中（外部依賴重，介接窗口非工程可控）。
- **驗收**: EDXL/CAP 樣本訊息可 round-trip；介接文件備妥供洽談。

#### CD-6 戰時資料韌性
- **內容**: 異地備份由「建議」升級為**必要**：第二備份目標（Mac mini 或加密雲端冷儲存）自動化；RPO ≤ 24h／RTO ≤ 4h 目標入 RUNBOOK；還原演練頻率季→**月**（戰備期）；NAS 實體安置建議（非臨窗/有 UPS）。
- **風險**: 低（基於既有備份腳本擴充）。
- **驗收**: 雙目標備份自動化＋一次跨目標還原演練通過。

### 跨切面

#### XC-1 安全速修包（新增：深掃直接抓到的可利用點）
- 內容：前端 `devModeUser` 後門移除（或以 build-time flag 限 dev）、`services/api.ts` 壞 token key、`/api/v1/api/*` 路徑 bug、JWT fallback（併 BE-2e 執行）、`SYNC_TABLES` 阻擋（併 BE-2a）。
- **風險**: 低——都是小 diff、高收益；適合第一週出手。
- **驗收**: 逐項有回歸測試。

#### XC-2 文件與計數對帳
- docs 內模組數/頁面數口徑矛盾；STUB v1 已 superseded 未標記；本次三份調查結論需回寫 `docs/audit/`。
- **驗收**: 單一數據來源檔；過時文件標 superseded。

#### XC-3 CI/CD 與品質 gate 強化
- gate 加項：guard 覆蓋率、`@Body() any` 禁令、前端 vitest、裸 fetch ESLint 禁令、jest `coverageThreshold` 拼字修正＋門檻逐步拉高。
- **proof 機制修真**（§1.5-8）：`scan-routes-guards.ps1` 改讀 NestJS 實際路由表（`app.getHttpAdapter().getInstance()._router`）而非靜態掃描；重產全部 `docs/proof/` 產物；proof 過期偵測（引用行號/數量 vs repo 實況）納入 gate。
- **真實授權測試**（§1.5-9）：對 `UnifiedRolesGuard`/`GlobalAuthGuard` 補不 override guard 的整合測試（各 level 打各級端點的矩陣）。
- deploy 加 migration job（配合 BE-2）；部署拓撲寫進 RUNBOOK。
- **驗收**: PR 必過新 gate；proof 與 repo 實況一致；授權矩陣測試綠燈。

#### XC-4 核心功能缺口實作（接手 audit/01 P0/P1）
- 沿用既有編號（A-M1 SITREP、B-M1 志工篩選、C-M1 去重、C-M2 SLA、D-M1 任務通知、D-M2 簽到簽退、A-M2 IAP、A-M3 指揮鏈、B-M2 送達追蹤…），細節見 `docs/audit/01-gap-analysis.md`，驗收沿用 audit/05 Gherkin。
- **風險**: 多數需新 entity/欄位（碰 schema），屬功能開發。

---

## 3. 分期路線圖

原則：**每期獨立可交付可驗證；安全速修最先；低風險純前端建立節奏；碰 schema/正式資料集中在明確窗口；功能開發最後**。

| 期別 | 主題 | 內容 | 風險屬性 | 交付驗證 |
|------|------|------|------|------|
| **Phase E**（**立即，1–3 天**） | 生產緊急止血 | §1.5 P0/P1：JWT_SECRET 補進 deploy＋輪換、憑證/個資出 git＋密碼輪換與使用者通知、app.module 16 模組復原、LINE webhook `@Public()`＋raw body 簽章、CI `needs:` 串起部署、修紅燈 spec、`npm audit fix` | 🔴 生產安全 | 偽造 token 實測失敗、LINE webhook 實測可達、紅燈 CI 阻擋部署實測 |
| **Phase 0**（~1 週） | 安全速修＋防護網 | XC-1 速修包、XC-3 gate 強化（含 proof 重產、真實授權測試）、FE-5 測試補底、XC-2 對帳、ErrorBoundary 未 commit 工作收尾 | 🟢-🟡 零 schema | 速修各有回歸測試、CI 新 gate 上線 |
| **Phase 1**（2–3 週） | 後端正確性 I | BE-2 schema 治理（SYNC_TABLES 禁用、baseline migration、重複 entity、JWT 收斂）、BE-1 前半（31 裸 controller 補 RequiredLevel） | 🔴 正確性關鍵，baseline 不改表 | 乾淨 DB 可重建、裸 controller 清零 |
| **Phase 2**（2–3 週） | 前端重設計 I | FE-1 路由/IA 對帳收斂、FE-2 設計系統收斂（含死依賴清理）、FE-3 巨檔拆分 | 🟢 純前端 | 對帳表、e2e＋截圖回歸、bundle 對比 |
| **Phase 3**（2–3 週） | 資料層統一 | FE-4 API 層 4→1（與 BE-1 後半的 DTO/遮罩成對驗證）、mock 殘頁清理、離線 outbox 收斂 | 🟡 認證/離線正確性 | ESLint 禁令生效、production build 實測 |
| **Phase 4**（2 週） | 治理決策落地 | DA-2 多租戶名實對齊（依 D9）、BE-4 stub 處置（依 D10）、FE-6 i18n（依 D11）、BE-5 品質債 | 🟡–🔴 依決策 | ADR 更新、stub 處置表 |
| **Phase 5**（3–4 週） | 核心功能缺口 | XC-4（audit P0→P1）、BE-3 分頁/N+1（前後端成對 PR）、DA-1 索引 | 🟡–🔴 新 entity/欄位 | audit/05 Gherkin、explain 驗證 |
| **Phase 6**（1–2 週） | 收尾 | DA-3 Resources 評估報告、API 版本 ADR、剩餘換皮批次、文件終稿 | 🟢（分析/文件） | 報告交付 |
| **Phase M**（機動，2–3 週，**期限由 Google 租約到期日決定**） | 本地 NAS 搬遷 | INF-1：NAS Docker 棧、DB/檔案搬遷、本地 LLM provider、對外通道（Tunnel/反代）、備份演練 | 🟡-🔴 一次性停機搬資料 | NAS 全棧 e2e 綠燈、備份還原演練 |
| **Phase R**（3–4 週，v1.7 新增，FABLE 主導） | 前端完整重設計 | FE-7：R1 設計語言＋Shell（含 2.2 IA 收斂）→ R2 旗艦頁 → R3 全站批次 → R4 回歸驗證 | 🟡 UI 大改（API/測試已穩） | 設計語言文件、災時走查、e2e＋a11y |
| **Phase C1**（2 週，D16 新增） | 民防：資料與分類 | CD-1 災型擴充、CD-2 防空避難設施、CD-6 韌性升級 | 🟢-🟡 enum/資料為主 | 新災型全流程、避難處所離線可查、雙備份演練 |
| **Phase C2**（3–4 週） | 民防：MCI＋降級 | CD-3 大量傷患流程、CD-4 通訊降級（含 LoRa spike 報告） | 🔴 新核心流程 | 50 傷患演練情境、四級降級 SOP |
| **Phase C3**（機動） | 民防：介接 | CD-5 EDXL/CAP＋政府體系介接（依 D19 洽談進度） | 🟡 外部依賴 | 標準訊息 round-trip |

依賴：Phase 1 的 baseline 需 D7 窗口；Phase 3 依賴 Phase 2 的元件層與 Phase 1 的 DTO；Phase 5 依賴 Phase 1 的 schema 治理完成。**Phase M 排程建議**：至少在租約到期前 4 週啟動；理想順序是 P1（schema 治理）→ P4 的 stub 刪除（縮小 Gemini/搬遷面）→ Phase M，但若租約期限緊迫，Phase M 可提前插隊，僅硬性依賴 P1 的 baseline migration（沒有它，NAS 重建 schema 只能整庫 dump/restore，仍可行但失去版控保障）。

---

## 4. 執行分工建議（FABLE 5 / OPUS 5 / SONNET 5）

> **v1.7（2026-08-01）owner 指示**：分工由二層升級為三層，且**前端頁面由 FABLE 5 做完整重新設計**（見 FE-7 / Phase R）。已完成項維持原二層標記為歷史記錄。

判準：
- **[FABLE]** ＝ 全新設計與最高風險取捨：前端完整重設計（設計語言/IA/旗艦頁）、人命攸關流程設計（MCI）、跨系統架構決策
- **[OPUS]** ＝ 正確性實作與複雜重構：資料模型、權限、migration、複雜後端邏輯、依 FABLE spec 的高難度實作
- **[SONNET]** ＝ 機械性批次：依 spec 的頁面批次套用、掃描盤點、文案、重複遷移

### FE-7 前端完整重新設計（FABLE 主導）— 取代原 FE-2 的「漸進換皮」路線

原 FE-2（token 收斂＋2.5 首批 20 頁換皮）為過渡；owner 指示升級為**完整重新設計**：
- **R1 設計語言與 Shell**［FABLE］：以 `tokens.css`＋戰術 UI spec（`lightkeepers_tactical_uiux_spec_utf8_bundle/`）為基礎定義完整設計語言（版型格線、密度、資訊層級、狀態色語意、動效、深淺色、行動端斷點），重新設計 AppShellLayout/Sidebar/導覽（整合 2.1 對帳表的 IA 收斂＝2.2 併入此項）；產出 `docs/architecture/DESIGN_LANGUAGE.md`＋核心版型元件實作
- **R2 旗艦頁重設計**［FABLE］：CommandCenter（COP 態勢牆）、EmergencyResponse、Map、Intake 通報、Dashboard——逐頁從資訊架構層重新設計（不是套皮），災時單手操作/高壓場景可讀性為第一原則
- **R3 全站批次套用**［SONNET 依 R1/R2 spec］：其餘頁面按新設計語言批次重建
- **R4 視覺回歸與 a11y**［SONNET］：截圖基準、對比度、鍵盤導航、行動端驗證
- **風險**: R1/R2 中（UI 大改但 API 層已穩定、測試防護網已建）；R3 低
- **驗收**: 設計語言文件；旗艦頁在災時情境走查通過；e2e 全綠；a11y AA

### 工作項總表（工作項 × 執行者 × 風險 × 期別）

| # | 工作項 | 執行者 | 風險 | 期別 |
|---|--------|:------:|:----:|:----:|
| E.1 | deploy.yml 補 `JWT_SECRET=jwt-secret:latest`＋Secret Manager 輪換＋移除 5 處 fallback 改 fail-fast | OPUS | 🔴 | PE |
| E.2 | `users.json`/`create-owner.js` 等出 git＋歷史清理＋11 位使用者密碼輪換通知 | OPUS 執行 / **owner 配合通知** | 🔴 | PE |
| E.3 | app.module.ts imports 重排（一行一模組）復原 16 個死模組＋後端加 ESLint/`noUnusedLocals` 防復發 | OPUS | 🟠 | PE |
| E.4 | LINE webhook `@Public()`＋raw body `validateSignature`＋constant-time 比對 | OPUS | 🟠 | PE |
| E.5 | 修 forecast.service.spec＋deploy.yml 加 `needs:` CI＋E2E/lint/audit 改為阻擋式 | SONNET 修 spec / OPUS 改 workflow | 🟠 | PE |
| E.6 | `npm audit fix`（84 漏洞，4 critical） | SONNET | 🟠 | PE |
| 0.1 | devModeUser 後門移除＋壞 token key＋path 重複 bug（XC-1） | OPUS | 🟡 | P0 |
| 0.2 | CI gate 加項（guard%、any 禁令、裸 fetch ESLint、jest 拼字修正）（XC-3） | OPUS 定規則 / SONNET 實作 | 🟢 | P0 |
| 0.3 | 前端 vitest 補底＋e2e 角色矩陣（FE-5） | SONNET | 🟢 | P0 |
| 0.4 | ErrorBoundary 未 commit 工作審查收尾 | OPUS | 🟢 | P0 |
| 0.5 | docs 計數對帳＋superseded 標記（XC-2） | SONNET | 🟢 | P0 |
| 1.1 | SYNC_TABLES production 禁用＋JWT secret 單點化（BE-2a/e） | OPUS | 🔴 | P1 |
| 1.2 | baseline migration 生成與驗證（BE-2b/c）。**範圍擴充（1.3 執行時發現）**：① `1768494672978-AddDeletedAtColumns` migration 是重複 entity bug 的損壞產物（對不存在的欄位 DROP，真 DB 上必 throw，幾乎可確定從未套用 → **soft-delete 欄位在生產可能根本不存在**）② 生產 `audit_logs` 實體 schema 極可能仍是 snake_case 版，audit 模組的 camelCase 寫入一直被 `AuditService.log()` 吞錯靜默失敗 → **生產稽核記錄疑似長期空轉**。1.2 需一併：廢棄/重寫損壞 migration、對照生產實際 schema 產 reconciliation migration、驗證 audit 寫入真的落庫 | OPUS | 🔴 | P1（需 D7 窗口） |
| 1.3 | audit_logs/attendance 重複 entity 收斂（BE-2d） | OPUS | 🟡 | P1 |
| 1.4 | 31 裸 controller 掃描清單 | SONNET | 🟢 | P1 |
| 1.5 | 逐端點定 RequiredLevel＋補 guard（BE-1） | OPUS | 🔴 | P1 |
| 1.6 | guard 新舊三版收斂為一套（BE-1） | OPUS | 🟡 | P1 |
| 2.1 | route×page×sidebar×權限 四方對帳表（FE-1） | SONNET 產表 / OPUS 定去留建議 | 🟢 | P2 |
| 2.2 | 路由收斂＋redirect＋權限單一來源落地（FE-1） | SONNET | 🟢 | P2 |
| 2.3 | token/元件庫二選一方案（FE-2） | OPUS | 🟢 | P2 |
| 2.4 | 死依賴/死檔清理（leaflet、tailwind config、孤兒 css）（FE-2） | SONNET | 🟢 | P2 |
| 2.5 | 首批 20 頁換皮遷移（FE-2） | SONNET | 🟢 | P2 |
| 2.6 | WidgetContent registry 化＋動態 import（FE-3） | OPUS 設計 / SONNET 執行 | 🟢 | P2 |
| 2.7 | PageWrapper 雙模式明確化（FE-3） | OPUS | 🟢 | P2 |
| 3.1 | API client 收斂方案＋ESLint 禁令（FE-4） | OPUS | 🟡 | P3 |
| 3.2 | 51 頁（31 裸 fetch＋16＋4）批次遷移到 client.ts（FE-4） | SONNET | 🟡 | P3 |
| 3.3 | 12+ mock 殘頁接真 API＋workforce 同名頁去重（FE-4） | SONNET | 🟢 | P3 |
| 3.4 | 離線 outbox 三套收斂＋補測試（FE-4） | OPUS | 🟡 | P3 |
| 3.5 | 38 處 @Body any → DTO（BE-1，與 3.2 成對驗證） | OPUS 定 DTO / SONNET 批次 | 🟡 | P3 |
| 3.6 | SensitiveDataInterceptor 遮罩（BE-1/F-M2） | OPUS | 🟡 | P3 |
| 4.1 | 多租戶名實對齊（依 D9：降級或全面實施）（DA-2） | OPUS | 🔴 | P4 |
| 4.2 | 41 個 stub 模組處置表＋執行（依 D10）（BE-4） | OPUS 裁決 / SONNET 執行刪除 | 🟡 | P4 |
| 4.3 | 70 個 Map 狀態 service 中「留用者」遷 DB/Redis（BE-4） | OPUS | 🟡 | P4 |
| 4.4 | i18n 依 D11 收斂或落地（FE-6） | SONNET | 🟢 | P4 |
| 4.5 | console.log 清理＋strict 分包＋敏感端點限流（BE-5） | SONNET 批次 / OPUS 限流策略 | 🟢 | P4 |
| 5.1 | audit P0 功能（去重/SLA/志工篩選/SITREP/簽到簽退…）（XC-4） | OPUS | 🔴 | P5 |
| 5.2 | 上述功能前端頁面接線 | SONNET | 🟢 | P5 |
| 5.3 | 分頁 DTO 統一＋端點批次改造（BE-3） | OPUS 定 DTO / SONNET 批次 | 🟡 | P5 |
| 5.4 | N+1 熱點修復（BE-3） | OPUS | 🟡 | P5 |
| 5.5 | composite/GiST 索引 migration（DA-1） | OPUS | 🟡 | P5 |
| 6.1 | Resources/unified-resources 使用率分析報告（DA-3） | OPUS | 🟢 | P6 |
| 6.2 | API 版本策略 ADR（BE-3） | OPUS | 🟢 | P6 |
| 6.3 | 剩餘頁換皮＋soft-delete 收尾（restore/includeDeleted） | SONNET / OPUS | 🟢/🟡 | P6 |
| M.0 | 修 docker-compose env 對接（`DATABASE_URL`→`DB_HOST` 等，本地棧可啟動）（INF-1） | SONNET | 🟢 | PM 前置 |
| M.1 | NAS Docker 棧設計（compose 擴充：nginx/registry/備份 job）＋回雲四原則文件化（INF-1） | OPUS | 🟡 | PM |
| M.2 | 本地 LLM provider（OpenAI-compatible/Ollama）＋模型選型對測（INF-1） | OPUS 選型 / SONNET 接線 | 🟡 | PM |
| M.3 | storage driver 切 local＋GCS 檔案批次搬遷腳本（INF-1） | SONNET | 🟡 | PM |
| M.4 | Cloud SQL → NAS PostGIS 搬遷（dump/restore＋停機窗口演練）（INF-1） | OPUS | 🔴 | PM |
| M.5 | 對外通道（Cloudflare Tunnel/反代＋TLS）＋LINE webhook/FCM 實測（INF-1） | OPUS | 🟡 | PM |
| M.6 | Cloud Logging/cloudbuild 替換（winston 本地＋GitHub Actions）＋備份還原演練（INF-1） | SONNET / OPUS 驗收 | 🟢 | PM |
| C1.1 | 災型 enum/表單/圖標/LLM prompt 擴充（CD-1） | OPUS 定分類法 / SONNET 批次接線 | 🟡 | PC1 |
| C1.2 | 防空避難處所開放資料介接＋地圖圖層＋更新 job（CD-2） | SONNET | 🟢 | PC1 |
| C1.3 | 雙目標備份自動化＋RPO/RTO 入 RUNBOOK（CD-6） | OPUS | 🟢 | PC1 |
| C2.1 | MCI 資料模型與傷票流程（START/JumpSTART、離線傷票）（CD-3） | OPUS | 🔴 | PC2 |
| C2.2 | 分流站/後送追蹤/醫院容量看板 UI（CD-3） | SONNET（依 C2.1 spec） | 🟡 | PC2 |
| C2.3 | 四級通訊降級 SOP＋L3 紙本包一鍵匯出（CD-4） | OPUS 定 SOP / SONNET 匯出實作 | 🟡 | PC2 |
| C2.4 | LoRa/mesh spike 評估報告（硬體/覆蓋/法規/成本）（CD-4） | OPUS | 🟢(報告) | PC2 |
| C3.1 | CAP 協定收發＋EDXL round-trip 沙盒（CD-5） | OPUS | 🟡 | PC3 |
| C3.2 | 政府介接技術文件包（供洽談）（CD-5） | SONNET | 🟢 | PC3 |
| R1 | 設計語言＋Shell/導覽重設計＋IA 收斂落地（FE-7，含原 2.2） | **FABLE** | 🟡 | PR |
| R2 | 旗艦頁重設計（CommandCenter/EmergencyResponse/Map/Intake/Dashboard） | **FABLE** | 🟡 | PR |
| R3 | 全站批次套用新設計語言 | SONNET（依 R1/R2 spec） | 🟢 | PR |
| R4 | 視覺回歸基準＋a11y AA 驗證 | SONNET | 🟢 | PR |
| C2.1 補註 | MCI 資料模型與傷票流程**設計**升級為 FABLE、實作 OPUS | FABLE 設計 / OPUS 實作 | 🔴 | PC2 |

**三層重派原則（未完成項適用）**：R1/R2/C2.1 設計＝FABLE；1.2 baseline、M.4/M.5 搬遷、C2.3/C2.4/C3.1＝OPUS；R3/R4/C3.2 與各批次＝SONNET。

**派工模式**: 每期 OPUS 先出細部 spec（端點清單/元件 API/遷移批次），SONNET 按清單批量執行，OPUS review 所有碰正確性的 PR。SONNET 批次工作以「每批一 PR＋e2e 綠燈」為節奏。

---

## 5. 硬約束與待 Owner 決策項

### 硬約束（從 repo 規範/實況讀出，執行時一律遵守）

1. **DB 變更只走 migration**；`SYNC_TABLES` 修正後在 production 永久禁用。
2. **CI gate 不可繞過**：`tools/audit/ci-gate-check.ps1`（含 G7 soft-delete gate）必過；新工作不得降 gate。
3. **RBAC 固定 6 級**（L0–L5，ADR-005）；roleLevel 以 DB 為準（c413558 慣例）；不回退 JWT 內嵌角色。
4. **Default-deny**：新端點必有 guard 或進 public allowlist（附 reason）；`@Public()` 現有 23 處需補 reason。
5. **ResourceOwnerGuard**（ADR-003）慣例沿用；ADR-001 多租戶依 D9 決策後更新。
6. **軟刪除為核心 entity 預設**；硬刪僅限 log/暫存。
7. **文件放 `docs/`**，架構決策寫 ADR（`docs/adr/`）。
8. 正式部署 GCP Cloud Run asia-east1；任何正式 DB 操作（baseline 對照、migration、索引）需排窗口＋備份確認（D7）。
9. 沿用既有最佳實作收斂（`api/client.ts`、shared/ 新版 guards、Outbox pattern），不另起爐灶。

### 決策記錄（已拍板，2026-07-31）

| # | 決策題 | **Owner 決定** | 對計畫的影響 |
|---|--------|----------------|--------------|
| D2 | 路由去留清單 | **依建議**：對帳表（工作項 2.1）產出後圈選 | FE-1 照常執行；圈選為 P2 內的一次輕量確認 |
| D7 | 正式 DB 操作窗口 | **依建議**：提前兩週排程、附備份確認 | P1 baseline、P5 索引、Phase M 搬遷停機皆循此程序 |
| D9 | 多租戶 | **降級為單租戶** | DA-2 走 (a) 路線：廢 TenantGuard、ADR-001 標 superseded、tenants 模組降為組織資料管理；省去核心表加 tenantId 的大工程；工作項 4.1 風險由 🔴 降為 🟡 |
| D10 | 41 個純 stub 模組 | **刪除** | BE-4 走刪除路線（工作項 4.2）：先出 app.module import 依賴圖確認無隱性依賴，分批刪除＋CI 綠燈；同時大幅縮小 Gemini 依賴面，利於 Phase M 的本地 LLM 切換 |
| D16 | 民防韌性（戰爭/恐攻/大型災難） | **同意新設計（2026-08-01）** | 新增 CD-1~6 主題與 Phase C1–C3（見 §2 民防韌性節）；衍生新決策 D17（LoRa 硬體投資，待 C2.4 spike 報告）、D18（SMS fallback 通道費用）、D19（政府/EOC 介接窗口洽談，owner 主導） |
| D12 | NAS 硬體規格 | **已提供（2026-08-01）**：ASUSTOR AS5404T（Nimbustor 4 Gen2）、Celeron N5105 4C4T、16GB DDR4、ADM 5.1.1、4-bay HDD（RAID 6）＋4× M.2 NVMe（規劃 RAID 10 供 Docker/DB）、2× 2.5GbE。**同內網另有 RTX 5090 AI 工作站、Mac mini、中華電信固定 IP、TP-Link 網路** | Phase M 架構修正（見 INF-1 補充）：NAS 只跑 Docker 應用棧（backend＋PostGIS＋nginx，N5105/16GB 對協會規模足夠；DB volume 放 NVMe RAID 10）；**LLM 推論不在 NAS 上跑，走 RTX 5090 工作站**（Ollama/LM Studio server mode，backend 以 OpenAI-compatible endpoint 經內網呼叫）；HDD RAID 6 池承接備份（每日 pg_dump＋檔案快照） |

### 待 Owner 拍板的方向題（尚未決）

| # | 決策題 | 選項/影響 | 建議 |
|---|--------|-----------|------|
| D1 | UI 基底：以 `design-system/` 為單一元件庫換皮，或引入新 UI 框架？ | 影響 FE-2 工作量 2–3 倍 | 用既有 design-system 收斂，不引新框架 |
| D3 | 模組大合併（175→50 舊建議）正式放棄？ | STUB v2 已推翻前提 | 標 superseded；D10 已決的 41 個 stub 刪除即涵蓋主要收斂 |
| D4 | Capacitor 行動殼定位：積極維護或凍結？ | 影響離線工作深度 | 需 owner 表態使用實況 |
| D5 | 國際標準（HXL/IATI、ICS 表單、多國隱私法）做到什麼程度？ | 工作量大 | 僅保 ICS 表單，列 P5 之後 |
| D6 | 部署路徑收斂 | 因租約到期，主路徑改為 **NAS（Phase M）**；Vercel 是否保留作前端 preview？ | 保留 preview 或一併撤除，成本皆低 |
| D8 | Resources domain 是否動刀 | 待 6.1 分析報告 | 報告後再決 |
| D11 | 多語系是真需求嗎？（現況 0/137 頁使用，13 語系檔 10 個未註冊） | 若是，工作量≈從零開始 | 需 owner 確認服務對象語言構成 |
| D12 | **NAS 硬體與規格**：現有 NAS 型號/CPU/RAM/是否有 GPU？ | 決定本地 LLM 選型上限（無 GPU → 小模型或外接推論機）與 Docker 可行性 | 提供型號後由 OPUS 評估 |
| D13 | **本地 LLM 模型選型**：中文災情分類場景 | **2026-08-01 實機修正**：GPU 主機實測為 **RTX 4080 SUPER 16GB**（非截圖所述 5090/32GB）→ 32B 裝不下，上限 ~14B。**Owner 要求與其他專案（ST）共用同一 Ollama、不切換模型**——實測該機 Ollama 已有 14 模型在庫，ST 常駐的是 `nomic-embed-text`（嵌入模型，0.3GB，與聊天模型不衝突）。**2026-08-01 實測定案：`qwen2.5:7b-instruct`**——20 題內建災情分類對測：7b＝95% 準確/0 失敗/平均 6.4s；qwen3:14b＝95%/1 次呼叫失敗/平均 13.8s（思考模式拖慢）→ 同準確度下 7b 快一倍、VRAM 省一半（4.7GB），與 ST 的嵌入模型共存無壓力。正式上線前建議用真實通報資料（`--dataset`）複測一次 | 模型已在庫免下載；`qwen2.5vl:7b` 視覺模型也在庫，未來可評估把災情照片分析本地化 |
| D14 | **對外通道方式** | D12 確認有**中華電信固定 IP** → 兩案皆可行：(a) Cloudflare Tunnel（仍建議：隱藏 IP、免開 port、擋 DDoS）(b) 固定 IP 直連＋nginx＋Let's Encrypt（延遲較低，需自管防火牆） | 建議仍取 (a)；LINE webhook 對來源 IP 無要求，Tunnel 完全相容 |
| D15 | **搬遷停機窗口與租約到期日** | 決定 Phase M 是否插隊到 P1 之後 | 告知到期日後排定 |

---

## 附錄：調查來源與狀態

- ✅ 既有調查文件全數接手（audit 00–05、architecture 5 份、ADR 5 份、NEXT_STEPS、安全稽核）。
- ✅ 後端逐模組深掃完成（119 模組、guard/schema/tenant/測試實況，證據含 file:line）。
- ✅ 前端逐頁深掃完成（126 路由×137 頁對帳、API 層 4 套實測、設計系統盤點、i18n 實況）。
- ✅ **「專案深度調查」session 執行驗證報告已整合**（worktree `project-deep-investigation-55b1c1`；實跑測試 355 suites、deploy workflow 分析、模組圖遞移閉包、前端可達性分析 411 檔）——其 P0/P1 結論構成 §1.5 與 Phase E；其 P2 結論已併入 BE-2/XC-3/FE-1。
- 📌 深掃細節證據（file:line 級）保存在本計畫引用處；執行各工作項時以 repo 當下實況 re-verify。
