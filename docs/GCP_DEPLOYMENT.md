# Light Keepers 災防平台 - GCP 部署指南

## 📋 目錄
1. [前置需求](#前置需求)
2. [本地開發環境](#本地開發環境)
3. [GCP 專案設定](#gcp-專案設定)
4. [Cloud SQL 設定](#cloud-sql-設定)
5. [部署到 Cloud Run](#部署到-cloud-run)
6. [CI/CD 設定](#cicd-設定)
7. [監控與維運](#監控與維運)

---

## 前置需求

### 必要工具
```bash
# 安裝 Google Cloud CLI
# Windows: https://cloud.google.com/sdk/docs/install

# 驗證安裝
gcloud --version

# 登入 GCP
gcloud auth login

# 設定預設專案
gcloud config set project YOUR_PROJECT_ID
```

### 環境需求
- Node.js 20+
- Docker Desktop
- Git

---

## 本地開發環境

### 1. 複製專案
```bash
cd "c:\Users\xiang\Light Keepers\xiwang-disaster-platform"
```

### 2. 設定環境變數
```bash
# 複製環境變數範本
copy .env.example .env

# 編輯 .env 填入實際值
notepad .env
```

### 3. 啟動開發環境
```bash
# 啟動 PostgreSQL + pgAdmin
docker-compose up -d postgres pgadmin

# 等待資料庫就緒後，可透過 pgAdmin 查看
# 網址: http://localhost:5050
# 帳號: admin@lightkeepers.local
# 密碼: admin123
```

### 4. 啟動後端 API（開發模式）
```bash
cd backend
npm install
npm run start:dev
```

---

## GCP 專案設定

### 1. 建立專案（如尚未建立）
```bash
gcloud projects create light-keepers --name="Light Keepers 災防平台"
gcloud config set project light-keepers
```

### 2. 啟用必要 API
```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 3. 建立 Artifact Registry（Docker 映像儲存庫）
```bash
gcloud artifacts repositories create light-keepers \
  --repository-format=docker \
  --location=asia-east1 \
  --description="Light Keepers Docker images"
```

---

## Cloud SQL 設定

### 1. 建立 PostgreSQL 實例
```bash
gcloud sql instances create light-keepers-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-east1 \
  --storage-size=10GB \
  --storage-auto-increase \
  --backup-start-time=03:00 \
  --availability-type=zonal
```

> ⏱️ 此步驟需要 5-10 分鐘

### 2. 設定 root 密碼
```bash
gcloud sql users set-password postgres \
  --instance=light-keepers-db \
  --password=YOUR_SECURE_PASSWORD
```

### 3. 建立資料庫
```bash
gcloud sql databases create lightkeepers \
  --instance=light-keepers-db
```

### 4. 啟用 PostGIS
```bash
# 透過 Cloud SQL Proxy 連接後執行
gcloud sql connect light-keepers-db --user=postgres

# 在 psql 中執行
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

---

## 部署到 Cloud Run

### 手動部署（首次測試用）
```bash
# 1. 建置映像
docker build -t asia-east1-docker.pkg.dev/YOUR_PROJECT/light-keepers/backend:v1 ./backend

# 2. 推送映像
docker push asia-east1-docker.pkg.dev/YOUR_PROJECT/light-keepers/backend:v1

# 3. 部署到 Cloud Run
gcloud run deploy light-keepers-api \
  --image=asia-east1-docker.pkg.dev/YOUR_PROJECT/light-keepers/backend:v1 \
  --region=asia-east1 \
  --platform=managed \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_PROJECT:asia-east1:light-keepers-db \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=postgresql://postgres:PASSWORD@localhost/lightkeepers?host=/cloudsql/YOUR_PROJECT:asia-east1:light-keepers-db" \
  --memory=512Mi \
  --cpu=1
```

---

## CI/CD 設定

### 使用 Cloud Build 自動部署

1. 將 `cloudbuild.yaml` 推送到 Git 儲存庫
2. 在 GCP Console 中建立 Cloud Build 觸發器
3. 設定機密變數 `_DB_PASSWORD`

```bash
# 建立機密
echo -n "your-db-password" | gcloud secrets create db-password --data-file=-

# 授權 Cloud Build 存取機密
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:YOUR_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 監控與維運

### 查看日誌
```bash
gcloud run logs read light-keepers-api --region=asia-east1
```

### 查看指標
```bash
# 在 GCP Console 中查看
# https://console.cloud.google.com/run
```

### 費用預估（每月）
| 服務 | 規格 | 預估費用 |
|------|------|----------|
| Cloud Run | 512MB, 1 vCPU | ~$10-20 USD |
| Cloud SQL | db-f1-micro | ~$10-15 USD |
| Artifact Registry | <1GB | ~$1 USD |
| **總計** | | **~$20-40 USD** |

---

## 常見問題

### Q: Cloud Run 無法連接 Cloud SQL？
確認已加入 `--add-cloudsql-instances` 參數，並使用 Unix socket 連接：
```
host=/cloudsql/PROJECT:REGION:INSTANCE
```

### Q: PostGIS 擴充無法啟用？
Cloud SQL 的 PostgreSQL 預設支援 PostGIS，但需手動執行 `CREATE EXTENSION`。

---

*文件更新日期: 2025-12-20*
