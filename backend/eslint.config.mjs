// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * 最小可用 ESLint flat config (backend)
 *
 * 主要目的（Phase E.3 防復發）：
 * app.module.ts 曾被網頁編輯器壓掉換行，導致模組名稱被吃進 `//` 行註解，
 * 模組被 import 卻從未註冊到 imports 陣列 → 端點全部 404 而編譯不報錯。
 *
 * 「import 了但沒用到」正是這個 bug 的可偵測特徵，因此
 * `@typescript-eslint/no-unused-vars` 設為 error，是本設定的核心守門規則。
 *
 * 註：tsconfig 的 `noUnusedLocals` 未開啟——全 repo 開啟會在既有程式碼
 * （未使用的解構、預留參數、測試輔助變數等）產生大量編譯錯誤，
 * 且它會連帶擋掉 build/test。ESLint 規則可精準只針對 import 收斂，
 * 且不影響 tsc/build，因此採用 ESLint 而非 noUnusedLocals。
 */
/** @type {import('@typescript-eslint/utils').TSESLint.SharedConfig.RuleLevelAndOptions[1]} */
const UNUSED_VARS_OPTIONS = {
    vars: 'all',
    args: 'none',
    caughtErrors: 'none',
    ignoreRestSiblings: true,
    varsIgnorePattern: '^_',
};

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'coverage/**',
            'coverage-e2e/**',
            'uploads/**',
            'migrations/**',
            '**/*.js',
            '**/*.mjs',
            '**/*.cjs',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            // 全域先設為 warn：既有程式碼尚有約 320 處未使用變數/import，
            // 一次全開會讓 lint 直接紅到無法當 gate 用。先曝光、不擋 CI。
            '@typescript-eslint/no-unused-vars': ['warn', UNUSED_VARS_OPTIONS],

            // === 以下為既有程式碼大量存在、暫不列入 gate 的規則 ===
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-unused-expressions': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
            'prefer-const': 'warn',
            'no-case-declarations': 'warn',
            'no-empty': 'off',
            'no-useless-escape': 'off',
            'no-control-regex': 'off',
        },
    },

    // =========================================================
    // no-console 守門（工作項 4.5）：一律走 NestJS Logger
    // =========================================================
    // src/ 內 45 處 console.* 已於 4.5 轉為 Logger；此規則防復發。
    // 豁免：main.ts（bootstrap 早於 DI/Logger 可用）、scripts/**（獨立維運腳本）。
    {
        files: ['src/**/*.ts'],
        ignores: ['src/main.ts', 'src/scripts/**'],
        rules: {
            'no-console': ['error', { allow: ['warn', 'error'] }],
        },
    },

    // =========================================================
    // 核心守門區：*.module.ts
    // =========================================================
    // 這裡是 E.3 事故的發生地。在 NestJS 的 module 檔中，
    // 「import 了某個 Module 但沒出現在 imports/providers/exports 陣列」
    // 幾乎必然代表該模組沒被註冊 → 對應端點 404，而 tsc 完全不會報錯。
    // 因此這個範圍內一律 error，且此範圍目前為 0 error（可當 CI gate）。
    {
        files: ['**/*.module.ts'],
        rules: {
            '@typescript-eslint/no-unused-vars': ['error', UNUSED_VARS_OPTIONS],
        },
    },
);
