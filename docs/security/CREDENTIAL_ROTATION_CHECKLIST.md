# 憑證輪換檢查清單（Credential Rotation Checklist）

> **建立時間**：2026-07-31
> **來源**：Phase E 生產緊急止血 — E.2「移除版控中的敏感檔案」
> **狀態**：🔴 進行中 — 本文件所列的「輪換」與「歷史清理」動作**尚未執行**，必須由專案 owner 親自完成
> **適用範圍**：`xiwang-disaster-respond`（Light Keepers 災防平台）全 repo 與 GCP 專案 `light-keepers-mvp`

---

## 0. 摘要與威脅評估

本次稽核在 **git HEAD 追蹤中**發現 11 個含真實憑證或個資的檔案。E.2 已完成的動作是「止血」：
以 `git rm --cached` 解除追蹤 + 寫入 `.gitignore`，**本機實體檔案完整保留、未刪除任何內容**。

⚠️ **關鍵認知**：解除追蹤**只能防止未來的洩漏**。
所有這些憑證**仍然完整存在於 git 歷史中**，任何曾經 clone 過本 repo 的人、
任何 fork、任何 CI 快取、任何 GitHub 的 dangling object，都仍可還原出明文憑證。

**因此：所有列於 §2 的憑證都必須視為「已洩漏」並強制輪換。輪換的優先序高於 git 歷史清理。**

| 風險等級 | 項目 | 理由 |
|---|---|---|
| 🔴 P0 | GCP 服務帳號私鑰 | 可直接取得舊 Firebase 專案的 Admin 權限 |
| 🔴 P0 | 生產 Cloud SQL DB 密碼 | 可直接讀寫生產資料庫全部資料 |
| 🔴 P0 | Gemini API Key | 可被盜用產生帳單、無使用量上限 |
| 🟠 P1 | Owner 帳號密碼（3 組明文） | 平台最高權限（Level 5）帳號 |
| 🟠 P1 | 9 位使用者的 Firebase scrypt hash + salt | 可離線暴力破解；多數為弱密碼風險 |
| 🟡 P2 | Firebase / Google Maps 瀏覽器 API Key | 設計上為公開值，但需確認網域限制 |
| 🟡 P2 | 9 位使用者 email（個資） | 個資外洩，涉及告知義務 |

---

## 1. 已洩漏項目清單與位置

### 1.1 已於 E.2 解除版控追蹤的檔案（11 個）

| # | 檔案路徑 | 洩漏內容 | 處置 |
|---|---|---|---|
| 1 | `backend/users.json` | Firebase 使用者匯出檔：9 筆帳號、11 筆 email 紀錄、7 組 `passwordHash`（scrypt）+ `salt` | `git rm --cached` ✅ |
| 2 | `backend/src/scripts/exported-users.json` | 同上之子集：5 筆帳號、4 組 `passwordHash` + `salt` | `git rm --cached` ✅ |
| 3 | `backend/src/scripts/old-project-service-account.json` | **GCP 服務帳號私鑰**（`type: service_account`、`project_id: light-keepers-mvp`、完整 `private_key` PEM、`private_key_id: 14ca40dc…`） | `git rm --cached` ✅ |
| 4 | `backend/app.yaml` | **生產 Cloud SQL 密碼** `DB_PASSWORD`、**`GEMINI_API_KEY`**（`AIzaSyC-5aw…`）、Cloud SQL instance 連線字串 | `git rm --cached` ✅ |
| 5 | `backend/create-owner.js` | Owner 帳號明文密碼 `19861007`（bcrypt 前的明文）、本機 DB 密碼 `localdev123`、owner email | `git rm --cached` ✅ |
| 6 | `backend/fix-schema.js` | 本機 DB 密碼 `localdev123` | `git rm --cached` ✅ |
| 7 | `backend/fix-all-schema.js` | 本機 DB 密碼 `localdev123` | `git rm --cached` ✅ |
| 8 | `backend/get-columns.js` | 本機 DB 密碼 `localdev123` | `git rm --cached` ✅ |
| 9 | `backend/scripts/firebase-reset.ts` | Owner 明文密碼 `19861007`、且為破壞性腳本（會刪除**所有** Firebase Auth 使用者） | `git rm --cached` ✅ |
| 10 | `backend/src/scripts/set-owner-password.ts` | Owner 明文密碼 `LightKeepers2026!`、owner email | `git rm --cached` ✅ |
| 11 | `web-dashboard/.env.production` | Firebase Web 設定、`VITE_GOOGLE_MAPS_API_KEY`、`VITE_GOOGLE_CLIENT_ID`、`VITE_LINE_CLIENT_ID`、生產 API URL | `git rm --cached` ✅ |

