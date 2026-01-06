# 🎨 Light Keepers UI/UX 設計規範
> **Lightkeepers VI - Premium Design System**
> 融合：極簡高端 · 現代 SaaS · 北歐溫暖

---

## 📁 設計系統架構

| 層級 | 檔案 | 用途 |
|------|------|------|
| 1 | `design-system/variables.css` | 核心設計 Tokens |
| 2 | `styles/senteng-theme.css` | Senteng 主題元件 |
| 3 | `index.css` | 基礎樣式與工具類 |

---

## 🎨 品牌色彩系統

### Brown 系列 (主品牌色)
| 變數 | 色值 | 用途 |
|------|------|------|
| `--color-brown-900` | #3D2E24 | 最深,主背景 |
| `--color-brown-800` | #4A3728 | 次背景 |
| `--color-brown-700` | #5C4739 | 卡片背景 |
| `--color-brown-600` | #6B5B4F | Hover 狀態 |
| `--color-brown-500` | #7E6B5B | Active 狀態 |
| `--color-brown-400` | #9A8A7A | 邊框 |
| `--color-brown-300` | #B5A595 | 淺邊框 |

### Beige 系列 (北歐溫暖)
| 變數 | 色值 | 用途 |
|------|------|------|
| `--color-beige-50` | #FDFCFB | 最淺背景 |
| `--color-beige-100` | #FAF8F5 | 主背景(淺色主題) |
| `--color-beige-200` | #F5EDE4 | 次背景 |
| `--color-beige-300` | #E8DDD0 | Hover |
| `--color-beige-400` | #D9CCC0 | 邊框 |
| `--color-beige-500` | #C4B5A5 | 深邊框 |

### Gold 系列 (強調色)
| 變數 | 色值 | 用途 |
|------|------|------|
| `--color-gold-300` | #D4BC96 | 淺金 |
| `--color-gold-400` | #C4A77D | 主金色 |
| `--color-gold-500` | #B8976F | 標準金 |
| `--color-gold-600` | #A68660 | Hover |
| `--color-gold-700` | #8F7352 | Active |

### 語意化色彩
| 用途 | 主色 | 淺色 | 深色 |
|------|------|------|------|
| **Success** | #6B8E5C | #7DA86B | #5A7A4D |
| **Warning** | #C9A256 | #D4B366 | #B89145 |
| **Danger** | #B85C5C | #C96B6B | #A54D4D |
| **Info** | #5C7B8E | #6B8A9D | #4D6C7F |

---

## 🔷 雙主題系統

### Theme A - Dark Brown (戰術救援風格)
```css
[data-theme="A"], :root {
    --bg-primary: var(--color-brown-900);      /* #3D2E24 */
    --bg-secondary: var(--color-brown-800);    /* #4A3728 */
    --bg-tertiary: var(--color-brown-700);     /* #5C4739 */
    --bg-card: var(--color-brown-700);
    --text-primary: var(--color-beige-100);    /* #FAF8F5 */
    --text-secondary: var(--color-beige-400);  /* #D9CCC0 */
    --accent-primary: var(--color-gold-400);   /* #C4A77D */
}
```

### Theme B - Light Beige (人道救援風格)
```css
[data-theme="B"] {
    --bg-primary: var(--color-beige-100);      /* #FAF8F5 */
    --bg-secondary: var(--color-beige-200);    /* #F5EDE4 */
    --bg-card: #FFFFFF;
    --text-primary: var(--color-brown-900);    /* #3D2E24 */
    --text-secondary: var(--color-brown-700);  /* #5C4739 */
    --accent-primary: var(--color-gold-500);   /* #B8976F */
}
```

---

## 🔤 字體系統

### 字體家族
```css
--font-family-primary: 'Inter', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-family-display: 'Inter', sans-serif;
--font-family-monospace: 'JetBrains Mono', 'Fira Code', monospace;
```

### 字體大小
| Token | Size | 用途 |
|-------|------|------|
| `--font-size-2xs` | 10px | 極小標籤 |
| `--font-size-xs` | 11px | 小標籤 |
| `--font-size-sm` | 12px | 次要文字 |
| `--font-size-base` | 14px | 基礎文字 |
| `--font-size-md` | 16px | 中等文字 |
| `--font-size-lg` | 18px | 大文字 |
| `--font-size-xl` | 20px | 標題 |
| `--font-size-2xl` | 24px | 大標題 |
| `--font-size-3xl` | 28px | 頁面標題 |
| `--font-size-4xl` | 32px | 特大標題 |
| `--font-size-5xl` | 40px | 主視覺標題 |

