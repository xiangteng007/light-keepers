# 🚀 Light Keepers 運維手冊 (Runbook)

## 1. 部署流程

### 1.1 後端部署 (Cloud Run)

```bash
# 觸發 CI/CD
git push origin main

# 手動部署
cd backend
gcloud run deploy light-keepers-api \
  --source . \
  --region asia-east1 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10
```

### 1.2 前端部署 (Firebase Hosting)

```bash
cd web-dashboard
npm run build
firebase deploy --only hosting
```

---

## 2. 健康檢查

### 2.1 API 健康

```bash
curl https://api.lightkeepers.app/health
# 預期: {"status":"ok","timestamp":"..."}
```

### 2.2 資料庫連線

```bash
curl https://api.lightkeepers.app/health/db
# 預期: {"database":"connected"}
```

---

## 3. 告警處理

### 3.1 高 CPU 使用率

**症狀**: Cloud Run CPU > 80%

**處理**:
1. 檢查 /metrics 端點
2. 調整 max-instances
3. 檢查是否有 N+1 查詢

### 3.2 資料庫連線池耗盡

**症狀**: 500 錯誤，log 顯示 "too many connections"

**處理**:
1. 檢查 Cloud SQL 連線數
2. 調整 TypeORM pool size
3. 檢查是否有連線未正確釋放

### 3.3 記憶體不足

**症狀**: OOMKilled

**處理**:
1. 調整 Cloud Run memory
2. 檢查記憶體洩漏
3. 減少並發處理數

---

## 4. 回滾程序

### 4.1 快速回滾

```bash
# 列出歷史版本
gcloud run revisions list --service light-keepers-api

# 回滾到指定版本
gcloud run services update-traffic light-keepers-api \
  --to-revisions=light-keepers-api-00001-abc=100
```

### 4.2 資料庫回滾

```bash
# 列出 migration
npm run typeorm migration:show

# 回滾最近一次
npm run typeorm migration:revert
```

---

## 5. 緊急聯絡

| 角色 | 聯絡方式 |
|------|---------|
| On-call SRE | +886-XXX-XXX |
| 技術負責人 | email@example.com |
| GCP Support | console.cloud.google.com |

---

## 6. 常用指令

```bash
# 查看 logs
gcloud logging read "resource.type=cloud_run_revision" --limit 100

# 連接 Cloud SQL
gcloud sql connect lightkeepers-db --user=postgres

# 清除 Redis cache
redis-cli FLUSHDB
```

---

## 7. 資料韌性：雙目標備份與 RPO／RTO（CD-6）

> 適用於 NAS 自主部署（`infra/nas/`）。設定與操作細節見
> [infra/nas/README.md](../infra/nas/README.md) 第 5 節；本節定義**目標值、量測方式與演練節奏**。

### 7.1 雙目標架構

D16 民防韌性決策把「異地第二副本」從建議升級為**必要**。理由很直接：
NAS 的 HDD RAID 6 與 NVMe 在同一台機器、同一個地址。RAID 擋得住硬碟壞，
擋不住失竊、火災、淹水、停電燒毀，更擋不住戰時的物理毀損。
**同址單一副本 = 沒有備份。**

| | 主副本 | 第二副本 A（主推） | 第二副本 B（選配） |
|---|---|---|---|
| 位置 | NAS HDD RAID 6 | 內網 Mac mini（**不同房間／不同電源迴路**） | S3 相容冷儲存 |
| 傳輸 | 本機 `pg_dump` + `rsync` | `rsync over SSH` | `rclone crypt`（離開 NAS 前已加密） |
| 抵禦 | 硬碟故障、誤刪 | 整台 NAS 損毀／失竊 | 整個場址損毀 |
| 成本 | 已有 | 已有硬體，無月費 | 依用量計費 |
| 保留 | 14 天 | `REPLICA_RETENTION_DAYS`（建議 ≥ 30 天） | 同左 |

每日 `BACKUP_AT`（預設 03:30）流程：

```
pg_dump ──► HDD 池 ──► sha256（本機驗）──► 推送 ──► 遠端重算 sha256 回驗
                                              │
                          失敗 ──► .replica-failed（原因+時間）
                                  且不更新 .replica-heartbeat ──► healthcheck unhealthy
```

