# Emergency Response API 與 WebSocket 規格

**文件編號**：06  
**版本**：1.0

---

## 1. NestJS 模組切分

```
src/modules/
├── emergency-response/
│   ├── mission-session/      # 任務場次管理
│   ├── dashboard/            # KPI 聚合查詢
│   ├── events/               # 事件 CRUD
│   ├── tasks/                # 派工 CRUD
│   ├── reports/              # 通報 CRUD
│   ├── inventory/            # 物資異動
│   ├── alerts/               # NCDR 警示
│   ├── maps/                 # 地圖標記
│   ├── audit/                # 稽核日誌
│   └── export/               # 報表匯出
```

---

## 2. REST API 端點

### 2.1 Mission Session

| 方法 | 端點 | 說明 | 權限 |
|------|------|------|------|
| POST | `/api/er/sessions` | 建立場次 | Admin, Commander |
| GET | `/api/er/sessions` | 列表 | All |
| GET | `/api/er/sessions/:id` | 詳情 | All |
| PATCH | `/api/er/sessions/:id/activate` | 啟用 | Admin, Commander |
| PATCH | `/api/er/sessions/:id/close` | 結束 | Admin, Commander |
| DELETE | `/api/er/sessions/:id/purge` | 重置刪除 | Admin |

### 2.2 Dashboard

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/er/sessions/:id/kpi` | KPI 聚合數據 |
| GET | `/api/er/sessions/:id/timeline` | 時間軸事件 |

### 2.3 Events / Tasks / Reports

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/er/sessions/:sid/events` | 事件列表 |
| POST | `/api/er/sessions/:sid/events` | 新增事件 |
| GET | `/api/er/sessions/:sid/tasks` | 派工列表 |
| POST | `/api/er/sessions/:sid/tasks` | 新增派工 |
| PATCH | `/api/er/tasks/:id/status` | 更新狀態 |
| GET | `/api/er/sessions/:sid/reports` | 通報列表 |
| POST | `/api/er/sessions/:sid/reports` | 新增通報 |

### 2.4 Export

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/er/sessions/:id/export/pdf` | 匯出 PDF |
| GET | `/api/er/sessions/:id/export/csv` | 匯出 CSV |
| GET | `/api/er/sessions/:id/export/json` | 匯出 JSON |

---

## 3. WebSocket 規格

### 3.1 Namespace 與 Room

```typescript
namespace: /emergency-response
room: session:{mission_session_id}
```

### 3.2 事件清單

| 事件 | 方向 | Payload | 說明 |
|------|------|---------|------|
| `join` | C→S | `{ sessionId }` | 加入房間 |
| `leave` | C→S | `{ sessionId }` | 離開房間 |
| `kpi.updated` | S→C | `KpiData` | KPI 更新 |
| `alerts.updated` | S→C | `Alert[]` | 警示更新 |
| `events.created` | S→C | `Event` | 新事件 |
| `tasks.updated` | S→C | `Task` | 派工更新 |
| `inventory.updated` | S→C | `InventoryTxn` | 物資異動 |
| `sync.status` | S→C | `{ status, lastSync }` | 同步狀態 |

### 3.3 Payload Schema 範例

```typescript
interface KpiData {
  activeEvents: number;
  ncdrAlerts: number;
  pendingReports: number;
  availableVolunteers: number;
  pendingTasks: number;
  completionRate: number;
  lastUpdated: string; // ISO timestamp
}
```

---

## 4. 權限 Guard

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'commander')
@Post('sessions')
async createSession(@Body() dto: CreateSessionDto) {}
```
