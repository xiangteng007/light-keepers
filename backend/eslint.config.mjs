// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**', 'coverage/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
    },
  },
  {
    rules: {
      // BE-5: prevent console.log noise from creeping back in.
      // console.warn/console.error are still allowed (e.g. for last-resort
      // fallback logging before NestJS Logger/DI is available).
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Downgraded to warn: these are pre-existing patterns across the codebase
      // (including modules pending removal that must not be touched right now).
      // Not part of BE-5 scope; revisit in a follow-up cleanup pass.
      'no-case-declarations': 'warn',
      'no-useless-assignment': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  },
  {
    // bootstrap 啟動訊息與獨立執行的 CLI script 允許使用 console
    files: ['src/main.ts', 'src/scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
