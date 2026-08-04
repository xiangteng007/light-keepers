# 秘密清單與輪換程序（NAS 自架時代）— S6.6

> **建立**：2026-08-04（工作項 S6.6）
> **適用**：NAS 自架部署（`infra/nas/`）。所有秘密集中在 NAS 上的 `infra/nas/.env`
> 一個檔案（chmod 600、已被 .gitignore 排除）。
> **與 [CREDENTIAL_ROTATION_CHECKLIST.md](CREDENTIAL_ROTATION_CHECKLIST.md) 的關係**：
> 該文件是 2026-07-31 洩漏事件（R13）的一次性應變清單；本文件是搬上 NAS 之後的
> **常態性**清單與輪換節奏。R13 的輪換完成後，新值一律依本文件管理。

---

## 0. 三條鐵律

1. **秘密只存在兩個地方**：NAS 上的 `infra/nas/.env`（唯一執行來源）與協會的
   密碼保管流程（離線備援）。不進版控、不進聊天記錄、不進截圖。
2. **兩把「換錯即資料永久不可解」的鑰匙**（見 §2 ⚠ 列）輪換前必須先完成
   重加密／重上傳程序，**絕不可直接換值**。
3. 任何一項疑似外洩 → 視為已洩漏，立即輪換，不等證據。

---

## 1. 秘密清單（`.env` 全項盤點）

| 秘密 | 用途 | 產生方式 | 輪換週期 | 換掉後的影響 |
|---|---|---|---|---|
| `DB_PASSWORD` | PostGIS 連線 | `openssl rand -base64 32` | 每年／事件 | 需同步改 postgres 使用者密碼（§3.2），重啟 backend/backup |
| `JWT_SECRET` | access token 簽章 | `openssl rand -hex 32` | **每 90 天** | 全體使用者被登出（可接受，公告即可） |
| `JWT_OFFLINE_SECRET` | 離線模式 token | `openssl rand -hex 32` | 與 JWT_SECRET 同步 | 離線裝置需重新上線換發 |
| `ENCRYPTION_KEY` ⚠ | 欄位級加密 | `openssl rand -hex 32` | **原則上不輪換** | **換錯＝既有密文永久不可解**（§2.1） |
| `CLOUDFLARE_TUNNEL_TOKEN` | 對外入口 | CF Zero Trust 主控台重發 | 每年／事件 | 重發後舊 token 立即失效，需更新 `.env` 並重啟 cloudflared |
| `LOCAL_STORAGE_SIGNING_SECRET` | 上傳簽名 URL | `openssl rand -hex 32` | 每年 | 已簽發的短效 URL 失效（無長期影響） |
| `GEMINI_API_KEY` | hybrid 降級雲端 LLM | Google AI Studio | 每年／事件 | 換新即可；工作站正常時不影響服務 |
| `LINE_CHANNEL_SECRET` / `LINE_CHANNEL_ACCESS_TOKEN` | LINE Bot | LINE Developers Console | 事件驅動 | webhook 驗簽與推播中斷至新值生效 |
| `LINE_CLIENT_SECRET` | LINE Login | 同上 | 事件驅動 | 登入中斷至新值生效 |
| `GOOGLE_CLIENT_SECRET` | Google OAuth | GCP Console | 事件驅動 | Google 登入中斷至新值生效 |
| `GOOGLE_MAPS_API_KEY` | 前端地圖 | GCP Console | 事件驅動 | 屬公開值，靠 referrer 限制防濫用；確認限制勝於輪換 |
| `FIREBASE_SERVICE_ACCOUNT` | FCM 推播（firebase-admin） | Firebase Console 重發金鑰 | 每年／事件 | 推播中斷至新值生效 |
| `CWA_API_KEY` / `WRA_API_KEY` | 氣象/水利資料 | 各平台申請 | 事件驅動 | 資料源中斷至新值生效 |
| `SENTRY_DSN` | 錯誤追蹤 | Sentry 專案設定 | 事件驅動 | 僅影響錯誤上報 |
| 第二副本 SSH 私鑰（`REPLICA_SSH_KEY_HOST` 指向的檔案） | rsync→Mac mini | `ssh-keygen -t ed25519` | 每年 | 需同步更新 Mac mini `authorized_keys`（保留 `restrict,pty` 前綴） |
| rclone crypt `password`/`password2` ⚠ | 雲端冷儲存加密 | rclone config 產生 | **原則上不輪換** | **記錯＝雲端那份永久解不開**（§2.2） |
| S3 冷儲存 access key（rclone.conf 底層 remote） | B2/R2 存取 | 供應商主控台 | 每年／事件 | 換新後更新 rclone.conf 即可（不動 crypt 層） |