三個刻意的設計：

1. **推送前先在本機驗 sha256**。把已損毀的檔案推出去會覆蓋遠端「還是好的」那一份，
   一次疏忽同時弄壞兩份副本。
2. **推送後在遠端重算 sha256 比對**。不採信 rsync/rclone 的回傳碼——
   傳輸層說成功不代表磁碟上的位元是對的。
3. **兩條心跳分開**（`.heartbeat` / `.replica-heartbeat`）。
   「沒備份」和「備了但沒送出去」的處置方式完全不同，混在一起看不出差別。

### 7.2 RPO / RTO 目標

**RTO 依「機器還在不在」分成兩種情境（S4.5，2026-08-04 誠實化）。**
單一「RTO ≤ 4h」的寫法隱含「手上有一台可以還原上去的機器」，
而協會依定位 (c) 拍板**不採購冷備機**——所以兩種情境的數字天差地遠，必須分開承諾：

| 指標 | 目標 | 由什麼決定 | 現況機制 |
|---|---|---|---|
| **RPO ≤ 24h** | 最多損失一天資料 | 備份頻率（每日一次） | 每日 03:30 全量 `pg_dump` + uploads 鏡像 |
| **RTO（情境 A：資料壞了，機器還在）≤ 4h** | pgdata 損毀／誤刪／勒索——NAS 硬體可用，從主副本（HDD 池）還原 | 還原耗時 + 決策時間 | `restore-drill.sh` 量測還原段 |
| **RTO（情境 B：機器沒了）＝ 採購前置期 + 4h** | NAS 燒毀／失竊／戰損——**先買到並裝好一台替代機**（實務上數天到一週），再從第二副本還原 | **採購與到貨時間**（主導項）+ 還原耗時 | 第二副本（Mac mini／雲端冷儲存）+ `restore-drill.sh --source=secondary` |

⚠ 情境 B 的「數天到一週」不是失敗，是**接受了「不養冷備機」的取捨後的誠實數字**。
災防面的補位機制是：緊急靜態頁（S5.3，不依賴 NAS）＋ PWA 離線模式（現場裝置
仍可作業）＋ 人工告警管道（§7.7-③）。對外不承諾情境 B 的 4 小時恢復。

**RPO 的實際意義**：03:30 備份、當天 22:00 機房全毀 → 損失 18.5 小時的資料。
這是日備份的固有上限，接受它就要接受這個數字。若某類資料無法承受一天的損失
（例如災時的傷患分流紀錄），正確做法不是把備份改成每小時，而是讓那條資料流
在寫入時就同步到第二個地方——那是另一個工作項，不在 CD-6 範圍。

**RTO 是端到端的，不只是還原指令的時間**。`restore-drill.sh` 輸出的
「DB 還原 RTO」只是其中一段：

| 階段 | 預估 | 壓縮方式 |
|---|---|---|
| 發現故障 | 0–30 min | healthcheck + 心跳告警（已有） |
| 判斷與決策（修 vs 重建） | 15–30 min | 本 runbook 的判斷樹（§7.5） |
| 備援硬體就位 | 0–120 min | **最大變數**：手上有沒有可用機器 |
| 取回備份 | 5–60 min | 主副本 5 min；第二副本視網路／雲端取回速度 |
| DB 還原 | 演練實測值 | `--jobs` 平行還原 |
| uploads 還原 | 演練實測值 | rsync 增量 |
| 服務啟動與驗證 | 15–30 min | `verify-stack.sh` |

**判定原則**：「備援硬體就位」一欄只適用情境 A（機器還在，0 min）。
情境 B 沒有 2 小時內就位的可能——冷備機已拍板不採購，端到端 RTO 以
「採購前置期 + 4h」計。演練紀錄中須如實標註當次演練對應哪個情境。

### 7.3 量測方式與演練紀錄表

每次演練後，把 `restore-drill.sh` 輸出的數字填進下表（**這張表是 RTO 的唯一事實來源**；
沒有實測數字的 RTO 目標只是願望）：

