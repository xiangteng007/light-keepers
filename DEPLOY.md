# 🚀 Light Keepers 部署指南

> **⚠ DEPRECATED（S5.9，2026-08-04）**：本文件描述的 GCP（Cloud Run／Cloud Build）部署路徑已停用，僅保留作回雲參考。
> 現行部署目標是自架 NAS（見 `infra/nas/README.md`）；GCP 生產環境已下線且資料不可取回（D20）。
> Vercel 帳號僅保留作網域管理用（D24），`vercel.json` 已撤除（D25）。

## 快速開始

### 1. LINE Bot 設定

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 建立 Provider → Create New Channel → **Messaging API**
3. 填寫資訊：
   - Channel name: `Light Keepers 小秘書`
   - Category: `公共事業`
4. 取得憑證：
   - **Channel Secret**: Basic settings
   - **Channel Access Token**: Messaging API → Issue

### 2. GCP 設定

#### 2.1 設定環境變數
在 Cloud Build 觸發器中設定 Substitution variables：

| 變數 | 說明 |
|------|------|
| `_DB_PASSWORD` | PostgreSQL 密碼 |
| `_LINE_CHANNEL_ACCESS_TOKEN` | LINE Token |
| `_LINE_CHANNEL_SECRET` | LINE Secret |

#### 2.2 手動部署
```bash
# 登入 GCP
gcloud auth login

# 設定專案
gcloud config set project YOUR_PROJECT_ID

# 建置並推送映像
cd backend
docker build -t asia-east1-docker.pkg.dev/YOUR_PROJECT_ID/light-keepers/backend .
docker push asia-east1-docker.pkg.dev/YOUR_PROJECT_ID/light-keepers/backend

# 部署到 Cloud Run
gcloud run deploy light-keepers-api \
  --image asia-east1-docker.pkg.dev/YOUR_PROJECT_ID/light-keepers/backend \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "LINE_CHANNEL_ACCESS_TOKEN=xxx" \
  --set-env-vars "LINE_CHANNEL_SECRET=xxx"
```

### 3. LINE Webhook 設定

部署完成後，取得 Cloud Run URL：
```
https://light-keepers-api-xxxxx-an.a.run.app
```

到 LINE Developers Console → Messaging API：
- Webhook URL: `https://YOUR-CLOUD-RUN-URL/api/v1/line-bot/webhook`
- 開啟 **Use webhook** 開關
- 關閉 **Auto-reply messages**

### 4. 前端部署 (Vercel)

```bash
cd web-dashboard
vercel --prod
```

設定環境變數：
- `VITE_API_URL`: Cloud Run API URL

---

## 驗證

### 測試 LINE Bot
1. 掃描 QR Code 加入官方帳號
2. 傳送 `時數` 測試回覆
3. 傳送 `任務` 測試 Flex Message

### API 測試
```bash
# 健康檢查
curl https://YOUR-URL/api/v1/health

# Rich Menu 配置
curl https://YOUR-URL/api/v1/line-bot/rich-menu-config
```

---

## 故障排除

| 問題 | 解決方案 |
|------|----------|
| LINE 無回應 | 檢查 Webhook URL 是否正確 |
| 400 Invalid signature | 確認 Channel Secret 正確 |
| Bot not configured | 確認環境變數已設定 |
