#!/bin/bash

# 在 Cloud Run 服務中執行 Migration
# 此腳本會連接到生產環境的 Cloud SQL 資料庫並執行 volunteer-account 關聯 migration

echo "🚀 開始在生產環境執行 Migration..."

# 執行 Migration 命令
gcloud run jobs create run-volunteer-migration-job \
  --image=asia-east1-docker.pkg.dev/light-keepers-mvp/light-keepers/backend:latest \
  --region=asia-east1 \
  --project=light-keepers-mvp \
  --add-cloudsql-instances=light-keepers-mvp:asia-east1:light-keepers-db \
  --set-secrets="DB_PASSWORD=db-password:latest" \
  --set-env-vars="NODE_ENV=production,DB_HOST=/cloudsql/light-keepers-mvp:asia-east1:light-keepers-db,DB_USERNAME=postgres,DB_DATABASE=lightkeepers" \
  --command="npx" \
  --args="ts-node,src/scripts/run-volunteer-migration.ts" \
  --max-retries=0 \
  --task-timeout=300s \
  --tasks=1

echo "✅ Migration Job 已建立，開始執行..."

# 執行 job
gcloud run jobs execute run-volunteer-migration-job \
  --region=asia-east1 \
  --project=light-keepers-mvp \
  --wait

echo "🎉 Migration 執行完成！"

# 清理 job (可選)
# gcloud run jobs delete run-volunteer-migration-job --region=asia-east1 --project=light-keepers-mvp --quiet