| 日期 | 來源 | 備份檔日期 | DB 還原（秒） | 演練總耗時（秒） | 推估端到端 RTO | 結果 | 執行人 | 備註 |
|---|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | primary / secondary | | | | | 通過 / 失敗 | | |

執行方式：

```bash
cd infra/nas/scripts

# 主副本完整演練（季度基本盤）
./restore-drill.sh

# 第二副本跨目標演練（CD-6 驗收項）——真的把資料從 Mac mini/雲端拉回來還原
./restore-drill.sh --source=secondary

# 第二副本輕量檢查（拉回 + 驗 sha256，不還原；快，適合每月常跑）
./restore-drill.sh --source=secondary --dry-run
```

「推估端到端 RTO」＝ 實測還原時間 ＋ §7.2 表格中各階段的當下估計值。
演練時請一併確認「備援硬體就位」那一格的假設是否還成立。

### 7.4 演練頻率：平時季度 → 戰備期每月

| 期別 | 主副本演練 | 第二副本演練 | 觸發條件 |
|---|---|---|---|
| 平時 | 每季 1 次 | 每季 1 次（可與主副本同日） | 預設 |
| **戰備期** | **每月 1 次** | **每月 1 次（完整還原，非 dry-run）** | 見下方任一條成立 |

**切換到每月的條件**（任一成立即切換，由技術負責人宣告並記錄於演練表備註欄）：

1. 政府發布空襲警報、灰色地帶衝突升溫，或全民防衛動員相關預警
2. 平台被納入實際的災防／民防作業（不再只是演練環境）
3. 前一次演練失敗，或第二副本心跳曾連續 48 小時未更新
4. 備份/還原路徑上有結構性變更（DB 主版本升級、儲存拓撲調整、第二副本目標更換）

**解除條件**：連續 3 次月演練全數通過，且第 1 條的外部情勢已解除，方可回到季度。
解除同樣要記錄在演練表，**不可默默停止**——演練頻率降回去卻沒人知道，
是最典型的「以為有備份」失效模式。

### 7.5 告警與處置

| 症狀 | 意義 | 處置 |
|---|---|---|
| `lk-backup` unhealthy，訊息含「本地備份心跳已過期」 | 連備份都沒跑成功 | 看 `${HDD_BACKUP_ROOT}/backup.log`；檢查 DB 是否可連、HDD 池是否掛載 |
| `lk-backup` unhealthy，訊息含「第二副本心跳已過期」 | 有備份，但**只有同址一份** | `cat ${HDD_BACKUP_ROOT}/.replica-failed` 看原因（Mac mini 關機／金鑰／網路／雲端憑證） |
| `.replica-failed` 存在但容器 healthy | 曾失敗，之後已自動推送成功 | 讀一次確認原因是否會重演，然後可刪除該檔 |
| 演練報「遠端 sha256 不符」 | 第二副本內容已損毀 | **不要覆蓋它**，先保留現場；查傳輸路徑與遠端儲存健康度 |
| 演練報「拉取失敗」 | 災難當下拿不回資料 | 視同 P1：第二副本形同不存在，須當日排除 |

查目前狀態：

```bash
cd infra/nas
docker compose -f docker-compose.nas.yml --env-file .env exec backup /usr/local/bin/healthcheck.sh
cat ${HDD_BACKUP_ROOT}/.replica-failed 2>/dev/null    # 有這個檔就是有事
tail -50 ${HDD_BACKUP_ROOT}/backup.log

# 手動補推一次（例：Mac mini 修好後）
docker compose -f docker-compose.nas.yml --env-file .env exec backup /usr/local/bin/replicate.sh
```

### 7.6 NAS 實體安置建議

備份策略再完整，也擋不住把兩台機器放在同一張桌子上。以下屬**驗收項**，
安裝完成後需拍照存證於演練紀錄：