> 第 11 項為前端 client-side 公開識別值（Firebase Web API Key 依 Google 官方定義**並非機密**）。
> 解除追蹤的理由是：`.github/workflows/deploy.yml` 已從 GitHub Secrets 注入所有 `VITE_*` 變數，
> 此檔案對正式部署流程是多餘的；本機開發者仍可保留自己的 `.env.production`。
> 但 **Google Maps API Key 仍必須確認網域限制**，見 §2.5。

### 1.2 保留版控但已就地清除明文的檔案

| 檔案 | 內容 | 處置 |
|---|---|---|
| `backend/scripts/reset-accounts.ts` | 第 56 行 `console.log` 內含 `xiangteng007@gmail.com / 19861007` | 已改為不含憑證的提示字串（檔案本身為合法維運腳本，故保留版控） |

### 1.3 已確認為**安全**、無需處理的項目

- `.env.example`、`web-dashboard/.env.example` — 全為 `your_secure_xxx_here` 佔位字串 ✅
- `backend/run-migration-production.sh`、`backend/run-seed-production.sh` — 使用 `--set-secrets="DB_PASSWORD=db-password:latest"`（Secret Manager 引用），無明文 ✅
- `web-dashboard/public/firebase-messaging-sw.js` — `AIzaSyD_placeholder` 佔位值 ✅
- `web-dashboard/src/config/firebase.config.ts` — 全部讀取 `import.meta.env` ✅
- `web-dashboard/capacitor.config.json`、`ios/App/App/Info.plist` — 無憑證 ✅
- 全 repo 無 `*.pem` / `*.key` / `*.p12` / `google-services.json` / `GoogleService-Info.plist` / 資料庫 dump / backup 檔被追蹤 ✅
- `backend/src/**/*.spec.ts` 中的 `password123` 等 — 測試 fixture，非真實憑證 ✅

### 1.4 仍存在於原始碼中的 owner email（個資，非憑證）

以下檔案硬編碼 `xiangteng007@gmail.com` 作為預設 owner。這**不是憑證洩漏**，但建議改為讀取 `OWNER_EMAIL` 環境變數：

- `backend/src/modules/accounts/seed.service.ts:16`
- `backend/src/database/migrations/1738699752000-AssignOwnerRole.ts:10,64`
- `backend/src/scripts/seed-owner.ts:23`（已有 env fallback）
- `backend/src/scripts/fix-owner-role.ts:22`（已有 env fallback）

> 建議列入 Phase E 後續（非 E.2 阻斷項）。

---

## 2. 必須輪換的憑證

> **每一項完成後請在 checkbox 打勾，並記下執行者與時間。**

### 2.1 🔴 P0 — GCP 服務帳號私鑰

- [ ] 到 GCP Console → IAM 與管理 → 服務帳號，找出 `private_key_id = 14ca40dc4f7a28941ec9abdd8bc94795cf6c5b9d` 對應的服務帳號
- [ ] **先建立新金鑰**並更新所有使用端（Cloud Run / Secret Manager / 本機 `temp-firebase-key.json`）
- [ ] 驗證新金鑰可正常運作後，**刪除舊金鑰**（Console → 該服務帳號 → 金鑰 → 刪除）
- [ ] 檢視該服務帳號的 IAM 角色，套用最小權限原則（移除多餘的 `Editor` / `Owner`）
- [ ] 到 GCP Console → 記錄檔探索工具，查詢該金鑰過去 90 天的使用紀錄，確認無非預期來源 IP／非預期 API 呼叫
- [ ] 若該服務帳號屬於「舊專案」且已無用途 → 直接**停用並刪除整個服務帳號**（最徹底）

**查核指令草稿**（需 owner 具備 gcloud 權限後執行）：

