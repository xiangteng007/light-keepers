# 依執行語言模型分層的任務總綱（MODEL TASK ASSIGNMENTS）

> **日期**: 2026-08-04。整併 `FULL_SYSTEM_REDESIGN_PLAN.md`（P 線）與 `SELF_HOSTED_MIGRATION_PLAN.md`（S 線）＋`EXECUTION_PLAN_RELAUNCH.md`。
> **用途**: owner 開新 session 時，按模型挑「該層且 READY」的任務直接派工。
> ⚠ 分層準則以**本文件為準**（EXECUTION_PLAN_RELAUNCH 中 FABLE=設計主導為舊定位，自本文件起 FABLE-5 改任最簡單層；設計類工作歸 OPUS-5）。
> **v1.1（2026-08-04 補列）**: 首版遺漏的工作項全數入表——P·1.6 guard 收斂、P·5 全部（audit P0 功能/分頁 DTO/N+1）、P·6 全部（Resources 分析/API 版本 ADR/soft-delete 收尾）、民防 C2.2/C2.3/C3.1/C3.2、S1.6（field-reports 附件直傳落地端點）、S5.8（L2 離線演練體系）。兩份來源計畫的工作項至此無遺漏。

## 1. 總綱：兩條主線的關係

**P 線（P1–P6 全系統優化）**：程式碼與產品品質——schema 治理、授權、路由收斂、i18n、MCI。**S 線（S0–S7 自主化）**：把平台搬上自有 NAS＋本地 Ollama，零雲端費用。先後關係：P 線的 **1.2 baseline migration 是 S 線開站的唯一硬前置**（D20 資料不可取回→重新開站，空庫全靠 migration 建 schema）；其餘兩線大部分可平行。D12/D20/D21/D24/D26/D27 已全數定案，S 線已無決策阻塞，只剩 owner 實體動作（採購/主機操作/平台後台）。

## 2. 三層分類準則

- 🔴 **OPUS-5**：架構、schema/DB、baseline migration、資料搬遷/還原、權限與資安正確性、AI hybrid/韌性設計、複雜重構、需取捨判斷（含設計類）。
- 🟡 **SONNET-5**：機械但非瑣碎——路由收斂、批次頁遷移/換皮、殘留直呼 Gemini 改抽象層、跨服務設定、寫測試、DTO 批次。
- 🟢 **FABLE-5**：最簡單——一行設定修正、文件、清單、find-replace、死碼移除、清理。

## 3. 逐任務分類表

### 已完成（不需再派工）

| 任務群 | 期別 | 狀態 |
|---|---|---|
| Phase E 緊急止血（JWT/憑證出 git/死模組/LINE webhook/CI 閘門/漏洞歸零） | P·E | 已完成 |
| Phase 0/1 大部（devModeUser、SYNC_TABLES 硬禁、entity 收斂、55 controller 定級） | P·0-1 | 已完成 |
| Phase 2 大部（四方對帳、token 收斂、死依賴、WidgetContent 拆分、20 頁換皮） | P·2 | 已完成 |
| Phase 3 全部（API client 收斂、mock 換真、離線層收斂、DTO、遮罩/IDOR） | P·3 | 已完成 |
| Phase 4 可派項（單租戶降級、35 stub 刪、Logger、限流修復）＋P0 補強 | P·4 | 已完成 |
| Phase M 前置（M.0–M.3b：NAS compose/LLM provider/storage 抽象/搬遷腳本） | S·M | 已完成 |
| Phase C1 民防（災型擴充/防空處所/雙備份）＋C2.1 MCI 設計 | P·C1 | 已完成 |
| Phase R＋R5 全部（B3c 戰術化：token/排印/旗艦頁/圖文系統 84 icon/axe 零違規/48 基準） | P·R | 已完成 |
| 孤兒 79 檔刪除、App.css 考古一階（−1,658 行）、emoji 債 115 檔、T6 收官 | P·R5 | 已完成 |
| S0 決策全關（D20/D21/D24 查證）＋A3/A4 定案入檔 | S·0 | 已完成 |

### 🔴 OPUS-5（架構/正確性/取捨）

