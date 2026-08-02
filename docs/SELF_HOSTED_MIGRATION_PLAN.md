# Light Keepers 自主架構改造計畫（Self-Hosted Migration Plan）

> **版本**: v1.1（規劃階段 — **本文件不含任何程式、schema 或部署變更**）
> **日期**: 2026-08-02
> **v1.1 變更**: Owner 於 2026-08-02 **全數採納 v1.0 §4 的建議**。D22/D23/D25/D26/D27/D28/D29/D30/D31 已拍板；D20/D21/D24 方向確認但屬事實查證與採購/註冊，仍需 owner 執行。全文已依決策改寫，**不再有「待 Dxx」的條件分支**；§4 分期已依決策重排並補入決策衍生的新工作項。
> **定位**: Owner 決定將希望防災平台從已失效的 GCP，改造為與 ST／DRONES 相同的自主架構：**資料庫在本地 NAS、語言模型跑桌機 GPU 的本地 Ollama、零雲端費用**。本文件盤點實際接線、提出搬遷設計、並針對「防災平台跑在家用設備上」的結構性風險做誠實分析。
> **與既有文件的關係**:
> - `docs/FULL_SYSTEM_REDESIGN_PLAN.md` §INF-1 / Phase M 是本改造的**上位計畫**，D12–D15 決策記錄在該文件。
> - `infra/nas/README.md`（553 行）是**實際操作手冊**（拓撲、儲存配置、部署步驟、備份還原、搬遷腳本、疑難排解）。本文件**不重複**其內容，只指出它的落差與新增項。
> - `docs/RUNBOOK.md` §7 已有雙目標備份與 RPO/RTO 目標。本文件 §3 對那些目標的**可達成性**提出質疑。
>
> **本文件的增量**：① 逐項在程式碼中實查的接線盤點（含既有文件已過期的部分）② 韌性與使用情境風險分析（owner 特別要求，既有文件沒有）③ 重新分期與決策記錄（D20–D31）。

---

## 0. 一句話結論

**搬遷本身的技術難度不高——`infra/nas/` 的資產已經做到八成，抽象層（storage / LLM provider）也已經就位，env 換一換就能跑。真正的問題有兩個：一是「資料還在不在」目前無人知道；二是「家用設備」與「災難時必須可用」在物理上互相衝突，這一點不是寫程式能解決的。**

因此本計畫的立場是：**技術面全本地可行且推薦；但對外告警與公眾入口這兩條關鍵路徑，明確保留雲端/混合備援，而不是硬全本地。** 詳見 §3.8。

**Owner 已於 2026-08-02 全數採納此立場**，拍板後的目標架構一句話是：

> **資料、後端、前端、AI 推論全部在自家設備（NAS ＋ 桌機 GPU，`LLM_PROVIDER=hybrid`）；公眾入口與緊急靜態頁走 Cloudflare 免費邊緣層；異地備份走加密雲端冷儲存（月費個位數美金）；管理面走 Tailscale。平台定位為「內部為主、公眾唯讀」，不對外承諾 24/7 SLA。**

實際持續性的雲端支出只有一項：**加密雲端冷儲存的月費（個位數美金）**。Gemini 只在工作站不可用時被呼叫，Cloudflare 用的全是免費方案。

---

## 1. 現況接線盤點（實查，非引用舊文件）

盤點方式：直接讀 `backend/src/`、`web-dashboard/src/`、`infra/`、`.github/workflows/` 的原始碼與組態，不採信既有文件的敘述（既有文件已被查出多處過期，見各節 ⚠ 標記）。

分級定義：

| 標記 | 意義 |
|---|---|
| 🟢 **好搬** | 改 env 或小幅改碼即可，無外部依賴 |
| 🟡 **要繞** | 需要替代方案、額外元件，或功能會降級 |
| 🔴 **天生外部** | 本質上無法自架（作業系統層／第三方平台強制），只能接受依賴或改用其他通道 |

---

### 1.1 Gemini / LLM — 🟢 文字場景好搬，🟡 影像與語音要繞

**抽象層狀態：已完成，比文件記載的更完整。**

`backend/src/modules/ai-queue/providers/` 下已有完整的 provider 路由層：

| 檔案 | 內容 |
|---|---|
| `llm-provider.service.ts` | 三模式路由器：`gemini` / `local` / `hybrid`。hybrid 會先用 `GET /models` 探測工作站（`LLM_CONNECT_TIMEOUT_MS`，預設 3s），結果快取 `LLM_HEALTH_CACHE_MS`（預設 30s），不可達時降級到 Gemini 並記 WARN；`local` 模式失敗**明確拋錯不偷偷降級**。 |
| `openai-compatible.provider.ts`（＋spec） | Ollama / vLLM / LiteLLM 相容的 provider **已實作** |
| `gemini.provider.ts` | 原雲端 provider |
| `health.controller.ts` | 已有 `/health/llm` 端點回報 mode/active/兩邊健康 |

> ⚠ **既有文件已過期**：`infra/nas/README.md` §8「已知待辦」仍寫「LLM provider 接線：實際的 OpenAI-compatible provider 尚未實作」。實際上已實作並有測試。該行應刪除。

**仍直接使用 Gemini、未經抽象層的呼叫點（實查 6 處）：**

| 檔案 | 用途 | 呼叫方式 | 搬遷難度 |
|---|---|---|---|
| `modules/manuals/manuals.service.ts` | 手冊 AI 檢索 | `new GoogleGenerativeAI` → `gemini-1.5-flash` | 🟢 純文字，改注入 `LlmProviderService` 即可 |
| `modules/psychological-support/pfa-chatbot.service.ts` | 心理急救對話 | 裸 `fetch` 打 `generativelanguage.googleapis.com`，且**直接讀 `process.env.GEMINI_API_KEY`**（繞過 ConfigService） | 🟢 純文字；已有 template fallback，降級路徑現成 |
| `modules/voice/voice-transcription.service.ts`（SITREP 摘要段） | 語音記錄 → SITREP 摘要 | 裸 `fetch`，`gemini-1.5-flash` | 🟢 純文字 |
| `modules/voice/voice-transcription.service.ts`（轉錄段） | 音檔 → 文字 | Gemini multimodal | 🟡 需 ASR（Whisper/faster-whisper） |
| `modules/ai-queue/use-cases/image-analysis.usecase.ts` | 災害現場照片分析 | `GeminiProvider`，程式碼中**刻意註記不走抽象層**（本地模型為純文字） | 🟡 需 VLM |
| `modules/ai-queue/use-cases/voice-transcription.usecase.ts` | 佇列版語音轉錄 | 同上，刻意註記 | 🟡 需 ASR |

另 `modules/line-bot/disaster-report/ai-classification.service.ts` 是混合的：**文字分類已走 `LlmProviderService`**（M.2 完成），**影像分析仍直接用 Gemini**。

**🔴 實查發現的關鍵組態缺口（會讓「零雲端費用」直接失效）：**

`infra/nas/docker-compose.nas.yml:129-131` 與 `infra/nas/.env.nas.example:91-94` 設定了 `LLM_BASE_URL` / `LLM_MODEL` / `LLM_API_KEY`，**但兩處都沒有設 `LLM_PROVIDER`**。而 `llm-provider.service.ts` 的 `parseMode()` 在該值缺席時**預設回 `'gemini'`**。

> **後果**：照現在的 `infra/nas/` 資產部署上 NAS，所有 LLM 流量仍然 100% 打 Gemini——工作站上的 Ollama 一次都不會被呼叫，Google 帳單照跑。修正只需在 compose 與 `.env.nas.example` 各加一行，但不加就整個本地化目標落空。

**模型選型的兩處不一致，需 owner 確認：**

1. `LLM_MODEL` 在 compose 與 `.env.nas.example` 的預設值都是 `qwen2.5:32b-instruct`，但 `FULL_SYSTEM_REDESIGN_PLAN.md` 的 **D13 已於 2026-08-01 實機定案為 `qwen2.5:7b-instruct`**（20 題災情分類對測：7b＝95% 準確／0 失敗／平均 6.4s；qwen3:14b＝95%／1 次呼叫失敗／平均 13.8s，思考模式拖慢）。NAS 組態的預設值是**未同步的舊值**。
2. **GPU 機型記載互相矛盾**：D12 記為「RTX 5090」（`infra/nas/README.md` 拓撲圖也照抄），D13 的實機量測記為「**RTX 4080 SUPER 16GB**」。16GB 裝不下 32B。這會直接影響 §3.6 的 GPU 競爭分析，**請 owner 確認實際機型與 VRAM**。

> 本次 owner 指示提到「本地 Ollama qwen3」。依 repo 內既有的實機對測結果，**qwen3:14b 在同準確度下比 qwen2.5:7b 慢一倍、VRAM 多一倍，且出現過呼叫失敗**。
>
> ✅ **已拍板（D22，2026-08-02）：採用 `qwen2.5:7b-instruct`。** compose 與 `.env.nas.example` 的 `LLM_MODEL` 預設值須一併從 `qwen2.5:32b-instruct` 改過來（工作項 S2.1）。正式上線前依 D13 建議，用真實通報資料以 `--dataset` 複測一次（工作項 S2.3）。

---

### 1.2 Firebase — 必須拆成三件事分別看

把 Firebase 當一個東西看會做錯決策。實查後它是三個獨立的東西，難度天差地遠：

#### (a) Firebase Auth — 🟢 好搬（可能根本沒人在用）

- `modules/auth/services/firebase-admin.service.ts`：`verifyIdToken`、`createFirebaseUser`、`generateEmailVerificationLink`、`setEmailVerified`、`deleteFirebaseUser`。
- 使用者：`auth.service.ts` 的 `loginWithFirebaseToken()`（Firebase ID Token 登入）與 Email 驗證流程；`accounts.service.ts` 刪帳號時同步刪 Firebase 使用者。
- **但本地帳密登入（`passwordHash` + 自簽 JWT）是主路徑**，Firebase 登入是可選的第二條路。
- **前端 `web-dashboard/src/services/firebase-auth.service.ts` 的引用數是 0**——全 repo 沒有任何檔案 import 它。也就是說前端根本沒有走 Firebase 登入的 UI 路徑。

