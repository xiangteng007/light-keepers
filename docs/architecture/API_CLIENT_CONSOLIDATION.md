# 前端 API Client 收斂方案（FE-4 / 工作項 3.1）

> 對應計畫：`docs/FULL_SYSTEM_REDESIGN_PLAN.md` → FE-4「API 層統一（4 套 → 1）＋錯誤/狀態慣例」
> 本文件為 **3.1 產出的方案**；**3.2 依本文件的批次清單執行遷移**。
> 數字盤點基準：`main` @ `57cfff0`（2026-08-01 重新掃描，非計畫書撰寫當時的舊數字）。

---

## 1. 現況（re-verify 後的實測數字）

| 項目 | 計畫書當時 | 本次實測 | 備註 |
|---|---|---|---|
| HTTP client 套數 | 4 | 4 | client.ts / utils/api.ts / services/api.ts / 裸 fetch |
| `utils/api` 使用檔 | 16 | **17**（其中 3 檔本次已遷移 → 剩 14） | 含 1 個 modal 元件，非全是頁面 |
| `services/api` 使用檔 | 4 | **4** | ApprovalCenter / DroneControl / Equipment / Triage |
| 裸 `fetch()` 檔 | 31 | **38 檔 / 148 個呼叫點** | 含 8 個非頁面模組（hook/service/元件） |
| 後端硬寫 `api/` 前綴 controller | 23 | **23** | 造成 `/api/v1/api/*`；不在本任務範圍 |
| react-query 使用檔 | 12 | **12 → 15**（本次 +3） | |

**頁數對帳**：38 個 fetch 檔中屬於 `src/pages/**` 的有 30 頁，加上 14（utils/api）+ 4（services/api）+ 3（本次已遷移）＝ **51 頁**，與計畫書的 51 一致；另有 8 個非頁面模組（`TimelineView` 元件、`useOfflineReports` / `useCoreObjects` hook、`firebase-auth.service` / `aiQueueApi` / `fieldReportsApi` / `taskDispatchApi` / `services/api.ts`）一併納入遷移範圍。

### 1.1 四套 client 的能力對照

| 能力 | `src/api/client.ts` ✅ 目標 | `src/utils/api.ts` | `src/services/api.ts` | 裸 `fetch()` |
|---|---|---|---|---|
| 底層 | axios | axios | fetch 包裝 | fetch |
| `baseURL` | `${VITE_API_URL}/api/v1` | `${VITE_API_URL}/api/v1` | `${VITE_API_URL}/api/v1` | **各頁自理，多數錯誤** |
| Bearer 注入 | ✅ request interceptor | ✅ request interceptor | ✅ `createHeaders()` | ❌ 幾乎全無 |
| 401 auto-refresh | ✅ **mutex，單一 refresh 請求** | ❌ 直接清 token 並跳 `/login` | ❌ 直接丟 Error | ❌ |
| 401 後 public path 保護 | ✅ 白名單頁不強制跳轉 | ❌ 一律跳轉 | ❌ | ❌ |
| `withCredentials`（httpOnly refresh cookie） | ✅ | ❌ | ❌ | 1 處手動 `credentials:'include'` |
| timeout | ✅ 20s（Cloud Run 冷啟動） | ❌ 無 | ❌ 無 | ❌ 無 |
| 403 記錄 | ✅ | ❌ | ❌ | ❌ |
| 測試覆蓋 | ✅ `src/test/api/client.test.ts` | ❌ | ❌ | ❌ |

**結論**：`src/api/client.ts` 是唯一具備完整認證語意的實作，其餘三套都是它的退化版本。收斂方向沒有取捨空間。

---

## 2. 目標架構：單一出口 `src/api/`

```
src/api/
├── client.ts      ← 唯一 axios instance（default export）。Bearer 注入 / 401 refresh mutex /
│                    withCredentials / timeout。**全站唯一允許發 HTTP 的地方。**
├── config.ts      ← API_BASE_URL / API_BASE / WS_BASE_URL 常數（re-export client）
├── errors.ts      ← 【本次新增】getApiErrorMessage / isClientError / defaultQueryRetry
├── paths.ts       ← 【本次新增】legacy 後端 `api/` 重複前綴的路徑常數表
├── index.ts       ← barrel（`export { default as api } from './client'`）
└── services/*.ts  ← 依領域封裝的 API 函式（既有，逐步擴充）
```

