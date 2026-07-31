# Light Keepers（希望防災）前後端優化與重新設計 — 設計總綱與執行計畫

> **版本**: v1.1（規劃階段，不含任何程式/schema 變更）
> **日期**: 2026-07-31
> **定位**: 本文件是「優化＋重新設計」的總綱與分工計畫，後續由 OPUS（架構/正確性）與 SONNET（UI/機械性）分工執行。
> **資料來源**: ① 既有深度調查（`docs/audit/00–05`、`docs/architecture/*`、`docs/NEXT_STEPS.md`、ADR-001~005）② 2026-07-31 後端逐模組深掃 ③ 2026-07-31 前端逐頁深掃。三份來源已全部整合，無待補項。

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

### 1.5 做得不錯、應保留的部分

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
- **問題**: ① `SYNC_TABLES` 可在 production 開 synchronize＋`autoLoadEntities`（一個環境變數即可改壞正式 schema）② migration 僅 9 支 vs ~120 張表，多數表無版本控管、無法重建回滾 ③ `src/database/migrations/` 2 支永不執行 ④ `audit_logs` 3 個 entity class 對同一張表、`attendance_records` 2 個——TypeORM schema 衝突隱患 ⑤ JWT secret 5 處硬編碼 fallback。
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
- **方向**: 41 個 stub 逐一標記【刪除/凍結（feature flag 隔離）/排入實作】——決策權在 owner（D10）；留下者的 Map 狀態遷往 DB/Redis；吞錯回 mock 的 catch 改為顯式錯誤。
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
- **方向**: 待 owner 拍板（D9）：**(a) 單租戶降級**——正式承認單一協會使用，廢 TenantGuard、ADR-001 標 superseded（省大量成本）；或 **(b) 真多租戶**——核心表全面加 tenantId＋資料回填＋guard 全面啟用（大工程，碰所有資料）。
- **風險**: (a) 低；(b) **極高**（正式資料遷移）。
- **驗收**: ADR 更新；實作與文件一致。

#### DA-3 Resources domain 簡化（E-M1，降級為評估項）
- **問題**: Resources 40+ entities＋`unified-resources` 並存。
- **方向**: 先 dead-entity 使用率分析，有證據才動；任何合併附遷移＋回滾。
- **風險**: 高（碰正式資料模型）；分析先行。
- **驗收**: 分析報告；動刀另立案。

### 跨切面

#### XC-1 安全速修包（新增：深掃直接抓到的可利用點）
- 內容：前端 `devModeUser` 後門移除（或以 build-time flag 限 dev）、`services/api.ts` 壞 token key、`/api/v1/api/*` 路徑 bug、JWT fallback（併 BE-2e 執行）、`SYNC_TABLES` 阻擋（併 BE-2a）。
- **風險**: 低——都是小 diff、高收益；適合第一週出手。
- **驗收**: 逐項有回歸測試。

#### XC-2 文件與計數對帳
- docs 內模組數/頁面數口徑矛盾；STUB v1 已 superseded 未標記；本次三份調查結論需回寫 `docs/audit/`。
- **驗收**: 單一數據來源檔；過時文件標 superseded。

#### XC-3 CI/CD 與品質 gate 強化
- gate 加項：guard 覆蓋率、`@Body() any` 禁令、前端 vitest、裸 fetch ESLint 禁令、jest 門檻修正；部署雙軌用途寫進 RUNBOOK。
- **驗收**: PR 必過新 gate。

#### XC-4 核心功能缺口實作（接手 audit/01 P0/P1）
- 沿用既有編號（A-M1 SITREP、B-M1 志工篩選、C-M1 去重、C-M2 SLA、D-M1 任務通知、D-M2 簽到簽退、A-M2 IAP、A-M3 指揮鏈、B-M2 送達追蹤…），細節見 `docs/audit/01-gap-analysis.md`，驗收沿用 audit/05 Gherkin。
- **風險**: 多數需新 entity/欄位（碰 schema），屬功能開發。

---

## 3. 分期路線圖

原則：**每期獨立可交付可驗證；安全速修最先；低風險純前端建立節奏；碰 schema/正式資料集中在明確窗口；功能開發最後**。

| 期別 | 主題 | 內容 | 風險屬性 | 交付驗證 |
|------|------|------|------|------|
| **Phase 0**（~1 週） | 安全速修＋防護網 | XC-1 速修包、XC-3 gate 強化、FE-5 測試補底、XC-2 對帳、ErrorBoundary 未 commit 工作收尾 | 🟢-🟡 零 schema | 速修各有回歸測試、CI 新 gate 上線 |
| **Phase 1**（2–3 週） | 後端正確性 I | BE-2 schema 治理（SYNC_TABLES 禁用、baseline migration、重複 entity、JWT 收斂）、BE-1 前半（31 裸 controller 補 RequiredLevel） | 🔴 正確性關鍵，baseline 不改表 | 乾淨 DB 可重建、裸 controller 清零 |
| **Phase 2**（2–3 週） | 前端重設計 I | FE-1 路由/IA 對帳收斂、FE-2 設計系統收斂（含死依賴清理）、FE-3 巨檔拆分 | 🟢 純前端 | 對帳表、e2e＋截圖回歸、bundle 對比 |
| **Phase 3**（2–3 週） | 資料層統一 | FE-4 API 層 4→1（與 BE-1 後半的 DTO/遮罩成對驗證）、mock 殘頁清理、離線 outbox 收斂 | 🟡 認證/離線正確性 | ESLint 禁令生效、production build 實測 |
| **Phase 4**（2 週） | 治理決策落地 | DA-2 多租戶名實對齊（依 D9）、BE-4 stub 處置（依 D10）、FE-6 i18n（依 D11）、BE-5 品質債 | 🟡–🔴 依決策 | ADR 更新、stub 處置表 |
| **Phase 5**（3–4 週） | 核心功能缺口 | XC-4（audit P0→P1）、BE-3 分頁/N+1（前後端成對 PR）、DA-1 索引 | 🟡–🔴 新 entity/欄位 | audit/05 Gherkin、explain 驗證 |
| **Phase 6**（1–2 週） | 收尾 | DA-3 Resources 評估報告、API 版本 ADR、剩餘換皮批次、文件終稿 | 🟢（分析/文件） | 報告交付 |

