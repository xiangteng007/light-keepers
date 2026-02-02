# 📊 Light Keepers SLO/SLA 規格

## Service Level Objectives (SLO)

### 可用性

| 服務 | SLO | 計算窗口 |
|------|-----|---------|
| API Gateway | 99.9% | 月 |
| WebSocket | 99.5% | 月 |
| 資料庫 | 99.99% | 月 |

### 延遲 (P95)

| 端點類型 | SLO |
|----------|-----|
| 讀取 API | < 200ms |
| 寫入 API | < 500ms |
| 檔案上傳 | < 5s |
| WebSocket 推播 | < 100ms |
| SOS 警報 | < 1s |

### 容量

| 指標 | SLO |
|------|-----|
| 並發用戶 | 1,000 |
| API QPS | 500 |
| WebSocket 連線 | 5,000 |

---

## Service Level Agreement (SLA)

### 可用性承諾

| 等級 | 可用性 | 月停機時間 |
|------|--------|-----------|
| Standard | 99.5% | 3.6 小時 |
| Premium | 99.9% | 43.8 分鐘 |
| Enterprise | 99.95% | 21.9 分鐘 |

### 違約賠償

| 可用性 | 賠償 |
|--------|------|
| 99.0% - 99.5% | 10% 月費 |
| 95.0% - 99.0% | 25% 月費 |
| < 95.0% | 50% 月費 |

---

## 監控指標

### Error Budget

```
Error Budget = 1 - SLO
月錯誤預算 = (1 - 0.999) × 30天 × 24小時 × 60分鐘
            = 43.2 分鐘
```

### 關鍵指標 (KPI)

1. **Availability** = (總時間 - 停機時間) / 總時間
2. **Latency P95** = 95th percentile response time
3. **Error Rate** = 5xx errors / total requests
4. **Throughput** = requests per second

---

## 維護窗口

| 類型 | 時間 | 頻率 |
|------|------|------|
| 例行維護 | 週日 02:00-04:00 | 每週 |
| 資料庫維護 | 週日 03:00-05:00 | 每月 |
| 緊急修補 | 隨時 | 依需求 |

> 維護期間不計入 SLA 可用性計算
