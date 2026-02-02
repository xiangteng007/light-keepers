# Observability Guide

> 可觀測性指南 - 日誌、指標、追蹤

---

## 1. 日誌 (Logging)

### 1.1 日誌層級

| 層級 | 用途 | 範例 |
|------|------|------|
| ERROR | 系統錯誤 | 資料庫連線失敗 |
| WARN | 潛在問題 | Rate limit 接近上限 |
| INFO | 業務事件 | 任務建立成功 |
| DEBUG | 開發調試 | 請求/回應詳情 |
| VERBOSE | 詳細追蹤 | 每個函式呼叫 |

### 1.2 結構化日誌格式

```json
{
  "timestamp": "2026-02-02T12:00:00.000Z",
  "level": "INFO",
  "correlationId": "req-abc123",
  "service": "light-keepers-api",
  "module": "task-dispatch",
  "message": "Task created",
  "context": {
    "taskId": "task-xyz",
    "missionSessionId": "mission-123",
    "userId": "user-456"
  }
}
```

### 1.3 查詢範例 (Cloud Logging)

```sql
-- 查詢特定任務的所有日誌
resource.type="cloud_run_revision"
jsonPayload.context.taskId="task-xyz"

-- 查詢錯誤日誌
severity >= ERROR
timestamp >= "2026-02-02T00:00:00Z"

-- 查詢特定用戶操作
jsonPayload.context.userId="user-456"
```

---

## 2. 指標 (Metrics)

### 2.1 關鍵業務指標

| 指標名稱 | 類型 | 描述 |
|----------|------|------|
| `mission.active_count` | Gauge | 進行中任務數 |
| `task.created_total` | Counter | 累計建立任務數 |
| `triage.victims_total` | Counter | 累計檢傷人數 |
| `shelter.occupancy_rate` | Gauge | 避難所入住率 |

### 2.2 系統效能指標

| 指標名稱 | 類型 | 描述 |
|----------|------|------|
| `http_requests_total` | Counter | HTTP 請求總數 |
| `http_request_duration_seconds` | Histogram | 請求延遲分布 |
| `websocket_connections` | Gauge | 當前 WS 連線數 |
| `ai_jobs_queue_depth` | Gauge | AI 任務佇列深度 |

### 2.3 Prometheus 格式

```text
# HELP mission_active_count Number of active missions
# TYPE mission_active_count gauge
mission_active_count{region="taipei"} 5

# HELP http_request_duration_seconds Request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} 1234
http_request_duration_seconds_bucket{le="0.5"} 5678
http_request_duration_seconds_sum 12345.67
http_request_duration_seconds_count 98765
```

---

## 3. 追蹤 (Tracing)

### 3.1 Trace Context 傳遞

```typescript
// 前端發送請求時帶上 correlationId
const correlationId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
headers['X-Correlation-ID'] = correlationId;

// 後端接收並傳遞
@Middleware()
class CorrelationMiddleware {
  use(req, res, next) {
    const correlationId = req.headers['x-correlation-id'] || generateId();
    AsyncLocalStorage.enterWith({ correlationId });
    next();
  }
}
```

### 3.2 關鍵追蹤點

| 操作 | Span 名稱 | 標籤 |
|------|-----------|------|
| HTTP 請求 | `http.request` | method, path, status |
| 資料庫查詢 | `db.query` | table, operation |
| 外部 API 呼叫 | `http.client` | service, endpoint |
| AI 任務處理 | `ai.process` | useCaseId, model |

### 3.3 Cloud Trace 查詢

```
// 查看特定 Trace
trace.googleapis.com/projects/PROJECT_ID/traces/TRACE_ID

// 查詢慢請求 (> 500ms)
latency > 500ms
```

---

## 4. 告警規則

### 4.1 錯誤率告警

```yaml
name: "High Error Rate"
condition:
  metric: http_requests_total{status="5xx"}
  threshold: 10
  window: 5m
  comparison: GREATER_THAN
severity: CRITICAL
notification:
  - slack: "#alerts"
  - pagerduty: on-call
```

### 4.2 延遲告警

```yaml
name: "High Latency P95"
condition:
  metric: http_request_duration_seconds_p95
  threshold: 1.0
  window: 5m
severity: WARNING
notification:
  - slack: "#alerts"
```

### 4.3 容量告警

```yaml
name: "WebSocket Connection Limit"
condition:
  metric: websocket_connections
  threshold: 8000
  window: 1m
severity: WARNING
notification:
  - slack: "#ops"
```

---

## 5. Dashboard 設計

### 5.1 系統概覽 Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Light Keepers System Overview                          │
├───────────────┬───────────────┬───────────────┬─────────┤
│ Active Missions│ Total Tasks   │ Error Rate    │ P95 Lat │
│     12        │    456        │    0.5%       │  120ms  │
├───────────────┴───────────────┴───────────────┴─────────┤
│  Request Rate (RPM)                                     │
│  ▂▃▅▇█▆▄▂▃▅▆▇█▆▄▃▂▁                                    │
├─────────────────────────────────────────────────────────┤
│  Top Endpoints by Latency                               │
│  1. POST /api/v1/ai/jobs - 450ms                       │
│  2. GET /api/v1/missions - 120ms                       │
│  3. POST /api/v1/triage - 80ms                         │
└─────────────────────────────────────────────────────────┘
```

### 5.2 任務監控 Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  Mission Operations Dashboard                           │
├───────────────────────┬─────────────────────────────────┤
│ By Status             │ By Priority                     │
│ ● Active: 12         │ ● Critical: 3                   │
│ ● Pending: 34        │ ● High: 15                      │
│ ● Completed: 156     │ ● Normal: 28                    │
├───────────────────────┴─────────────────────────────────┤
│  Task Completion Rate (hourly)                          │
│  ████████████████████████████████                       │
│  0h      6h      12h      18h      24h                 │
└─────────────────────────────────────────────────────────┘
```

---

## 6. 日誌保留政策

| 日誌類型 | 保留期限 | 儲存位置 |
|----------|----------|----------|
| Application Logs | 30 天 | Cloud Logging |
| Audit Logs | 365 天 | Cloud Storage |
| Access Logs | 90 天 | Cloud Logging |
| Debug Logs | 7 天 | Cloud Logging |
| Trace Data | 30 天 | Cloud Trace |

---

## 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.0 | 2026-02-02 | 初版 |
