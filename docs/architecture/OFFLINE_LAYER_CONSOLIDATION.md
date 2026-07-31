# 離線層收斂與修復（FE-4 / 工作項 3.4）

> 對應計畫：`docs/FULL_SYSTEM_REDESIGN_PLAN.md` → FE-4「離線 outbox 三套收斂」
> 前置：工作項 3.1（`docs/architecture/API_CLIENT_CONSOLIDATION.md`）已把 HTTP 出口收斂到 `src/api/client.ts`，
> 並對 7 個離線層檔案開了 `no-restricted-syntax` 豁免，明言「**豁免 ≠ 正確**，其正確性由 3.4 負責」。
> 本文件即該筆技術債的償還紀錄。
> 盤點基準：worktree `agent-a710ea83bff91325a`（已 merge `main` @ `99baa19`）。

---

## 0. 結論摘要（TL;DR）

盤點前假設是「離線 outbox 有 **三套**」。實測結果是 **四套**（另有一套 SW 內建佇列，共五個入口），
而且 **唯一還活著的那一套根本沒有真的送出資料**。

| 嚴重度 | 問題 | 影響 |
|---|---|---|
| 🔴 P0 | `offline.service.ts::attemptSync()` 是**假的**——`setTimeout(100)` 模擬 API 呼叫後**無條件刪除佇列項目** | **離線寫入 100% 靜默遺失**。這是唯一被 UI 消費的離線路徑 |
| 🔴 P0 | `offlineOutbox.ts::syncItem()` 用 `fetch` 但**從不檢查 `response.ok`** | 401/500 被當成成功 → 刪除佇列項目 → **資料遺失** |
| 🔴 P0 | `offline.service.ts` `import Dexie from 'dexie'`，但 `dexie` **不在 `package.json`**（幽靈相依，僅存在於 lockfile） | 任何一次重建依賴樹就會讓唯一的離線模組編譯失敗 |
| 🟠 P1 | `offlineOutbox` / `uploadQueue` / `rxdbSyncService` 全部缺 `/api/v1` 前綴 | production 必 404 |
| 🟠 P1 | 入列時把 `token` 一起寫進 IndexedDB，重放時用**過期 token** | 離線越久越必然 401，且無 refresh → 資料遺失 |
| 🟡 P2 | `offlineSOP.ts` 打 `/api/v1/sops` —— 後端**沒有這個 controller** | 永遠 404 |
| 🟡 P2 | rxdb 層打 `*/sync/push`、`*/sync/pull` —— 後端**沒有任何一個** | 永遠 404 |
| 🟠 P1 | `useSyncStatus.clearData` 呼叫 `clearAllData()`，連 `pendingSync` 一起清 | 使用者按「清除離線資料」＝**丟掉尚未送出的災情回報** |

**收斂結果：4 套 outbox → 1 套**（`services/offline/offline.service.ts`），
刪除 7 個檔案共 ~2,240 行，`npm install` 移除 114 個套件。

**驗證**：`tsc --noEmit` 乾淨、`vitest run` 118 passed（基準 91 + 新增 27）、`vite build` 通過。

---

## 1. 盤點：各檔職責、消費者、路徑/認證正確性、判定

「實際被誰消費」欄位一律附可重跑的證據；`grep` 指令以 `web-dashboard/` 為工作目錄。

### 1.1 判定總表