| # | 任務 | 期別 | 理由 | 狀態 |
|---|---|---|---|---|
| O1 | **Baseline migration**：entity→基準 migration（~120 表）、雙 migration 目錄收斂、併 5 支未跑、空庫 run＝synchronize diff 零 | P·1.2＝S·A1 | schema 正確性即全案地基 | ✅ **已完成**（2026-08-04，branch `opus/migration-core`：122 表 Baseline＋11 支歸檔＋黃金標準驗證「No changes」；順修 org-node 重複 @Index） |
| O2 | NAS 共存適配：compose 目錄/RAM 參數化、port 對帳、`/volume1/Docker/LK/` 守門部署腳本 | S·A4 | 與 ST 棧共存的取捨 | ✅ **已完成**（2026-08-04，branch `opus/migration-core`：LK_PG_MEM/LK_BACKEND_MEM 實測制＋deploy-lk.sh＋README §10 port/RAM 對帳） |
| O3 | NAS 起棧＋migration:run＋verify-stack 內網綠（B1） | S·B1 | 部署正確性 | **READY**（O1 已完成解鎖；需 owner 陪跑 NAS 端操作） |
| O4 | Cloudflare Tunnel＋Tailscale 管理面接通（B2） | S·B2 | 對外入口資安 | BLOCKED-on-zone-active（NS 傳播中） |
| O5 | S2.5 AI 全面非阻斷＋fallback 演練＋hybrid 降級可觀測（R11） | S·2.5 | 韌性設計 | **READY** |
| O6 | S5.4 通知降級鏈：Web Push(VAPID) 接回＋Email 空殼補實 | S·5.4 | 多通道告警正確性 | **READY** |
| O7 | S6.1/S6.2 告警鏈：外部 uptime＋備份/副本/LLM 三訊號推 owner | S·6 | 觀測悖論解法 | **READY**（owner 開 UptimeRobot 帳號可後補） |
| O8 | S6.4 NAS 回滾機制（SHA tag/保留前版/SOP） | S·6.4 | 部署安全網 | **READY** |
| O9 | S6.8 N5105 效能實測＋P5 PostGIS 索引 | S·6.8＋P·5 | 量測與 DB 調優 | BLOCKED-on-O3 |
| O10 | S6.5 pgdata 加密評估→回寫 D34 | S·6.5 | 個資 vs 效能取捨 | BLOCKED-on-O3 |
| O11 | S4.3/S4.4 第二副本 rclone crypt 設定＋跨目標還原演練＋RTO 實測 | S·4 | 資料保全 | BLOCKED-on-O3（棧須先在） |
| O12 | 未註冊模組×3 註冊＋`reports` controller 前綴衝突解 | P·4 遺留 | 模組圖手術 | **READY** |
| O13 | 4.3 核心模組記憶體 Map 狀態遷 DB/Redis | P·4.3 | 資料一致性 | **READY** |
| O14 | i18n 基建：抽取框架＋語言切換＋zh-TW/en 骨架（D11 已拍板） | P·4.4a | 架構決策多 | **READY** |
| O15 | S5.2 CI build image→NAS 拉取部署路徑 | S·5.2 | 供應鏈正確性 | BLOCKED-on-R13（憑證輪換→清史→push） |
| O16 | MCI 傷票 M1–M8 實作（含傷票 UI 深化） | P·C2 | 臨床正確性+設計 | BLOCKED-on-D-MCI×6 |
| O17 | C2.4 LoRa/mesh spike 評估報告（D17 前置） | P·CD | 硬體取捨研究 | **READY** |
| O18 | TV 牆模式（?wall=1 唯讀 3 秒法則大屏） | P·R 遺留 | 新介面設計 | **READY** |
| O19 | C-3 auth 38 端點公開介面清單提案（產出給 owner 核） | P·P0 補強遺留 | 資安面判斷 | **READY** |
| O20 | S7.4 LINE webhook 切換實測＋一則端到端通報 | S·7.4 | 對外正確性驗證 | BLOCKED-on-O4＋owner(B3) |
| O21 | S1.6 field-reports 附件直傳落地端點：local storage `action:'write'` 簽章 URL 補驗簽＋落檔 backend 端點 | S·1.6 | 災防關鍵功能正確性 | ✅ **已完成**（2026-08-04，branch `opus/migration-core`：PUT /api/v1/uploads/* capability URL＋write URL 改指落地端點＋無密鑰拒發＋9 案 spec；NAS 實測段仍併 O3） |
| O22 | 1.6 guard 新舊三版收斂為一套收尾（進度表標「執行中」） | P·1.6 | 授權正確性 | **READY** |
| O23 | 5.1 audit P0 功能缺口（SITREP/IAP/志工篩選/去重/SLA/簽到簽退，XC-4） | P·5.1 | 新 entity 群＋核心流程 | BLOCKED-on-O1（新表落在 baseline 之後） |
| O24 | 5.3 分頁 `PaginatedResponse` DTO 定型＋5.4 N+1 熱點修復 | P·5.3/5.4 | API 形狀取捨（前後端成對） | DTO 定型 **READY**；N+1 量測段 BLOCKED-on-O3（配 S6.8） |
| O25 | 6.1 Resources/unified-resources 使用率分析報告＋6.2 API 版本策略 ADR | P·6.1/6.2 | 純分析與架構決策 | **READY** |
| O26 | 6.3 soft-delete 收尾：DispatchTask/MissionSession 轉換、includeDeleted RBAC、restore endpoint | P·6.3 | 欄位 migration＋權限 | BLOCKED-on-O1 |
| O27 | C2.3 四級通訊降級（L0–L3）SOP 定稿 | P·C2.3 | 韌性 SOP 取捨 | **READY**（L3 匯出實作在 N21） |
| O28 | C3.1 CAP 協定收發＋EDXL round-trip 沙盒（技術面先行） | P·C3.1 | 標準介接正確性 | **READY**（正式介接等 D19 洽談，不卡技術面） |
| O29 | S5.8/D6 離線演練體系：L2 基地台演練腳本＋離線可用頁清單＋`OfflinePrepPage` 準備度檢查 | S·5.8 | 韌性流程設計 | 腳本/清單/UI **READY**；實地演練 BLOCKED-on-B 上線＋owner |

### 🟡 SONNET-5（機械但非瑣碎）

| # | 任務 | 期別 | 理由 | 狀態 |
|---|---|---|---|---|
| N1 | S2.4 三處純文字 Gemini 直呼改 `LlmProviderService`（manuals/pfa/voice-SITREP，pfa 順修 process.env） | S·2.4 | 規格明確接線 | **READY** |
| N2 | 2.2 路由收斂＋redirect 落地 | P·2.2 | 批次路由手術 | BLOCKED-on-D2（owner 圈選） |
| N3 | 雙前綴 controller×23 修正＋前端呼叫點同步 | P·4 遺留 | 批次修正 | **READY** |
| N4 | C-6 行內型別 106 處分批補 DTO（棘輪基準 111→0） | P·P0 補強 | DTO 批次 | **READY** |
| N5 | C-5 前端 2FA verify 少送 secret 修復＋測試 | P·P0 補強 | 小接線+測試 | **READY** |
| N6 | i18n 批次：137 頁抽字串套框架 | P·4.4b | 大批次機械 | BLOCKED-on-O14 |
| N7 | XC proof 重產：改讀 NestJS 實際路由表＋重跑報告 | P·XC | 腳本改造 | **READY** |
| N8 | NCDR 災型接 pictogram registry＋MapSidebar 下拉改自訂元件（殘餘 emoji 17+23） | P·R5 尾 | 元件化收尾 | **READY** |
| N9 | lucide 殘值 67 檔重評：可補畫語彙清單→補畫→換裝 | P·R5 尾 | 批次換裝 | **READY**（低優先） |
| N10 | App.css 二階考古（餘 1,634 行有主規則逐步遷出）＋components/ui 前朝庫刪除（Skeleton/Textarea/ConfirmModal 補齊後） | P·R5 尾 | 漸進清理 | **READY**（低優先） |
| N11 | S3.4 Tailscale 先行設定（NAS 端 daemon＋ACL） | S·3.4 | 跨服務設定 | **READY** |
| N12 | S5.1 邊緣快取規則＋Always Online 設定 | S·5.1 | 平台設定 | BLOCKED-on-zone-active |
| N13 | S5.3 緊急靜態頁（B3c 規格已定）製作＋CF Pages 部署 | S·5.3 | 規格明確單頁 | 製作 **READY**／部署 BLOCKED-on-zone |
| N14 | S5.6 公眾端點限流收緊＋測試 | S·5.6 | 設定+測試 | **READY** |
| N15 | S5.7 收尾：`DirectionsPanel` 深連結原生地圖＋全站移除 `@react-google-maps/api` 依賴 | S·5.7 | 依賴出清 | **READY** |
| N16 | S6.3 winston 檔案輪替進 compose＋Sentry 免費額度接線 | S·6.3 | 跨服務設定 | **READY** |
| N17 | S2.3 llm-benchmark 以真實通報資料複測 7b | S·2.3 | 跑腳本+報告 | BLOCKED-on-owner（工作站 Ollama） |
| N18 | 5.2 audit P0 功能的前端頁面接線 | P·5.2 | 依 spec 接線 | BLOCKED-on-O23 |
| N19 | 5.3 list 端點分頁批次改造（依 O24 定型 DTO，前後端成對 PR） | P·5.3 | 批次改造 | BLOCKED-on-O24 |
| N20 | C2.2 分流站/後送追蹤/醫院容量看板 UI（依 C2.1 spec） | P·C2.2 | 依 spec 批次 UI | BLOCKED-on-O16 |
| N21 | C2.3 L3 紙本包一鍵匯出 PDF 實作（依 O27 SOP） | P·C2.3 | 匯出實作 | BLOCKED-on-O27 |
| N22 | C3.2 政府介接技術文件包（供 owner 洽談用） | P·C3.2 | 規格明確文件包 | **READY** |

### 🟢 FABLE-5（最簡單：一行修正/文件/清單/死碼）

| # | 任務 | 期別 | 理由 | 狀態 |
|---|---|---|---|---|
| F1 | S2.1：compose＋`.env.nas.example` 補 `LLM_PROVIDER=hybrid`、`LLM_MODEL=qwen2.5:7b-instruct` | S·2.1 | 兩檔各一兩行 | ✅ **已完成**（2026-08-04；compose config 通過） |
| F2 | `infra/nas/README.md` §8 過期項修（「LLM provider 尚未實作」已過期）＋儲存池段改「已建好」＋目錄/port 對照 A4 定案 | S·1.5 | 文件同步 | ✅ **已完成**（2026-08-04；含 RTX 4080S/ADM 5.1.3 同步；全量 port/RAM 對帳表仍歸 O2） |
| F3 | S4.5 RUNBOOK RTO 改寫：雙情境（資料壞 ≤4h／機器沒了=採購期+4h） | S·4.5 | 文件誠實化 | ✅ **已完成**（2026-08-04；RUNBOOK §7.2） |
| F4 | S4.7 SOP 三條寫入 RUNBOOK：停電切離線／應變期停 GPU 訓練／NAS 掛時人工告警管道 | S·4.7 | 文件 | ✅ **已完成**（2026-08-04；RUNBOOK §7.7；內容待 owner 確認） |
| F5 | S6.6 秘密清單與輪換程序文件（含 ENCRYPTION_KEY/rclone 密碼「換錯即永久不可解」警語） | S·6.6 | 清單文件 | ✅ **已完成**（2026-08-04；`docs/security/SECRETS_INVENTORY.md`） |
| F6 | S6.7 每月維護日 SOP（ADM/映像/CVE/磁碟/演練 checklist） | S·6.7 | 清單文件 | ✅ **已完成**（2026-08-04；`docs/operations/MONTHLY_MAINTENANCE.md`；節奏待 owner 確認） |
| F7 | S7.1 開站公告草稿＋S7.3 PWA 重裝教學一頁 | S·7 | 文件草擬 | ✅ **已完成**（2026-08-04；`RELAUNCH_ANNOUNCEMENT_DRAFT.md`＋`PWA_REINSTALL_GUIDE.md`；發布/動員待 owner） |
| F8 | S5.9：`vercel.json` 撤 preview 部署＋`cloudbuild.yaml`/`DEPLOY.md` 標 deprecated＋`deploy.yml`/`deploy-staging.yml` 停用註記（Vercel 帳號保留管網域） | S·5.9 | 設定/標註 | ✅ **已完成**（2026-08-04；workflow 僅留 workflow_dispatch） |
| F9 | S5.5 後端 legacy FCM 死路徑刪除（`notification-queue.sendPush` 的 `fcm.googleapis.com/fcm/send` 段；Google 已停用該 API） | S·5.5 | 死碼移除 | ✅ **已完成**（2026-08-04；`FCM_SERVER_KEY` 一併出 compose/env；spec 10/10 綠） |
| F10 | ReportSchedulePage 404 修：前端呼叫 `/report-schedules`→`reports/scheduler` 對齊 | P·4 遺留 | find-replace 級 | ✅ **已完成**（2026-08-04；含動詞對齊與後端 `history` 路由順序修正；**殘留**：後端 enabled/cron vs 前端 isActive/frequency 的 DTO 形狀對齊，屬 SONNET 級另列） |
| F11 | 死檔 service×3 刪（orgChartApi/shiftCalendarApi/payrollApi） | P·4 遺留 | 死碼移除 | ✅ **已完成**（2026-08-04；tsc 綠） |
| F12 | `Layout.test.tsx` 殘留 lucide passthrough mock 移除＋scratchpad 級殘留清點 | P·R5 尾 | 清理 | ✅ **已完成**（2026-08-04；lucide mock 經查已於 3681268 移除無殘留；Playwright 產物 `playwright-report/`/`test-results/` 出版控＋入 .gitignore） |
| F13 | 上位計畫執行進度表回寫（R5 收官/D 決策狀態/S 線進度同步三份 doc 一致） | 文件 | 對帳回寫 | ✅ **已完成**（2026-08-04；三份 doc 已對帳：REDESIGN 進度表/RELAUNCH A2·C4/MIGRATION S 表 10 項標記） |

### ✋ OWNER（無法代勞）

UPS＋4G/5G 路由器採購｜工作站 Ollama 架設（S2.2）｜LINE/LIFF/Google callback 重登記（B3）｜UptimeRobot/B2 或 R2 帳號開通｜D-MCI 六決策｜D2 路由圈選｜C-1 財務端點 L3 實務覆核｜憑證輪換＋git 歷史清理確認（R13）｜開站公告發布＋PWA 動員

## 4. 使用守則

1. 開 session＝從對應層挑一個 **READY** 任務，指明任務編號（如「做 O1」）。
2. 🔴 **同一 repo 一次只跑一個 session**；要平行必須切互不重疊的檔案區（先聲明各自檔案集），避免 HEAD 互踩——T6 曾因 A/B 平行編修留下 2 個殘錯，教訓在案。
3. 完成即 commit local main（**不 push**——R13 鎖鏈未解），並回寫本表狀態。
4. BLOCKED 項不要硬做；解鎖事件發生後先更新本表再派工。

## 5. 決策解鎖對照

| 決策 | 狀態 | 解鎖的任務 |
|---|---|---|
| D20（GCP 資料） | ✅ 已定案（不可取回→重開站） | O1 解除窗口約束、O3 走空庫 migration、S7.2 消滅、搬遷腳本退役 |
| D24（網域） | ✅ 已定案（Vercel 註冊、NS→Cloudflare 傳播中） | zone Active 後：O4、N12、N13 部署——**這是目前唯一的「等待事件」** |
| D26（定位=內部為主公眾唯讀） | ✅ 已拍板 | S5 範圍定型（N12/N13/N14）；冷備機不採購 |
| D27（LLM=hybrid） | ✅ 已拍板 | F1 直接照值落地、O5 的降級鏈成立 |
| 尚未解的 | D-MCI×6→O16（連鎖 N20）｜D2→N2｜R13→O15｜D19（政府介接洽談）→C3 正式介接（O28/N22 技術面不卡）｜owner 實體項→O20/N17/O7 後半 |