```bash
# 列出服務帳號金鑰
gcloud iam service-accounts keys list \
  --iam-account=<SERVICE_ACCOUNT_EMAIL> \
  --project=light-keepers-mvp

# 刪除已洩漏的金鑰
gcloud iam service-accounts keys delete 14ca40dc4f7a28941ec9abdd8bc94795cf6c5b9d \
  --iam-account=<SERVICE_ACCOUNT_EMAIL> \
  --project=light-keepers-mvp
```

### 2.2 🔴 P0 — 生產資料庫密碼（Cloud SQL）

洩漏值位於 `backend/app.yaml` 的 `DB_PASSWORD`（Cloud SQL instance `light-keepers-mvp:asia-east1:light-keepers-db`）。

- [ ] 產生新的高強度隨機密碼（≥ 32 字元）
- [ ] Cloud SQL → 使用者 `postgres` → 變更密碼
- [ ] 更新 Secret Manager 中的 `db-password` secret（新增版本，不要就地覆寫，方便回滾）
- [ ] 重新部署 Cloud Run backend 服務使其取得新版本 secret
- [ ] 確認 `backend/app.yaml`（App Engine 設定）是否仍在使用；**若已改用 Cloud Run 則應廢棄此檔**
- [ ] 稽核 Cloud SQL 連線紀錄，確認無非預期來源

```bash
# 更新 Secret Manager
printf '%s' "<NEW_PASSWORD>" | gcloud secrets versions add db-password \
  --data-file=- --project=light-keepers-mvp

# 變更 Cloud SQL 使用者密碼
gcloud sql users set-password postgres \
  --instance=light-keepers-db \
  --project=light-keepers-mvp \
  --prompt-for-password
```

### 2.3 🔴 P0 — Gemini API Key

洩漏值位於 `backend/app.yaml` 的 `GEMINI_API_KEY`（`AIzaSyC-5aw…`）。

- [ ] 到 Google AI Studio / GCP Console → API 與服務 → 憑證，**刪除**該 API Key
- [ ] 建立新 Key，套用 API 限制（僅 Generative Language API）與呼叫端限制
- [ ] 將新 Key 存入 Secret Manager（`gemini-api-key`），由 Cloud Run 以 `--set-secrets` 注入，**不得再寫入任何檔案**
- [ ] 檢查 GCP 帳單與 API 使用量，確認無異常暴衝

### 2.4 🟠 P1 — Owner 帳號密碼

已洩漏的 owner 明文密碼共 **3 組**（`xiangteng007@gmail.com`）：

| 明文密碼 | 洩漏位置 |
|---|---|
| `19861007` | `backend/create-owner.js`、`backend/scripts/firebase-reset.ts`、`backend/scripts/reset-accounts.ts` |
| `LightKeepers2026!` | `backend/src/scripts/set-owner-password.ts` |
| `localdev123`（DB，非帳號） | `backend/create-owner.js`、`fix-schema.js`、`fix-all-schema.js`、`get-columns.js` |

- [ ] 立即從 Firebase Console → Authentication 變更 owner 密碼（**不要**用任何 repo 內腳本，避免再寫入明文）
- [ ] 若後端另有本地 `accounts` 表密碼，一併以互動方式更新（不得使用硬編碼腳本）
- [ ] **為 owner 帳號啟用 MFA / 二階段驗證**
- [ ] 檢視 Firebase Auth 登入紀錄，確認無非預期 IP 曾以 owner 身分登入
- [ ] 撤銷 owner 的所有既有 refresh token（Firebase Admin `revokeRefreshTokens`；後端另有 `refresh_tokens` 表需一併清空該帳號紀錄）
- [ ] 本機開發 DB 密碼 `localdev123` 一併更換（雖為本機，但已成為已知字典值）

### 2.5 🟡 P2 — 前端 API Key 與 OAuth Client ID

