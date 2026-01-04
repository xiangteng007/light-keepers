# Emergency Response 緊急應變任務系統

## 📌 重要設計原則

**設計系統獨立性**: Emergency Response 副系統的視覺設計**完全獨立於主系統**，不受 Light Keepers 主平台的 Command Center 深色主題約束。

### 設計決策理由
1. **清晰度優先**: 緊急情境下需要最高的可讀性
2. **視覺區隔**: 明確標示使用者已進入緊急應變模式
3. **專業定位**: 任務指揮系統需要專業、清晰的介面

### 主題對比

| 系統 | 主題 | 配色 | 用途 |
|------|------|------|------|
| **Light Keepers 主平台** | Command Center 深色主題 | 深藍 + 金色（深色背景） | 日常監控與管理 |
| **Emergency Response 副系統** | Light Theme | Navy Blue + Golden Amber（白色背景） | 緊急任務指揮 |

---

## 文件索引

1. **[01-system-overview.md](./01-system-overview.md)** - 系統架構與核心概念
2. **[02-dashboard-layout.md](./02-dashboard-layout.md)** - Dashboard 12欄網格佈局
3. **[03-design-system.md](./03-design-system.md)** - Light Theme 設計代幣
4. **[04-components.md](./04-components.md)** - React 組件規格
5. **[05-data-model.md](./05-data-model.md)** - 資料模型與 PostgreSQL Schema
6. **[06-api-websocket.md](./06-api-websocket.md)** - REST API 與 WebSocket 規格
7. **[07-sync-offline.md](./07-sync-offline.md)** - 同步、離線與重置策略
8. **[08-reports.md](./08-reports.md)** - 報表輸出規格
9. **[09-acceptance.md](./09-acceptance.md)** - 驗收標準與測試案例

## 技術堆疊

與主系統共用：
- Frontend: React 19 + Vite + Bootstrap 5
- Backend: NestJS 10 + TypeORM + PostgreSQL 15 + PostGIS
- Real-time: Socket.IO
- Auth: Firebase Authentication (emergency-response-911)

## 開發狀態

- [x] Phase 1: 規格文件
- [x] Phase 2: Firebase 遷移
- [x] Phase 3: Backend 模組實作
- [x] Phase 4: Frontend Dashboard 實作
- [ ] Phase 5: WebSocket 即時同步
- [ ] Phase 6: PWA 離線功能
- [ ] Phase 7: 報表匯出

## 快速開始

```bash
# 1. 啟動 Docker (PostgreSQL)
docker-compose up -d

# 2. 啟動 Backend
cd backend
npm run start:dev

# 3. 啟動 Frontend
cd web-dashboard
npm run dev
```

訪問: `http://localhost:5173/emergency-response`  
**權限**: Level 2 (幹部) 以上
