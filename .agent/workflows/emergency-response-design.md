---
description: Emergency Response Light Theme 設計代幣完整規格
---

# Emergency Response Design System - Light Theme

## 🎨 設計原則

> **重要**: 此設計系統**完全獨立**於主平台 Command Center 深色主題

**設計目標**:
1. **清晰度優先** - 緊急情境下最高可讀性
2. **視覺區隔** - 明確標示進入緊急模式
3. **專業定位** - 任務指揮系統的專業介面

---

## 🎨 色彩系統

### 主色調 (Primary Colors)

```css
:root {
  /* Navy Blue - 主要導航與標題 */
  --navy-primary: #1E3A6C;
  --navy-secondary: #2D5AA0;
  --navy-light: #4A6FA5;
  --navy-border: rgba(30, 58, 108, 0.2);
  
  /* Golden Amber - 強調與行動按鈕 */
  --gold-primary: #C59750;
  --gold-accent: #D4A574;
  --gold-light: #E8C9A0;
  --gold-hover: #B08640;
  
  /* 背景色系 */
  --white-bg: #FFFFFF;
  --gray-bg: #F8F9FA;
  --gray-light: #E9ECEF;
  --gray-border: #DEE2E6;
}
```

### 語意色彩 (Semantic Colors)

```css
:root {
  /* 狀態色 */
  --success: #28A745;
  --warning: #FFC107;
  --danger: #DC3545;
  --info: #17A2B8;
  
  /* 文字色 */
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-disabled: #94A3B8;
  
  /* 陰影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

---

## 📐 字體系統

### 字體家族

```css
:root {
  --font-heading: 'Noto Sans TC', 'Inter', sans-serif;
  --font-body: 'Inter', 'Noto Sans TC', sans-serif;
  --font-mono: 'Fira Code', 'Consolas', monospace;
}
```

### 字體大小

```css
:root {
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### 字重

```css
:root {
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

---

## 📏 間距系統

```css
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
}
```

---

## 🔲 圓角系統

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

---

## 🎯 組件樣式範例

### 按鈕 (Buttons)

```css
/* Primary Button - 金色 */
.btn-primary {
  background: var(--gold-primary);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--gold-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Secondary Button - 深藍 */
.btn-secondary {
  background: var(--navy-primary);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-md);
}

/* Danger Button - 紅色 */
.btn-danger {
  background: var(--danger);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: var(--radius-md);
}
```

### 卡片 (Cards)

```css
.card {
  background: var(--white-bg);
  border: 2px solid var(--navy-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--gold-primary);
}
```

### KPI 卡片

```css
.kpi-card {
  background: white;
  border: 2px solid var(--navy-border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.kpi-icon {
  font-size: 40px;
  line-height: 1;
}

.kpi-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--navy-primary);
}

.kpi-label {
  font-size: 14px;
  color: var(--text-secondary);
}
```

---

## 🚨 緊急元素樣式

### 緊急啟動按鈕

```css
.btn-emergency {
  background: rgba(220, 38, 38, 0.15);
  border: 2px solid rgba(220, 38, 38, 0.4);
  color: #DC2626;
  padding: 16px 24px;
  border-radius: var(--radius-lg);
  font-weight: var(--font-bold);
  animation: emergency-pulse 2s infinite;
}

@keyframes emergency-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(220, 38, 38, 0);
  }
}
```

---

## 📱 響應式斷點

```css
/* Mobile First */
:root {
  --breakpoint-sm: 576px;   /* 手機橫向 */
  --breakpoint-md: 768px;   /* 平板 */
  --breakpoint-lg: 992px;   /* 桌面 */
  --breakpoint-xl: 1200px;  /* 大螢幕 */
}
```

---

## 🎨 與主系統的對比

| 屬性 | 主系統 (Command Center) | Emergency Response |
|------|------------------------|-------------------|
| 背景 | 深藍漸層 (#0A1628) | 白色 (#FFFFFF) |
| 主色 | 金色強調 | Navy Blue 主導 |
| 文字 | 白色/淺色 | 深色 (#0F172A) |
| 卡片 | 半透明深色 | 實心白色 + 邊框 |
| 陰影 | 內發光 | 外投影 |
| 按鈕 | 發光效果 | 實心 + hover 提升 |

---

## 📚 相關檔案

- CSS Variables: `web-dashboard/src/pages/EmergencyResponsePage.css`
- 組件範例: 查看已實作的 EmergencyResponsePage
- 設計規格: `docs/emergency-response/03-design-system.md`