- [ ] Google Maps API Key（`AIzaSyBudn50h4…`）：確認已設定 **HTTP referrer 限制**（僅 `lightkeepers.ngo` 及必要子網域）與 **API 限制**（僅 Maps JavaScript API）
- [ ] 確認 Firebase Web API Key 已在 Firebase Console 設定授權網域白名單
- [ ] 若無法確認限制狀態 → 直接輪換這兩把 Key 並更新 GitHub Secrets（`GOOGLE_MAPS_API_KEY`、`FIREBASE_API_KEY`）
- [ ] LINE Login Channel（`2008769727`）：確認 **Channel Secret 從未進版控**（本次掃描未發現，但請於 LINE Developers Console 覆核）
- [ ] Google OAuth Client：確認 **Client Secret 從未進版控**（本次掃描未發現）

### 2.6 🟠 P1 — JWT Secret

本次掃描**未在版控中發現明文 `JWT_SECRET`**（`.env.example` 僅有佔位字串），但基於下列理由仍建議輪換：

- 生產 DB 密碼與服務帳號私鑰已洩漏，攻擊者若曾取得環境變數即可能一併取得 JWT secret
- 輪換成本低、影響可控（僅使既有 token 失效）

- [ ] 產生新的 `JWT_SECRET`（≥ 64 bytes 隨機值）並寫入 Secret Manager
- [ ] 同步輪換 refresh token 簽章密鑰（若與 access token 分離）
- [ ] 重新部署後端
- [ ] 清空 `refresh_tokens` 資料表（強制全體重新登入）
- [ ] 公告使用者「系統維護，需重新登入」

---

## 3. 使用者密碼重設與通知

### 3.1 受影響名單（共 9 個帳號 / 7 組密碼雜湊）

| # | Email | 是否含 passwordHash + salt |
|---|---|---|
| 1 | `molly199565@gmail.com` | ✅ 是 |
| 2 | `kevinroad0912@gmail.com` | ✅ 是 |
| 3 | `zaza951016@gmail.com` | ✅ 是 |
| 4 | `axixsxdx@gmail.com` | ❌ 否（`google.com` 社群登入，洩漏 displayName + photoUrl） |
| 5 | `xiangteng007@gmail.com` | ✅ 是（owner） |
| 6 | `juno23kk@gmail.com` | ✅ 是 |
| 7 | `a0966363517@gmail.com` | ❌ 否（`google.com` 社群登入） |
| 8 | `eserver0315@gmail.com` | ✅ 是 |
| 9 | `nov9729@gmail.com` | ✅ 是 |

> 7 個帳號為 email/密碼登入（含 scrypt hash + salt）；2 個為 Google 社群登入（無密碼雜湊，但洩漏姓名與頭像 URL）。
> **9 個帳號全部都需要執行 §3.3 的 session 撤銷；其中 7 個另需強制密碼重設。**

> 完整名單以本機 `backend/users.json` 為準（該檔已解除追蹤但實體保留）。
> `providerUserInfo` 造成部分 email 重複出現，故「email 出現次數（11）」與「實際帳號數（9）」不同。

### 3.2 密碼雜湊風險說明

洩漏的是 **Firebase scrypt** 雜湊 + 每人獨立 salt。Firebase scrypt 參數強、且需搭配專案層級的
`signer key` / `salt separator` 才能完整重現，因此**不等於明文外洩**。
但仍必須假設：擁有 hash + salt 的攻擊者可對弱密碼進行離線字典攻擊。

⚠️ 特別注意：`backend/users.json` 洩漏的僅是 hash 與 salt，
**專案層級的 scrypt 參數（signer key、salt separator、rounds、memory cost）本次掃描未在版控中發現**。
請 owner 到 Firebase Console → Authentication → 使用者 → 密碼雜湊參數，
確認這些參數從未被匯出到任何版控或文件中。若曾洩漏，破解難度將大幅降低，需升級為 P0。

### 3.3 執行步驟

- [ ] **步驟 1｜備份**：確認本機 `backend/users.json` 已安全保存（用於比對名單），並將其移出 repo 目錄，存放於加密位置
- [ ] **步驟 2｜強制重設**：透過 Firebase Admin SDK 對上述 9 個帳號發送密碼重設連結
  ```ts
  // 一次性腳本，執行後即刪除，勿提交版控
  import * as admin from 'firebase-admin';
  const emails = [/* 見 §3.1 */];
  for (const email of emails) {
    const link = await admin.auth().generatePasswordResetLink(email);
    console.log(email, link); // 交由郵件系統寄送
  }
  ```
