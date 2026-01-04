# Emergency Response 專案遷移指南

**目標**：將現有專案遷移至新的 GitHub/GCP/Firebase 路徑，**保留所有舊資料**

---

## 1. 目標路徑

| 服務 | 舊路徑 | 新路徑 |
|------|--------|--------|
| GitHub | xiangteng007/light-keepers | xiangteng007/Emergency-Response |
| GCP | (現有專案) | emergency-response-483312 |
| Firebase | (現有專案) | emergency-response-911 |

---

## 2. Firebase 遷移（匯出/匯入模式）

### 2.1 匯出舊專案資料

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入
firebase login

# 匯出 Firestore 資料至 Cloud Storage
gcloud firestore export gs://[OLD_PROJECT_BUCKET]/firestore-backup \
  --project=[OLD_PROJECT_ID]

# 匯出 Authentication 使用者（需使用 Admin SDK）
# 建立匯出腳本 scripts/export-users.ts
```

### 2.2 匯入至新專案

```bash
# 匯入 Firestore 資料
gcloud firestore import gs://[OLD_PROJECT_BUCKET]/firestore-backup \
  --project=emergency-response-911

# 匯入 Authentication 使用者
firebase auth:import users.json --project=emergency-response-911
```

### 2.3 需遷移項目清單

| 項目 | 匯出方式 | 匯入方式 |
|------|----------|----------|
| Firestore 資料庫 | gcloud firestore export | gcloud firestore import |
| Authentication 使用者 | firebase auth:export | firebase auth:import |
| Storage 檔案 | gsutil cp -r | gsutil cp -r |
| Remote Config | Firebase Console 匯出 JSON | Firebase Console 匯入 |
| Cloud Functions | 重新部署 | firebase deploy --only functions |

---

## 3. GCP 遷移

### 3.1 Cloud SQL 備份

```bash
# 建立備份
gcloud sql backups create \
  --instance=[INSTANCE_NAME] \
  --project=[OLD_PROJECT]

# 還原至新專案
gcloud sql backups restore [BACKUP_ID] \
  --restore-instance=[NEW_INSTANCE] \
  --project=emergency-response-483312
```

### 3.2 需遷移服務

| 服務 | 動作 |
|------|------|
| Cloud SQL | 備份 → 還原 |
| Cloud Storage | gsutil rsync |
| Cloud Run | 重新部署 |
| Secret Manager | 重新建立 |

---

## 4. GitHub 遷移

```bash
# 複製現有 repo 到新位置
git clone https://github.com/xiangteng007/light-keepers.git Emergency-Response
cd Emergency-Response

# 更新 remote
git remote set-url origin https://github.com/xiangteng007/Emergency-Response.git

# 推送
git push -u origin main
```

---

## 5. 環境變數更新

更新以下檔案中的專案 ID：
- `.env`
- `.env.credentials`
- `cloudbuild.yaml`
- `web-dashboard/src/config/firebase.ts`
- `backend/src/config/firebase.config.ts`

---

## 6. 驗證清單

- [ ] GitHub repo 可正常 clone/push
- [ ] Firebase Firestore 資料完整
- [ ] Firebase Authentication 使用者可登入
- [ ] Cloud SQL 資料完整
- [ ] Cloud Run 部署成功
- [ ] 前端可連接新後端