依賴：Phase 1 的 baseline 需 D7 窗口；Phase 3 依賴 Phase 2 的元件層與 Phase 1 的 DTO；Phase 4 依賴 D9/D10/D11 拍板；Phase 5 依賴 Phase 1 的 schema 治理完成（新 entity 才有乾淨的 migration 流程）。

---

## 4. 執行分工建議（OPUS / SONNET）

判準：**[OPUS]** ＝ 架構、資料模型、權限/正確性、需取捨判斷；**[SONNET]** ＝ UI 換皮、元件抽取、批次遷移、文案、機械性掃描。

### 工作項總表（工作項 × 執行者 × 風險 × 期別）

| # | 工作項 | 執行者 | 風險 | 期別 |
|---|--------|:------:|:----:|:----:|
| 0.1 | devModeUser 後門移除＋壞 token key＋path 重複 bug（XC-1） | OPUS | 🟡 | P0 |
| 0.2 | CI gate 加項（guard%、any 禁令、裸 fetch ESLint、jest 拼字修正）（XC-3） | OPUS 定規則 / SONNET 實作 | 🟢 | P0 |
| 0.3 | 前端 vitest 補底＋e2e 角色矩陣（FE-5） | SONNET | 🟢 | P0 |
| 0.4 | ErrorBoundary 未 commit 工作審查收尾 | OPUS | 🟢 | P0 |
| 0.5 | docs 計數對帳＋superseded 標記（XC-2） | SONNET | 🟢 | P0 |
| 1.1 | SYNC_TABLES production 禁用＋JWT secret 單點化（BE-2a/e） | OPUS | 🔴 | P1 |
| 1.2 | baseline migration 生成與驗證（BE-2b/c） | OPUS | 🔴 | P1 |
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

### 待 Owner 拍板的方向題

| # | 決策題 | 選項/影響 | 建議 |
|---|--------|-----------|------|
| D1 | UI 基底：以 `design-system/` 為單一元件庫換皮，或引入新 UI 框架？ | 影響 FE-2 工作量 2–3 倍 | 用既有 design-system 收斂，不引新框架 |
| D2 | 路由去留清單：16 空殼＋27 孤兒＋重複入口，哪些刪、哪些留 roadmap？ | 影響 FE-1；git 可回復 | 對帳表出來後圈選 |
| D3 | 模組大合併（175→50 舊建議）正式放棄？ | STUB v2 已推翻前提 | 標 superseded，僅按 D10 處理 41 個真 stub |
| D4 | Capacitor 行動殼定位：積極維護或凍結？ | 影響離線工作深度 | 需 owner 表態使用實況 |
| D5 | 國際標準（HXL/IATI、ICS 表單、多國隱私法）做到什麼程度？ | 工作量大 | 僅保 ICS 表單，列 P5 之後 |
| D6 | 部署雙軌（Cloud Run＋Vercel）收斂為單一路徑？ | 影響 RUNBOOK 與 CI | 收斂到 Cloud Run，Vercel 若僅 preview 用途則明文化 |
| D7 | 正式 DB 操作窗口（P1 baseline、P5 索引、soft-delete migration） | 需協會方指定離峰＋備份 | 提前兩週排程 |
| D8 | Resources domain 是否動刀 | 待 6.1 分析報告 | 報告後再決 |
| D9 | **多租戶：降級為單租戶（省大量成本）或真正實施（碰所有核心表）？** | 本次深掃最大的架構決策 | 若平台只服務單一協會 → 選降級 |
| D10 | **41 個純 stub 模組：刪除/凍結/排入實作？**（blockchain、image-recognition、rag-knowledge 等） | 可砍 1/3 維護面積 | 無產品承諾者刪除，其餘 feature flag 凍結 |
| D11 | 多語系是真需求嗎？（現況 0/137 頁使用，13 語系檔 10 個未註冊） | 若是，工作量≈從零開始 | 需 owner 確認服務對象語言構成 |

---

## 附錄：調查來源與狀態

- ✅ 既有調查文件全數接手（audit 00–05、architecture 5 份、ADR 5 份、NEXT_STEPS、安全稽核）。
- ✅ 後端逐模組深掃完成（119 模組、guard/schema/tenant/測試實況，證據含 file:line）。
- ✅ 前端逐頁深掃完成（126 路由×137 頁對帳、API 層 4 套實測、設計系統盤點、i18n 實況）。
- 📌 深掃細節證據（file:line 級）保存在本計畫引用處；執行各工作項時以 repo 當下實況re-verify。
