# Light Keepers 重新開站執行計畫（三層模型分工版）

> **日期**: 2026-08-04。**前提已全數關閉**：D20 資料不可取回＝重新開站／D24 網域 NS 已切 Cloudflare（傳播中）／D12 NAS＝ST 現役 AS5404T（池已建）／D21 GPU＝RTX 4080S 16GB／R5 前端戰術化已完整交付（318 tests、axe 零違規）。
> **分工原則**（沿用專案慣例，模型名更新為第 5 代）：
> - **FABLE 5**＝全新設計、最高風險取捨、品味決策（設計語言級的工作）
> - **OPUS 5**＝正確性關鍵實作（schema/資安/基礎設施/資料完整性）
> - **SONNET 5**＝機械性批次、文件回寫、規格明確的接線
> 每項均可獨立 worktree 開工；驗收一律 tsc＋vitest（前端）／jest（後端）全綠＋各項專屬驗收。

---

## Phase A — 開站硬前置（先做，互相可平行）

| # | 工作 | 模型 | 驗收 | 備註 |
|---|---|---|---|---|
| A1 | **Baseline migration**：以現有 entity 為準產生 1.2 基準 migration（~120 表），收斂兩個 migration 目錄為一（`src/migrations`）、併入 5 支未跑 migration、修損壞 migration；空庫 `migration:run` 一次建齊＝與 `SYNC_TABLES=true` 產物 diff 為零 | **OPUS 5** | 空 PostGIS 容器 run→schema diff 零；後端 3,499 tests 綠 | 全案最後技術硬前置；無停機窗口約束 |
| A2 | S2.1：`infra/nas/docker-compose.nas.yml`＋`.env.nas.example` 補 `LLM_PROVIDER=hybrid`、`LLM_MODEL=qwen2.5:7b-instruct` | **SONNET 5** | 兩檔 diff＋compose config 通過 | 不做則 LLM 100% 打 Gemini |
| A3 | S2.4：manuals／pfa-chatbot／voice(SITREP) 三處純文字 Gemini 直呼改注入 `LlmProviderService`（pfa 順修直讀 process.env） | **SONNET 5** | 三檔改線；既有 LLM 對測綠 | 規格明確的接線 |
| A4 | NAS 共存適配：LK compose 依 A4 共存約束改版——目錄 `/volume2/docker/lightkeepers`＋`/volume1/backup/lightkeepers`、RAM 預算改為「部署時實測制」（postgres 2–4g 可調參數化）、host port 全量對帳表、比照 ST 建 `/volume1/Docker/LK/` 部署副本＋守門腳本 | **OPUS 5** | compose config 綠；port/RAM 對帳表入 README | 動 NAS 前讀 `ST/docs/NAS_OPERATIONS.md` |

## Phase B — 上線（依賴 A；B1→B2→B3 序列）

| # | 工作 | 模型 | 驗收 |
|---|---|---|---|
| B1 | NAS 實際部署：build/送 image、起棧、`migration:run`（A1 產物）、`verify-stack.sh` 內網全綠 | **OPUS 5** 主導＋owner 陪跑 | verify-stack 8 項綠 |
| B2 | Cloudflare 對外層（zone Active 後）：Tunnel（Public Hostname→nginx:8080）、`/public/*` 邊緣快取＋Always Online、Tailscale 管理面 | **OPUS 5** | `verify-stack.sh --base-url https://lightkeepers.ngo` 綠 |
| B3 | 外部平台 callback 重登記（LINE Messaging/Login、LIFF、Google OAuth）＋端到端實測一則 LINE 通報 | **owner 操作＋OPUS 5 陪驗** | webhook 實測收到 |
| B4 | **緊急靜態頁**（CF Pages，不依賴 NAS）：B3c 語言的單頁（系統狀態＋119/1991 指引） | **FABLE 5** 設計＋SONNET 5 部署 | Pages URL 上線 |

## Phase C — 韌性與觀測（可與 B 平行）

| # | 工作 | 模型 | 驗收 |
|---|---|---|---|
| C1 | S6.1/S6.2 告警鏈：UptimeRobot 外部監控＋備份/副本/LLM 降級三訊號經 LINE Bot 推 owner | **OPUS 5**（owner 開 UptimeRobot 帳號） | 拔線演練收到通知 |
| C2 | S6.4 NAS 回滾機制（image SHA tag＋保留前版＋SOP）＋S6.3 winston 輪替+Sentry | **OPUS 5** | 回滾演練一次成功 |
| C3 | S4.3/S4.4 備份第二副本實際設定（rclone crypt→雲端冷儲存）＋跨目標還原演練，RTO 實測入 RUNBOOK | **OPUS 5**（owner 開 B2/R2 帳號） | `restore-drill.sh --source=secondary` 綠 |
| C4 | 文件批：RUNBOOK RTO 雙情境改寫、S4.7 SOP 三條（停電切離線/應變期停訓練/人工告警）、S6.6 秘密清單、S6.7 每月維護日 SOP、S7.1 開站公告草稿 | **SONNET 5** | owner 核可 |
| C5 | S6.5 pgdata 加密評估（ADM volume 加密效能量測→回寫 D34） | **OPUS 5** | 量測數據＋建議 |

## Phase D — 產品完備（開站後，優先序由 owner 調）

| # | 工作 | 模型 | 備註 |
|---|---|---|---|
| D1 | **TV 牆模式**（R5/T2 遺留）：`/command-center?wall=1` 唯讀 3 秒法則大屏 | **FABLE 5** | 設計主導 |
| D2 | i18n 落地（D11）：①字串抽取基建＋語言切換 UX ②137 頁批次抽字串 | ①**OPUS 5** ②**SONNET 5** | R5 已建字串紀律，收割 |
| D3 | NCDR 災型接 pictogram registry（map-constants legacy）＋MapSidebar 殘餘 17 處 emoji（下拉改自訂元件） | **SONNET 5** | 圖標債最後清償 |
| D4 | SidebarSettings 4 顆 chrome icon 已補畫完的殘餘接線覆檢＋lucide 67 檔殘值定期重評 | **SONNET 5** | 低優先 |
| D5 | **MCI 傷票實作 M1–M8**（C2.1 設計已完成） | **OPUS 5** 實作＋**FABLE 5** 傷票 UI 深化 | ⛔ 前置：6 個 D-MCI 決策待 owner |
| D6 | 離線 PWA 演練體系：L2 基地台模式演練腳本＋離線可用頁清單＋OfflinePrepPage 準備度檢查 | **OPUS 5**＋owner 演練 | §3.9 流程面 |

## ⛔ 等 owner 的決策/動作（不阻塞 A–C 開工）

1. UPS＋4G/5G 備援路由器採購（唯一實體採購項）
2. D-MCI 六決策（解鎖 D5）
3. D2 路由圈選（`ROUTE_IA_RECONCILIATION.md`，解鎖路由收斂）
4. 開站公告發布＋志工 PWA 重裝動員（C4 產草稿後）
5. 憑證輪換＋git 歷史清理確認（R13 鎖鏈：解鎖 push origin 與 CI 部署路徑）

## 建議開工順序

**今天就能發**：A1（Opus）＋A2/A3（Sonnet）＋A4（Opus）四路平行 → A 全綠後 B1；B2 等 zone Active（傳播中，1–48h）；C 全程可插隊平行；B4/D1 給 Fable 排在 B 之後。