> 判斷：Firebase Auth 極可能已是死路徑。**待確認**：DB 中 `accounts.firebaseUid` 非空的筆數（現在查不到，因為連不上 DB）。若為 0，`FirebaseAdminService` 的 Auth 部分可直接停用；若非 0，那些帳號需要走一次「設定本地密碼」流程。

#### (b) FCM 推播 — 🔴 天生外部（且現況已有一條是死的）

- **可用路徑**：`firebase-admin.service.ts` 的 `sendMulticastPush` / `sendTopicPush`，走 firebase-admin SDK（FCM v1 API）。`notifications.service.ts` 用的是這條，含無效 token 清理。**這條在 NAS 上照樣能用**（純出站 HTTPS，只需要 `FIREBASE_SERVICE_ACCOUNT`）。
- **已死路徑**：`notification-queue.service.ts` 的 `sendPush()` 打的是 **legacy FCM HTTP API**（`https://fcm.googleapis.com/fcm/send` + `Authorization: key=<FCM_SERVER_KEY>`）。Google 已於 **2024 年 6 月停用 legacy FCM API**——這條路徑**與搬不搬遷無關，現在就是壞的**。
- **前端 Web Push 沒有接線**：`web-dashboard/src/services/push-notification.service.ts`（`getMessaging`/`getToken`/`onMessage`）與 `public/firebase-messaging-sw.js` 都存在，但**引用數為 0**。實際只有 `nativeBridge.ts` 動態載入 Capacitor 的 `@capacitor/push-notifications`（原生殼用）。
- **為什麼是天生外部**：iOS 推播必須經 APNs、Android 推播必須經 FCM，這是作業系統層強制，**沒有自架的可能**。唯一能自架的是瀏覽器 **Web Push（VAPID）**——不需要 Google 專案，但目前這條線是死碼。

> 這是本次改造中**唯一無法「零雲端」的核心功能**。處置建議見 §3.7。

#### (c) Firebase Hosting — 🟢 好搬

`deploy.yml` 的 dashboard job 佈到 Firebase Hosting。NAS 上由 `infra/nas/nginx/default.conf` 提供靜態檔（已寫好，含 SPA fallback、資產快取、`/uploads/` 出檔與 `.meta.json` deny）。直接替換。

#### (d) 其他順帶

`notification-queue.service.ts` 的 `sendEmail()` 與 `sendSms()` 兩個 channel 是**只寫 log 的空殼**（`// SMS implementation would go here`）。`NotificationChannel` 型別宣告了 5 個通道，實際只有 in-app / push / LINE 有實作。這對 §3.7 的「多通道告警」很重要——**現在並沒有多通道**。

---

### 1.3 LINE Bot / LIFF — 🔴 天生外部，且是「需要公網入口」的主要原因

| 面向 | 實況 | 分級 |
|---|---|---|
| Webhook 接收 | `line-bot.controller.ts:43-44` `@Public() @Post('webhook')`，簽章用 SDK `validateSignature(rawBody, channelSecret, signature)`（constant-time，且已改用 `req.rawBody` 而非 `JSON.stringify`）。**必須有公網可達的 HTTPS 端點與有效憑證。** | 🔴 |
| LINE 推播（出站） | `notification-queue.service.ts` 打 `api.line.me/v2/bot/message/push`；`rich-menu.service.ts`。純出站，NAS 上可用。 | 🟢 |
| LINE Login (OAuth) | `oauth.service.ts` — `LINE_REDIRECT_URI` 純 env 驅動（預設 `http://localhost:3000/auth/line/callback`），需在 LINE Developers Console 重新登記新網域 | 🟡 換網域＋重登記 |
| LIFF | `VITE_LIFF_ID`；LIFF App 的 Endpoint URL 需重登記到新網域 | 🟡 同上 |
| Google OAuth | `GOOGLE_REDIRECT_URI`，deploy.yml 目前寫死指向已 404 的 `light-keepers-api-955234851806.asia-east1.run.app` | 🟡 同上 |

**網域是硬前提**：`lightkeepers.ngo` 與 `api.lightkeepers.app` 目前皆 **NXDOMAIN**（根本沒註冊或已過期）。LINE webhook、LINE Login callback、LIFF endpoint、Google OAuth redirect **四者都需要一個真實可解析、有 TLS 的網域**。沒有網域 → LINE 相關功能無法上線，這與 NAS 好不好無關。

---

### 1.4 Google Maps — 🟢 大部分已不依賴，剩路徑規劃要繞

實查前端地圖堆疊，結論與直覺相反——**主力已經是可自架的 MapLibre + PMTiles**：

| 堆疊 | 檔案數 | 代表檔案 |
|---|---|---|
| **maplibre-gl / pmtiles**（可自架） | 14 | `components/map/MapContainer.tsx`、`ClusterLayer`、`useDrawingTools`、`useOverlayEngine`、`maps/MapLibreTacticalMap.tsx`、`services/localPMTilesServer.ts`、`OfflinePrepPage`、`PackageLibraryPage` |
| **@react-google-maps/api**（雲端計費） | 5 | `pages/MapPage.tsx`、`pages/map/MapMarkers.tsx`、`pages/map/MapInfoWindows.tsx`、`pages/map-constants.ts`、`components/map/DirectionsPanel.tsx` |

- 戰術地圖、離線圖磚包、繪圖、疊圖、叢集全部在 MapLibre 側 → **離線與自架路徑已經是主線**。
- 殘留的 Google Maps 主要在一般 `MapPage` 與 **`DirectionsPanel`（路徑規劃）**。
- 🟡 **路徑規劃是唯一真的要繞的**：本地要有等價功能得自架 OSRM 或 Valhalla（需台灣 OSM 資料，NAS 上跑 OSRM 對 N5105 是可行但吃記憶體的活）。
- Google Maps JS API **按載入次數計費** → 留著就不是零雲端費用。

> ✅ **已拍板（D31，2026-08-02）**：**不自架 OSRM**。`DirectionsPanel` 改為**深連結開啟使用者手機的原生地圖 App**（現場人員本來就會用自己的手機導航，路徑規劃不在關鍵路徑上）；同時把 `MapPage` / `MapMarkers` / `MapInfoWindows` / `map-constants` 收斂到既有的 MapLibre 元件，**完全移除 `@react-google-maps/api` 依賴**。收斂後地圖層達成零雲端計費。工作項 S5.7（2–3 人日，需視覺回歸驗證）。

---

### 1.5 TypeORM / PostgreSQL 連線與 migration — 🟢 連線好搬，🔴 **schema 是本計畫最大的單一風險**

**連線設定：完全 env 驅動，零改碼。**

`modules/database/database.module.ts`：
- 讀 `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`/`DB_DATABASE`。
- 自動判斷：`DB_HOST` 以 `/cloudsql/` 開頭 → Unix socket 模式（port 設 undefined、ssl false）；否則 TCP。→ **NAS 上填 `DB_HOST=postgres` 就好，回雲時填回 socket path 也不用改碼。**
- `resolveSynchronize()` 在 `NODE_ENV=production` **硬性停用** synchronize，`SYNC_TABLES=true` 會被忽略並印錯誤。
- `docker-compose.yml`（根目錄）的 M.0 env 對接**已修好**（現在傳 `DB_HOST` 等，不再傳 `DATABASE_URL`）。

**🔴 schema 面：三個疊加的問題，合起來是搬遷的真正阻斷點。**

1. **兩個 migration 目錄，其一永不執行。**
   `backend/src/data-source.ts` 只註冊 `migrations: [join(__dirname, 'migrations/*.{ts,js}')]`。
   - `backend/src/migrations/` — **9 支**，CLI 會跑。
   - `backend/src/database/migrations/` — **2 支**（`AddVolunteerAccountRelation`、`AssignOwnerRole`），**CLI 從來不會跑到**。

2. **正式環境的 schema 不是 migration 生出來的。**
   `deploy.yml` **沒有任何 migration 步驟**（實查全檔確認），而 `FULL_SYSTEM_REDESIGN_PLAN.md` §1.3 記載線上原本開著 `SYNC_TABLES=true`——也就是**約 120 張表是 TypeORM synchronize 自動生的**，只有 9 支 migration 有版控。

3. **因此：在 NAS 的空資料庫上跑 `migration:run`，做不出線上那套 schema。**
   `infra/nas/README.md` §3.7 寫「首次部署（全新資料庫）→ `migration:run`」——這句話**只在 baseline migration（工作項 1.2）完成後才成立**，而 1.2 仍在等 D7/D15 窗口。目前唯一能重建完整 schema 的方法是 **`pg_dump` 線上 DB 再 restore**。

> **而線上 DB 現在連不上。** 本機 gcloud 帳號對 `light-keepers-mvp` 專案無權限（`CONSUMER_INVALID`），該專案在 `gcloud projects list` / `firebase projects:list` 都看不到，Cloud Run 服務全 404。
>
> **所以「NAS 上要放什麼資料」目前是未知數，這是 §4 排序的第一順位待辦（D20）。** 三種可能：
> - **(A) 資料還在，且能取回** → 走 `infra/nas/scripts/migrate-db.sh` 標準流程，最理想。
> - **(B) 資料還在，但取不回**（專案已無成員／帳單停用超過保留期）→ 等同資料遺失。
> - **(C) 專案已刪** → 資料不存在。
>
> 若是 (B)/(C)，改造性質就從「搬遷」變成「**以現有程式碼重新開站**」：必須先補齊 baseline migration（工作項 1.2）才能建出 schema，工作量與風險完全不同。**這一項不釐清，後面所有排程都是空的。**

4. **5 支已寫但未在線上執行的 migration**（防空避難處所 `AddAirRaidShelters`、民防災型 `AddCivilDefenseDisasterTypes` 等）：在情境 (A) 下，restore 之後補跑即可（README §3.7 的「從雲端搬遷」路徑正是如此）；在 (B)/(C) 下這個問題自動被 baseline 吸收。

---