- [ ] **步驟 3｜撤銷 session**：對每個帳號呼叫 `admin.auth().revokeRefreshTokens(uid)`，並清空後端 `refresh_tokens` 表中對應紀錄
- [ ] **步驟 4｜通知信**：寄送個資外洩告知（範本見 §3.4）
- [ ] **步驟 5｜法遵**：依《個人資料保護法》第 12 條，個資外洩應**查明後以適當方式通知當事人**。
      本案洩漏 email + 密碼雜湊 + Google 顯示名稱／頭像，屬個資。
      請評估是否需向主管機關通報（依組織性質與規模判定）— **此判斷需 owner 決策，必要時諮詢法務**
- [ ] **步驟 6｜追蹤**：7 日後檢查未完成重設的帳號，直接停用（`admin.auth().updateUser(uid, { disabled: true })`）

### 3.4 使用者通知信範本

```
主旨：【Light Keepers】重要安全通知 — 請立即重設您的密碼

親愛的使用者您好：

我們在一次內部安全稽核中發現，本平台的程式碼倉庫曾意外包含一份使用者帳號
匯出檔，其中含有您的電子郵件地址與加密後的密碼雜湊值（並非明文密碼）。

【已採取的措施】
1. 已立即將該檔案自版本控制中移除。
2. 已輪換所有相關系統憑證。
3. 已強制登出所有裝置的既有登入狀態。

【請您協助的事項】
1. 點擊我們寄出的密碼重設連結，設定一組全新的密碼。
2. 若您在其他網站使用了相同的密碼，請一併更換。
3. 建議啟用二階段驗證。

【目前掌握的影響範圍】
洩漏內容為：電子郵件地址、加密後的密碼雜湊值與 salt。
我們目前沒有發現任何帳號被未授權存取的跡象。
您的密碼以強加密演算法保護，並未以明文形式洩漏。

對於造成的不便，我們深感抱歉。
如有任何疑問，請聯繫：<聯絡信箱>

Light Keepers 團隊
<日期>
```

---

## 4. Git 歷史清理程序

> ### ⛔ 警語 — 請務必先讀完
>
> **本節指令會改寫 git 歷史，屬不可逆的高風險操作，必須由 owner 確認後另行執行，本次 E.2 一律不執行。**
>
> 執行後將造成：
> 1. **所有 commit SHA 全部改變** — 現有的 PR、issue 連結、CI 紀錄、部署標籤中的 SHA 全部失效
> 2. **必須 force push**（`git push --force-with-lease`）— 需暫時解除 GitHub 分支保護規則
> 3. **所有協作者必須重新 clone** — 舊的本機 clone 若直接 `git pull` 會產生災難性的歷史合併
> 4. **所有進行中的 PR 需要重建**
> 5. **GitHub 端的舊物件不會立即消失** — 需另外聯繫 GitHub Support 要求清除 dangling objects，
>    或將 repo 設為 private / 重建 repo
>
> **⚠️ 最重要：即使歷史清理成功，也不能取代 §2 的憑證輪換。**
> 憑證一旦進入過公開歷史即應永久視為已洩漏。
> **正確順序是：先完成 §2 全部輪換 → 再考慮是否進行歷史清理。**

### 4.1 前置準備（owner 執行）

- [ ] §2 所有 P0 / P1 憑證輪換**已全部完成並驗證**
- [ ] 通知所有協作者預定的執行時間窗口，並要求在該時間點前推送所有本機工作
- [ ] 建立完整鏡像備份：`git clone --mirror <repo-url> lightkeepers-backup-$(date +%Y%m%d).git`
- [ ] 另外將備份壓縮存放於離線／加密位置
- [ ] 記錄目前的 HEAD SHA 與所有分支狀態
- [ ] 暫時解除 GitHub 分支保護規則（`main`）
- [ ] 安裝工具：`pip install git-filter-repo`（**不要**使用已棄用的 `git filter-branch`）

### 4.2 指令草稿（尚未執行，僅供 owner 覆核）

