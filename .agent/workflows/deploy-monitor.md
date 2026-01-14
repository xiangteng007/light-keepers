---
description: 監視 Cloud Run 部署狀態並修正錯誤
---

# 部署監控工作流程

## 何時使用

每次 `git push` 後，執行此工作流程監視部署狀態。

## 步驟

// turbo-all

### 1. 檢查最新 Cloud Build 狀態

```powershell
gcloud builds list --limit=3 --format="table(id,status,createTime,duration)"
```

### 2. 若有 FAILURE，查看詳細日誌

```powershell
gcloud builds log BUILD_ID --stream
```

### 3. 檢查 Cloud Run 服務狀態

```powershell
gcloud run services describe light-keepers-dashboard --region=asia-east1 --format="yaml(status)"
```

### 4. 查看服務日誌 (最近 50 條)

```powershell
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=light-keepers-dashboard" --limit=50 --format="table(timestamp,severity,textPayload)"
```

### 5. 常見錯誤修復

| 錯誤 | 可能原因 | 修復方式 |
|------|----------|----------|
| `MODULE_NOT_FOUND` | 缺少依賴 | 檢查 package.json |
| `PORT 8080 timeout` | 啟動失敗 | 檢查 main.ts 端口設定 |
| `password authentication failed` | DB 密碼錯誤 | 更新 Secret Manager |
| `502 Bad Gateway` | 容器崩潰 | 查看 stdout 日誌 |

### 6. 強制重新部署 (若需要)

```powershell
gcloud run services update light-keepers-dashboard --region=asia-east1 --no-traffic --tag=debug
```
