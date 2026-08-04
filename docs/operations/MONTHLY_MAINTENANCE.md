# 每月維護日 SOP — S6.7

> **建立**：2026-08-04（工作項 S6.7）
> **節奏**：每月**第一個週末**固定執行，全程約 1–2 小時，可由 agent 陪跑。
> **為什麼存在**：雲上 Google 幫你 patch，NAS 上沒有人幫。沒有這個節奏，
> 一年後這台 NAS 就是一台沒人敢動的黑盒子。
> **前置**：動 NAS 前先讀 `ST/docs/NAS_OPERATIONS.md`（共存約束）；
> 維護動作只碰 LK 自己的容器，**不碰 st-\*/xxt-agent**。

每次執行把結果記到 §8 的紀錄表。**跳過一次要寫原因**——默默跳過是這類 SOP
失效的第一步。

---

## 1. 開始前（10 分鐘）

- [ ] 確認昨夜備份成功：`lk exec backup /usr/local/bin/healthcheck.sh` 兩條心跳皆綠
- [ ] `lk ps` 全部 healthy；`docker stats --no-stream` 記下當前 RAM 水位
- [ ] 對外可達：打開 `https://<PUBLIC_DOMAIN>` 與 `/api/v1/health/ready`
- ⚠ 任一項不綠 → **先修再維護**；帶病更新出問題時分不清是誰造成的

## 2. ADM 與韌體

- [ ] ADM 桌面 → Settings → Update：有無 ADM 更新（讀 release note，重大版本先查
      ST 專案是否已驗證過）
- [ ] App Central：Docker Engine 是否有更新
- [ ] 若更新需重開機：先 `lk down`（graceful），重開後 `lk up -d` → `verify-stack.sh`

## 3. 容器映像更新

- [ ] 基底服務逐一檢查新版：postgres（**只跟 minor/patch**，major 升級另立工作項）、
      nginx、cloudflared
- [ ] 更新方式：改 compose 的 image tag → `lk pull` → `lk up -d <服務>` → 觀察 5 分鐘
- [ ] backend image：有新版（CI 或本機 build）才更新；記下更新前的 image ID 以便回滾
- [ ] 更新後 `docker image prune -f` 清舊層（確認回滾用的前一版 tag 還在，勿 `-a`）

## 4. 依賴與 CVE

```bash
cd backend && npm audit --omit=dev        # 生產依賴
cd ../web-dashboard && npm audit --omit=dev
```

- [ ] critical/high：當場升級或記入待辦（含 CVE 編號與影響評估）
- [ ] moderate 以下：累積到季度一次處理
- [ ] `docker scout cves lightkeepers/backend:local` 或等效工具掃 image（若可用）

## 5. 磁碟與資源

- [ ] Storage Manager：兩個池的健康度（SMART）與剩餘容量——
      NVMe 熱池（/volume2）低於 20% 或 HDD 冷池（/volume1）低於 30% 即列警訊
- [ ] `du -sh ${HDD_BACKUP_ROOT}/*` 備份佔用趨勢是否符合保留天數預期
- [ ] `docker system df`；日誌是否受 10m×5 輪替控制（compose 已設）
- [ ] `docker stats --no-stream` 與 §1 記錄比對：RAM 水位有無異常爬升

## 6. 備份與演練排程檢查

- [ ] `tail -50 ${HDD_BACKUP_ROOT}/backup.log`：本月有無失敗紀錄
- [ ] `.replica-failed` 不存在（存在→查原因，見 RUNBOOK §7.5）
- [ ] 對照 `RUNBOOK.md` §7.4：本季/本月演練是否已排、上次演練距今多久
- [ ] 戰備期切換條件（RUNBOOK §7.4）有無任一成立——有就把演練頻率切每月

## 7. 收尾

- [ ] `verify-stack.sh` 全綠
- [ ] 功能抽測：登入一次、發一則測試通報、開一次地圖
- [ ] 異常與待辦記入 §8；需要派工的開任務（標 O/N/F 層級）
- [ ] 記錄本次總耗時（連續三個月超過 2 小時＝流程要檢討瘦身）

## 8. 執行紀錄

| 日期 | 執行者 | ADM/映像更新 | CVE 處置 | 磁碟水位 | 異常/待辦 | 耗時 |
|---|---|---|---|---|---|---|
| | | | | | | |
