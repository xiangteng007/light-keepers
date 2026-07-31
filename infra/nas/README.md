# Light Keepers — NAS 本地部署（INF-1 / Phase M）

> 對應 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` 工作項 **M.1**（NAS Docker 棧設計＋回雲四原則）與 **M.3**（storage driver 切 local＋檔案搬遷腳本）。
> 因 Google 服務租約到期，平台自 GCP（Cloud Run / Cloud SQL / GCS / Gemini）搬遷至協會自有 NAS，**同時保留隨時回雲的能力**。

---

## 1. 目標拓撲

```
                    Internet
                       │
                       ▼
        ┌──────────────────────────────┐
        │  Cloudflare Tunnel（免開 port）│   TLS 在此終結
        └──────────────┬───────────────┘
                       │ 出站連線（NAS 主動連 CF，路由器不需 port forward）
   ┌───────────────────▼────────────────────────────────────────┐
   │  ASUSTOR AS5404T（Celeron N5105 / 16GB / ADM 5.1.1）        │
   │                                                             │
   │   cloudflared ──▶ nginx:8080 ──┬──▶ backend:8080（NestJS）  │
   │                                │         │                  │
   │                                │         ▼                  │
   │                                │    postgres:5432（PostGIS）│
   │                                └──▶ /uploads（靜態出檔）     │
   │                                                             │
   │   backup（每日 03:30）── pg_dump + rsync ──▶ HDD RAID 6     │
   │                                                             │
   │   NVMe RAID 10：pgdata / uploads   HDD RAID 6：backups      │
   └───────────────────┬─────────────────────────────────────────┘
                       │ 內網 2.5GbE
                       ▼
        ┌──────────────────────────────────────┐
        │  RTX 5090 工作站：Ollama serve        │
        │  OpenAI-compatible :11434/v1          │
        │  （AI 推論一律不落在 NAS 上）          │
        └──────────────────────────────────────┘

        Mac mini：備份第二副本（異地/異機）