| 項目 | 要求 | 理由 |
|---|---|---|
| **非臨窗** | 不放在窗邊、外牆邊、玻璃帷幕附近 | 爆震波首先破壞的是窗戶；碎玻璃與衝擊波會直接摧毀機器 |
| 低樓層／非頂樓 | 優先地下室或低樓層內側房間 | 頂樓承受空襲與強風的風險最高 |
| **UPS** | 至少可撐 15 分鐘，且設定自動 graceful shutdown | 斷電當下強制關機最容易寫壞 pgdata；15 分鐘足夠讓 DB 收尾 |
| 離地 | 機器與 UPS 皆離地 ≥ 30 cm | 淹水、消防灑水 |
| 溫控與通風 | 避免密閉櫃；停電時空調也會停 | 停電後機房溫度上升會讓硬碟提早失效 |
| **第二副本異址** | Mac mini 與 NAS **不同房間**，理想上不同建物 | 同一場火、同一次竊盜會一起消失，放旁邊等於白做 |
| 實體門禁 | 機器所在空間可上鎖 | 備份介質失竊即個資外洩（第二副本 B 已加密，A 未加密） |
| 標示 | 機器貼上「災防系統，勿斷電」 | 避免被當成閒置設備關掉或搬走 |

⚠ 第二副本 A（Mac mini）上的資料是**未加密**的。若該處無法上鎖，
應改用方案 B（`rclone crypt`）或在 Mac mini 上啟用 FileVault。

### 7.7 應變 SOP 三條（S4.7 拍板事項，R1/R7/R9 對策）

以下三條是拍板過的**流程約定**，不是技術措施——寫在這裡就是唯一的執行依據，
應變中心開設時由指揮者宣告執行，不需要再請示。

**① 長時間停電 → 切離線模式（R1）**

- UPS 只涵蓋 NAS＋ONU＋路由器＋交換器（GPU 工作站刻意不納入），續航約 30–60 分鐘。
- **停電超過 30 分鐘（或 UPS 電量低於 50%）即宣告切換離線模式**：
  不要讓大家守在螢幕前等網站回來。現場人員改用 PWA 離線模式作業——
  裝置上已有快取資料與 outbox，通報與紀錄照常進行，復電後自動同步。
- NAS 設定為 UPS 剩 20% 時自動 graceful shutdown（保 pgdata，不保服務）。
- 復電後：NAS 開機 → `verify-stack.sh` 綠 → 宣告恢復線上模式。

**② 應變期間暫停 GPU 訓練工作（R7）**

- 協會開設應變中心期間，工作站上的**訓練類工作（投資模型、DRONES 等）一律暫停**，
  VRAM 讓給 Ollama 推論——災情分類尖峰正是最需要本地推論吞吐的時刻。
- 這是與 ST／DRONES 專案的使用約定：宣告應變即生效，毋須逐次協調。
- 若工作站仍不可用（停電/故障），`LLM_PROVIDER=hybrid` 會自動降級走 Gemini；
  降級屬預期行為，但要在 `/health/llm` 上確認，避免整段應變期都在隱形計費。

**③ NAS 不可用時的人工告警替代管道（R9）**

- NAS 掛掉時平台發不出告警，而那往往正是要發告警的時刻。**替代管道不依賴 NAS**：
  1. **幹部 LINE 群組**（人工手打；LINE 官方服務不受 NAS 影響）
  2. **電話樹**：指揮 → 各組長 → 組員，名單紙本一份放應變中心、一份隨值班手機
- 觸發條件：外部 uptime 監測（S6.1）告警，或任何人發現平台 15 分鐘以上不可達。
- 發動人：值班幹部即可發動，**不需等技術人員確認原因**——先通知、後排障。

---

## 8. 相關文件

| 文件 | 內容 |
|---|---|
| [infra/nas/README.md](../infra/nas/README.md) | NAS 部署、備份機制、還原程序、疑難排解 |
| [infra/nas/.env.nas.example](../infra/nas/.env.nas.example) | 所有組態項（§7.1 為第二副本設定） |
| [docs/SLO_SLA.md](SLO_SLA.md) | 服務等級目標 |
| [docs/THREAT_MODEL.md](THREAT_MODEL.md) | 威脅模型 |
| [docs/FULL_SYSTEM_REDESIGN_PLAN.md](FULL_SYSTEM_REDESIGN_PLAN.md) | CD-6 工作項定義與驗收條件 |