### 1.6 部署腳本與 CI/CD — 🟢 好搬但要重寫一條新路

| 資產 | 現況 | 處置 |
|---|---|---|
| `.github/workflows/deploy.yml` | Cloud Run（`light-keepers-mvp`/asia-east1，Cloud SQL socket）＋ Firebase Hosting。硬編 `FRONTEND_URL=https://lightkeepers.ngo`（NXDOMAIN）、`GOOGLE_REDIRECT_URI` 指向已 404 的 run.app。**無 migration 步驟。** | 停用（保留檔案作為回雲參考），新增 NAS 部署路徑 |
| `.github/workflows/ci-cd.yml` | 測試/lint/閘門，是 deploy 的前置 | **保留**（與雲無關） |
| `cloudbuild.yaml`、`DEPLOY.md` | 過時舊路徑，含 `YOUR_PROJECT_ID` 佔位 | 標註 deprecated |
| `vercel.json` | 前端 preview | owner 決定去留（D25） |
| `infra/nas/docker-compose.nas.yml` | 五服務：`postgis/postgis:15-3.3-alpine`(4g)、backend(2g)、`nginx:1.27-alpine`(256m)、`cloudflare/cloudflared`(256m)、backup(512m)；含 healthcheck 與記憶體上限 | **主力，可直接用** |
| `infra/nas/scripts/` | `migrate-db.sh`（含逐表 row count 對帳）、`migrate-gcs-files.sh`、`verify-stack.sh`（8 項含內網 Ollama 可達）、`restore-drill.sh`（另起臨時容器，不碰生產 DB） | **主力，可直接用** |
| `infra/nas/backup/` | 每日 `pg_dump`＋sha256、uploads rsync＋硬連結快照、14 天保留、雙心跳、`replicate.sh` 第二副本＋回驗 | **主力，可直接用** |

**缺口：沒有「從 CI 把 image 送上 NAS」的路徑。** compose 的 `BACKEND_IMAGE` 預設 `lightkeepers/backend:local`，README 要求在 NAS 上 `docker compose build`（N5105 上 10–20 分鐘）。每次更新都要 SSH 進去手動 build，對非技術 owner 不友善，且 build 期間 NAS 資源被吃滿。→ 列為工作項（§4 S5.2）。

---

### 1.7 盤點總表

| 項目 | 分級 | 一句話 |
|---|---|---|
| LLM 文字場景（分類/摘要/手冊/PFA） | 🟢 好搬 | 抽象層已完成；**但 `LLM_PROVIDER` 沒設，現況會全打 Gemini** |
| LLM 影像分析 | 🟡 要繞 | 需 VLM（`qwen2.5vl:7b` 據 D13 記載已在工作站庫中，未對測） |
| LLM 語音轉錄 | 🟡 要繞 | 需 ASR（Whisper 系），工作站上尚無 |
| Firebase Auth | 🟢 好搬 | 前端引用數 0，極可能已是死路徑；待查 DB |
| FCM 推播（原生 App） | 🔴 天生外部 | APNs/FCM 是 OS 層強制，無法自架 |
| Web Push | 🟢 好搬 | VAPID 可完全自架，**但目前前端是死碼** |
| Firebase Hosting | 🟢 好搬 | nginx 已寫好 |
| LINE webhook | 🔴 天生外部 | 必須公網 HTTPS；Cloudflare Tunnel 相容 |
| LINE 推播（出站） | 🟢 好搬 | 純出站，NAS 可用；**台灣覆蓋率最高的告警通道** |
| LINE Login / LIFF / Google OAuth | 🟡 要繞 | env 驅動，但需**網域**＋各平台重登記 |
| Google Maps（一般圖資） | 🟢 好搬 | MapLibre+PMTiles 已是主線（14 檔 vs 5 檔）；D31 拍板全數收斂 |
| Google Maps 路徑規劃 | 🟡 要繞 | D31 拍板：**不自架 OSRM**，改深連結開啟手機原生地圖 App |
| TypeORM 連線 | 🟢 好搬 | 純 env，含 socket/TCP 自動判斷 |
| **DB schema / 資料** | 🔴 **阻斷點** | 線上 schema 由 synchronize 生成、無 baseline migration，而線上 DB 目前取不到 |
| 檔案儲存 | 🟢 好搬 | storage 抽象層 M.3b 已完成，三 service 全遷 |
| 部署 CI/CD | 🟢 好搬 | NAS compose 齊備；缺 image 配送路徑 |

---

## 2. 搬遷設計（照 ST／DRONES 模式）

本節只寫**與 `infra/nas/README.md` 不同或它沒寫**的部分。操作步驟一律以該 README 為準。

### ① DB → NAS Postgres

- **目標**：`postgis/postgis:15-3.3-alpine`，資料放 NVMe RAID 10（`${NVME_DATA_ROOT}/pgdata`），備份放 HDD RAID 6（`verify-stack.sh` 第 7 項會用 `df` 擋下兩者同裝置的錯誤配置）。
- **連線**：`DB_HOST=postgres` 即可，無需改碼。
- **路徑分歧（取決於 D20 的答案）**：
  - **情境 (A) 資料可取回**：`migrate-db.sh --dry-run` → `--dump-only`（離峰先抓）→ 停機窗口內完整搬＋逐表對帳 → `migration:run` 補跑 5 支未執行的 migration → `verify-stack.sh`。這是 README §6.1 已寫好的流程。
  - **情境 (B)/(C) 資料不可取回**：**必須先完成 baseline migration（工作項 1.2）**，否則空 DB 跑 `migration:run` 建不出 ~120 張表。這會把 Phase 1 的一個「等窗口」工作項變成 NAS 上線的**硬前置**，需重排（見 §4 S0.3）。
- **不要做的事**：不要在 NAS 上開 `SYNC_TABLES=true` 湊 schema。`resolveSynchronize()` 在 production 會擋掉；就算繞過去，也會讓 NAS 與版控永久分歧，回雲時無法保證一致（違反 README §4「回雲四原則」第 3 條）。

### ② AI → 本地 Ollama（經 gateway 抽換 provider）

- **設計已完成**，只需補組態與收斂殘留呼叫點：
  1. `infra/nas/docker-compose.nas.yml` 與 `.env.nas.example` 補 **`LLM_PROVIDER=hybrid`**（✅ D27 已拍板，理由見 §3.6）。
  2. `LLM_MODEL` 從 `qwen2.5:32b-instruct` 改為 **`qwen2.5:7b-instruct`**（✅ D22 已拍板）。
  3. 把 `manuals`、`pfa-chatbot`、`voice`(SITREP 摘要段) 三處純文字呼叫改注入 `LlmProviderService`（SONNET 機械性工作）。
  4. **影像與語音維持 Gemini**（✅ D23 已拍板）。用量低，且 hybrid 模式下這兩條本來就只走雲端；工作站加 VLM/Whisper 屬日後選配，不進本次範圍。
- **關鍵設計原則（新增，非既有文件所有）**：**AI 一律不得在關鍵路徑上同步等待。** ai-queue 本來就是佇列＋circuit breaker，但 `line-bot` 的災情分類與 `pfa-chatbot` 是同步呼叫。單 GPU 序列化推論在尖峰會排到分鐘級（§3.6），**災情通報必須在 AI 失敗/逾時時仍能完成**。line-bot 已有關鍵字 fallback、pfa 已有模板 fallback——這兩條 fallback 要納入驗收演練，不能只當例外處理。

### ③ 後端 NestJS → NAS 容器

- 沿用 `backend/Dockerfile`（與部署 Cloud Run 時同一份，回雲四原則第 1 條）。
- 記憶體上限 2g（16GB 機器上與 postgres 4g、其餘 ~1g 共存）。
- **11 個 WebSocket gateway**（ai-queue / field-reports / mission-session / notification / offline-mesh / overlay / realtime ×2 / realtime-chat / task-dispatch）是長連線，nginx 已設好 `/socket.io/` 的 upgrade 代理。這是 N5105 上的主要並發壓力來源（§3.5）。

### ④ 前端 → NAS 靜態服務

- 在開發機或 CI build（`VITE_API_BASE_URL=https://<網域>/api/v1`），rsync 到 `${NVME_DATA_ROOT}/web`，nginx 服務。**不要在 N5105 上跑 Vite build。**
- PWA（`vite-plugin-pwa`，`registerType: 'autoUpdate'`）與 pmtiles 離線圖磚照常運作，且與伺服器位置無關——這是 §3 韌性的重要籌碼。

### ⑤ 對外入口

- **Cloudflare Tunnel**（D14 建議案 a）：出站連線、路由器不開 port、NAS 管理介面不暴露、免憑證輪替。Public Hostname 服務位址須填 `nginx:8080`（cloudflared 在容器內）。**Disable Chunked Encoding 保持關閉**（LINE webhook 需要）。
- 中華電信固定 IP 作為內網與備援用途，不作為主要對外路徑。
- **必須先有網域**（D24）。Cloudflare Tunnel 需要一個託管在 Cloudflare 的網域才能建 Public Hostname。
- 切換清單（README §3.8 已列）：LINE Messaging API Webhook URL、LINE Login Callback URL、LIFF Endpoint URL、Google OAuth 已授權重新導向 URI。

---

## 3. 韌性與使用情境風險分析

> 這一節是本次改造的核心，也是既有文件（`RUNBOOK.md` §7 只有備份與實體安置一張表）沒有涵蓋的部分。

### 3.0 先講結構性矛盾

防災平台最矛盾的地方：**它最被需要的時刻，正是家用設備最脆弱的時刻。**

搬到自主架構後，整個平台的可用性取決於三個**同址、同時受災**的單點：

```
        ┌── 家用市電 ──────────┐
        │                      │
   [NAS AS5404T]   [RTX 工作站]   [中華電信 ONU/路由器]
        │                      │
        └── 同一棟建築、同一條電力、同一條網路 ──┘
```

**地震把房子搖壞、颱風讓這個地址停電、火災燒掉機房——三個單點會同時失效，而那正是平台該上線的時候。** 雲端架構的價值從來不是「比較快」，而是「不在災區」。