### 2.1 呼叫層級

```
頁面 / 元件
   └─ react-query（useQuery / useMutation）   ← 資料存取的標準介面
        └─ src/api/services/<domain>.ts       ← 可選：領域函式（多頁共用時才抽）
             └─ src/api/client.ts             ← 唯一 HTTP 出口
```

單頁自用的請求可以在 `queryFn` 內直接呼叫 `api.get(...)`，不必為了抽而抽；
**同一端點被 2 個以上頁面使用時**才提升到 `src/api/services/`。

### 2.2 後端 `/api/v1/api/*` 路徑重複問題的相容設計

後端 `backend/src/main.ts` 設 `app.setGlobalPrefix('api/v1')`，但 23 個 controller 在
`@Controller()` 裡又寫了一次 `api/`：

```ts
@Controller('api/drill')        // → 實際 /api/v1/api/drill
@Controller('api/v1/clusters')  // → 實際 /api/v1/api/v1/clusters
```

**後端前綴清理不在 FE-4 範圍**（會動到 23 個 controller 與其 spec）。
因此本次新增 `src/api/paths.ts`，把「多出來的那一段」集中成常數：

```ts
import api from '@/api/client';
import { LEGACY, legacyPath, missionPath } from '@/api/paths';

await api.get(`${LEGACY.drill}/scenarios`);        // → /api/v1/api/drill/scenarios
await api.get(missionPath(sessionId, 'sitrep'));   // → /api/v1/api/missions/<id>/sitrep
await api.get(LEGACY.clusters);                    // → /api/v1/api/v1/clusters
```

後端修好時，把 `paths.ts` 的 `LEGACY_PREFIX` / `LEGACY_V1_PREFIX` 改成 `''` 即可，
**所有呼叫點都不用動**。這是「路徑常數表」相對於各頁硬寫 `/api/...` 字串的唯一理由，
3.2 遷移時**不得**把 legacy 路徑硬寫進頁面。

`paths.ts` 內 `LEGACY` 涵蓋全部 23 個 controller，可用下列指令重新驗證：

```bash
grep -rn "@Controller(['\"\`]api/" backend/src --include=*.ts
```

---

## 3. API 差異對照與遷移對應

### 3.1 `utils/api.ts` → `api/client.ts`（**drop-in**）

兩者都是 axios instance，**公開介面完全相同**（`api.get/post/put/patch/delete`、
`{ params }`、`response.data`、`AxiosError`）。差別只在 interceptor 行為，且新版是嚴格更好的。

| 舊 | 新 |
|---|---|
| `import api from '../utils/api'` | `import api from '../api/client'` |
| `api.get('/x', { params })` | 不變 |
| `err?.response?.data?.message` | `getApiErrorMessage(err, '無法載入…')` |

**唯一行為變化**：401 時不再無條件跳 `/login`，改為先嘗試 refresh；
refresh 失敗且當前不是 public path 才跳轉。對使用者是改善，對測試需注意 mock 的是 `api/client`。

### 3.2 `services/api.ts` → `api/client.ts`（**回傳形狀相容，錯誤形狀不同**）

`services/api.ts` 刻意模仿 axios 的 `{ data, status, statusText }`，所以**讀取回傳值的程式碼不用改**。
需要改的只有兩處：

| 面向 | `services/api.ts`（舊） | `api/client.ts`（新） | 遷移動作 |
|---|---|---|---|
| 回傳 | `{ data, status, statusText }` | `AxiosResponse`（同名欄位 + headers/config） | 無需改 |
| `params` 型別 | `Record<string, string>` | `any`（axios 自行序列化） | 可直接傳 number/boolean，不必再 `String(x)` |
| 錯誤 | `new Error('API Error: 404 Not Found')` | `AxiosError`（帶 `response.data`） | `err.message` → `getApiErrorMessage(err, ...)` |
| 401 | 丟 Error，各頁自理 | 自動 refresh + 重送 | 移除頁面裡的手動 re-login 邏輯 |
| 非 JSON 回應 | 自動回 `text()` | 回字串（`Content-Type` 非 JSON 時） | 無需改 |

### 3.3 裸 `fetch()` → `api/client.ts`

