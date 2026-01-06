---
description: Emergency Response 完整規格文件索引
---

# Emergency Response 完整規格文件

## 📚 文件結構

位置: `docs/emergency-response/`

### README.md - 系統總覽

**設計系統獨立性聲明**:
- Emergency Response 採用獨立 Light Theme
- 不受主平台 Command Center 深色主題約束
- 配色: Navy Blue + Golden Amber on White

**技術堆疊**:
- Frontend: React 19 + Vite + Bootstrap 5
- Backend: NestJS 10 + TypeORM + PostgreSQL 15
- Auth: Firebase (emergency-response-911)
- Real-time: Socket.IO

---

### 01-system-overview.md - 系統概要

**核心定位**:
- 任務導向的指揮系統
- PostGIS 空間感知
- Mission Session 生命週期管理

**數據隔離模型**:
- Reference Data (持久參考資料)
- Session Data (任務特定，可清除)

**角色權限**:
- Admin (Level 2+): 建立/管理任務
- Commander: 指揮任務
- Operator: 執行操作
- Viewer: 只能查看

---

### 02-dashboard-layout.md - 儀表板佈局

**12欄網格系統**:
```
┌────────────────────────────┐
│  Header (full width)       │ 
├────────────────────────────┤
│  KPI Cards (4x3 grid)      │
├─────────┬──────────────────┤
│ Quick   │  Active Session  │
│ Actions │     (col-8)      │
│ (col-4) ├──────────────────┤
│         │  Events & Tasks  │
└─────────┴──────────────────┘
```

**區塊說明**:
- KPI Row: 任務狀態、事件數、任務進度、持續時間
- Quick Actions: 快速操作按鈕
- Active Session: 進行中任務資訊
- Events List: 即時事件列表
- Tasks Board: 任務看板

---

### 03-design-system.md - 設計代幣

**色彩系統** (Light Theme):
```css
--navy-primary: #1E3A6C;     /* 主要深藍 */
--navy-secondary: #2D5AA0;   /* 次要藍色 */
--gold-primary: #C59750;     /* 主要金色 */
--gold-accent: #D4A574;      /* 金色強調 */
--white-bg: #FFFFFF;         /* 白色背景 */
--text-primary: #0F172A;     /* 主文字 */
--text-secondary: #475569;   /* 次要文字 */
```

**字體系統**:
- 標題: 'Noto Sans TC', sans-serif (700)
- 內文: 'Inter', sans-serif (400, 500)
- 數字: Tabular nums

**間距系統**:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

---

### 04-components.md - 組件規格

**核心組件**:
1. MissionSessionCard - 任務卡片
2. EventList - 事件列表
3. TaskBoard - 任務看板
4. KPICard - KPI 統計卡
5. QuickActionButton - 快速操作按鈕

**組件狀態**:
- Active: 進行中
- Pending: 準備中
- Completed: 已完成
- Cancelled: 已取消

---

### 05-data-model.md - 資料模型

**數據庫 Schema**:

```sql
-- 任務會話
CREATE TABLE mission_sessions (
    id UUID PRIMARY KEY,
    title VARCHAR(255),
    status VARCHAR(50),
    commander_id VARCHAR,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 事件記錄
CREATE TABLE events (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES mission_sessions(id),
    title VARCHAR(255),
    type VARCHAR(50),
    location JSONB,  -- [lng, lat]
    created_at TIMESTAMP DEFAULT NOW()
);

-- 任務項目
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES mission_sessions(id),
    title VARCHAR(255),
    status VARCHAR(50),
    priority VARCHAR(50),
    assignee_id VARCHAR,
    due_at TIMESTAMP
);

-- 物資異動
CREATE TABLE inventory_transactions (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES mission_sessions(id),
    item VARCHAR(255),
    quantity INT,
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 06-api-websocket.md - API 規格

**REST API**:
- `POST /mission-sessions` - 建立任務
- `GET /mission-sessions` - 列出任務
- `POST /mission-sessions/:id/start` - 啟動
- `POST /mission-sessions/:id/end` - 結束
- `GET /mission-sessions/:id/stats` - 統計

**WebSocket Events** (規劃中):
- `session:started` - 任務啟動
- `event:created` - 新事件
- `task:updated` - 任務更新

---

### 07-sync-offline.md - 同步策略

**同步機制** (規劃中):
- 樂觀更新
- 衝突解決策略
- 離線佇列

**PWA 離線** (規劃中):
- Service Worker 快取
- 離線 SOP 文件
- 背景同步

---

### 08-reports.md - 報表輸出

**報表類型** (規劃中):
- PDF 任務報告
- CSV 資料匯出
- JSON 完整資料包

---

### 09-acceptance.md - 驗收標準

**功能驗收**:
- ✅ 建立/啟動/結束任務
- ✅ 查看統計資訊
- ✅ 權限控制 (Level 2+)
- 📋 即時同步
- 📋 離線功能

---

## 🔗 快速導航

使用以下斜線指令快速查看：
- `/emergency-response-overview` - 系統總覽
- `/emergency-response-design` - 設計代幣
- `/emergency-response-backend` - 後端模組
- `/emergency-response-frontend` - 前端頁面
