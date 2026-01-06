#!/bin/bash

# 在 Cloud Run 服務中執行種子資料腳本
# 此腳本會連接到生產環境的 Cloud SQL 資料庫

echo "🚀 開始在 Cloud Run 上執行志工種子資料..."

# 執行種子資料命令
gcloud run jobs create seed-volunteers-job \
  --image=asia-east1-docker.pkg.dev/light-keepers-mvp/light-keepers/backend:latest \
  --region=asia-east1 \
  --project=light-keepers-mvp \
  --add-cloudsql-instances=light-keepers-mvp:asia-east1:light-keepers-db \
  --set-secrets="DB_PASSWORD=db-password:latest" \
  --set-env-vars="NODE_ENV=production,DB_HOST=/cloudsql/light-keepers-mvp:asia-east1:light-keepers-db,DB_USERNAME=postgres,DB_DATABASE=lightkeepers" \
  --command="npm" \
  --args="run,seed:volunteers" \
  --max-retries=0 \
  --task-timeout=300s \
  --tasks=1

echo "✅ Job 已建立，開始執行..."

# 執行 job
gcloud run jobs execute seed-volunteers-job \
  --region=asia-east1 \
  --project=light-keepers-mvp \
  --wait

echo "🎉 種子資料執行完成！"