| # | 檔案 | 行數 | 職責 | 實際消費者（證據） | 路徑 | 認證 | 判定 |
|---|---|---|---|---|---|---|---|
| 1 | `services/offline/offline.service.ts` | 334 | Dexie 快取（alerts/tasks/resources）＋ `pendingSync` outbox ＋ 狀態訂閱 | ✅ **活的**：`hooks/useSyncStatus.ts:9` → `components/SyncStatusIndicator/SyncStatusIndicator.tsx:16` → `components/layout/AppShellLayout.tsx:19,194` | n/a（**根本沒發 HTTP**） | n/a | **保留＋修復（收斂目標）** |
| 2 | `services/offlineOutbox.ts` | 313 | IndexedDB outbox（report/sos/location/attachment）＋ 真實重放 | ⚠️ 只被 `services/syncManager.ts:7` 與 `services/uploadQueue.ts:6` 匯入，**兩者本身皆為孤兒** → 傳遞性死碼 | ❌ 缺 `/api/v1` | ⚠️ 用入列時快照的 token，無 refresh | **收斂進 offline.service（刪檔）** |
| 3 | `services/syncManager.ts` | 243 | 週期同步排程 / 指數退避 / Background Sync 註冊，包在 offlineOutbox 外 | ❌ **零消費者**（僅自身 `export const syncManager`） | 無 HTTP | n/a | **收斂進 offline.service（刪檔）** |
| 4 | `hooks/useOfflineReports.ts` | 271 | 第三套 IndexedDB 佇列（`lightkeepers-offline`），災情回報離線暫存 | ⚠️ 僅 `useNetworkStatus`（同檔另一個 export）被 `components/NetworkStatus.tsx:5` 使用；`useOfflineReports` 本身**零消費者** | ❌ 相對路徑 `/api/v1/reports` | ❌ **完全沒有** Authorization | **刪除死佇列，保留 `useNetworkStatus`** |
| 5 | `hooks/useOfflineSync.ts` | 193 | 第四套佇列：透過 `postMessage` 指揮 SW 內建佇列 | ❌ **零消費者**（2.4 已判定孤兒） | 對應的 SW 協定在 production **不存在**（見 §2） | n/a | **刪除** |
| 6 | `services/offlineSOP.ts` | 294 | SOP 文件離線快取（idb） | ❌ **零消費者**；同檔的 `useOfflineSOP` hook 也零消費者 | ❌ 相對 fetch `/api/v1/sops`；**後端無 `sops` controller** | ❌ 完全沒有 | **刪除** |
| 7 | `services/rxdbDatabase.ts` | 415 | RxDB schema / Lamport clock | ❌ 僅被 `rxdbSyncService.ts:9`、`hooks/useRxDB.ts:8` 匯入，後者零消費者 | n/a | n/a | **刪除** |
| 8 | `services/rxdbSyncService.ts` | 549 | RxDB 雙向 replication ＋ CRDT 衝突解決 | ❌ 僅被 `hooks/useRxDB.ts:9` 匯入（孤兒） | ❌ 缺 `/api/v1`，且**後端無任何 `sync/push`、`sync/pull` 端點** | 用注入的 `authToken`，無 refresh | **刪除** |
| 9 | `hooks/useRxDB.ts` | 233 | rxdb 層的 React 介面 | ❌ **零消費者** | n/a | n/a | **刪除** |
| 10 | `services/uploadQueue.ts` | 278 | presigned URL 附件上傳（initiate → PUT → complete）＋ 進度 | ❌ **零消費者**，但端點**真實存在** | ❌ 缺 `/api/v1` | ⚠️ 手動 `setToken()`，無 refresh | **保留＋修復** |
| 11 | `services/capacitorFilesystem.ts` | — | Capacitor 檔案系統，`fetch(url)` 下載任意資產 | （非離線同步層） | 下載任意 URL，**非 API 呼叫** | n/a | **保留原樣**（豁免正當） |
| 12 | `services/push-notification.service.ts` | — | FCM 註冊 | （非離線同步層） | ✅ 用 `API_BASE`（`= ${VITE_API_URL}/api/v1`），**正確** | 手動帶 token | **保留原樣**（豁免正當，非本任務範圍） |

> **§1.1 的 7 個 ESLint 豁免檔**（`eslint.config.js:49-58` 的 `FETCH_EXEMPT_FILES`，扣掉 `src/api/**`）＝
> #2 `offlineOutbox` / #6 `offlineSOP` / #10 `uploadQueue` / #8 `rxdbSyncService` / #3 `syncManager` / #11 `capacitorFilesystem` / #12 `push-notification`。
> 其中 **4 個被刪除**，1 個修復後不再需要豁免（#10 改走 client），2 個豁免正當保留。

### 1.2 重跑驗證用指令

```bash
cd web-dashboard
# 消費者掃描（判定「孤兒」的依據）
grep -rn "useOfflineSync\|useRxDB\|offlineSOPService\|useOfflineSOP\|syncManager\|uploadQueue" src --include=*.ts --include=*.tsx
# 活路徑掃描
grep -rn "offline.service\|useSyncStatus" src --include=*.ts --include=*.tsx
# 後端端點是否存在
grep -rn "@Controller(" ../backend/src | grep -i "sop"          # → 無輸出
grep -rn "sync/push\|sync/pull" ../backend/src                   # → 無輸出
```

### 1.3 四套 outbox 的 IndexedDB 資料庫名稱（互不相通）

