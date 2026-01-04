# Emergency Response# Design System - Light Theme 設計代幣

> **📋 設計系統獨立性**  
> Emergency Response 副系統採用**獨立的 Light Theme 設計**，不受主平台 Command Center 深色主題約束。此設計決策基於：
> - 緊急情境下的高可讀性需求
> - 任務數據的清晰展示
> - 與主系統的視覺區隔（明確標示進入緊急模式）

本文件定義 Emergency Response 子系統的視覺設計語言，採用 **淺色主題**（Navy Blue + Golden Amber on White）。

```css
:root {
  /* ═══ 核心配色 ═══ */
  --color-primary: #001F3F;
  --color-accent: #D97706;
  --color-accent-hover: #B45309;
  --color-accent-50: rgba(217, 119, 6, 0.5);
  --color-accent-70: rgba(217, 119, 6, 0.7);
  
  /* 風險等級 */
  --color-risk-low: #276749;
  --color-risk-medium: #C05621;
  --color-risk-high: #9B2C2C;
  --color-risk-critical: #702459;
  
  /* 狀態 */
  --color-success: #059669;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #0284C7;
  
  /* 文字 */
  --color-text-primary: #1F2937;
  --color-text-secondary: #6B7280;
  --color-text-disabled: #9CA3AF;
  --color-text-inverse: #FFFFFF;
  
  /* 背景 */
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F9FAFB;
  --color-bg-tertiary: #F3F4F6;
  --color-bg-hover: #F3F4F6;
  --color-bg-active: #E5E7EB;
  --color-bg-disabled: #E5E7EB;
  
  /* 邊框 */
  --color-border: #E2E8F0;
  --color-border-focus: #D97706;
  
  /* ═══ 字體 ═══ */
  --font-family: 'Noto Sans TC', 'Inter', system-ui, sans-serif;
  --font-size-h1: 28px;
  --font-size-h2: 20px;
  --font-size-h3: 16px;
  --font-size-body: 14px;
  --font-size-small: 12px;
  --font-size-caption: 11px;
  
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
  
  --line-height-tight: 1.3;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.6;
  
  /* ═══ 間距 ═══ */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  
  /* ═══ 圓角 ═══ */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  
  /* ═══ 陰影 ═══ */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 4px 12px rgba(0, 0, 0, 0.15);
  --shadow-focus: 0 0 0 3px rgba(217, 119, 6, 0.2);
  
  /* ═══ 動畫 ═══ */
  --transition-fast: 150ms ease;
  --transition-normal: 200ms ease;
  --transition-slow: 300ms ease;
  
  /* ═══ z-index ═══ */
  --z-dropdown: 50;
  --z-sticky: 100;
  --z-modal-backdrop: 200;
  --z-modal: 210;
  --z-toast: 300;
  --z-tooltip: 400;
}
```

---

## 2. 狀態 Token

| 狀態 | 背景 | 文字 | 邊框 |
|------|------|------|------|
| Default | `--color-bg-primary` | `--color-text-primary` | `--color-border` |
| Hover | `--color-bg-hover` | `--color-text-primary` | `--color-border` |
| Active | `--color-bg-active` | `--color-text-primary` | `--color-accent` |
| Focus | `--color-bg-primary` | `--color-text-primary` | `--color-border-focus` + shadow |
| Disabled | `--color-bg-disabled` | `--color-text-disabled` | `--color-border` |

---

## 3. 無障礙對比（WCAG AA）

| 組合 | 對比度 | 通過 |
|------|--------|------|
| Navy #001F3F on White | 16.75:1 | ✓ AAA |
| Amber #D97706 on White | 3.19:1 | ✓ AA (Large) |
| Text #1F2937 on White | 13.01:1 | ✓ AAA |
| Secondary #6B7280 on White | 5.01:1 | ✓ AA |