這不代表不該自主化。ST／DRONES 沒有「災難時必須可用」的需求，Light Keepers 有。所以正確的做法不是「全本地 vs 全雲端」的二選一，而是**分清楚哪些路徑可以跟著建築物一起倒，哪些不行**。§3.8 給出這條線。

---

### 3.1 停電（UPS）

| | |
|---|---|
| **會發生什麼** | 市電中斷 → NAS、工作站、ONU、路由器、交換器**同時斷**。NAS 若直接斷電，`pgdata` 在寫入中途被切斷有機率損毀（PostgreSQL 有 WAL，多數情況可自行復原，但 RAID 控制器與 NVMe 快取層增加變數）。 |
| **既有措施** | `RUNBOOK.md` §7.6 只有一行要求：「UPS 至少可撐 15 分鐘，且設定自動 graceful shutdown」。**這是保資料，不是保服務。** |
| **落差** | ① UPS 只列在 NAS，**沒有涵蓋 ONU／路由器／交換器**——這三者任一沒電，NAS 有電也連不出去。② `cloudflared` 是出站連線，路由器斷電＝對外全斷。③ RTX 工作站尖峰功耗高（4080 SUPER 整機約 500–600W），**小型 UPS 撐不動**，也不該撐。 |

**對策（分層，成本由低到高）— ✅ 第 1–3 項拍板為必做（D29／S4.1／S4.7），第 4 項不採用**

1. **必做（低成本）**：UPS 保護範圍從 NAS 擴大到 **NAS ＋ ONU ＋ 路由器 ＋ 交換器**。這四樣加起來待機功耗約 60–100W，1000VA 級 UPS 可撐 30–60 分鐘。設定 NAS 在 UPS 剩 20% 時自動 graceful shutdown。
2. **必做（零成本）**：**GPU 工作站不納入 UPS**，並確認停電時 AI 功能會優雅降級——這正是 §3.6 主張 `LLM_PROVIDER=hybrid` 而非 `local` 的理由之一。停電時工作站關機，hybrid 會自動走 Gemini（若對外網路還在）；若網路也斷，line-bot 關鍵字 fallback 與 pfa 模板 fallback 接手。**這條降級鏈要實際演練過。**
3. ✅ **已拍板必做（寫進 SOP，S4.7）**：長時間停電（>1 小時）時，**放棄維持伺服器，改走離線模式**。這是 PWA 的用武之地（§3.9）：現場人員的裝置上已有快取資料與 outbox，可繼續作業，復電後同步。**SOP 要明寫「停電超過 X 分鐘就切離線模式」，而不是讓大家在那裡等網站回來。**
4. **不採用（高成本）**：發電機/大容量儲能。以協會規模與 D26 的定位 (c)，投資報酬遠不如「把公眾入口與告警放到 Cloudflare 免費層」（§3.8）。

---

### 3.2 家用斷網

| | |
|---|---|
| **會發生什麼** | 中華電信線路中斷（災害時常見：電桿倒、機房淹水、光纜斷）→ Cloudflare Tunnel 是**出站**連線，斷網即 Tunnel 掉線 → 對外 100% 不可達。 |
| **連帶影響** | ① LINE webhook 收不到（LINE 有重試但次數有限，超過即丟棄——民眾透過 LINE 的通報會**永久遺失**）② LINE push / FCM 送不出去 ③ 公眾入口全掛 ④ 現場人員若透過外網連回來，也連不上。 |
| **既有措施** | 無。`RUNBOOK.md` 與 `infra/nas/README.md` 都沒有處理上游網路中斷。 |

**對策 — ✅ 全數拍板為必做（D29／S4.2／S5.3／S4.7）**

1. ✅ **已拍板必做（D29，中成本，最有效）**：**雙 WAN failover**。加一台 4G/5G 路由器（或用手機熱點 + 支援 USB tethering 的路由器），設定主線斷時自動切換。中華電信固定 IP 走主線，行動網路走備線。Cloudflare Tunnel 對 IP 變動不敏感（出站連線，換 IP 會自動重連），**這是 Tunnel 相對於固定 IP + port forward 的實質優勢**。
   > 為什麼定位是 (c) 內部為主也要買：公眾唯讀那一面有 CF 快取可以降級，**但內部應變協作沒有任何替代品**——斷網時幹部無法派遣、現場無法回報、指揮無法看到全局，而那才是這個平台真正要做的事。
   - 成本：4G/5G 路由器約 3–8k，行動網路吃到飽月費約 300–500 元。
   - 注意：行動網路上行通常只有 10–30 Mbps，**只夠維持告警與 API，撐不住公眾尖峰**（§3.5）。降級模式要接受這件事。
2. **必做（零成本）**：`cloudflared` 可設定多個 connector replica。若同時有主線與備線，跑兩個 connector 讓 Cloudflare 自動選路。
3. **必做（低成本）**：在 Cloudflare 上放一個**完全不依賴 NAS 的靜態緊急頁**（Cloudflare Pages 免費）。NAS 全掛時，民眾至少看得到「系統維護中，緊急情況請撥 119／1991」而不是連線逾時。這一頁應該是改造完成的驗收項之一。
4. **接受並寫進 SOP**：**斷網期間的 LINE 通報會遺失，這是無法避免的**（LINE 的重試視窗有限，且沒有補拉 API）。SOP 必須有替代管道（電話、現場回報），且 AAR 時要知道這段時間的資料有缺口。

---

### 3.3 單點無異地

| | |
|---|---|
| **會發生什麼** | 火災、竊盜、淹水、勒索軟體、戰時物理毀損 → NAS 與 HDD RAID 6 備份**一起消失**（同一台機器）。 |
| **既有措施（已相當好）** | C1.3 已實作第二副本自動化：`infra/nas/backup/replicate.sh` 支援 rsync→Mac mini 或 rclone crypt→雲端冷儲存，含**推送後回驗 sha256**、失敗寫 `.replica-failed`、獨立的 `.replica-heartbeat`（49 小時門檻）。`restore-drill.sh --source=secondary` 可實際從第二副本拉回還原。`RUNBOOK.md` §7.6 要求 Mac mini 與 NAS 不同房間、理想上不同建物。 |
| **落差（誠實講）** | ① **機制完成 ≠ 已生效**：README §8 明寫「仍需人為設定目標並跑一次 `--source=secondary` 演練才算生效」。目前沒有任何證據顯示已設定。② **Mac mini 若與 NAS 同址，第二副本擋不住火災與竊盜**——這正是 RUNBOOK 自己指出的問題，但落實與否是人的事。③ 方案 A（Mac mini rsync）的資料**未加密**，失竊即個資外洩（平台含真實使用者 email、傷患資料、心理健康紀錄）。 |
| **🔴 RTO ≤ 4h 目前沒有基礎** | `RUNBOOK.md` §7.2 訂 RPO ≤ 24h／RTO ≤ 4h。RPO 24h 靠每日 03:30 備份可達成。**但 RTO 4h 隱含「有一台可以還原上去的機器」**——如果 NAS 本身燒掉／被偷，4 小時內買不到、裝不好一台 AS5404T。**現況的真實 RTO 是「重新採購 + 安裝 + 還原」＝數天到一週。** 這個數字應該誠實寫進 RUNBOOK，而不是掛一個做不到的目標。 |

**對策 — ✅ 全數拍板為必做（D30／S4.3／S4.4／S4.5）**

1. **必做（零成本，但需要人動手）**：把第二副本目標實際設定起來，跑一次 `restore-drill.sh --source=secondary`，把 RTO 實測值記進 `RUNBOOK.md` §7.3。**沒跑過的備份等於沒有備份。**
2. ✅ **已拍板必做（D30，低成本）**：第二副本改用 **方案 B（`rclone crypt` → 加密雲端冷儲存）**。B2/R2 這種冷儲存放幾十 GB 的月費是個位數美金——**這是本計畫中「花小錢買大保險」性價比最高的一項**，也是明確不為了「零雲端費用」而砍掉的項目。
   > ⚠ rclone crypt 的密碼**必須妥善保管**：密碼記錯不會報「密碼錯」，只會解出亂碼或找不到檔案（README §9 已列此陷阱）。建議與其他關鍵秘密一起進協會的密碼保管流程。
3. **必做（零成本）**：修正 `RUNBOOK.md` 的 RTO 目標，區分兩種情境：
   - 「資料壞了、機器還在」→ RTO ≤ 4h（可達成，restore-drill 已驗證）
   - 「機器沒了」→ RTO = 採購前置期 + 4h（誠實寫成數天）
4. **後續選配（中成本）**：買第二台便宜 NAS 或用 Mac mini 當冷備機（預先裝好 Docker 與 compose，平時不跑），能把情境二的 RTO 拉回數小時。
   > 依 D26 拍板為「內部為主、公眾唯讀」，**本次不採購**——(c) 定位下沒有對外 SLA 承諾，數天的 RTO 可以靠 SOP 與人工程序涵蓋。若日後 RTO 數天被判定不可接受，再回頭做（§4-C 選配清單）。

---

### 3.4 公眾尖峰 — 家用上行頻寬

| | |
|---|---|
| **會發生什麼** | 災害發生 → 媒體報導 → 民眾湧入查避難所／災情地圖 → 流量在幾分鐘內暴增數十倍。而家用光纖的**上行**（伺服器對外送資料的方向）通常只有 100–250 Mbps，且與整棟樓共享。 |
| **實查的公眾端點** | `modules/public/public.controller.ts` 全數 `@Public()`：`/public/announcements`、`/shelters`、`/aed`、`/alerts`、`/weather`、`/ping`、`/info`。這些是災時最會被打的路徑。全 repo 共 73 處 `@Public()`。 |
| **量級估算** | 前端首載約 1MB（PWA 快取後回訪近乎 0）。100 Mbps 上行 ≈ 12.5 MB/s ≈ **理論上每秒 12 個新訪客**。API JSON 回應輕（數 KB），但 `/public/shelters` 帶座標的清單可能到數十 KB。**真正會塞爆的是首次載入的靜態資產，不是 API。** |