裸 fetch 依「baseURL 從哪來」分成六類，遷移難度與**production 影響程度**不同：

| 類別 | 形式 | 檔數 / 呼叫點 | production 現況 | 遷移動作 |
|---|---|---|---|---|
| **A** | `fetch('/api/v1/...')` 相對路徑 | 20 檔 / 66 處 | **必壞**：打到前端 CDN 網域，無 baseURL、無 auth header | 換 `api.get('/...')`，去掉 `/api/v1` 前綴 |
| **A′** | `fetch(\`${API_BASE}/api/...\`)`，`API_BASE = VITE_API_URL`（檔內自定義） | 1 檔 / 1 處（`useCoreObjects.ts`） | **必壞**：缺 `/v1` 版本段 | 換 `api.*`，路徑去掉 `/api` |
| **B** | `fetch(\`${API_BASE}/...\`)`，`API_BASE` 來自 `api/config`（已含 `/api/v1`） | 10 檔 / 43 處 | 路徑對，但**無 Authorization header** → 受保護端點一律 401 | 換 `api.*`，路徑不變 |
| **C** | `fetch(\`${API_URL}/...\`)`，`API_URL = VITE_API_URL`（**缺 `/api/v1`**） | 5 檔 / 32 處 | **必壞**：缺版本段 | 換 `api.*`，路徑不變（baseURL 自動補版本段） |
| **D** | `services/api.ts` 內部實作 | 1 檔 / 5 處 | n/a | 整檔刪除（3.2 最後一步） |
| **E** | 外部 URL 健康檢查 | 1 檔 / 1 處（`MonitorPage.tsx`） | 正常 | **保留 fetch**，改為 ESLint config 明文例外並註明理由 |

標準轉換樣板：

```ts
// 之前
const res = await fetch(`${API_BASE}/audits?status=${filterStatus}`, {
    headers: { 'Content-Type': 'application/json' },
});
if (!res.ok) throw new Error('failed');
const data = await res.json();

// 之後
const { data } = await api.get('/audits', { params: { status: filterStatus } });
```

要點：
- **不要**自己組 query string，交給 axios 的 `params`（自動 encode、跳過 `undefined`）。
- **不要**自己寫 `Content-Type` / `Authorization`，client 已處理。
- **不要**自己檢查 `res.ok`，axios 對非 2xx 自動 throw。
- `response.json()` → `response.data`（axios 已 parse）。

---

## 4. 特殊情況盤點（全站掃描結果）

在動手遷移前先確認「有沒有 axios 換不掉的東西」。掃描結論：**沒有阻擋項**。

| 特殊情況 | 掃描指令 | 實測 | 處理方式 |
|---|---|---|---|
| **FormData / 檔案上傳** | `grep -rn "FormData" src` | fetch + FormData **0 處**。上傳走 `services/uploadQueue.ts` 的 presigned URL（initiate → PUT → complete） | 無需處理；uploadQueue 屬離線層，已列 ESLint 例外 |
| **AbortController / signal** | `grep -rn "AbortController\|signal:" src` | **1 處**：`MonitorPage.tsx` 的 `AbortSignal.timeout(10000)`，打的是**外部服務 URL** | 保留 fetch（類別 E）。頁面內的請求取消改用 react-query 傳入的 `signal`：`queryFn: ({ signal }) => api.get(url, { signal })`（axios 1.x 原生支援） |
| **Blob / ArrayBuffer / responseType** | `grep -rn "\.blob()\|arrayBuffer()\|responseType" src` | **0 處** | 無。日後若需下載，用 `api.get(url, { responseType: 'blob' })` |
| **`credentials: 'include'`** | `grep -rn "credentials: 'include'" src` | **1 處**：`useCoreObjects.ts` | client.ts 已全域 `withCredentials: true`，遷移後自動具備 |
| **EventSource / WebSocket** | `grep -rn "EventSource\|new WebSocket" src` | **0 處**（realtime 走 socket.io，用 `WS_BASE_URL`） | 不在本範圍 |
| **外部網域 fetch** | `grep -rn "fetch(['\`\"]http" src` | **0 處**（唯一外部呼叫是 `MonitorPage` 的變數 `service.url`） | 類別 E |
| **Service Worker** | `public/sw.js`、`public/firebase-messaging-sw.js` | 不在 `eslint src` 掃描範圍 | 天然豁免；**不得**改用 axios（SW 無 window/localStorage） |
| **離線同步層** | `offlineOutbox` / `offlineSOP` / `uploadQueue` / `rxdbSyncService` / `syncManager` / `capacitorFilesystem` / `push-notification.service` | 在背景 sync / Capacitor 情境執行 | **ESLint 明文豁免**。其正確性由工作項 **3.4**（離線 outbox 三套收斂）負責，不在 3.2 範圍 |

