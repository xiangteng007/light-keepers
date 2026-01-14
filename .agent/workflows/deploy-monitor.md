---
description: 監視 Cloud Run 部署狀態並修正錯誤
---

# 部署監控工作流程

> [!IMPORTANT]
> **部署架構**: 所有 Cloud Run 部署都透過 **GitHub Actions** 執行，不使用 Cloud Build 觸發器。
>
> - Dashboard 部署: `.github/workflows/deploy.yml` → `deploy-dashboard` job
> - API 部署: `.github/workflows/deploy.yml` → `deploy-api` job

## 何時使用

每次 `git push` 後，執行此工作流程監視部署狀態。

## 步驟

// turbo-all

### 1. 檢查 GitHub Actions 工作流程狀態

打開瀏覽器查看最新的 workflow runs:

```
https://github.com/xiangteng007/light-keepers/actions
```

或使用 GitHub CLI (若已安裝):

```powershell
gh run list --limit 5
```

### 2. 檢查最新 Cloud Build 狀態

```powershell
gcloud builds list --limit=3 --format="table(id,status,createTime,duration)"
```

### 3. 若有 FAILURE，查看詳細日誌

**GitHub Actions:**

```powershell
gh run view RUN_ID --log-failed
```

**Cloud Build:**

```powershell
gcloud builds log BUILD_ID --stream
```

### 4. 檢查 Cloud Run 服務狀態

```powershell
gcloud run services describe light-keepers-dashboard --region=asia-east1 --format="yaml(status)"
```

### 5. 查看服務日誌 (最近 50 條)

```powershell
gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=light-keepers-dashboard" --limit=50 --format="table(timestamp,severity,textPayload)"
```

### 6. 常見錯誤修復

| 錯誤 | 可能原因 | 修復方式 |
|------|----------|----------|
| `MODULE_NOT_FOUND` | 缺少依賴 | 檢查 package.json |
| `PORT 8080 timeout` | 啟動失敗 | 檢查 main.ts 端口設定 |
| `password authentication failed` | DB 密碼錯誤 | 更新 Secret Manager |
| `502 Bad Gateway` | 容器崩潰 | 查看 stdout 日誌 |
| `npm ERR! peer dep` | 依賴衝突 | 檢查 package-lock.json |

### 7. 強制重新部署 (若需要)

```powershell
gcloud run services update light-keepers-dashboard --region=asia-east1 --no-traffic --tag=debug
```

## GitHub Workflows

| Workflow | 用途 |
|----------|------|
| `ci-cd.yml` | CI/CD 主流程 |
| `deploy.yml` | 部署到 Cloud Run |
| `audit-gates.yml` | 安全審計 gates |
| `docker-health-check.yml` | Docker 健康檢查 |
