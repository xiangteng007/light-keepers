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
 *  - service worker / 離線同步層：需要在無 React context、
 *    背景 sync、Capacitor 檔案系統等環境下運作，axios instance 不適用。
 *    （其正確性由工作項 3.4「離線 outbox 三套收斂」負責，不在 3.2 遷移範圍）
 */
const FETCH_EXEMPT_FILES = [
  'src/api/**',
  'src/services/offlineOutbox.ts',
  'src/services/offlineSOP.ts',
  'src/services/uploadQueue.ts',
  'src/services/rxdbSyncService.ts',
  'src/services/syncManager.ts',
  'src/services/capacitorFilesystem.ts',
  'src/services/push-notification.service.ts',
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

  // legacy client 自身：檔案內不受 import 禁令影響（等待 3.2 完成後整檔刪除）
  {
    files: ['src/utils/api.ts', 'src/services/api.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
])