**對策（這一項有非常划算的解法）— ✅ 全數拍板為必做，工作項 S5.1／S5.6**

1. **必做（零成本，效果最大）**：**Cloudflare 邊緣快取**。前端靜態資產（`/assets/*`，帶 hash 檔名）設長期快取，公眾唯讀 API（`/public/*`）設 30–60 秒邊緣快取。這樣**家用上行只承載動態流量與快取回源**，公眾尖峰基本上打在 Cloudflare 而不是你家。
   - 這件事只需在 Cloudflare 設 Cache Rules，不動程式碼。
   - 副作用：`/public/alerts` 有 60 秒延遲。對防災告警而言 60 秒可接受；若不可接受就對這一條單獨設 5–10 秒。
2. **必做（零成本）**：開 Cloudflare **Always Online**——NAS 掛掉時，Cloudflare 用快取版本繼續服務公眾唯讀頁面。這對「災難時 NAS 剛好掛了」的情境價值極高。
3. ✅ **已拍板必做（S5.6）**：`@Throttle` 限流已在 Phase 4.1 修好（先前 18 個因命名不匹配靜默失效）。公眾端點應設較嚴的速率，避免單一爬蟲吃掉上行。
4. **要注意的**：**11 個 WebSocket gateway 的長連線無法被 Cloudflare 快取**，且每條連線在 N5105 上都佔資源。內部人員的即時協作（地圖疊圖、任務派遣、聊天）在百人級並發下對 N5105 是可行的，但**不要讓公眾頁面也開 WebSocket**。若目前公眾頁有訂閱即時更新，改成輪詢 + 邊緣快取。

---

### 3.5 Tailscale / Cloudflare Tunnel 併發與單機容量

- **對外通道選型**：D14 建議 Cloudflare Tunnel。本次 owner 提到 Tailscale——兩者用途不同，✅ **已拍板兩者並用**（工作項 S3.1／S3.4）：
  - **Cloudflare Tunnel**：公眾入口、LINE webhook、OAuth callback。這些需要**任何人都能連**的公開 HTTPS。Tailscale 做不到這件事（Tailscale Funnel 可以，但頻寬與穩定性不適合當公眾入口）。
  - **Tailscale**：管理面（SSH 進 NAS、pgAdmin、Portainer、內部人員從外部存取後台）。這比開放公網管理介面安全得多，且 owner 已在 ST／DRONES 熟悉這套。
  - **不建議**把公眾流量走 Tailscale。
- **併發**：Cloudflare Tunnel 免費方案未明訂併發上限，實務瓶頸在單一 `cloudflared` connector 的處理能力與家用上行。可跑多個 connector replica 分攤。
- **N5105 + 16GB 的實際容量**：compose 已分配 postgres 4g / backend 2g / 其餘 ~1g。對「內部百人級並發 + 公眾唯讀走邊緣快取」是足夠的。**若公眾流量直接回源打進來，這台機器會先在 CPU 上倒下**（N5105 是 4C4T 的低功耗 Celeron，TLS 終結 + Node.js + PostGIS 空間查詢同時吃 CPU）。→ 這再次說明 §3.4 的邊緣快取是必做而非選配。

---

### 3.6 桌機 24/7 不睡 ＋ 與投資訓練／DRONES 搶 GPU

| | |
|---|---|
| **會發生什麼** | ① 桌機為了服務 Ollama 必須 24/7 不睡，長期高溫、電費、硬體壽命。② owner 的其他專案（投資模型訓練、DRONES）同樣要吃 VRAM。RTX 4080 SUPER 只有 16GB（若實機確為 5090 則 32GB，D21 待確認）。③ **Ollama 預設序列化處理請求**——同時來 10 個災情分類，第 10 個要等前 9 個做完。 |
| **實測數據（D13）** | `qwen2.5:7b-instruct`：95% 準確、平均 **6.4 秒/次**、VRAM 4.7GB。ST 常駐的是 `nomic-embed-text`（0.3GB 嵌入模型，不衝突）。 |
| **尖峰算術** | 6.4s/次序列化 → 每分鐘約 9 件。災害初期 LINE 通報若每分鐘進 30 件，**佇列會以每分鐘 21 件的速度累積**，10 分鐘後積壓 200 件、延遲超過 20 分鐘。 |
| **VRAM 競爭的隱藏陷阱** | `hybrid` 模式的健康探測只打 `GET /models`，**只確認 Ollama 進程活著，不確認 VRAM 夠不夠載入模型**。若投資訓練吃滿 16GB，探測會通過但生成會失敗。所幸 `dispatch()` 有 `invalidateLocalHealth()`——生成失敗後會標記不健康並降級到 Gemini。**但這條保護只存在於 hybrid 模式。** |

**對策 — ✅ 全數拍板（D27／S2.1／S2.2／S2.5／S4.7）**

1. ✅ **已拍板（D27）：`LLM_PROVIDER=hybrid`，不用 `local`。** 這與「零雲端費用」目標有直接衝突，所以要把取捨寫清楚：
   - `local`：真正零費用，但工作站關機／VRAM 被佔／生成失敗時，**AI 功能直接報錯，沒有降級路徑**。
   - `hybrid`：平時 100% 走本地（零費用），**只有工作站不可用時才付 Gemini 的錢**。以協會的用量，這個費用是零星的幾塊錢，而換來的是「災難當下 AI 不會整個消失」。
   - 採納理由：災難時「工作站剛好在跑訓練」或「工作站沒電」的機率不低，而那正是最需要自動分類災情的時刻。
   - **配套（否則 hybrid 會變成隱形帳單）**：`/health/llm` 的 `active` 欄位與 `LlmProviderService` 的降級 WARN 必須被實際監看，讓「這個月付了多少 Gemini」是可見的，而不是等帳單才知道。列入工作項 S2.5。
2. **必做（零成本）**：所有 AI 呼叫改為**非阻斷**。ai-queue 本來就是佇列；line-bot 災情分類與 pfa-chatbot 是同步的，要確保逾時（`LLM_TIMEOUT_MS`）後 fallback 立即接手，**通報流程不能因為 AI 慢就卡住**。並把「AI 全掛時仍能完成 30 秒通報流」納入演練項目。
3. ✅ **已拍板必做（零成本）**：與 ST／DRONES 建立 GPU 使用約定——**災害應變期間（協會開設應變中心時）暫停訓練工作**。這是流程約定，不是技術問題，**要寫進 SOP 才有效**（工作項 S4.7）。
4. ✅ **已拍板必做**：Ollama 設 `OLLAMA_KEEP_ALIVE` 讓模型常駐 VRAM（避免每次冷載入），並考慮 `OLLAMA_NUM_PARALLEL` 提高並行度（代價是 VRAM，7B 模型在 16GB 上大約可開 2–3 並行）（工作項 S2.2／S2.5）。
5. **不採用**：桌機 Wake-on-LAN 由 NAS 喚醒——喚醒需時間，不適合災時，且增加一個會失敗的環節。優先度低，不進範圍。

---

### 3.7 FCM 推播本質依賴 Google

**這是本改造中唯一無法自主化的核心功能，必須誠實面對。**

| 通道 | 能否自架 | 現況 |
|---|---|---|
| **iOS 原生推播** | ❌ 必經 APNs（Apple 強制） | Capacitor 殼使用 |
| **Android 原生推播** | ❌ 必經 FCM（Google Play 服務強制） | Capacitor 殼使用 |
| **瀏覽器 Web Push** | ✅ **VAPID 可完全自架**，不需 Google 專案 | **前端是死碼**（`push-notification.service.ts` 引用數 0） |
| **LINE Push** | ❌ 必經 LINE，但**與 Google 無關** | ✅ 已實作可用 |
| **Email** | ✅ 可自架/用 Resend | ⚠ `notification-queue.sendEmail()` 是空殼 |
| **SMS** | ❌ 需電信商，且要付費 | ⚠ `notification-queue.sendSms()` 是空殼 |

**目前的真實狀態：`notification-queue.service.ts` 宣告 5 個通道，實際只有 in-app、push（且其中一條實作已被 Google 停用）、LINE 三條有程式碼。**

**對策（多通道降級鏈）— ✅ 已拍板（D28）**

告警設計成**明確的降級鏈**，而不是依賴單一通道：

```
L0  LINE Push（台灣覆蓋最高、與 Google 無關、NAS 可直接送）   ← 主力
L1  Web Push / VAPID（自架，需把死碼接回來）                  ← 補瀏覽器使用者
L2  FCM / APNs（原生 App 使用者，保留 Google 依賴）            ← 接受依賴
L3  Email（Resend 或自架 SMTP，需把空殼補實）                  ← 非即時但可留存
L4  SMS（需付費，D18 既有決策項）                              ← 最後手段，最不依賴網路
```

**拍板內容**：
- ✅ **保留 FCM，不為了「零雲端」而砍。** 它是免費的、純出站的，且原生 App 使用者沒有替代方案。保留成本是零，砍掉的代價是那批使用者收不到告警。
- ✅ **LINE Push 作為主力告警通道**，而不是 FCM。它在台灣的實際到達率最高，且完全不受 Google 影響。
- ✅ **把 Web Push 死碼接回來**（前端 service 已寫好，只缺接線與 VAPID 金鑰）。
- ✅ **補實 `sendEmail()` 空殼**（Resend 或自架 SMTP），作為 L3 非即時留存通道。
- ✅ **刪除已被 Google 停用的 legacy FCM 路徑**（`notification-queue.sendPush`），改走 `firebase-admin` v1——留著只會讓人以為推播有兩條路。
- SMS（L4）依既有 D18 另議，不進本次範圍。
- 告警發送路徑與 NAS 的關係見 §3.8 第 3 項（已拍板走方案 (a)）。

---

### 3.8 ✅ 已拍板：保留雲端／混合的六條關鍵路徑

這是本節的結論，也是本計畫對「硬全本地」提出的**不同意見**。**Owner 已於 2026-08-02 全數採納。**

