import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// ---------------------------------------------------------------------------
// FE-4 API client 收斂防護欄
// 方案文件：docs/architecture/API_CLIENT_CONSOLIDATION.md
//
// 全站唯一 HTTP 出口為 `src/api/client.ts`（axios，含 Bearer 注入、
// 401 refresh mutex、withCredentials）。以下兩條規則負責：
//   (a) 擋住 `src/utils/api.ts` / `src/services/api.ts` 兩套 legacy client
//   (b) 擋住裸 `fetch()`（缺 baseURL 與 Authorization header，production 必壞）
//
// 現有違規已用 eslint-disable 註記逐頁白名單化（註記文字含 "FE-4"），
// 由工作項 3.2 分批移除；**新增的違規會直接被擋下**。
// ---------------------------------------------------------------------------

/** legacy client 的模組路徑（相對 import 與 alias 皆涵蓋） */
const LEGACY_CLIENT_PATTERNS = [
  '**/utils/api',
  '**/utils/api.ts',
  '**/services/api',
  '**/services/api.ts',
]

const LEGACY_CLIENT_MESSAGE = [
  'FE-4: 禁止 import legacy API client（utils/api、services/api）。',
  '請改用單一出口 `src/api/client.ts`（`import api from "@/api/client"` 或相對路徑）。',
  '遷移方式見 docs/architecture/API_CLIENT_CONSOLIDATION.md。',
].join(' ')

const BARE_FETCH_MESSAGE = [
  'FE-4: 禁止直接呼叫 fetch()。',
  '裸 fetch 缺少 baseURL（/api/v1）與 Authorization header，production 必壞。',
  '請改用 `src/api/client.ts` 匯出的 axios instance；legacy 後端前綴路徑見 `src/api/paths.ts`。',
  '例外僅限 src/api/** 與 service worker / 離線同步層。',
].join(' ')

/**
 * 允許直接使用 fetch 的層：
 *  - `src/api/**`：單一 client 出口本身（含 axios 之外的低階實作）
 *  - `capacitorFilesystem`：下載任意資產 URL，不是 API 呼叫，axios instance 不適用
 *  - `push-notification.service`：SW / FCM 情境，已正確使用 `API_BASE`（含 `/api/v1`）
 *  - `uploadQueue`：presigned URL 直傳 GCS，夾在 initiate/complete 之間，
 *    無法走 axios baseURL；已改為即時讀取 token + 401 refresh 重試
 *  - `src/pages/MonitorPage.tsx`：類別 E（見 API_CLIENT_CONSOLIDATION.md §3.3/§4）。
 *    對 `service.url`（外部健檢端點，非本站後端 API）做 timeout 健康檢查，
 *    刻意不經過 `src/api/client.ts`（baseURL/攔截器只適用本站 `/api/v1` 端點，
 *    且此處需要 `AbortSignal.timeout()`）。
 *
 * 工作項 3.4 已完成離線層收斂：`offlineOutbox` / `offlineSOP` / `syncManager` /
 * `rxdbSyncService` 全數刪除（孤兒或端點不存在）。
 * 盤點見 `docs/architecture/OFFLINE_LAYER_CONSOLIDATION.md`。
 *
 * 離線寫入請一律使用 `src/services/offline/offline.service.ts` 的 outbox，
 * 它內部經 `src/api/client.ts` 送出，不需要豁免。
 */
const FETCH_EXEMPT_FILES = [
  'src/api/**',
  'src/services/uploadQueue.ts',
  'src/services/capacitorFilesystem.ts',
  'src/services/push-notification.service.ts',
  'src/pages/MonitorPage.tsx',
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'warn',

      // FE-4 (a) — legacy client import 禁令
      'no-restricted-imports': ['error', {
        patterns: [{
          group: LEGACY_CLIENT_PATTERNS,
          message: LEGACY_CLIENT_MESSAGE,
        }],
      }],

      // FE-4 (b) — 裸 fetch 禁令
      'no-restricted-syntax': ['error',
        {
          selector: "CallExpression[callee.type='Identifier'][callee.name='fetch']",
          message: BARE_FETCH_MESSAGE,
        },
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.object.name=/^(window|globalThis|self)$/][callee.property.name='fetch']",
          message: BARE_FETCH_MESSAGE,
        },
      ],
    },
  },

  // FE-4 (b) 例外層：單一 client 出口本身 + service worker / 離線同步層
  {
    files: FETCH_EXEMPT_FILES,
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
])