### 字重
| Token | Weight |
|-------|--------|
| `--font-weight-normal` | 400 |
| `--font-weight-medium` | 500 |
| `--font-weight-semibold` | 600 |
| `--font-weight-bold` | 700 |

### 行高
| Token | Value |
|-------|-------|
| `--line-height-tight` | 1.25 |
| `--line-height-normal` | 1.5 |
| `--line-height-relaxed` | 1.75 |

---

## 📐 間距系統

| Token | Value |
|-------|-------|
| `--spacing-0` | 0 |
| `--spacing-0-5` | 2px |
| `--spacing-1` | 4px |
| `--spacing-1-5` | 6px |
| `--spacing-2` | 8px |
| `--spacing-2-5` | 10px |
| `--spacing-3` | 12px |
| `--spacing-4` | 16px |
| `--spacing-5` | 20px |
| `--spacing-6` | 24px |
| `--spacing-8` | 32px |
| `--spacing-10` | 40px |
| `--spacing-12` | 48px |
| `--spacing-16` | 64px |
| `--spacing-20` | 80px |
| `--spacing-24` | 96px |

---

## 📦 圓角系統

| Token | Value | 用途 |
|-------|-------|------|
| `--radius-none` | 0 | 無圓角 |
| `--radius-xs` | 2px | 極小 |
| `--radius-sm` | 4px | 小型元件 |
| `--radius-md` | 8px | 標準元件 |
| `--radius-lg` | 12px | 按鈕/輸入框 |
| `--radius-xl` | 16px | 卡片 |
| `--radius-2xl` | 20px | 大卡片 |
| `--radius-3xl` | 24px | Modal |
| `--radius-full` | 9999px | 圓形/膠囊 |

---

## 💫 陰影系統

### 標準陰影
```css
--shadow-xs: 0 1px 2px rgba(61, 46, 36, 0.04);
--shadow-sm: 0 1px 3px rgba(61, 46, 36, 0.08), 0 1px 2px rgba(61, 46, 36, 0.06);
--shadow-md: 0 4px 6px rgba(61, 46, 36, 0.08), 0 2px 4px rgba(61, 46, 36, 0.06);
--shadow-lg: 0 10px 15px rgba(61, 46, 36, 0.10), 0 4px 6px rgba(61, 46, 36, 0.05);
--shadow-xl: 0 20px 25px rgba(61, 46, 36, 0.10), 0 10px 10px rgba(61, 46, 36, 0.04);
--shadow-2xl: 0 25px 50px rgba(61, 46, 36, 0.15);
--shadow-inner: inset 0 2px 4px rgba(61, 46, 36, 0.06);
```

### 發光效果 (Glow)
```css
--shadow-glow-sm: 0 0 10px rgba(196, 167, 125, 0.2);
--shadow-glow: 0 0 20px rgba(196, 167, 125, 0.3);
--shadow-glow-lg: 0 0 40px rgba(196, 167, 125, 0.4);
--shadow-glow-success: 0 0 20px rgba(107, 142, 92, 0.3);
--shadow-glow-warning: 0 0 20px rgba(201, 162, 86, 0.3);
--shadow-glow-danger: 0 0 20px rgba(184, 92, 92, 0.3);
--shadow-glow-info: 0 0 20px rgba(92, 123, 142, 0.3);
```

---

## 🌈 玻璃態效果 (Glassmorphism)

```css
--glass-bg: rgba(255, 255, 255, 0.7);
--glass-bg-light: rgba(255, 255, 255, 0.85);
--glass-bg-subtle: rgba(255, 255, 255, 0.5);
--glass-bg-dark: rgba(61, 46, 36, 0.85);
--glass-bg-dark-subtle: rgba(61, 46, 36, 0.6);
--glass-border: rgba(255, 255, 255, 0.2);
--glass-border-light: rgba(255, 255, 255, 0.3);
--glass-blur: 20px;
--glass-blur-sm: 10px;
--glass-blur-lg: 40px;
```