| 路徑 | 拍板 | 理由 | 成本 | 工作項 |
|---|---|---|---|---|
| **1. 公眾唯讀入口** | ✅ **Cloudflare 邊緣快取 ＋ Always Online** | 家用上行撐不住媒體導流；NAS 掛掉時民眾至少看得到快取版本 | **免費** | S5.1 |
| **2. 緊急靜態頁** | ✅ **Cloudflare Pages，完全不依賴 NAS** | NAS 全掛時告訴民眾「請撥 119／1991」。這一頁不能跟 NAS 一起死 | **免費** | S5.3 |
| **3. 對外告警發送** | ✅ **混合：LINE Push 主力 ＋ FCM 保留；NAS 依賴走方案 (a)** | 最矛盾的一條：NAS 掛了就發不出告警，而 NAS 掛掉的時候往往正是要發告警的時候 | 零 | S4.7 / S5.4 |
| **4. AI 推論** | ✅ **`LLM_PROVIDER=hybrid`，不用 `local`** | 平時 100% 本地零費用；工作站不可用時才付費。災時 AI 不會整個消失 | **趨近於零**（僅降級時計費） | S2.1 / S2.5 |
| **5. 異地備份第二副本** | ✅ **加密雲端冷儲存（rclone crypt → B2/R2）** | 火災/竊盜/戰時物理毀損，同址副本一起消失 | **月費個位數美金** | S4.4 |
| **6. 管理面存取** | ✅ **Tailscale**（不是公網開 port） | 安全性遠優於暴露管理介面 | **免費** | S3.4 |

**第 3 項需要展開講，因為它是最難的一個。**

理想解是：告警發送不依賴 NAS 存活。可行做法有三種，複雜度遞增：

- **(a) 最簡單，零成本**：接受依賴，但**把「NAS 掛了發不出告警」明寫進 SOP**，並準備人工替代（幹部 LINE 群組手動發、電話樹）。
- **(b) 中等**：在 Cloudflare Workers（免費額度充足）放一個極小的告警發送端點，持有 LINE Channel Access Token，可由授權幹部從手機觸發。NAS 掛掉時仍能對全體發布告警。
- **(c) 複雜**：告警服務獨立部署到便宜 VPS，NAS 只做資料。**不採用**——多一個要維護的東西，對非技術 owner 是負擔。

> ✅ **拍板：本次做 (a)**（工作項 S4.7，寫進 SOP ＋ 準備人工替代管道）。**(b) 列為後續選配**，等 §3.9 的 L2 演練跑過、確認人工替代真的可行之後再評估——**先確認流程能動，再花力氣自動化**。
>
> ⚠ 誠實提醒：(a) 的意思是**接受「NAS 掛了就發不出自動告警」這個結果**，靠人補。這不是技術上的最佳解，是對協會維運能量的務實判斷。若日後定位改為公眾正式營運（D26 從 (c) 改成 (a)），(b) 就從選配變成必做。

**總結**：把 DB、後端、前端、AI 全部搬到本地是對的，而且技術上已經八成就緒。但**「公眾入口的快取層」「告警的最後一哩」「異地備份」這三件事，硬要做到零雲端，換來的是可靠度的實質下降，而省下的錢趨近於零**（前兩項免費，第三項月費個位數美金）。這不是技術妥協，是把錢花在刀口上。

---

### 3.9 善用既有離線 PWA 降低現場對伺服器的依賴

這是本架構最強的一張牌，而且**已經做完了**——應該在 SOP 與訓練中被更積極地使用。

**已具備的能力（實查）**：

| 能力 | 實作 | 狀態 |
|---|---|---|
| 統一離線 outbox | `web-dashboard/src/services/offline/offline.service.ts`（Dexie） | ✅ 工作項 3.4 已收斂，**並修好三個 P0 資料遺失 bug** |
| 不遺失不變式 | 佇列項目**只在伺服器回 2xx 時才刪除**；網路錯誤/4xx/5xx/超過重試上限一律保留 | ✅ 有測試 `offline.service.test.ts` |
| 離線可通報 | `queueReport` / `queueIntakeReport` / `queueSos` / `queueLocation` | ✅ |
| 週期同步 + Background Sync | `attemptSync()` / `registerBackgroundSync()`，指數退避 | ✅ |
| 401 處理 | 經 `api/client.ts`（含 mutex refresh），本身另有第二道防線 | ✅ |
| 離線快取資料 | alerts / tasks / resources / reports | ✅ |
| 離線圖磚 | maplibre + pmtiles + `localPMTilesServer.ts` + `OfflinePrepPage` + `PackageLibraryPage` | ✅ |
| PWA 安裝與離線殼 | `vite-plugin-pwa`（`registerType: 'autoUpdate'`）、`public/offline.html` | ✅ |
| 原生殼 | Capacitor 8 | ✅ |

**因此，「伺服器不可用」對現場人員的影響比想像中小**——只要他們**在事前**安裝了 PWA、預先下載了圖磚包、且應用已快取過必要資料。

**要補的（都不是程式問題，是流程問題）— ✅ 已納入 S5.8 與 S4.7**：

1. **事前準備才是關鍵**：PWA 的離線能力只涵蓋**已快取的內容**。災難當天才第一次打開 App 的人，什麼都沒有。→ **「平時就要裝好 App 並下載圖磚包」必須是志工訓練的固定項目**，且應在 `OfflinePrepPage` 加上明確的「準備度檢查」。
2. **明確的離線可用頁清單**：目前沒有文件說明「斷線時哪些頁面還能用」。應盤點並寫入訓練教材，避免現場人員在斷線時亂試。
3. **演練**：`FULL_SYSTEM_REDESIGN_PLAN.md` 的 CD 主題已定義 L0–L3 降級模式（L0 正常／L1 無雲／L2 無網際網路／L3 無電力）。**L2「內網 WiFi + 離線 outbox」的基地台模式演練尚未執行**——這應該是改造完成後的第一場演練。
4. **與 §3.1 的連結**：停電超過 UPS 續航時，正確的動作是**切離線模式繼續作業**，而不是等系統回來。這條要寫進 SOP。

---

### 3.10 韌性風險總表（含拍板後的對策）

| # | 風險 | 現況 | ✅ 已拍板對策 | 成本 | 優先度 | 工作項 |
|---|---|---|---|---|---|---|
| R1 | 停電 → 服務中斷 + pgdata 損毀風險 | RUNBOOK 只要求 NAS 有 UPS | UPS 涵蓋 **NAS+ONU+路由器+交換器**；GPU 不納入；長停電切離線模式並寫進 SOP | 低（1000VA UPS 約 5–8k） | 🔴 高 | S4.1 |
| R2 | 上游斷網 → 對外 100% 不可達、LINE 通報遺失 | 完全無措施 | **雙 WAN failover**（4G/5G 備線，D29 拍板為必做）+ CF Pages 緊急靜態頁 + 多 connector | 中（設備 3–8k + 月費 300–500） | 🔴 高 | S4.2 / S5.3 |
| R3 | 單點無異地 → 火災/竊盜/戰損全失 | 機制完成但**未設定、未演練**；Mac mini 若同址則無效；方案 A 未加密 | 實際設定 + 跑一次跨目標演練 + **改用 rclone crypt 加密雲端冷儲存**（D30） | 低（月費個位數美金） | 🔴 高 | S4.3 / S4.4 |
| R4 | RTO ≤ 4h 目標無基礎 | RUNBOOK 訂了但沒有備機 | **誠實區分兩種 RTO** 寫回 RUNBOOK；冷備機不採購（定位 (c) 下不划算） | 零（改文件） | 🟠 中 | S4.5 |
| R5 | 公眾尖峰打爆家用上行與 N5105 | 無快取層 | **CF 邊緣快取 + Always Online + 公眾端點限流**；公眾頁不開 WebSocket | **零** | 🔴 高 | S5.1 / S5.6 |
| R6 | 單 GPU 序列化 → 尖峰 AI 積壓 | Ollama 預設序列 | **AI 全面非阻斷 + fallback 納入演練** + `OLLAMA_KEEP_ALIVE`/`OLLAMA_NUM_PARALLEL` | 零 | 🟠 中 | S2.5 |
| R7 | GPU 被其他專案佔用 → 探測通過但生成失敗 | hybrid 有 `invalidateLocalHealth` 保護；**local 模式沒有** | **`LLM_PROVIDER=hybrid`**（D27）；應變期間暫停訓練（SOP 約定） | 趨近零 | 🔴 高 | S2.1 / S4.7 |
| R8 | 推播本質依賴 Google | 兩條推播實作，其中 legacy FCM **已被 Google 停用**；Web Push 是死碼 | **多通道降級鏈**（D28）：LINE 主力 → Web Push → FCM → Email；刪 legacy FCM 死路 | 低 | 🟠 中 | S5.4 / S5.5 |
| R9 | 告警與 NAS 共存亡 | 無措施 | **方案 (a)**：寫進 SOP + 人工替代管道；(b) CF Workers 列後續選配 | 零 | 🟠 中 | S4.7 |
| R10 | **線上資料是否還存在，未知** | 無人能存取 GCP 專案 | **最優先釐清**（D20，owner 執行） | 零 | 🔴 **最高** | S0.1 |
| R11 | hybrid 的 Gemini 降級變成隱形帳單 | 降級有記 WARN，但無人監看 | **監看 `/health/llm` 的 `active` 與降級 WARN**，讓費用可見 | 零 | 🟠 中 | S2.5 |

---

## 4. 分期路線、工作量、風險與決策記錄

工作量單位為**人日**（1 人日 = 一個 agent 一輪完整實作 + 測試 + 自驗）。分工照 `FULL_SYSTEM_REDESIGN_PLAN.md` 既有慣例：**OPUS**（架構/正確性/高風險）、**SONNET**（機械性批次）、**owner**（採購/註冊/實體操作，無法代勞）。

> **v1.1 說明**：以下分期已依 2026-08-02 的拍板結果重排——原本標「選配」「待 Dxx」的項目，凡被採納者一律升為必做並給定人日；被排除者移出範圍並註明。

---

### S0 — 前置解封（**沒做完，後面全部是空的**）

