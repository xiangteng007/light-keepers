---
description: 災難應變知識庫首頁 - 淺藍配金色設計規格（亮色主題 Light Theme）
---

# 光守護者災防實務手冊系統 - 亮色主題設計規格

**設計定位**：志工任務導向的專業應急指揮系統  
**版本**：v1.0 Final

---

## 1. 核心配色

| 用途 | 顏色 | Hex | 應用 |
|------|------|-----|------|
| 主色 | Navy Blue | `#001F3F` | 導覽、標題、重要區塊 |
| 輔色 | Golden Amber | `#D97706` | 按鈕外框、強調、快捷區 |
| 低風險 | Forest Green | `#276749` | 風險標籤背景 |
| 中風險 | Orange | `#C05621` | 風險標籤背景 |
| 高風險 | Deep Red | `#9B2C2C` | 風險標籤背景 |
| 極危 | Purple Red | `#702459` | 風險標籤背景 |
| 文字主 | Dark Gray | `#1F2937` | 主要內文 |
| 文字次 | Medium Gray | `#6B7280` | 輔助資訊 |
| 背景 | White | `#FFFFFF` | 主背景 |
| 邊框 | Light Gray | `#E2E8F0` | 卡片邊框、分隔線 |

---

## 2. 字體規範

**字體家族**：Noto Sans TC（中文）、Inter（英數）

| 用途 | 大小 | 粗細 | 行高 |
|------|------|------|------|
| H1 頁面標題 | 28px | 700 | 1.3 |
| H2 區塊標題 | 20px | 600 | 1.4 |
| H3 卡片標題 | 16px | 600 | 1.5 |
| Body 內文 | 14px | 400 | 1.6 |
| Small 輔助 | 12px | 400 | 1.5 |
| Caption 極小 | 11px | 400 | 1.4 |

---

## 3. Icon 規範

- **風格**：線框（Outlined）
- **筆觸**：2px
- **尺寸**：24px / 32px / 48px / 64px
- **來源**：Material Icons Outlined

---

## 4. 間距與圓角

- **圓角**：8px（卡片、按鈕、輸入框）、4px（標籤）
- **間距**：4px / 8px / 16px / 24px / 32px

---

## 5. CSS 變數

```css
:root {
  /* Colors */
  --primary: #001F3F;
  --accent: #D97706;
  --success: #276749;
  --warning: #C05621;
  --danger: #9B2C2C;
  --critical: #702459;
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --bg-primary: #FFFFFF;
  --border-color: #E2E8F0;
  
  /* Typography */
  --font-family: 'Noto Sans TC', 'Inter', sans-serif;
  --font-size-h1: 28px;
  --font-size-h2: 20px;
  --font-size-h3: 16px;
  --font-size-body: 14px;
  --font-size-small: 12px;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
  
  /* Border */
  --radius: 8px;
  --radius-small: 4px;
  
  /* Shadow */
  --shadow-medium: 0 2px 8px rgba(0,0,0,0.1);
  --shadow-hover: 0 4px 12px rgba(0,0,0,0.15);
}
```

---

## 6. 元件設計規格

### 6.1 導覽列（Header）

```css
.header {
  height: 60px;
  background: #001F3F;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
}

.header-logo {
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
  margin-right: 24px;
}

.header-search {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  border-radius: 8px;
  padding: 8px 12px;
  width: 300px;
  color: #FFFFFF;
}
```

### 6.2 按鈕樣式（半透明實心 50%）

```css
.button-solid {
  background: rgba(217, 151, 6, 0.5);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  color: #001F3F;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(217, 151, 6, 0.15);
}

.button-solid:hover {
  background: rgba(245, 158, 11, 0.7);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(217, 151, 6, 0.25);
}
```

### 6.3 標籤（邊框標籤）

```css
.tag {
  display: inline-block;
  padding: 4px 10px;
  border: 1px solid #001F3F;
  border-radius: 4px;
  font-size: 12px;
  color: #001F3F;
  background: transparent;
  margin-right: 6px;
}
```

### 6.4 風險標籤

```css
.risk-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}
.risk-badge.low { background: #276749; }
.risk-badge.medium { background: #C05621; }
.risk-badge.high { background: #9B2C2C; }
.risk-badge.critical { background: #702459; }
```

### 6.5 值勤快捷按鈕

8個固定項目：集合/報到、隊伍分工、通訊測試、風險評估、現場安全、撤離程序、交接流程、回報範本

```css
.quick-button {
  background: rgba(217, 151, 6, 0.5);
  border: none;
  border-radius: 8px;
  padding: 12px;
  color: #001F3F;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 6px rgba(217, 151, 6, 0.2);
}

.quick-button:hover {
  background: rgba(245, 158, 11, 0.7);
  transform: translateY(-2px);
}
```

---

## 7. 響應式設計

```css
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    height: auto;
    padding: 12px;
  }
  
  .header-search {
    width: 100%;
    margin-top: 12px;
  }
  
  .quick-buttons {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
}
```

---

## 8. 設計確認清單

- [x] 配色方案：Navy Blue + Golden Amber
- [x] 字體系統：Noto Sans TC
- [x] Icon 風格：線框（Outlined）
- [x] 圓角間距：8px / 16px
- [x] 卡片樣式：中陰影 + 邊框
- [x] 風險標籤：完整標籤
- [x] 搜尋列：極簡內嵌
- [x] 導覽列：Logo 置中 + 搜尋右側
- [x] 標籤樣式：邊框標籤
- [x] 按鈕樣式：半透明實心按鈕（50%）
- [x] 空狀態：圖解空狀態
- [x] 載入狀態：進度條
