---
name: deploy
description: 部署 Light Keepers 應用程式到 Google Cloud Run
---

# Deploy Skill

部署 Light Keepers 前後端到 Google Cloud Run。

## 前置條件

- gcloud CLI 已安裝並登入
- Docker 已安裝
- 有 GCP 專案權限

## 後端部署

### 1. 建置 Docker 映像

```bash
cd backend
docker build -t gcr.io/PROJECT_ID/lightkeepers-backend:latest .
```

### 2. 推送到 GCR

```bash
docker push gcr.io/PROJECT_ID/lightkeepers-backend:latest
```

### 3. 部署到 Cloud Run

```bash
gcloud run deploy lightkeepers-backend \
  --image gcr.io/PROJECT_ID/lightkeepers-backend:latest \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production"
```

## 前端部署

### 1. 建置前端

```bash
cd frontend
npm run build
```

### 2. 部署到 Firebase Hosting

```bash
firebase deploy --only hosting
```

## 環境變數

必要的環境變數請參考：

- `backend/.env.example`
- Cloud Run 服務設定

## 驗證

部署後驗證：

1. Health check: `GET /health`
2. API 測試: 使用 smoke tests