> ⚠️ 「ESLint 豁免」不等於「實作正確」。例如 `offlineSOP.ts` 目前用 `fetch('/api/v1/sops')` 相對路徑，
> 在 production 同樣會壞——但它屬 3.4 的範圍，本文件只負責標記，3.2 不動它。

---

## 5. react-query 標準用法慣例

全站 `QueryClient` 預設值（`src/main.tsx`）：

```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 分鐘
      retry: defaultQueryRetry,   // 4xx 不重試，其餘重試 1 次（本次新增）
    },
  },
})
```

`defaultQueryRetry`（`src/api/errors.ts`）修掉了原本 `retry: 1` 的問題：
401 在 refresh 失敗後還會再打一次、403/404 也會無意義重試。

### 5.1 命名與 query key

```ts
/** query key 慣例：[領域, 資源, ...參數] —— 參數進 key，變動即自動 refetch */
const auditKeys = {
    logs: (filters: { status: string; action: string }) => ['audit', 'logs', filters] as const,
};
```

- key 一律 **`as const` 陣列**，第一段是後端領域名（對齊 controller 路徑）。
- **伺服器端篩選條件必須進 key**；純前端搜尋（如 client-side `searchQuery`）**不進 key**。
- 每頁把 key factory 宣告在檔案頂層，`useMutation` 成功後用
  `queryClient.invalidateQueries({ queryKey: auditKeys.logs(...) })` 失效。

### 5.2 loading / error / staleTime 對應表

| 舊寫法 | react-query 對應 | 說明 |
|---|---|---|
| `const [loading, setLoading] = useState(true)` | `isFetching` | 含首次載入與 refetch，與舊行為等價 |
| 只想在**首次**顯示骨架 | `isPending` | 背景 refetch 不閃爍時用這個 |
| `const [error, setError] = useState<string \| null>` | `getApiErrorMessage(queryError, '無法載入…')` | fallback 訊息必填，強制想清楚語境 |
| `const [data, setData] = useState([])` | `data: rows = []` | 預設值寫在解構，避免 `data!` |
| `fetchX()`（重新整理按鈕） | `refetch` | **必須包成 `onClick={() => refetch()}`**；直接傳會把 MouseEvent 當 `RefetchOptions`，TS weak-type 檢查會報錯 |
| `useEffect(() => { fetchX() }, [dep])` | 把 `dep` 放進 `queryKey` | 直接刪掉 effect |
| 每次進頁都重打 | `staleTime` | 預設 5 分鐘；即時性資料（告警/派遣）覆寫為 `staleTime: 0` 或加 `refetchInterval` |

### 5.3 標準模式

**模式 A — 單一 GET 清單**（範例：`LeaderboardPage.tsx`）

```ts
const { data: entries = [], isFetching: loading, error: queryError, refetch } = useQuery({
    queryKey: leaderboardKeys.ranking(timeframe),
    queryFn: async ({ signal }): Promise<LeaderboardEntry[]> => {
        const res = await api.get('/volunteer-points/ranking', {
            params: { timeframe, limit: 20 },
            signal,                       // 元件卸載/參數變動時自動取消
        });
        const data = res.data?.data || res.data || [];
        return (Array.isArray(data) ? data : data.items ?? []).map(normalize);
    },
});
const error = queryError ? getApiErrorMessage(queryError, '無法載入排行榜') : null;
```

**模式 B — 串接式多請求**（範例：`OrgChartPage.tsx`）

一個 `queryFn` 內做多個相依請求即可，**不要**拆成兩個 `useQuery` 再用 `enabled` 串
（多一次 render、loading 變成兩段）。同時：原本寫在 `finally` 裡的「衍生 UI 狀態」
（如自動展開前兩層）應改為 `useMemo` 從 query 結果推導，避免 `react-hooks/set-state-in-effect`。