| Outbox | DB 名稱 | 儲存體 | 狀態 |
|---|---|---|---|
| `offline.service.ts` | `LightKeepersOfflineDB` | Dexie | 活（但重放是假的） |
| `offlineOutbox.ts` | `lightkeepers-outbox` | 原生 IndexedDB | 死碼 |
| `useOfflineReports.ts` | `lightkeepers-offline` | 原生 IndexedDB | 死碼 |
| `offlineSOP.ts` | `lightkeepers-sop` | idb | 死碼 |
| SW 內建佇列 | `offline-queue`（`public/sw.js`） | 原生 IndexedDB | production 不存在（見 §2） |

四個相似的 DB 名稱是這層最大的認知負擔來源：`lightkeepers-offline` 與 `lightkeepers-outbox` 僅差兩個字元，
卻是兩套完全獨立、schema 不相容的佇列。

---

## 2. 與 Workbox / Service Worker 的關係（重要：手寫 SW 在 production 會被覆蓋）

專案同時存在兩個 service worker 來源：

1. `web-dashboard/public/sw.js` —— 手寫 SW，實作了 `QUEUE_REQUEST` / `GET_QUEUE` / `CACHE_SOP` /
   `CLEAR_CACHE` / `SYNC_COMPLETE` / `QUEUE_UPDATE` 的 postMessage 協定（即 `useOfflineSync.ts` 對接的協定）。
2. `vite-plugin-pwa` 以 **`generateSW` 模式**產出 `dist/sw.js`（`vite.config.ts:9-10`，`registerType: 'autoUpdate'`）。

兩者輸出到**同一個路徑** `/sw.js`，而 `src/main.tsx:46` 註冊的是 `/sw.js`。

**實測證據**（跑 `npx vite build` 後）：

```
PWA v1.2.0
mode      generateSW
files generated
  dist/sw.js
  dist/workbox-f641ca17.js

$ grep -c "QUEUE_REQUEST\|GET_QUEUE\|CACHE_SOP" dist/sw.js
0
```

→ **`public/sw.js` 在 production build 被 Workbox 產物完全覆蓋**，手寫 SW 的離線佇列協定一行都不存在。
因此 `useOfflineSync.ts` 不只是「零引用孤兒」，它對接的協定在 production **根本不存在**——刪除無任何行為風險。

### 2.1 Workbox 快取與 outbox 的分工（收斂後）

| 層 | 負責 | 不負責 |
|---|---|---|
| **Workbox runtime caching**（`vite.config.ts:49-`） | **讀取型** GET：API `NetworkFirst` 24h（`/api/v1/*`）、地圖磚 `CacheFirst`（Google Maps 7d、其他 30d） | 寫入型請求 |
| **offline.service outbox** | **寫入型** POST/PATCH/DELETE：離線入列 → 上線重放 | 讀取快取 |

兩者責任不重疊：Workbox 只快取 GET 回應，`NetworkFirst` 對 POST 不生效；
離線寫入必須由 outbox 承擔。收斂後這條分界線是明確的，先前四套 outbox 並存時則不是。

> **注意**：Workbox 的 `cacheableResponse.statuses: [0, 200]` 表示 API 快取只收 200。
> 離線時讀取走 Workbox 快取（最多 24h 舊資料），寫入走 outbox，兩條路徑獨立。

---

## 3. 收斂後架構

```
                    ┌─ 讀取（GET）─── src/api/client.ts ──→ 後端
                    │                      ↑
UI（React 元件/頁面）┤                 Workbox NetworkFirst 24h（離線回退快取）
                    │
                    └─ 寫入（離線時）─ offline.service.queue*() ─→ Dexie `pendingSync`
                                              │
                                     online 事件 / 30s 週期 / 手動
                                              ↓
                                      attemptSync() 依 FIFO 重放
                                              ↓
                                    src/api/client.ts（Bearer 注入 + 401 refresh）
                                              ↓
                                    2xx → 刪除項目｜失敗 → 保留 + retryCount++ + 指數退避
```

**一句話**：離線層從「四套互不相通的 outbox＋一個假的重放」收斂成
**單一 Dexie outbox（`offline.service`），入列後由 `src/api/client.ts` 依 FIFO 重放，
只有真正 2xx 才刪除，401 先 refresh 再重試，其餘失敗一律保留並指數退避**。

### 3.1 `offline.service` 收編的能力來源