| # | 工作 | 分工 | 人日 | 風險 |
|---|---|---|---|---|
| S0.1 | **釐清線上資料是否還能取回**（GCP 專案歸屬、Cloud SQL 是否存在、能否 dump） | **owner**（只有 owner 能處理帳號歸屬） | — | 🔴 阻斷全案 |
| S0.2 | 註冊網域並託管到 Cloudflare | **owner** | — | 🔴 阻斷 LINE/OAuth |
| S0.3 | **條件性**：若 S0.1 結果是「資料取不回」，先完成 baseline migration（既有工作項 1.2） | OPUS | 3–5 | 🔴 高（~120 張表的 schema 重建） |
| S0.4 | 確認 GPU 工作站實機型號與 VRAM（D12 記 5090 vs D13 實測 4080S 16GB 矛盾），並回寫修正 D12 與 `infra/nas/README.md` 拓撲圖 | owner 確認 + SONNET 回寫 | 0.5 | 🟡 影響模型選型 |

> **S0.1 是整個計畫的最上游。** 在它有答案之前，任何排程都不成立。
>
> **S0.2 網域**（D24）：拍板為必須註冊且託管到 Cloudflare。`.ngo` 年費較高，可考慮 `.org.tw` / `.tw`。**Cloudflare Tunnel 的 Public Hostname 需要網域先託管在 Cloudflare**，所以註冊時就要選能轉 NS 的註冊商。

---

### S1 — 內網最小可用（不對外）

| # | 工作 | 分工 | 人日 | 風險 |
|---|---|---|---|---|
| S1.1 | NAS 上建儲存池、目錄、裝 Docker（README §3.1–3.2） | owner（依 README 操作） | — | 🟢 |
| S1.2 | 填 `.env`、build image、`compose up`，內網 `verify-stack.sh` 綠燈 | OPUS 陪同 | 1–2 | 🟡 首次部署常卡權限/路徑 |
| S1.3 | schema 就位（情境 A：`migrate-db.sh`；情境 B/C：`migration:run` on baseline） | OPUS | 1–3 | 🔴 資料正確性 |
| S1.4 | 前端 build + rsync + nginx 服務驗證 | SONNET | 0.5 | 🟢 |
| S1.5 | 更新 `infra/nas/README.md` §8 過期項（LLM provider 已實作） | SONNET | 0.2 | 🟢 |

---

### S2 — AI 本地化

| # | 工作 | 分工 | 人日 | 風險 |
|---|---|---|---|---|
| S2.1 | **補 `LLM_PROVIDER=hybrid` 到 compose 與 `.env.nas.example`**（D27）；`LLM_MODEL` 改為 `qwen2.5:7b-instruct`（D22） | SONNET | 0.2 | 🟢 **但不做則全案目標落空** |
| S2.2 | owner 在工作站架 Ollama serve、開內網 11434、拉模型；設 `OLLAMA_KEEP_ALIVE` 讓模型常駐 | **owner** | — | 🟡 |
| S2.3 | 跑 `backend/src/scripts/llm-benchmark.ts` 用**真實通報資料**（`--dataset`）複測（D13 建議） | OPUS | 0.5 | 🟢 |
| S2.4 | 收斂 3 處純文字 Gemini 呼叫到 `LlmProviderService`（manuals / pfa-chatbot / voice SITREP） | SONNET | 1 | 🟡 pfa 直讀 `process.env` 需一併修 |
| S2.5 | **AI 全面非阻斷 + fallback 演練**（line-bot 關鍵字、pfa 模板）＋**hybrid 降級可觀測性**（監看 `/health/llm` 的 `active` 與降級 WARN，讓 Gemini 費用可見，R11） | OPUS | 1.5 | 🟠 韌性關鍵 |
| ~~S2.6~~ | ~~影像（VLM）與語音（Whisper）本地化~~ | — | — | **移出範圍**（D23：維持 Gemini） |

---

### S3 — 對外入口

| # | 工作 | 分工 | 人日 | 風險 |
|---|---|---|---|---|
| S3.1 | 建 Cloudflare Tunnel、Public Hostname 指 `nginx:8080` | owner + OPUS | 0.5 | 🟡 |
| S3.2 | LINE Developers Console / LIFF / Google Cloud Console 四處 callback 重登記 | **owner**（需帳號權限） | — | 🟡 |
| S3.3 | LINE webhook 端到端實測（含簽章、Disable Chunked Encoding 確認） | OPUS | 0.5 | 🟠 |
| S3.4 | Tailscale 用於管理面（SSH/pgAdmin），不對公網開管理埠 | owner + OPUS | 0.5 | 🟢 |
| S3.5 | `verify-stack.sh --base-url https://<網域>` 全綠 | OPUS | 0.3 | 🟢 |

---

### S4 — 韌性硬體與備份（**owner 採購為主**）

| # | 工作 | 分工 | 人日 | 風險 |
|---|---|---|---|---|
| S4.1 | UPS 採購與配置，**涵蓋 NAS+ONU+路由器+交換器**（非只有 NAS），設定 NAS 在 UPS 剩 20% 時 graceful shutdown。GPU 工作站**不納入** | **owner** | — | 🔴 R1 |
| S4.2 | **雙 WAN 備援網路**（4G/5G 路由器 failover）＋ `cloudflared` 多 connector replica | **owner** ＋ OPUS 設定 | 0.5 | 🔴 R2 |
| S4.3 | **實際設定第二副本目標並跑一次 `restore-drill.sh --source=secondary`**，把 RTO 實測值寫進 RUNBOOK §7.3 | owner + OPUS | 1 | 🔴 R3 |
| S4.4 | 第二副本改用 **rclone crypt → 加密雲端冷儲存**（D30；`infra/nas/backup/replicate.sh` 已支援，需設定 remote 與密碼保管） | OPUS | 0.5 | 🟠 個資 |
| S4.5 | 修正 RUNBOOK 的 RTO 目標（區分「資料壞了 ≤4h」vs「機器沒了 = 採購前置期 + 4h」） | SONNET | 0.3 | 🟢 誠實性 |
| S4.6 | NAS 實體安置驗收（RUNBOOK §7.6 清單，拍照存證） | **owner** | — | 🟠 |
| S4.7 | **SOP 補三條拍板事項**：① 停電超過 UPS 續航 → 切離線模式 ② 應變期間暫停 GPU 訓練工作 ③ NAS 不可用時的人工告警替代管道（幹部 LINE 群組、電話樹） | OPUS + owner 確認 | 0.5 | 🟠 R1/R7/R9 |

---

### S5 — 公眾唯讀強化與零雲端收尾（定位 (c)，D26）

| # | 工作 | 分工 | 人日 | 風險 |
|---|---|---|---|---|
| S5.1 | Cloudflare 邊緣快取規則（靜態資產長期快取 + `/public/*` 30–60s，`/public/alerts` 縮到 5–10s）+ **Always Online** | OPUS | 0.5 | 🟢 **性價比最高** |
| S5.2 | CI 建 image 推 registry → NAS 拉取的部署路徑（取代 NAS 上手動 build 的 10–20 分鐘） | OPUS | 1–2 | 🟡 |
| S5.3 | Cloudflare Pages 緊急靜態頁（不依賴 NAS，含 119／1991 指引） | SONNET | 0.5 | 🟢 |
| S5.4 | 多通道告警降級鏈（D28）：**Web Push 死碼接回**（VAPID 金鑰 + 前端接線）、**Email 空殼補實**、LINE Push 升為主力 | OPUS | 2 | 🟠 R8 |
| S5.5 | **刪除已被 Google 停用的 legacy FCM 路徑**（`notification-queue.sendPush` 的 `fcm.googleapis.com/fcm/send`），統一走 `firebase-admin` v1 | SONNET | 0.5 | 🟢 現在就是壞的 |
| S5.6 | 公眾端點限流收緊；確認公眾頁**不開 WebSocket**（長連線無法被邊緣快取） | SONNET | 0.5 | 🟢 |
| S5.7 | **Google Maps 收斂**（D31）：`MapPage`／`MapMarkers`／`MapInfoWindows`／`map-constants` 改用既有 MapLibre 元件；`DirectionsPanel` 改為**深連結開啟使用者手機原生地圖 App**，移除 `@react-google-maps/api` 依賴 | OPUS 設計 / SONNET 批次 | 2–3 | 🟡 需視覺回歸驗證 |
| S5.8 | **L2「基地台模式」離線演練** + 離線可用頁清單文件 + `OfflinePrepPage` 加「準備度檢查」 | OPUS + owner | 1.5 | 🟠 |
| S5.9 | 撤除 `vercel.json` 與 Vercel preview（D25）；`cloudbuild.yaml`／`DEPLOY.md` 標註 deprecated；`deploy.yml` 停用但保留作回雲參考 | SONNET | 0.3 | 🟢 |

---

### 工作量彙總

| 期別 | Agent 人日 | owner 動作 | 可否並行 |
|---|---|---|---|
| S0 | 0.5（＋條件性 3–5） | 🔴 3 項，**阻斷全案** | — |
| S1 | 3–6 | 1 項 | 依賴 S0 |
| S2 | 3.2 | 1 項 | 可與 S1 尾段並行 |
| S3 | 2.3 | 🔴 1 項（callback 重登記） | 依賴 S0.2 網域 |
| S4 | 2.8 | 🔴 4 項（採購／實體） | 可全程並行 |
| S5 | 9–11 | — | 依賴 S3 |
| **合計** | **約 21–26 人日**（不含 S0.3 條件性 baseline 的 3–5） | **10 項 owner 動作** | |

> 誠實提醒：**agent 人日不是瓶頸，owner 動作才是。** 10 項 owner 動作中有 3 項（GCP 帳號歸屬、網域註冊、外部平台 callback 重登記）**無法由 agent 代勞**，且其中 S0.1 決定整個計畫的性質。
>
> v1.0 → v1.1 的人日變化：S2.6（VLM/Whisper）移出範圍 **−1**；S2.5 增加可觀測性 **+0.5**；S4.2 雙 WAN 由選配轉必做 **+0.5**；S4.7 SOP 三條 **+0.5**；S5.7 Google Maps 收斂由「若做 2」轉必做 **2–3**；S5.8 加準備度檢查 **+0.5**；S5.9 部署路徑清理 **+0.3**。