**模式 C — 伺服器端篩選參數**（範例：`AuditLogPage.tsx`）

篩選條件進 `queryKey`，刪除 `useEffect` + `useCallback` 依賴鏈；react-query 會快取每一組條件的結果，
來回切換篩選不再重打。

**模式 D — 寫入（3.2 遇到 POST/PUT/DELETE 時）**

```ts
const queryClient = useQueryClient();
const { mutateAsync: createAudit, isPending: saving } = useMutation({
    mutationFn: (body: CreateAuditDto) => api.post('/audits', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: auditKeys.all }),
});
```

寫入失敗一律用 `getApiErrorMessage(err, '儲存失敗')` 呈現，**不要**吞掉錯誤。

---

## 6. ESLint 防護欄（本次已落地）

檔案：`web-dashboard/eslint.config.js`

### 6.1 規則

| # | 規則 | 內容 | 例外 |
|---|---|---|---|
| (a) | `no-restricted-imports` | 禁止 import `**/utils/api`、`**/services/api` | `src/utils/api.ts` / `src/services/api.ts` 自身 |
| (b) | `no-restricted-syntax` | 禁止 `fetch(...)` 與 `window`/`globalThis`/`self` 的 `.fetch(...)` | `src/api/**`＋service worker / 離線同步層 7 檔（見 config 內 `FETCH_EXEMPT_FILES`） |

兩條規則的 message 都直接指向本文件與 `src/api/paths.ts`，違規者不必翻文件就知道怎麼改。

### 6.2 現有違規統計（`npx eslint src`，規則加入後、白名單化之前）

| 規則 | 檔數 | 違規數 |
|---|---|---|
| `no-restricted-imports` | 21 → **18**（本次遷移 3 頁） | 21 → **18** |
| `no-restricted-syntax`（裸 fetch） | **38** | **148** |

**`no-restricted-imports` 18 檔**（每檔 1 行 import）：

<details><summary>展開清單</summary>

`utils/api`（14）：
`src/components/modals/InboundQrModal.tsx`、`src/pages/LabelManagementPage.tsx`、
`src/pages/PermissionsPage.tsx`、`src/pages/SensitiveAuditPage.tsx`、
`src/pages/UnifiedResourcesPage.tsx`、`src/pages/c2/AARPage.tsx`、
`src/pages/c2/DrillsPage.tsx`、`src/pages/c2/IncidentsPage.tsx`、
`src/pages/command/TaskDispatchPage.tsx`、`src/pages/domains/community/CommunityCenterPage.tsx`、
`src/pages/domains/logistics/EquipmentPage.tsx`、`src/pages/domains/logistics/ResourcesPage.tsx`、
`src/pages/domains/workforce/AttendancePage.tsx`、`src/pages/resources/ResourceOverviewPage.tsx`

`services/api`（4）：
`src/pages/ApprovalCenterPage.tsx`、`src/pages/DroneControlPage.tsx`、
`src/pages/EquipmentPage.tsx`、`src/pages/TriagePage.tsx`

</details>

**`no-restricted-syntax` 38 檔 / 148 處**（依 §3.3 分類）：

<details><summary>展開清單</summary>

**A — 相對 `/api`（20 檔 / 66 處，production 必壞）**

| 呼叫數 | 檔案 |
|---:|---|
| 5 | `src/pages/admin/DrillCenterPage.tsx` |
| 5 | `src/pages/admin/SchedulerPage.tsx` |
| 5 | `src/pages/care/MyMoodPage.tsx` |
| 5 | `src/pages/command/IAPManagerPage.tsx` |
| 4 | `src/pages/admin/FeatureFlagsPage.tsx` |
| 4 | `src/pages/admin/GeofencingPage.tsx` |
| 4 | `src/pages/admin/WebhookManagementPage.tsx` |
| 4 | `src/pages/command/SITREPViewerPage.tsx` |
| 4 | `src/pages/monitor/MeshMonitorPage.tsx` |
| 4 | `src/pages/notifications/NotificationCenterPage.tsx` |
| 4 | `src/pages/weather/WeatherPage.tsx` |
| 3 | `src/pages/analytics/AnalyticsDashboardPage.tsx` |
| 3 | `src/pages/command/AARPlaybackPage.tsx` |
| 3 | `src/pages/public/TransparencyPage.tsx` |
| 2 | `src/pages/admin/DashboardEditorPage.tsx` |
| 2 | `src/pages/admin/SystemSettingsPage.tsx` |
| 2 | `src/pages/security/TwoFactorSetupPage.tsx` |
| 1 | `src/pages/voice/VoiceCallPage.tsx` |
| 1 | `src/components/timeline/TimelineView.tsx` |
| 1 | `src/hooks/useOfflineReports.ts` |

