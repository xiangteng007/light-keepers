# 🚀 Light Keepers 運維手冊 (Runbook)

## 1. 部署流程

### 1.1 後端部署 (Cloud Run)

```bash
# 觸發 CI/CD
git push origin main

# 手動部署
cd backend
gcloud run deploy light-keepers-api \
  --source . \
  --region asia-east1 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

### 1.2 前端部署 (Firebase Hosting)

```bash
cd web-dashboard
npm run build
firebase deploy --only hosting
```

---

## 2. 健康檢查

### 2.1 API 健康

```bash
curl https://api.lightkeepers.app/health
# 預期: {"status":"ok","timestamp":"..."}
```

### 2.2 資料庫連線

```bash
curl https://api.lightkeepers.app/health/db
# 預期: {"database":"connected"}
```

---

## 3. 告警處理

### 3.1 高 CPU 使用率

**症狀**: Cloud Run CPU > 80%

**處理**:
1. 檢查 /metrics 端點
2. 調整 max-instances
3. 檢查是否有 N+1 查詢

### 3.2 資料庫連線池耗盡

**症狀**: 500 錯誤，log 顯示 "too many connections"

**處理**:
1. 檢查 Cloud SQL 連線數
2. 調整 TypeORM pool size
3. 檢查是否有連線未正確釋放

### 3.3 記憶體不足

**症狀**: OOMKilled

**處理**:
1. 調整 Cloud Run memory
2. 檢查記憶體洩漏
3. 減少並發處理數

---

## 4. 回滾程序

### 4.1 快速回滾

```bash
# 列出歷史版本
gcloud run revisions list --service light-keepers-api

# 回滾到指定版本
gcloud run services update-traffic light-keepers-api \
  --to-revisions=light-keepers-api-00001-abc=100
```

### 4.2 資料庫回滾

```bash
# 列出 migration
npm run typeorm migration:show

# 回滾最近一次
npm run typeorm migration:revert
```

---

## 5. 緊急聯絡

| 角色 | 聯絡方式 |
|------|---------|
| On-call SRE | +886-XXX-XXX |
| 技術負責人 | email@example.com |
| GCP Support | console.cloud.google.com |

---

## 6. 常用指令

```bash
# 查看 logs
gcloud logging read "resource.type=cloud_run_revision" --limit 100

# 連接 Cloud SQL
gcloud sql connect lightkeepers-db --user=postgres

# 清除 Redis cache
redis-cli FLUSHDB
```