### 建議執行順序

```
S0.1 資料能否取回 ──┬── (A) 能取回 ──→ S1.3 走 migrate-db.sh
（阻斷全案）        └── (B)/(C) ────→ S0.3 baseline migration（+3–5 人日）→ S1.3 走 migration:run
                            │
S0.2 網域註冊 ──────────────┼──→ S3 對外入口（無網域則整期卡住）
                            │
S0.4 GPU 機型確認 ──────────┼──→ S2 AI 本地化
                            │
S4 韌性硬體（採購前置期長）──┴──→ 建議與 S1/S2 同時啟動，不要排在最後
```

**S4 要早開始**：UPS 與 4G/5G 路由器有採購與到貨時間，且 S4.3 的跨目標還原演練需要第二副本目標先就位。**把它排在最後會變成上線後才發現備份沒設定。**

---

### 決策記錄（沿用既有 D 編號序列，現有到 D19；本計畫新增 D20–D31）

#### A. ✅ 已拍板（2026-08-02，owner 全數採納 v1.0 建議）

| # | 決策 | 拍板內容 | 理由 | 落地工作項 |
|---|---|---|---|---|
| **D22** | 本地模型選型 | **`qwen2.5:7b-instruct`** | 與 qwen3:14b 同為 95% 準確，但快一倍、VRAM 省一半（4.7GB），且 14b 在對測中有一次呼叫失敗。與 ST 的 `nomic-embed-text` 共存無壓力 | S2.1 / S2.3 |
| **D23** | 影像分析與語音轉錄 | **維持 Gemini，不本地化** | 用量低；本地模型為純文字，加 VLM/Whisper 的投入與收益不成比例。hybrid 下這兩條本就走雲端 | 移出範圍 |
| **D25** | Vercel preview | **撤除** | NAS 上線後無用途 | S5.9 |
| **D26** | 🔴 **平台定位** | **(c) 內部為主、公眾唯讀** | 公眾只提供唯讀資訊且走 CF 快取，寫入與協作限內部。家用架構的風險可控，且**不對外承諾做不到的 SLA** | 貫穿 S5 |
| **D27** | 🔴 `LLM_PROVIDER` | **`hybrid`**（非 `local`） | 與「零雲端費用」有衝突但值得：平時 100% 本地零費用，只有工作站不可用時才付 Gemini。災時 AI 不會整個消失。配套是降級可觀測性（R11） | S2.1 / S2.5 |
| **D28** | 推播策略 | **LINE 主力 ＋ 保留 FCM ＋ 補 Web Push ＋ 補實 Email；刪 legacy FCM 死路** | LINE 在台到達率最高且與 Google 無關；FCM 對原生 App 無替代方案且成本為零；Web Push 可完全自架。SMS 依 D18 另議 | S5.4 / S5.5 |
| **D29** | UPS／備援網路採購 | **UPS 必買**（涵蓋 NAS+ONU+路由器+交換器，GPU 不納入）；**雙 WAN 也必買** | 定位 (c) 下公眾端有 CF 快取可降級，**但內部應變協作沒有替代品**——斷網時內部作業會整個停擺，這正是平台的主要用途 | S4.1 / S4.2 |
| **D30** | 異地備份第二副本 | **rclone crypt → 加密雲端冷儲存** | 月費個位數美金，是本計畫最划算的保險。Mac mini 同址且未加密，擋不住火災/竊盜，且平台含真實個資與心理健康紀錄 | S4.4 |
| **D31** | Google Maps 路徑規劃 | **不自架 OSRM；`DirectionsPanel` 改深連結開啟手機原生地圖 App，並把 `MapPage` 收斂到 MapLibre** | OSRM 在 N5105 上吃記憶體，而路徑規劃不在關鍵路徑上（現場人員本來就會用自己手機導航）。收斂後可完全移除 `@react-google-maps/api`，達成地圖層零雲端計費 | S5.7 |

> **D29 的補充說明**：v1.0 原寫「雙 WAN 視 D26 而定，若定位 (b) 可先不買」。拍板結果 D26 = **(c)** 而非 (b)，因此雙 WAN 判定為**必買**——(c) 保護的是公眾唯讀那一面（CF 快取即可），但**內部應變協作在斷網時沒有任何替代**，而那才是這個平台真正要做的事。

#### B. 🔴 方向已定，待 owner 執行（事實查證／採購／註冊，無法由 agent 代勞）

| # | 事項 | 需要 owner 做什麼 | 為何無法代勞 | 影響 |
|---|---|---|---|---|
| **D20** | 🔴 **線上資料是否還能取回** | 查 Google 帳單/專案歸屬，或找出當初建立 `light-keepers-mvp` 的帳號；確認 Cloud SQL 是否還在、能否 dump | 本機帳號對該專案無權限（`CONSUMER_INVALID`），且該專案在 `gcloud projects list`／`firebase projects:list` 都看不到 | **決定本案是「搬遷」還是「重新開站」**；若取不回則觸發 S0.3（+3–5 人日） |
| **D21** | GPU 工作站實機型號與 VRAM | 目視確認是 RTX 5090 32GB 還是 RTX 4080 SUPER 16GB | D12 與 D13 記載互相矛盾，只有實機能確認 | 確認後回寫 D12 與 `infra/nas/README.md` 拓撲圖（S0.4）。**不影響 D22**——7b 在兩種卡上都跑得動 |
| **D24** | 🔴 **網域註冊** | 註冊一個網域並把 NS 轉到 Cloudflare。建議 `.org.tw` / `.tw`（`.ngo` 年費較高） | 需付費與實名資料 | LINE webhook／LINE Login／LIFF／Google OAuth 四處 callback 全卡在這；Cloudflare Tunnel 的 Public Hostname 也需要 |
| — | 外部平台 callback 重登記 | LINE Developers Console（Messaging API Webhook URL、LINE Login Callback）、LIFF Endpoint URL、Google Cloud Console OAuth 重新導向 URI | 需各平台帳號權限 | S3.2 |
| — | 硬體採購與安置 | UPS（1000VA 級）、4G/5G 路由器與行動網路方案、NAS 實體安置驗收（RUNBOOK §7.6 拍照存證） | 採購與實體操作 | S4.1／S4.2／S4.6 |
| — | 加密雲端冷儲存開通 | 開 B2/R2 帳號，設定 rclone crypt 密碼並**妥善保管**（密碼錯不會報錯，只會解出亂碼） | 需付款方式 | S4.4 |
| — | 工作站 Ollama 架設 | `ollama serve`、開放內網 11434、拉 `qwen2.5:7b-instruct`、設 `OLLAMA_KEEP_ALIVE` | 實體機器操作 | S2.2 |

#### C. 後續選配（不進本次範圍，條件觸發時再議）

| 事項 | 觸發條件 |
|---|---|
| CF Workers 獨立告警端點（§3.8 方案 (b)） | S5.8 的 L2 演練跑過後，若人工替代管道證實不可靠；或 D26 從 (c) 改為 (a) 公眾正式營運 |
| 冷備機（第二台 NAS 或 Mac mini 預裝 Docker） | 若「機器沒了」的 RTO 數天被判定不可接受 |
| 工作站加 VLM／Whisper（D23 的反向） | 若影像/語音的 Gemini 用量或費用意外攀升 |
| SMS 通道（既有 D18） | 依 D18 另議 |

---

## 5. 拍板後的下一步（v1.1）

決策已定，**但本文件仍是規劃文件——依然沒有動任何程式碼**。實際落地的第一步是：

1. **owner 執行 §4-B 的三項**：D20 資料查證（最上游）、D24 網域註冊、D21 GPU 機型確認。
2. **同時可先做的兩件低風險工作**（不依賴 owner 動作、不碰資料）：
   - **S2.1**（SONNET，0.2 人日）：補 `LLM_PROVIDER=hybrid` 與 `LLM_MODEL=qwen2.5:7b-instruct` 到 `infra/nas/docker-compose.nas.yml` 與 `.env.nas.example`。**這是全案最小、最關鍵的一行改動**——不補的話整個本地化目標落空。
   - **S1.5**（SONNET，0.2 人日）：修正 `infra/nas/README.md` §8 已過期的「LLM provider 尚未實作」。
3. **S4 的採購（UPS、4G/5G 路由器、加密雲端冷儲存）建議即刻啟動**，不要排在最後——採購有到貨前置期，且 S4.3 的跨目標還原演練需要第二副本目標先就位。

> ⚠ 提醒：S2.1 與 S1.5 雖然小，但屬於**改動 repo**，需另行下指令才會執行。本次僅更新計畫文件。

---

## 6. 本計畫不做的事

- 不改任何程式碼、schema、組態。
- 不執行任何部署。
- 不 push `origin/main`（local main 領先 origin/main 161 commits，push 的 blast radius 遠超字面——見 `docs/RUNBOOK.md` 與部署現況記載）。
- 不重複 `infra/nas/README.md` 已寫好的操作步驟。

---

## 7. 相關文件

| 文件 | 內容 |
|---|---|
| [docs/FULL_SYSTEM_REDESIGN_PLAN.md](FULL_SYSTEM_REDESIGN_PLAN.md) | 上位計畫；§INF-1／Phase M、D1–D19 決策記錄 |
| [infra/nas/README.md](../infra/nas/README.md) | **操作手冊**：拓撲、儲存配置、部署步驟、回雲四原則、備份還原、搬遷腳本、疑難排解 |
| [docs/RUNBOOK.md](RUNBOOK.md) | §7 雙目標備份、RPO/RTO、演練紀錄表、NAS 實體安置 |
| [docs/audit/02-integration-map.md](audit/02-integration-map.md) | 既有整合盤點（本文件為實查修正版） |
| [docs/architecture/OFFLINE_LAYER_CONSOLIDATION.md](architecture/OFFLINE_LAYER_CONSOLIDATION.md) | 離線層收斂判定依據（§3.9 的基礎） |