**A′ — 缺 `/v1`（1 檔 / 1 處）**：`src/hooks/useCoreObjects.ts`

**B — `API_BASE` 已含 `/api/v1`、缺 auth header（10 檔 / 43 處）**

| 呼叫數 | 檔案 |
|---:|---|
| 8 | `src/pages/ProfilePage.tsx` |
| 6 | `src/pages/ForecastPage.tsx` |
| 6 | `src/pages/ResourcesPage.tsx` |
| 6 | `src/pages/resources/DispatchTab.tsx` |
| 5 | `src/pages/resources/AuditTab.tsx` |
| 4 | `src/pages/resources/AssetsTab.tsx` |
| 4 | `src/pages/resources/WarehousesTab.tsx` |
| 2 | `src/pages/ResourcesPublicPage.tsx` |
| 1 | `src/pages/PublicSearchPage.tsx` |
| 1 | `src/services/firebase-auth.service.ts` |

**C — `API_URL` 缺 `/api/v1`（5 檔 / 32 處，production 必壞）**

| 呼叫數 | 檔案 |
|---:|---|
| 13 | `src/services/fieldReportsApi.ts` |
| 11 | `src/services/taskDispatchApi.ts` |
| 5 | `src/services/aiQueueApi.ts` |
| 2 | `src/pages/OfflinePrepPage.tsx` |
| 1 | `src/pages/PackageLibraryPage.tsx` |

**D — legacy client 自身（1 檔 / 5 處）**：`src/services/api.ts`

**E — 外部 URL 健康檢查（1 檔 / 1 處）**：`src/pages/MonitorPage.tsx`

</details>

### 6.3 白名單化方式

- **import 違規**（18 處）：在該 import 行尾加
  `// eslint-disable-line no-restricted-imports -- FE-4 遷移待辦（工作項 3.2）：改用 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md`
- **fetch 違規**（38 檔）：在檔首加
  `/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */`

  用檔案層級而非逐行，是因為單檔最多有 13 個呼叫點；3.2 完成該檔遷移時**整行刪除**即為驗收訊號。
  代價是白名單檔案內新增的 fetch 不會被擋——這是刻意的取捨，且白名單只會單向縮小。

### 6.4 驗收狀態

```
npx eslint src
  no-restricted-imports        0  （18 件已白名單化）
  no-restricted-syntax         0  （148 件已白名單化，38 檔）
  總 error 數                  156（＝加入規則前的既有基準，未增未減）
```

新增違規會被擋下——已用探針檔驗證 4 種形式（`utils/api` import、`services/api` import、
`fetch(...)`、`window.fetch(...)`）全部觸發 error。

**3.2 的進度可直接量測**：

```bash
grep -rl "eslint-disable.*FE-4" web-dashboard/src --include=*.ts --include=*.tsx | wc -l
# 目前 56，目標 0
```

---

## 7. 3.2 批次遷移清單

原則：**先修 production 必壞的、再修缺 auth 的、最後刪 legacy client**。
每批獨立可 commit、可 revert；每批完成後跑 `tsc --noEmit` + `vitest run` + `vite build`。

