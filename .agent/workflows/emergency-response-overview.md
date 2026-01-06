---
description: Emergency Response 緊急應變任務系統 - 完整概述與實作狀態
---

# Emergency Response 緊急應變任務系統

## 📋 系統概述

Emergency Response 是 Light Keepers 平台的**獨立副系統**，專為緊急災害應變任務指揮而設計。

### 🎯 核心特色

- **獨立設計系統**: 採用 Light Theme（Navy Blue + Golden Amber on White），不受主系統深色主題約束
- **權限控制**: Level 2+ (幹部) 才能啟動緊急任務
- **即時協作**: WebSocket 實時同步（規劃中）
- **離線支援**: PWA 離線 SOP 存取（規劃中）

### 🏗️ 技術架構

**Frontend**:
- React 19 + TypeScript
- Vite (build tool)
- Bootstrap 5 (base styles)
- React Query (data fetching)

**Backend**:
- NestJS 10 + TypeORM
- PostgreSQL 15 + PostGIS
- Socket.IO (real-time)
- Firebase Auth (emergency-response-911)

**Database Tables**:
```
mission_sessions     # 任務會話
├── events          # 事件記錄
├── tasks           # 任務項目
└── inventory_transactions  # 物資異動
```

---

## ✅ 實作狀態

### Phase 1: 規格文件 ✅
已完成 9 份規格文件於 `docs/emergency-response/`:
1. System Overview
2. Dashboard Layout  
3. Design System (Light Theme)
4. Components
5. Data Model
6. API & WebSocket
7. Sync & Offline
8. Reports
9. Acceptance Criteria

### Phase 2: Firebase 遷移 ✅
- 從 `light-keepers-mvp` 匯出 5 位使用者
- 匯入至新專案 `emergency-response-911`
- 已更新 `firebase.config.ts`

### Phase 3: Backend 實作 ✅

**位置**: `backend/src/modules/mission-sessions/`

**Entities** (4個):
- `MissionSession` - 任務會話主體
- `Event` - 事件記錄
- `Task` - 任務項目  
- `InventoryTransaction` - 物資異動

**API Endpoints**:
```
POST   /mission-sessions              # 建立任務 (Level 2+)
GET    /mission-sessions              # 列出任務 (Level 1+)
GET    /mission-sessions/:id          # 單一任務 (Level 1+)
PUT    /mission-sessions/:id          # 更新任務 (Level 2+)
POST   /mission-sessions/:id/start    # 啟動任務 (Level 2+)
POST   /mission-sessions/:id/end      # 結束任務 (Level 2+)
DELETE /mission-sessions/:id          # 刪除任務 (Level 4+)

POST   /mission-sessions/events       # 新增事件 (Level 2+)
GET    /mission-sessions/:id/events   # 事件列表 (Level 1+)

POST   /mission-sessions/tasks        # 新增任務 (Level 2+)
GET    /mission-sessions/:id/tasks    # 任務列表 (Level 1+)
PUT    /mission-sessions/tasks/:id    # 更新任務 (Level 2+)
DELETE /mission-sessions/tasks/:id    # 刪除任務 (Level 2+)

GET    /mission-sessions/:id/stats    # 統計資訊 (Level 1+)
```

### Phase 4: Frontend 實作 ✅

**位置**: `web-dashboard/src/pages/EmergencyResponsePage.tsx`

**功能**:
- ✅ KPI Cards (任務狀態、事件數、任務進度、持續時間)
- ✅ 進行中任務卡片
- ✅ 任務歷史列表
- ✅ 新增任務 Modal
- ✅ 主 Dashboard「🚨 緊急啟動」按鈕 (Level 2+ 顯示)

**路由**:
- Path: `/emergency-response`
- 權限: `<ProtectedRoute requiredLevel={2}>`

---

## 🚀 本地開發

### 啟動步驟

```bash
# 1. 啟動 PostgreSQL
docker-compose up -d

# 2. 啟動 Backend (terminal 1)
cd backend
npm run start:dev

# 3. 啟動 Frontend (terminal 2)
cd web-dashboard
npm run dev
```

### 測試流程

1. 訪問 `http://localhost:5173`
2. 使用 Level 2+ 帳號登入
3. 點擊主 Dashboard 的「🚨 緊急啟動」按鈕
4. 測試建立、啟動、結束任務

---

## 📦 未來開發 (Phase 5-7)

### Phase 5: WebSocket 即時同步
- [ ] 建立 WebSocket Gateway
- [ ] 事件即時廣播
- [ ] 任務狀態同步
- [ ] 在線人員列表

### Phase 6: PWA 離線功能
- [ ] Service Worker 快取策略
- [ ] 離線 SOP 文件存取
- [ ] 同步衝突解決機制

### Phase 7: 報表匯出
- [ ] PDF 任務報告
- [ ] CSV 資料匯出
- [ ] JSON 完整資料包

---

## 🎨 設計原則

> **重要**: Emergency Response 副系統採用**獨立的 Light Theme 設計**，不受主平台 Command Center 深色主題約束。

| 系統 | 主題 | 配色 | 用途 |
|------|------|------|------|
| Light Keepers 主平台 | Command Center 深色 | 深藍背景 + 金色 | 日常監控 |
| **Emergency Response** | **Light Theme** | **白色背景 + Navy Blue + Gold** | **緊急指揮** |

**設計理由**:
1. 緊急情境下的高可讀性
2. 任務數據的清晰展示
3. 與主系統的視覺區隔（明確標示進入緊急模式）

---

## 📚 相關文件

- 完整規格: `docs/emergency-response/README.md`
- 設計代幣: `docs/emergency-response/03-design-system.md`
- 後端模組: `backend/src/modules/mission-sessions/`
- 前端頁面: `web-dashboard/src/pages/EmergencyResponsePage.tsx`

---

## 🔗 快速連結

- GitHub Repo: [Emergency-Response](https://github.com/xiangteng007/Emergency-Response)
- Firebase Project: `emergency-response-911`
- GCP Project: `light-keepers-mvp` (共用 Cloud SQL)