```bash
# ⚠️ 以下全部為草稿，執行前請先完成 §4.1 全部前置項目
# ⚠️ 務必在「全新的 mirror clone」上操作，不要在日常工作目錄執行

# 步驟 0：取得乾淨的鏡像
git clone --mirror https://github.com/<ORG>/xiwang-disaster-respond.git repo-clean.git
cd repo-clean.git

# 步驟 1：從全部歷史中移除敏感檔案路徑
git filter-repo \
  --path backend/users.json \
  --path backend/src/scripts/exported-users.json \
  --path backend/src/scripts/old-project-service-account.json \
  --path backend/app.yaml \
  --path backend/create-owner.js \
  --path backend/fix-schema.js \
  --path backend/fix-all-schema.js \
  --path backend/get-columns.js \
  --path backend/scripts/firebase-reset.ts \
  --path backend/src/scripts/set-owner-password.ts \
  --path web-dashboard/.env.production \
  --invert-paths

# 步驟 2：清除仍散落在其他檔案中的明文憑證字串
#         （例如 reset-accounts.ts 舊版本中的 owner 密碼）
cat > /tmp/replacements.txt <<'EOF'
19861007==>***REMOVED***
LightKeepers2026!==>***REMOVED***
localdev123==>***REMOVED***
I5>>P5RR/bSdo%d8==>***REMOVED***
AIzaSyC-5awXniFknpEngQJ-orCgaBMHkJE8qhI==>***REMOVED***
EOF
git filter-repo --replace-text /tmp/replacements.txt --force
rm -f /tmp/replacements.txt

# 步驟 3：驗證敏感內容已消失（下列指令都應該沒有輸出）
git log --all --oneline -- backend/users.json
git log --all --oneline -- backend/src/scripts/old-project-service-account.json
git log --all --oneline -- backend/app.yaml
git grep -I "BEGIN PRIVATE KEY" $(git rev-list --all) | head
git grep -I "19861007"        $(git rev-list --all) | head
git grep -I "AIzaSyC-5aw"     $(git rev-list --all) | head

# 步驟 4：回收空間
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 步驟 5：force push（需先解除分支保護）
git remote add origin https://github.com/<ORG>/xiwang-disaster-respond.git
git push --force-with-lease --all origin
git push --force-with-lease --tags origin
```

### 4.3 執行後動作

- [ ] 重新啟用 GitHub 分支保護規則
- [ ] 通知全體協作者：**刪除舊的本機 clone，重新 `git clone`**（不可用 `git pull`）
- [ ] 重建所有進行中的 PR
- [ ] 檢查 CI/CD pipeline 是否因 SHA 變動而失效
- [ ] 聯繫 GitHub Support 要求清除 dangling objects（historic blob 在 GitHub 端仍可透過舊 SHA 直接存取）
- [ ] 檢查是否存在 fork；若有，需個別聯繫 fork 擁有者
- [ ] 檢查 CI 快取、Docker image layer、artifact 儲存是否仍含敏感檔

---

## 5. 輪換後驗證步驟

### 5.1 版控層驗證

```bash
# ① 敏感檔已不在追蹤清單中（應無輸出）
git ls-files | grep -E "users\.json|old-project-service-account|app\.yaml|create-owner\.js|fix-schema\.js|fix-all-schema\.js|get-columns\.js|firebase-reset\.ts|set-owner-password\.ts|\.env\.production"

# ② 實體檔案仍存在於本機（應全部列出）
ls backend/users.json backend/app.yaml backend/src/scripts/old-project-service-account.json

# ③ .gitignore 確實生效（應列出全部 11 個路徑）
git check-ignore backend/users.json backend/app.yaml backend/create-owner.js \
  backend/fix-schema.js backend/fix-all-schema.js backend/get-columns.js \
  backend/scripts/firebase-reset.ts backend/src/scripts/exported-users.json \
  backend/src/scripts/old-project-service-account.json \
  backend/src/scripts/set-owner-password.ts web-dashboard/.env.production

# ④ 範例檔未被誤忽略（應無輸出、exit code 1）
git check-ignore .env.example web-dashboard/.env.example

# ⑤ 沒有已追蹤檔案被新規則遮蔽（應無輸出）
git ls-files | git check-ignore --stdin

# ⑥ 現行工作樹中不再有明文憑證（應無輸出）
git grep -nI -E "localdev123|19861007|LightKeepers2026!|AIzaSyC-5aw" -- . ':!docs/security/'
```