| 批次 | 範圍 | 檔數 | 呼叫點 | 風險 | 驗收 |
|---|---|---:|---:|---|---|
| **B0**（3.1 已完成） | 示範 3 頁 | 3 | 4 | 🟢 | ✅ 已完成 |
| **B1** | 類別 A：`admin/` 7 檔＋`command/` 3 檔 | 10 | 38 | 🟡 | 各頁 production build 實測可載入 |
| **B2** | 類別 A：其餘 10 檔（`care`/`monitor`/`notifications`/`public`/`security`/`voice`/`weather`/`analytics`/`TimelineView`/`useOfflineReports`） | 10 | 28 | 🟡 | 同上 |
| **B3** | 類別 C：service 模組（`fieldReportsApi`/`taskDispatchApi`/`aiQueueApi`）＋ `OfflinePrepPage`/`PackageLibraryPage` | 5 | 32 | 🟠 高扇出，被多頁引用 | 引用頁全數 smoke；`fieldReportsApi` 含 SOS，需 e2e |
| **B4** | 類別 B：`API_BASE` 系 10 檔（補 auth header） | 10 | 43 | 🟡 | 受保護端點不再 401 |
| **B5** | 類別 A′＋E：`useCoreObjects`（改用 client）、`MonitorPage`（保留 fetch，改為 ESLint config 明文例外並註明外部健檢用途） | 2 | 2 | 🟢 | |
| **B6** | `utils/api` 14 檔（drop-in 換 import，順手改 react-query） | 14 | — | 🟢 | 每頁 loading/error 行為不變 |
| **B7** | `services/api` 4 頁 → client；完成後**刪除 `src/services/api.ts` 與 `src/utils/api.ts`**，並移除 ESLint config 內對這兩檔的例外區塊 | 4（+2 刪） | 5 | 🟡 | `grep -r "utils/api\|services/api" src` 回傳 0 |
| **B8** | 收尾：FE-4 disable 註記歸零；`no-restricted-*` 例外只剩 `src/api/**` 與離線層 | — | — | 🟢 | §6.4 指令輸出 0 |

**批內順序建議**：同一目錄的頁一起改（共用 API_BASE 常數與型別），改完立刻刪該檔的 disable 註記——
註記還在＝這批沒完成，是最直接的進度指標。

**不在 3.2 範圍**：

- 離線層 7 檔（`offlineOutbox` / `offlineSOP` / `uploadQueue` / `rxdbSyncService` / `syncManager` / `capacitorFilesystem` / `push-notification.service`）→ **工作項 3.4**
- 後端 23 個 controller 的 `api/` 重複前綴 → 另立後端項；前端已用 `src/api/paths.ts` 相容
- `src/pages/EquipmentPage.tsx` 與 `src/pages/domains/logistics/EquipmentPage.tsx` 同名重複頁 → **工作項 3.3**（去重後只需遷移一份）

---

## 8. 本次（3.1）實際變更

### 新增

- `web-dashboard/src/api/errors.ts` — `getApiErrorMessage` / `getApiErrorStatus` / `isClientError` / `defaultQueryRetry`
- `web-dashboard/src/api/paths.ts` — 23 個 legacy 前綴 controller 的路徑常數表 + `legacyPath()` / `legacyV1Path()` / `missionPath()`
- `docs/architecture/API_CLIENT_CONSOLIDATION.md` — 本文件

### 修改

- `web-dashboard/eslint.config.js` — 兩條防護欄規則 + 例外層定義
- `web-dashboard/src/main.tsx` — `QueryClient` 的 `retry: 1` → `defaultQueryRetry`（4xx 不重試）
- 56 個檔案加上 FE-4 disable 註記（18 個 import 行尾 + 38 個檔首）

### 示範遷移（3 頁，作為 3.2 範本）

| 頁面 | 模式 | 變更 |
|---|---|---|
| `src/pages/domains/workforce/LeaderboardPage.tsx` | A 單一 GET 清單 | `utils/api` → `api/client` + `useQuery`；刪 `useEffect`/`useCallback`/3 個 useState；`timeframe` 進 queryKey |
| `src/pages/domains/workforce/OrgChartPage.tsx` | B 串接式多請求 | 同上；auto-expand 由 `finally` 內 `setState` 改為 `useMemo` 推導＋toggle 覆寫 map（消除 setState-in-effect，且深層節點仍可展開） |
| `src/pages/AuditLogPage.tsx` | C 伺服器端篩選 | 同上；`statusFilter`/`actionFilter` 進 queryKey，刪 `useEffect` 依賴鏈；client-side `searchQuery` 保持不進 key |

三頁的共同淨效果：每頁少 3 個 `useState`、少 1 個 `useEffect`、少 1 個 `useCallback`，
錯誤訊息統一由 `getApiErrorMessage` 產生，切換篩選/timeframe 有快取。