```

**中華電信固定 IP 的角色**：備援與內網服務用。對外流量走 Cloudflare Tunnel，路由器**不需要**也**不應該**開 port forward——這樣既省掉憑證輪替，也讓 NAS 的管理介面完全不暴露在公網。

---

## 2. 儲存配置：什麼放 NVMe、什麼放 HDD

這是本次部署最關鍵的決定，兩個池的用途**不可混用**：

| 儲存池 | 掛載點（範例） | 放什麼 | 為什麼 |
|---|---|---|---|
| **M.2 NVMe RAID 10**（4 槽） | `${NVME_DATA_ROOT}` = `/volume2/docker/lightkeepers` | `pgdata/`（PostGIS 資料本體）<br>`uploads/`（使用者上傳，local storage driver 的 basePath）<br>`web/`（前端 build 產物） | DB 是隨機小 IO 密集型，HDD 的尋道延遲會直接變成 API 的 P95；RAID 10 兼顧 IOPS 與單碟容錯 |
| **HDD RAID 6**（4 槽） | `${HDD_BACKUP_ROOT}` = `/volume1/backup/lightkeepers` | `db/*.dump`（每日 pg_dump＋sha256）<br>`uploads/current`（最新鏡像）<br>`uploads/YYYYMMDD-HHMMSS/`（硬連結快照）<br>`backup.log` | 備份是順序大檔寫入，HDD 的 $/TB 便宜且 RAID 6 可容雙碟故障；**必須與資料不同池**，否則單一磁碟群組故障就同時失去資料與備份 |

`verify-stack.sh` 第 7 項會用 `df` 比對兩個路徑的裝置，若落在同一裝置會**判定失敗**——這是刻意的，寧可部署時擋下來，也不要在災難當下才發現備份形同虛設。

**異地副本**：HDD 池只擋硬體故障，擋不了火災、竊盜、勒索軟體。請另外設定 ADM 的 Backup & Restore 或 rsync 排程，把 `${HDD_BACKUP_ROOT}/db` 的最新 dump 同步一份到 Mac mini 或雲端冷儲存。**這一步不在本 compose 棧內**，需要人為設定。

---

## 3. ADM 上的部署步驟

### 3.1 安裝 Docker

1. ADM 桌面 → **App Central** → 搜尋 **Docker Engine** → 安裝
2. 一併安裝 **Portainer**（選用，圖形化查看容器狀態較方便）
3. **Services** → **Terminal (SSH)** → 啟用 SSH，之後步驟都在 SSH 中操作

```bash
ssh <admin>@<nas-ip>
docker --version
docker compose version    # 需為 v2；若只有 v1 的 docker-compose，請先升級
```

### 3.2 建立儲存池與目錄

1. **Storage Manager** → 建立兩個 Volume：
   - `Volume 2`：4× M.2 NVMe，**RAID 10**
   - `Volume 1`：4× 3.5" HDD，**RAID 6**
2. 建立目錄（路徑須與 `.env` 中的 `NVME_DATA_ROOT` / `HDD_BACKUP_ROOT` 一致）：

```bash
sudo mkdir -p /volume2/docker/lightkeepers/{pgdata,uploads,web}
sudo mkdir -p /volume1/backup/lightkeepers/{db,uploads}

# backend 容器以 node 使用者（uid 1000）執行，需要能寫 uploads
sudo chown -R 1000:1000 /volume2/docker/lightkeepers/uploads
sudo chmod 755 /volume2/docker/lightkeepers/uploads
```

### 3.3 取得程式碼與設定

```bash
cd /volume2/docker
git clone <repo-url> xiwang-disaster-respond
cd xiwang-disaster-respond/infra/nas

cp .env.nas.example .env
chmod 600 .env          # ⚠ 一定要做：這個檔含 DB 密碼、JWT 秘密、Tunnel token
vi .env                 # 逐項填寫，所有 CHANGE_ME 都必須換掉
```

產生秘密的建議方式：

```bash
openssl rand -hex 32        # JWT_SECRET / JWT_OFFLINE_SECRET / ENCRYPTION_KEY
openssl rand -base64 32     # DB_PASSWORD
```

> ⚠ `ENCRYPTION_KEY` 用於欄位級加密。**從雲端搬過來時必須沿用原本的值**，換新值會導致既有密文永久無法解開。

### 3.4 建置前端靜態檔

前端在開發機（或 CI）build 完再送上 NAS——N5105 跑 Vite build 很慢，沒必要在 NAS 上做：

```bash
# 開發機
cd web-dashboard
npm ci
VITE_API_BASE_URL=https://<你的網域>/api/v1 npm run build

# 送到 NAS
rsync -av --delete dist/ <admin>@<nas-ip>:/volume2/docker/lightkeepers/web/
```

### 3.5 建立 Cloudflare Tunnel

1. 登入 [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) → **Networks** → **Tunnels** → **Create a tunnel**
2. 類型選 **Cloudflared**，命名（例：`lightkeepers-nas`）
3. 在 **Install and run a connector** 頁面複製 token（`eyJ...` 開頭的長字串）→ 填入 `.env` 的 `CLOUDFLARE_TUNNEL_TOKEN`
4. 切到 **Public Hostnames** 分頁 → **Add a public hostname**：

   | 欄位 | 值 |
   |---|---|
   | Subdomain / Domain | 你的網域（= `.env` 的 `PUBLIC_DOMAIN`） |
   | Type | `HTTP` |
   | URL | `nginx:8080` |

   > 服務位址填 **`nginx:8080`** 而非 `localhost`——cloudflared 在容器內，`localhost` 指的是它自己。

5. **Additional settings** → 確認 **Disable Chunked Encoding** 保持關閉（LINE webhook 需要）
6. 儲存。DNS 記錄由 Cloudflare 自動建立，**不需要**在路由器開任何 port。

### 3.6 啟動

```bash
cd /volume2/docker/xiwang-disaster-respond/infra/nas

# 先驗證組態（不啟動任何東西）
docker compose -f docker-compose.nas.yml --env-file .env config >/dev/null && echo "組態 OK"

# 建置 image（backend 在 N5105 上約 10–20 分鐘，請耐心等）
docker compose -f docker-compose.nas.yml --env-file .env build

# 啟動
docker compose -f docker-compose.nas.yml --env-file .env up -d

# 觀察
docker compose -f docker-compose.nas.yml --env-file .env ps
docker compose -f docker-compose.nas.yml --env-file .env logs -f backend
```

### 3.7 建立 schema

**首次部署**（全新資料庫）：

```bash
docker compose -f docker-compose.nas.yml --env-file .env exec backend npm run migration:run
```

**從雲端搬遷**：不要跑 migration，直接還原雲端 dump（見 §6），還原後再跑一次 `migration:run` 對齊版本。

> `SYNC_TABLES` 在生產環境被 `resolveSynchronize()` 硬性擋掉（`backend/src/.../database.module.ts`），即使誤設 `true` 也不會生效。schema 一律走 migration。

### 3.8 驗收

```bash
./scripts/verify-stack.sh                              # 內網
./scripts/verify-stack.sh --base-url https://<網域>     # 連 Tunnel 一起驗
```

外部服務的 callback URL 需同步改到新網域：

- **LINE Developers Console** → Messaging API → Webhook URL → `https://<網域>/api/v1/...`（實際路徑見 backend 的 line-bot 路由）
- **LINE Login** → Callback URL
- **Google Cloud Console** → OAuth 2.0 用戶端 → 已授權的重新導向 URI
- **LIFF** → Endpoint URL

---

## 4. 回雲四原則與回雲程序

搬到 NAS 不是單行道。只要下列四項原則全程守住，未來回任何雲（GCP / AWS / 自建 k8s）都只是換 env 與 provider，**業務程式碼一行不動**。

### 四原則

| # | 原則 | 本棧如何落實 | 破壞它的後果 |
|---|---|---|---|
| **1** | **運行單位是 Docker image** | backend 沿用 `backend/Dockerfile`（與部署到 Cloud Run 時完全同一份），前端是純靜態檔 | 一旦在 NAS 上手動裝 Node、直接 `npm start`，環境就長出只有這台機器才有的相依，回雲得重做 |
| **2** | **組態全部走 env** | 所有設定從 `.env` 注入，compose 檔內零硬編碼；`docker-compose.nas.yml` 不含任何秘密 | 把路徑、網域、金鑰寫死在程式或 image 裡，換環境就得改碼＋重 build |
| **3** | **schema 走 migration** | `SYNC_TABLES=false`（且生產環境硬性停用），schema 變更一律經 `backend/migrations/` | 靠 TypeORM 自動同步，兩邊 schema 會悄悄分歧，回雲時無法保證一致 |
| **4** | **storage / LLM 走 provider 抽象** | `STORAGE_PROVIDER=local`↔`gcs` 由 env 切換（`common/storage/storage.module.ts`）；LLM 走 OpenAI-compatible endpoint，改 `LLM_BASE_URL` 即可換供應商 | 直接 `import { Storage } from '@google-cloud/storage'` 或寫死 Gemini SDK，回雲/換雲就要改業務碼 |

> ⚠ **原則 4 目前有已知缺口**：`modules/field-reports/gcs-storage.service.ts`、`modules/line-bot/disaster-report/image-upload.service.ts`、`modules/overlays/cloud-storage.service.ts` 三處**繞過**了抽象層，直接使用 GCS SDK。詳見 §7.2。

### 回雲程序

需要回雲時（例如協會規模成長、或取得新的雲端資源），依序執行：

1. **建立雲端資源**：Cloud SQL（或 RDS）、GCS bucket（或 S3）、容器執行環境
2. **推 image**：`docker build -t <registry>/lightkeepers-backend:<tag> ./backend && docker push ...`
   （image 與 NAS 上跑的是同一份 Dockerfile 產物，這正是原則 1 的價值）
3. **搬資料**：把 §6 的腳本反向操作
   - DB：`pg_dump` NAS → restore 到 Cloud SQL（`migrate-db.sh` 的對帳邏輯可直接沿用）
   - 檔案：`gsutil -m rsync -r ${NVME_DATA_ROOT}/uploads gs://<bucket>`
4. **換 env**：
   ```diff
   - STORAGE_PROVIDER=local          + STORAGE_PROVIDER=gcs
   - LOCAL_STORAGE_PATH=/app/uploads + GCS_BUCKET_NAME=<bucket>
   - DB_HOST=postgres                + DB_HOST=/cloudsql/<project>:<region>:<instance>
   - LLM_BASE_URL=http://<ws>:11434  + （改回 GEMINI_API_KEY，或指向雲端 OpenAI-compatible endpoint）
   ```
   > `database.module.ts` 已內建判斷：`DB_HOST` 以 `/cloudsql/` 開頭時自動切換為 Unix socket 模式。
5. **跑 migration**：`npm run migration:run`
6. **切流量**：DNS 從 Cloudflare Tunnel 改指到雲端 LB，觀察 24 小時後才停 NAS 棧
7. **保留 NAS 棧至少兩週**作為回退路徑，確認無誤再拆

---

## 5. 備份與還原演練

### 5.1 備份機制

`backup` 容器每日 `BACKUP_AT`（預設 03:30）執行一次：

| 步驟 | 動作 | 產出 |
|---|---|---|
| 1 | `pg_dump --format=custom --compress=6` | `${HDD_BACKUP_ROOT}/db/lightkeepers-YYYYMMDD-HHMMSS.dump` + `.sha256` |
| 2 | `rsync -a --delete` uploads | `${HDD_BACKUP_ROOT}/uploads/current/` |
| 3 | `cp -al` 硬連結快照 | `${HDD_BACKUP_ROOT}/uploads/YYYYMMDD-HHMMSS/`（未變動的檔案不佔額外空間） |
| 4 | 清理 | 刪除 mtime 超過 `BACKUP_RETENTION_DAYS`（預設 **14 天**）的 dump 與快照 |
| 5 | 心跳 | 更新 `.heartbeat`；超過 26 小時未更新，容器 healthcheck 會轉為 unhealthy |

設計上的兩個保護：dump 先寫 `.partial` 再改名（中斷不會留下看似完整的半套檔案）；dump 小於 1KB 直接判定失敗（幾乎必然是權限或連錯 DB）。

手動觸發一次：

```bash
docker compose -f docker-compose.nas.yml --env-file .env exec backup /usr/local/bin/backup.sh
```

### 5.2 還原演練（建議每季一次）

演練用 `scripts/restore-drill.sh`，它會**另起一個臨時 postgres 容器**做還原，**完全不碰生產資料庫**，因此可在任何時間安全執行。

```bash
cd infra/nas/scripts

# 1. 先只檢查備份存在與 sha256（幾秒鐘）
./restore-drill.sh --dry-run

# 2. 完整演練（用最新備份）
./restore-drill.sh

# 3. 若要人工進去查資料，加 --keep 保留臨時容器
./restore-drill.sh --keep
docker exec -it lk-restore-drill psql -U <DB_USERNAME> -d <DB_DATABASE>
docker rm -f lk-restore-drill      # 查完記得拆
```

演練會檢查並輸出：

1. 備份檔 sha256 是否通過
2. 能否在乾淨的 PostGIS 容器完整還原
3. 還原後的表數／row count 與線上逐表比對
   （線上比備份多 = 備份後的新增，正常；**還原比線上多 = 曾發生資料遺失，需追查**）
4. uploads 備份檔案數與保留快照數
5. **RTO**：實際還原耗時 —— 請記錄到 `docs/RUNBOOK.md`，這是災難當下唯一可信的時間估計

### 5.3 真的要還原生產資料庫時

⚠ 以下步驟會覆蓋線上資料，執行前務必再確認一次備份檔日期。

```bash
cd infra/nas

# 1. 停掉會寫入的服務（DB 保持運行）
docker compose -f docker-compose.nas.yml --env-file .env stop backend backup

# 2. 先幫「現況」拍一份保險 dump（就算現況是壞的，也可能含還原點之後的重要資料）
docker compose -f docker-compose.nas.yml --env-file .env exec -T postgres \
    pg_dump -U <DB_USERNAME> -Fc <DB_DATABASE> > /volume1/backup/lightkeepers/db/pre-restore-$(date +%Y%m%d-%H%M%S).dump

# 3. 用 migrate-db.sh 的 restore-only 模式還原（含 checksum 驗證與對帳）
./scripts/migrate-db.sh --restore-only \
    --dump-file /volume1/backup/lightkeepers/db/<選定的備份>.dump \
    --allow-nonempty

# 4. uploads 還原
rsync -a --delete /volume1/backup/lightkeepers/uploads/current/ /volume2/docker/lightkeepers/uploads/
chown -R 1000:1000 /volume2/docker/lightkeepers/uploads

# 5. 起服務並驗證
docker compose -f docker-compose.nas.yml --env-file .env start backend backup
./scripts/verify-stack.sh
```

---

## 6. 搬遷腳本（M.3）

全部位於 `infra/nas/scripts/`，共同特性：**冪等**（可安全重跑）、**有 `--dry-run`**、**不含任何憑證**（一律從 env 或 `.env` 讀取）。

| 腳本 | 用途 | 典型用法 |
|---|---|---|
| `migrate-db.sh` | Cloud SQL → NAS PostGIS。盤點來源 row count → `pg_dump` → `pg_restore` → 逐表對帳，任何差異即失敗 | `./migrate-db.sh --dry-run`<br>`./migrate-db.sh --dump-only`（離峰先抓）<br>`./migrate-db.sh`（停機窗口內） |
| `migrate-gcs-files.sh` | GCS bucket → NAS uploads。`gsutil rsync` + 物件數對帳 + MD5 抽驗 | `./migrate-gcs-files.sh --dry-run`<br>`./migrate-gcs-files.sh --sample 50` |
| `verify-stack.sh` | 全棧 smoke：容器健康、`/health*`、前端、`/uploads` 出檔、登入流程、備份心跳、內網 Ollama | `./verify-stack.sh --base-url https://<網域>` |
| `restore-drill.sh` | 備份還原演練（不碰生產 DB） | `./restore-drill.sh` |

### 6.1 建議的搬遷窗口流程

```
D-7   ./migrate-gcs-files.sh              # 檔案先搬一輪（量大，可線上跑）
D-3   ./migrate-db.sh --dump-only         # 抓一份 dump 演練還原，確認流程可行
      ./migrate-db.sh --restore-only ...  # 在測試 DB 上驗證
D-Day 公告停機 →
      Cloud Run 設為不接流量（或直接停）
      ./migrate-db.sh                     # 完整搬遷 + 對帳
      ./migrate-gcs-files.sh              # 追增量檔案（rsync 只搬差異，很快）
      migration:run                       # 對齊 schema 版本
      ./verify-stack.sh                   # 全棧驗收
      DNS / LINE webhook / OAuth callback 切到新網域
      觀察 →  ./verify-stack.sh --base-url https://<網域>
D+14  確認穩定後才關閉雲端資源（保留兩週回退空間）
```

### 6.2 搬遷憑證的處理

- Cloud SQL 建議透過 `cloud-sql-proxy` 連，不要直接開 public IP：
  ```bash
  cloud-sql-proxy --port 5433 <PROJECT>:<REGION>:<INSTANCE>
  # 然後 .env 裡 SRC_DB_HOST=127.0.0.1、SRC_DB_PORT=5433
  ```
- GCS 認證用 `gcloud auth application-default login`，或 `GOOGLE_APPLICATION_CREDENTIALS` 指向金鑰檔（權限 `600`）。**金鑰內容絕不可貼進 `.env`**。
- **搬遷完成後，把 `.env` 中 `SRC_*` 與 `GOOGLE_APPLICATION_CREDENTIALS` 清空**，並撤銷該 service account。

---

## 7. Storage driver：NAS 上的設定與現況

### 7.1 NAS 上的 env 設定值

| env key | NAS 上的值 | 說明 |
|---|---|---|
| `STORAGE_PROVIDER` | `local` | `storage.module.ts` 依此選 provider；未設定時預設就是 `local`，但**請明確寫出**，避免日後誤判 |
| `LOCAL_STORAGE_PATH` | `/app/uploads` | 容器內路徑，對應 host 的 `${NVME_DATA_ROOT}/uploads` |
| `LOCAL_STORAGE_URL` | `https://<網域>/uploads` | 對外可讀的 URL 前綴。**必須指向 nginx 的 `/uploads/` location**——backend 本身沒有靜態檔路由（`main.ts` 無 `useStaticAssets`），若指向 backend 會 404 |
| `UPLOAD_DIR` | `/app/uploads` | `FileStorageService` 走的另一條路徑，一併對齊到同一個目錄 |
| `BASE_URL` | `https://<網域>` | 同上，`FileStorageService` 組 URL 用 |
| `GCS_*` | 全部留空 | local 模式下不會被讀到 |

回雲時只需把 `STORAGE_PROVIDER` 改成 `gcs` 並填 `GCS_BUCKET_NAME`，其餘不動。

nginx 端對應的設定在 `nginx/default.conf` 的 `location /uploads/`，重點有二：

- `alias /usr/share/nginx/uploads/` 對到唯讀掛載的 uploads volume
- `location ~ \.meta\.json$ { deny all; }` —— local provider 會為帶 metadata 的檔案寫出 `<file>.meta.json` sidecar，這個檔案**不該對外**。`verify-stack.sh` 第 5 項會實際驗證這條 deny 規則有生效。

### 7.2 程式碼檢查結果（M.3 驗證）

實際讀過 `backend/src/common/storage/` 全部四個檔案後的結論：

**可用**——LocalStorageProvider 的 10 個介面方法（upload/download/delete/exists/getMetadata/list/getSignedUrl/copy/move）都有完整實作，組態鍵讀取正確，`StorageModule.forRoot()` 已在 `app.module.ts:192` 註冊，`ConfigModule` 為 `isGlobal: true`，env 注入路徑通暢。**env 切換即可運作，不需改碼。**

但有四點需要知道：

1. **抽象層目前無人使用**（重要）
   全 repo 找不到任何 `@Inject(STORAGE_PROVIDER)` 的注入點。實際處理檔案的是這三個服務，它們**直接使用 GCS SDK**，沒有走抽象層：

   | 檔案 | bucket env key |
   |---|---|
   | `modules/field-reports/gcs-storage.service.ts` | `GCS_BUCKET` |
   | `modules/line-bot/disaster-report/image-upload.service.ts` | `GCS_BUCKET_NAME` |
   | `modules/overlays/cloud-storage.service.ts` | `GCS_MAP_PACKAGES_BUCKET` |

   **影響**：把 `STORAGE_PROVIDER` 設成 `local` **不會**讓這三處改用本地磁碟——它們仍會嘗試連 GCS，在雲端資源關閉後會失敗。
   **這是 M.3 尚未收尾的部分**：需要把這三個服務改成注入 `STORAGE_PROVIDER`。屬於會動到業務碼的變更，不在 M.1 的設定檔範圍內，應以獨立工作項處理，並附回歸測試。
   `modules/files/file-storage.service.ts` 則是自己用 `fs` 寫本地磁碟（讀 `UPLOAD_DIR`），在 NAS 上可正常運作，`.env.nas.example` 已把它指到同一個 uploads 目錄。

2. **`getSignedUrl()` 沒有簽章**
   local provider 的實作直接回傳公開 URL（原始碼註解也寫明 `In production, implement JWT-based access tokens`）。因此 uploads 目錄在 NAS 上等同**公開可讀**——這與先前 GCS public object 的行為一致，不算搬遷造成的退步，但若日後要做授權出檔，正確作法是在 nginx 加 `auth_request` 打到 backend 的驗證端點，而不是把 alias 拿掉。

3. **路徑穿越 —— 已修**
   原本的 `getFullPath()` 是 `path.join(this.basePath, filePath)`，對含 `../` 的路徑會逃出 basePath。在 NAS 上 basePath 是真實的 bind mount，逃出去等同對主機任意讀寫。目前因無人注入此 provider 而不可觸發，但接上抽象層的當下就會變成可利用的漏洞，所以**趁現在零呼叫端、零回歸風險時先修**：改為 `path.resolve` 後驗證結果仍在 root 之內，否則丟 `BadRequestException`。
   已補 `local-storage.provider.spec.ts`（24 個案例），涵蓋 `../`、多層 `../`、絕對路徑，以及「兄弟目錄名剛好以 root 為前綴」（`/data/uploads` vs `/data/uploads-evil`）這個 `startsWith` 常見的漏判。

4. **建構子的 `ensureDirectoryExists` 未 await —— 已修**
   目錄建立失敗時只會產生一個未處理的 promise rejection，不會讓啟動失敗，錯誤訊息也不明顯。已補上 `.catch()` 記錄，避免在 NAS 上因掛載點權限問題而靜默失敗——這在 bind mount 打錯路徑時是最容易踩到的坑。

---

## 8. 已知待辦

| 項目 | 說明 | 建議歸屬 |
|---|---|---|
| 三個服務接上 storage 抽象層 | §7.2-1，`STORAGE_PROVIDER=local` 目前對它們無效。**這是搬遷的實質阻斷項**：雲端關掉後這三處會直接失效 | M.3 收尾（獨立工作項，含回歸測試） |
| `getSignedUrl()` 無簽章 | §7.2-2，若要做授權出檔需在 nginx 加 `auth_request` | 視需求，非搬遷阻斷項 |
| LLM provider 接線 | `LLM_BASE_URL` 等 env 已備妥，實際的 OpenAI-compatible provider 尚未實作 | 工作項 M.2 |
| Cloud Logging 替換 | winston 本地檔＋Sentry | 工作項 M.6 |
| cloudbuild → GitHub Actions | build image 推到 NAS 可拉的 registry | 工作項 M.6 |
| 異地備份第二副本 | HDD 池外的一份（Mac mini 或雲端冷儲存），需人為設定 | §2 |

---

## 9. 疑難排解

| 症狀 | 檢查 |
|---|---|
| `backend` 一直 restart | `logs backend`。最常見是 `.env` 有 `CHANGE_ME` 沒換掉，或 `NVME_DATA_ROOT` 目錄不存在 |
| `/api/v1/health/ready` 回 `ready:false` | DB 連不上。確認 `postgres` 為 healthy、`DB_PASSWORD` 兩邊一致（改過密碼但 `pgdata` 是舊的，密碼不會自動更新） |
| 上傳成功但圖片顯示 404 | `LOCAL_STORAGE_URL` 是否指向 nginx 而非 backend；nginx 的 uploads volume 是否掛到同一個 host 目錄 |
| 上傳回 `EACCES` | `chown -R 1000:1000 ${NVME_DATA_ROOT}/uploads` |
| Tunnel 連上但回 502 | Cloudflare 的 Public Hostname 服務位址須為 `nginx:8080`，不是 `localhost:8080` |
| LINE webhook 驗證失敗 | Webhook URL 是否已改到新網域；Cloudflare 的 Disable Chunked Encoding 應保持關閉 |
| 備份容器 unhealthy | `.heartbeat` 超過 26 小時未更新。看 `${HDD_BACKUP_ROOT}/backup.log` |
| 記憶體吃緊 | `docker stats`。16GB 的分配見 compose 檔開頭；AI 推論若不慎跑在 NAS 上會立刻爆掉——確認 `LLM_BASE_URL` 指向工作站 |

常用指令：

```bash
cd /volume2/docker/xiwang-disaster-respond/infra/nas
alias lk='docker compose -f docker-compose.nas.yml --env-file .env'

lk ps                       # 狀態
lk logs -f backend          # 日誌
lk restart backend          # 重啟單一服務
lk exec postgres psql -U <DB_USERNAME> -d <DB_DATABASE>
lk down                     # 停止（資料在 host bind mount，不會遺失）
```
