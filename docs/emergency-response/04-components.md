# Emergency Response 元件規格表

**文件編號**：04  
**版本**：1.0

---

## 1. 元件清單

| 元件 | 用途 | Bootstrap 對應 |
|------|------|----------------|
| Header | Top Bar | Navbar |
| KPICard | 數據卡片 | Card |
| QuickActionButton | 快捷按鈕 | Button |
| AlertListItem | 警示列表項 | ListGroup.Item |
| TimelineItem | 時間軸項目 | - |
| RiskBadge | 風險標籤 | Badge |
| Tag | 分類標籤 | Badge outline |
| ProgressBar | 進度條 | ProgressBar |
| MapContainer | 地圖容器 | - |
| Toast | 通知 | Toast |
| EmptyState | 空狀態 | - |
| LoadingSkeleton | 載入骨架 | Placeholder |

---

## 2. 元件規格

### 2.1 KPICard

| 屬性 | 型別 | 說明 |
|------|------|------|
| icon | `LucideIcon` | 圖示元件 |
| value | `number \| string` | 主要數值 |
| label | `string` | 底部標籤 |
| trend? | `'up' \| 'down' \| 'neutral'` | 趨勢 |
| loading? | `boolean` | 載入狀態 |

**狀態**：loading → Skeleton / error → ErrorIcon / default → 顯示數據

---

### 2.2 QuickActionButton

| 屬性 | 型別 | 說明 |
|------|------|------|
| icon | `LucideIcon` | 圖示 |
| label | `string` | 按鈕文字 |
| onClick | `() => void` | 點擊事件 |
| disabled? | `boolean` | 禁用 |

**樣式**：`background: var(--color-accent-50)` → hover: `var(--color-accent-70)`

---

### 2.3 AlertListItem

| 屬性 | 型別 | 說明 |
|------|------|------|
| id | `string` | 唯一識別 |
| level | `'low' \| 'medium' \| 'high' \| 'critical'` | 警示等級 |
| title | `string` | 標題 |
| summary | `string` | 摘要 |
| timestamp | `Date` | 時間 |
| isRead? | `boolean` | 已讀 |

---

### 2.4 RiskBadge

| 屬性 | 型別 | 說明 |
|------|------|------|
| level | `'low' \| 'medium' \| 'high' \| 'critical'` | 風險等級 |
| showIcon? | `boolean` | 顯示圖示 |

**CSS**：
```css
.risk-badge { padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; color: white; }
.risk-badge--low { background: var(--color-risk-low); }
.risk-badge--medium { background: var(--color-risk-medium); }
.risk-badge--high { background: var(--color-risk-high); }
.risk-badge--critical { background: var(--color-risk-critical); }
```

---

### 2.5 ProgressBar（物資進度）

| 屬性 | 型別 | 說明 |
|------|------|------|
| label | `string` | 品項名稱 |
| current | `number` | 目前數量 |
| max | `number` | 最大數量 |
| showPercentage? | `boolean` | 顯示百分比 |
| variant? | `'default' \| 'warning' \| 'danger'` | 樣式變體 |

---

### 2.6 EmptyState

| 屬性 | 型別 | 說明 |
|------|------|------|
| icon | `LucideIcon` | 圖示（64px） |
| title | `string` | 標題 |
| description | `string` | 描述 |
| action? | `{ label: string; onClick: () => void }` | 操作按鈕 |

---

### 2.7 Toast

| 屬性 | 型別 | 說明 |
|------|------|------|
| type | `'success' \| 'error' \| 'warning' \| 'info'` | 類型 |
| message | `string` | 訊息 |
| duration? | `number` | 顯示時間（ms），預設 3000 |
| action? | `{ label: string; onClick: () => void }` | 操作按鈕 |

---

## 3. RWD 行為摘要

| 元件 | 768px 以下行為 |
|------|----------------|
| KPICard Row | 橫向滑動（overflow-x: auto） |
| QuickActionButton Grid | 2x2 維持，尺寸縮小 |
| MapContainer | 寬度 100%，高度固定 250px |
| AlertListItem | 隱藏摘要，僅顯示標題 |