### 5.2 憑證層驗證

- [ ] **舊憑證確實失效**：以舊 DB 密碼嘗試連線 → 必須失敗
- [ ] **舊服務帳號金鑰失效**：以舊 `old-project-service-account.json` 呼叫 Firebase Admin API → 必須回傳 401/403
- [ ] **舊 Gemini Key 失效**：以舊 key 呼叫 API → 必須回傳 400/403
- [ ] **舊 owner 密碼失效**：以 `19861007` / `LightKeepers2026!` 登入 → 必須失敗
- [ ] **舊 JWT 失效**：以輪換前簽發的 access token 呼叫受保護 API → 必須回傳 401

### 5.3 服務層驗證（確認沒有輪換到壞掉）

- [ ] 後端 Cloud Run 服務健康檢查通過（`/health` 或等效端點）
- [ ] 後端可正常連線 Cloud SQL（查一筆資料驗證）
- [ ] Firebase Auth 登入流程可用（新密碼登入成功、取得 token、呼叫受保護 API 成功）
- [ ] Gemini/AI 相關功能可正常呼叫
- [ ] 前端生產站台可載入（地圖顯示正常、Firebase 初始化無錯誤）
- [ ] Google / LINE OAuth 登入可用
- [ ] 推播（FCM）可正常發送
- [ ] CI/CD pipeline 完整跑通一次

### 5.4 監控與後續防護

- [ ] 於 GCP Cloud Logging 建立告警：服務帳號金鑰建立／刪除事件
- [ ] 於 GCP 設定 Gemini API 用量配額與帳單預算告警
- [ ] 於 GitHub 啟用 **Secret Scanning** 與 **Push Protection**（Settings → Code security）
- [ ] 導入 pre-commit secret 掃描（`gitleaks` 或 `detect-secrets`），並加入 CI gate
- [ ] 建立「憑證一律走 Secret Manager，不得寫入任何檔案」的工程規範，補進 `docs/SECURITY_CHECKLIST.md`
- [ ] 排定 90 天定期憑證輪換週期

---

## 6. 必須由 owner 親自執行的動作（不可由 AI agent 代勞）

| # | 動作 | 原因 |
|---|---|---|
| 1 | 所有 GCP 憑證輪換（服務帳號金鑰、DB 密碼、Gemini API Key、Secret Manager） | 需要 GCP Console 登入與雲端專案管理權限 |
| 2 | Firebase Console 密碼變更、MFA 啟用、token 撤銷 | 需要 Firebase 專案 owner 權限 |
| 3 | 寄送使用者個資外洩通知信 | 對外溝通行為，需 owner 決定措辭、時機與收件範圍 |
| 4 | 個資法通報義務判定與（如需要的）主管機關通報 | 法律責任判定，必要時應諮詢法務 |
| 5 | `git filter-repo` 歷史清理與 `git push --force` | 不可逆、影響全體協作者，需明確授權 |
| 6 | 解除／恢復 GitHub 分支保護規則 | 需 repo admin 權限 |
| 7 | 聯繫 GitHub Support 清除 dangling objects | 需帳號擁有者身分 |
| 8 | 稽核 GCP / Firebase 存取紀錄，判定是否已遭實際入侵 | 需雲端稽核紀錄存取權與事件判讀決策 |
| 9 | 決定 `backend/app.yaml`（App Engine）是否廢棄 | 部署架構決策 |

---

## 7. 執行紀錄

| 日期 | 執行者 | 動作 | 結果 |
|---|---|---|---|
| 2026-07-31 | Phase E.2 agent | 11 個敏感檔 `git rm --cached` + 更新 `.gitignore` + 清除 `reset-accounts.ts` 明文 + 建立本文件 | ✅ 完成（本機實體檔案全部保留） |
| | | §2 憑證輪換 | ⬜ 待 owner 執行 |
| | | §3 使用者密碼重設與通知 | ⬜ 待 owner 執行 |
| | | §4 git 歷史清理 | ⬜ 待 owner 確認後執行 |
| | | §5 驗證 | ⬜ 待執行 |