| 能力 | 原本在哪 | 收斂後 |
|---|---|---|
| Dexie 快取（alerts/tasks/resources）、狀態訂閱、`clearOldData` | `offline.service` | 保留 |
| **真實 HTTP 重放** | `offlineOutbox.syncItem()` | 遷入，並補上 `response.ok` 等價檢查（axios 非 2xx 自動 reject） |
| `report` / `sos` / `location` 三種寫入型別 | `offlineOutbox` | 遷入為 `queueReport/queueSos/queueLocation` |
| `retryCount` / `lastError` / 上限 | `offlineOutbox` | 遷入（**上限到達不刪除**，只跳過） |
| 報告離線快取（`reports-cache`） | `offlineOutbox` | 遷入為 Dexie `reports` table（schema v2） |
| 週期同步（30s）、指數退避、Background Sync 註冊 | `syncManager` | 遷入為 `startAutoSync()` / `nextAttemptAt` / `registerBackgroundSync()` |
| presigned URL 上傳 + 進度 | `uploadQueue` | **維持獨立**（見 §3.2） |

### 3.2 為什麼 `uploadQueue` 不併入 outbox

outbox 的項目要序列化進 IndexedDB；`uploadQueue` 持有 `File`/`Blob` 且需要 `XMLHttpRequest`
上傳進度事件與 GCS presigned URL 的**直傳**（不能經過 axios baseURL）。兩者語意不同：

- outbox：**耐久**的 JSON 寫入，跨分頁重啟仍存在
- uploadQueue：**行程內**的二進位上傳，帶進度回報

> **已知限制（未在本次修復範圍）**：`uploadQueue` 的佇列是記憶體 `Map`，重新整理分頁後未完成的上傳會遺失。
> 要做到耐久需把 `Blob` 存進 IndexedDB，屬於獨立工作項。本次僅修正路徑與認證，並移除它對
> `offlineOutbox` 的相依（原本每筆 `attachment` 項目在重放時都會 `throw`，永遠累積在佇列裡清不掉）。

---

## 4. 修復清單

| # | 檔案 | 修復內容 |
|---|---|---|
| F1 | `offline.service.ts` | **移除假重放**。`attemptSync()` 改為經 `src/api/client.ts` 發出真實請求 |
| F2 | `offline.service.ts` | **只有 2xx 才 `delete`**；任何失敗都保留項目並 `retryCount++` / 記錄 `lastError` |
| F3 | `offline.service.ts` | **401 → `refreshAccessToken()` → 同一輪重試一次**；refresh 失敗也**不刪除**，留待下次 |
| F4 | `offline.service.ts` | 重放依 **FIFO**（Dexie `++id` 主鍵順序），單筆失敗不影響其他項目 |
| F5 | `offline.service.ts` | 指數退避 `nextAttemptAt`（5s → 上限 5min）；`attemptSync({ force: true })` 可略過退避（手動同步鈕用） |
| F6 | `offline.service.ts` | 重試上限（5 次）到達後**跳過但保留**資料，另開 `retryFailed()` 重置 |
| F7 | `offline.service.ts` | 新增 `queueReport` / `queueSos` / `queueLocation`，路徑補齊（client baseURL 已含 `/api/v1`） |
| F8 | `offline.service.ts` | 新增 Dexie schema v2：`reports` table（承接 `offlineOutbox` 的 `reports-cache`） |
| F9 | `offline.service.ts` | 新增 `startAutoSync()` / `stopAutoSync()` / `registerBackgroundSync()`（承接 `syncManager`） |
| F10 | `offline.service.ts` | 新增 `clearCaches()`：只清唯讀快取、**保留未送出的 outbox**（見 F11） |
| F11 | `hooks/useSyncStatus.ts` | `clearData` 由 `clearAllData()` 改為 `clearCaches()`——原本使用者按一下「清除離線資料」就會連同尚未送出的災情回報一起刪掉；`sync` 改用 `{ force: true }`（手動同步不該再等退避）；新增 `retryFailed` |
| F12 | `package.json` | **`dexie` 補進 `dependencies`**（原本是 lockfile 幽靈相依，唯一活著的離線模組靠它編譯） |
| F13 | `package.json` | 移除 `rxdb` / `rxjs` / `idb`（隨 rxdb 層與 offlineSOP 一起刪除，`npm install` 移除 114 個套件） |
| F14 | `vite.config.ts` | `manualChunks` 的 `vendor-realtime` 移除 `rxjs` entry（否則 build 會 `Could not resolve entry module "rxjs"`） |
| F15 | `uploadQueue.ts` | 路徑改用 `API_BASE`（含 `/api/v1`）；token 改讀 `getStoredToken()`（即時取，非快照）；401 → refresh → 重試一次 |
| F16 | `uploadQueue.ts` | 移除對 `offlineOutbox` 的相依（該路徑原本必定 `throw`）；initiate 改為送出呼叫端實際提供的 metadata（原本硬寫 `kind:'photo'` / `locationSource:'device'`，等於丟掉 EXIF 座標與 video/file 類型） |
| F17 | `useOfflineReports.ts` | 刪除死佇列與其裸 fetch，保留 `useNetworkStatus`；移除檔頭 ESLint 豁免註解 |
| F18 | `eslint.config.js` | `FETCH_EXEMPT_FILES` 由 7 → 3（`uploadQueue` / `capacitorFilesystem` / `push-notification`） |