不是秘密、毋須輪換：`LLM_API_KEY=ollama`（Ollama 不驗證，僅為 client 需要非空字串）。

---

## 2. ⚠ 兩把「換錯即永久不可解」的鑰匙

### 2.1 `ENCRYPTION_KEY`（欄位級加密）

- **換了值，既有密文就再也解不開——沒有 recovery，沒有寬限期。**
- 從雲端搬到 NAS 時**必須沿用原值**（`infra/nas/README.md` §3.3 已警示）。
- 真的必須輪換（確認外洩）時的唯一正確順序：
  1. 寫一次性重加密腳本：用**舊 key 解密 → 新 key 加密**，逐欄位跑完全表
  2. 驗證抽樣解密成功後，才把 `.env` 換成新值
  3. 舊 key 離線封存 90 天後銷毀（保險期內若發現漏跑的欄位還救得回）
- 此程序屬 OPUS 級工作，**不要在應變期間做**。

### 2.2 rclone crypt 密碼（第二副本）

- crypt 密碼記錯**不會報「密碼錯」**，只會解出亂碼或找不到檔案（README §9 陷阱表）。
- `password`/`password2` 一旦遺失，雲端上那份備份**等於不存在**。
- 保管要求：**離線抄存兩份**（協會密碼保管流程一份、與 NAS 不同址的實體保險位置一份）。
- 「輪換」的正確做法不是改密碼，而是**建新的 crypt remote → 全量重推 → 驗證
  `restore-drill.sh --source=secondary` 通過 → 才刪舊 remote**。

---

## 3. 標準輪換步驟

### 3.1 通用流程（適用大多數項目）

```
1. 產生新值（用 §1 表列的產生方式）
2. 先在對應外部平台生效（LINE/Google/CF…先發新、驗證、再廢舊）
3. 更新 NAS 上的 infra/nas/.env（chmod 600 不變）
4. docker compose -f docker-compose.nas.yml --env-file .env up -d（重建受影響服務）
5. verify-stack.sh 綠 + 手動驗證該功能（登入/推播/webhook…）
6. 廢止舊值（平台端撤銷）
7. 新值進協會密碼保管流程；在 §5 執行紀錄補一行
```

### 3.2 `DB_PASSWORD` 特別步驟

`pgdata` 已初始化後，改 `.env` **不會**自動改 DB 內的使用者密碼，須兩邊同步：

```bash
# 1. 容器內先改 postgres 使用者密碼
docker compose -f docker-compose.nas.yml --env-file .env exec postgres \
  psql -U $DB_USERNAME -d $DB_DATABASE -c "ALTER USER $DB_USERNAME WITH PASSWORD '<新值>';"
# 2. 再更新 .env 的 DB_PASSWORD，然後重建 backend 與 backup
docker compose -f docker-compose.nas.yml --env-file .env up -d backend backup
```

---

## 4. 保管流程

- `.env` 僅存於 NAS（chmod 600）；**每次變更後**，把全檔內容更新進協會密碼保管
  流程（密碼管理器的安全筆記，或加密後離線儲存）。NAS 全毀時（RTO 情境 B），
  重建棧的前提就是這份備援。
- rclone crypt 密碼另需**紙本離線抄存**（§2.2）。
- 交接：至少兩名幹部知道保管位置與開啟方式——單人持有＝那個人不可用時全案鎖死。

## 5. 執行紀錄

| 日期 | 項目 | 執行者 | 備註 |
|---|---|---|---|
| | | | |