---

## 🌅 漸變系統

```css
--gradient-gold: linear-gradient(135deg, #C4A77D 0%, #A68660 100%);
--gradient-gold-soft: linear-gradient(135deg, #D4BC96 0%, #B8976F 50%, #A68660 100%);
--gradient-gold-radial: radial-gradient(circle at top left, #C4A77D 0%, #A68660 100%);
--gradient-warm: linear-gradient(135deg, #FAF8F5 0%, #F5EDE4 100%);
--gradient-sidebar: linear-gradient(180deg, rgba(245, 237, 228, 0.95) 0%, rgba(250, 248, 245, 0.92) 50%, rgba(253, 252, 251, 0.9) 100%);
--gradient-success: linear-gradient(135deg, #7DA86B 0%, #6B8E5C 100%);
--gradient-warning: linear-gradient(135deg, #D4B366 0%, #C9A256 100%);
--gradient-danger: linear-gradient(135deg, #C96B6B 0%, #B85C5C 100%);
--gradient-info: linear-gradient(135deg, #6B8A9D 0%, #5C7B8E 100%);
```

---

## ⏱️ 動畫系統

### 時長
| Token | Duration | 用途 |
|-------|----------|------|
| `--duration-instant` | 50ms | 即時回饋 |
| `--duration-fast` | 150ms | 快速互動 |
| `--duration-normal` | 250ms | 標準動畫 |
| `--duration-slow` | 400ms | 慢動畫 |
| `--duration-slower` | 600ms | 轉場 |
| `--duration-slowest` | 1000ms | 特效 |

### 緩動曲線
```css
--ease-linear: linear;
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
--ease-in-out-back: cubic-bezier(0.68, -0.6, 0.32, 1.6);
--ease-elastic: cubic-bezier(0.5, 1.5, 0.5, 1);
```

---

## 📏 Z-Index 層級規範

| Token | Value | 用途 |
|-------|-------|------|
| `--z-below` | -1 | 底層元素 |
| `--z-base` | 0 | 基礎層 |
| `--z-dropdown` | 100 | 下拉選單 |
| `--z-sticky` | 200 | 固定元素 |
| `--z-overlay` | 300 | 遮罩層 |
| `--z-modal` | 400 | Modal |
| `--z-popover` | 500 | Popover |
| `--z-toast` | 600 | Toast 通知 |
| `--z-tooltip` | 700 | Tooltip |
| `--z-max` | 9999 | 最高層 |

---

## 🔘 元件 Tokens

### Button
| Token | Value |
|-------|-------|
| `--btn-height-xs` | 28px |
| `--btn-height-sm` | 32px |
| `--btn-height-md` | 40px |
| `--btn-height-lg` | 48px |
| `--btn-height-xl` | 56px |
| `--btn-radius` | 12px |

### Card
| Token | Value |
|-------|-------|
| `--card-padding` | 24px |
| `--card-radius` | 20px |

### Modal
| Token | Value |
|-------|-------|
| `--modal-padding` | 32px |
| `--modal-radius` | 24px |
| `--modal-width-sm` | 400px |
| `--modal-width-md` | 560px |
| `--modal-width-lg` | 720px |

### Input
| Token | Value |
|-------|-------|
| `--input-height-md` | 44px |
| `--input-radius` | 12px |

### Layout
| Token | Value |
|-------|-------|
| `--navbar-height` | 64px |
| `--sidebar-width` | 280px |
| `--sidebar-width-collapsed` | 80px |

---

## 📱 響應式斷點

| 斷點 | 寬度 | 說明 |
|------|------|------|
| Desktop | > 768px | 桌面版 |
| Tablet | ≤ 768px | 平板 / 小螢幕 |
| Mobile | ≤ 480px | 手機 |

---

## ✅ WCAG AA 對比驗證

| 元素 | 對比度 | 狀態 |
|------|--------|------|
| 主文字 #1F2937 on #FFF | 12.63:1 | ✅ |
| 次文字 #4B5563 on #FFF | 7.51:1 | ✅ |
| 淡化文字 #6B7280 on #FFF | 5.01:1 | ✅ |
| 主色 #4F46E5 on #FFF | 4.63:1 | ✅ |

---

*最後更新: 2026-01-06*