### 4.1 刪除清單

| 檔案 | 行數 | 理由 |
|---|---|---|
| `services/offlineOutbox.ts` | 313 | 能力已遷入 offline.service |
| `services/syncManager.ts` | 243 | 能力已遷入 offline.service |
| `services/offlineSOP.ts` | 294 | 零消費者＋後端無 `sops` 端點 |
| `services/rxdbDatabase.ts` | 415 | rxdb 層整層零消費者 |
| `services/rxdbSyncService.ts` | 549 | 同上＋後端無 `sync/*` 端點 |
| `hooks/useRxDB.ts` | 233 | 同上 |
| `hooks/useOfflineSync.ts` | 193 | 零消費者＋對接的 SW 協定在 production 不存在（§2） |
| **合計** | **~2,240** | |

---

## 5. 測試

`src/test/services/offline.service.test.ts`（新增）。以 `fake-indexeddb/auto`（已在 `src/test/setup.ts`）
提供真實 IndexedDB 語意，`vi.mock` 掉 `src/api/client` 以控制 HTTP 結果。

涵蓋（對應任務要求）：

| 要求 | 測試 |
|---|---|
| 入列 | 入列後 `getPendingCount()` / `getPendingChanges()` 反映項目；`queueReport/Sos/Location` 各自寫入正確 payload |
| 上線觸發重放 | 派發 `window` `online` 事件 → 自動呼叫重放 |
| 重放順序 | 三筆入列後，`api` 被呼叫的順序為 FIFO |
| 失敗重試不遺失 | 網路錯誤 / 500 後項目**仍在**佇列，`retryCount` 遞增、`lastError` 有值 |
| 401 refresh 後重試 | 401 → `refreshAccessToken()` 被呼叫 → 帶新 token 重試 → 成功後清除；refresh 失敗則**保留**項目 |
| 重放成功後清除 | 2xx 後項目從佇列消失，`lastSyncAt` 更新 |

另涵蓋：退避 gating、退避到期後重試、重試上限不刪資料、`retryFailed()` 重置、
畸形項目（缺 `missionSessionId`）也不刪除、離線時不重放、路徑/HTTP 方法對應、
`clearCaches()` 不波及 outbox。

**結果：新增 27 個測試，全套 118 passed（基準 91 + 27）。**

### 5.1 兩個測試環境陷阱（後續改這層時會踩到）

1. **不能用 `vi.useFakeTimers()`**：`fake-indexeddb` 依賴真實 timer/microtask 排程，
   假 timer 會讓 Dexie 的交易永遠不 resolve，整個檔案 hook timeout。
   要快轉退避時間請只 stub `Date.now`。
2. **`setOnline()` 不要順手派發 `online` 事件**：service 的 online listener 會自動觸發
   `attemptSync()`，與測試裡顯式呼叫的 `attemptSync()` 競爭 `isSyncing` 鎖
   （先進入的拿走鎖，後者直接 return 空結果）。只有驗證事件行為的測試才派發。

---

## 6. 後續（不在本工作項範圍）

1. **`public/sw.js` 的處置**：目前它在 production 被 Workbox 覆蓋，等於一個 700 行的死檔，
   但 dev 模式下仍可能被載入而造成混淆。要嘛改用 vite-plugin-pwa 的 `injectManifest` 模式把它接回來，
   要嘛刪除。本次僅刪除前端對它的呼叫端（`useOfflineSync`），SW 檔本身的去留另案處理。
2. **`uploadQueue` 耐久化**：見 §3.2 已知限制。
3. **後端 `api/` 重複前綴清理**：見 `docs/architecture/API_CLIENT_CONSOLIDATION.md`，23 個 controller。
4. **`OfflinePrepPage.tsx`**：`/hub/offline` 活路由，裸 fetch 缺 `/api/v1`，已由檔頭註解指派給**工作項 3.2**。
