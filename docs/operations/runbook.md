# Light Keepers Operations Runbook

> 運維手冊 - 標準操作程序與故障排除

---

## 1. 服務架構概覽

### 1.1 服務清單

| 服務 | 技術 | 部署位置 | 健康檢查端點 |
|------|------|----------|--------------|
| Backend API | NestJS | Cloud Run | `/health` |
| Frontend PWA | React/Vite | Vercel | N/A |
| Database | PostgreSQL | Cloud SQL | Port 5432 |
| Cache | Redis | Memorystore | Port 6379 |
| File Storage | GCS | Cloud Storage | N/A |
| AI Queue | Cloud Tasks | Cloud Run | `/ai/health` |

### 1.2 環境

| 環境 | URL | 用途 |
|------|-----|------|
| Production | `api.disaster-respond.tw` | 正式環境 |
| Staging | `staging-api.disaster-respond.tw` | 測試環境 |
| Development | `localhost:3000` | 本地開發 |

---

## 2. 標準操作程序 (SOP)

### 2.1 部署流程

```bash
# 後端部署
cd backend
npm run build
gcloud run deploy light-keepers-api \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated

# 前端部署 (Vercel 自動)
git push origin main
# Vercel 自動觸發部署
```

### 2.2 資料庫遷移

```bash
# 產生遷移
npm run migration:generate -- -n MigrationName

# 執行遷移
npm run migration:run

# 回滾最近一次遷移
npm run migration:revert
```

### 2.3 健康檢查

```bash
# 檢查後端 API
curl -s https://api.disaster-respond.tw/health | jq

# 預期回應
{
  "status": "ok",
  "timestamp": "2026-02-02T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 3. 故障排除

### 3.1 常見問題

#### 3.1.1 API 回應 502/503

**症狀**: Cloud Run 回傳 502 Bad Gateway 或 503 Service Unavailable

**排查步驟**:
1. 檢查 Cloud Run logs: `gcloud run logs read light-keepers-api --limit=50`
2. 確認資料庫連線: 檢查 Cloud SQL 狀態
3. 確認記憶體使用: 可能 OOM kill

**修復**:
- 增加 Cloud Run 記憶體配置
- 重啟服務: `gcloud run services update light-keepers-api --platform managed`

#### 3.1.2 認證失敗 (401)

**症狀**: 用戶無法登入或 Token 無效

**排查步驟**:
1. 檢查 Firebase Auth 狀態
2. 驗證 JWT Secret 配置
3. 檢查時鐘同步問題

**修復**:
- 確認 `JWT_SECRET` 環境變數正確
- 檢查 Token 過期時間設定

#### 3.1.3 即時通訊斷線

**症狀**: WebSocket 連線頻繁中斷

**排查步驟**:
1. 檢查 Cloud Run 最小實例數 (需 >= 1)
2. 檢查客戶端網路狀態
3. 確認 Load Balancer 設定

**修復**:
- 設定 Cloud Run min-instances: `gcloud run services update --min-instances 1`

---

## 4. 監控與告警

### 4.1 關鍵指標 (SLI)

| 指標 | 目標 (SLO) | 告警閾值 |
|------|-----------|----------|
| API 可用性 | 99.5% | < 99% |
| P95 延遲 | < 500ms | > 1000ms |
| 錯誤率 | < 1% | > 5% |
| WebSocket 連線數 | < 10,000 | > 8,000 |

### 4.2 Dashboard URLs

- **Cloud Monitoring**: `console.cloud.google.com/monitoring`
- **Error Reporting**: `console.cloud.google.com/errors`
- **Cloud Trace**: `console.cloud.google.com/traces`

### 4.3 告警配置

```yaml
# 範例: Cloud Monitoring 告警政策
resource:
  type: cloud_run_revision
  labels:
    service_name: light-keepers-api
conditions:
  - display_name: "High Error Rate"
    condition_threshold:
      filter: 'metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"'
      comparison: COMPARISON_GT
      threshold_value: 10
      duration: 300s
notification_channels:
  - projects/PROJECT_ID/notificationChannels/CHANNEL_ID
```

---

## 5. 備份與災難復原

### 5.1 資料備份策略

| 資料類型 | 備份頻率 | 保留期限 | 位置 |
|----------|----------|----------|------|
| PostgreSQL | 每日 | 30 天 | Cloud SQL 自動備份 |
| 附件檔案 | 即時 | 永久 | GCS 多區域 |
| 設定檔 | 每次變更 | Git 歷史 | GitHub |

### 5.2 災難復原程序

```bash
# 1. 從備份還原資料庫
gcloud sql backups restore BACKUP_ID \
  --restore-instance=INSTANCE_NAME

# 2. 重新部署服務
gcloud run deploy light-keepers-api --source .

# 3. 驗證服務狀態
curl https://api.disaster-respond.tw/health
```

### 5.3 RTO/RPO 目標

| 場景 | RTO | RPO |
|------|-----|-----|
| 單一服務故障 | 15 分鐘 | 0 |
| 資料庫故障 | 1 小時 | 24 小時 |
| 區域故障 | 4 小時 | 24 小時 |

---

## 6. 安全性操作

### 6.1 Secret 輪換

```bash
# 更新 JWT Secret
gcloud run services update light-keepers-api \
  --set-secrets=JWT_SECRET=new-secret:latest

# 更新資料庫密碼
gcloud sql users set-password postgres \
  --instance=lightkeepers-db \
  --password=NEW_PASSWORD
```

### 6.2 存取審計

- 所有 API 請求記錄於 Cloud Logging
- 敏感操作額外記錄 `auditLog` 表
- 每月審查存取權限

---

## 7. 聯絡資訊

### 7.1 On-Call 輪值

| 時段 | 主要聯絡人 | 備援聯絡人 |
|------|-----------|-----------|
| 工作日 9-18 | SRE Team | DevOps Lead |
| 非工作時段 | On-Call Engineer | SRE Manager |

### 7.2 升級路徑

1. **L1**: SRE On-Call → 15 分鐘內回應
2. **L2**: DevOps Lead → 30 分鐘內介入
3. **L3**: Architect + PM → 1 小時內決策

---

## 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.0 | 2026-02-02 | 初版 |
