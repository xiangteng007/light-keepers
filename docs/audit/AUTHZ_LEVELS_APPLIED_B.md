# 授權等級落地紀錄 B — 中／低敏感度裸 Controller（AUTHZ_LEVELS_APPLIED_B）

> 對應 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` 工作項 **1.5：逐端點定 RequiredLevel＋補 guard（BE-1）** 之**中／低敏感度**部分。
> 依據盤點：`docs/audit/AUTHZ_GAP_INVENTORY.md` 表一「中敏感度（18）」與「低敏感度（9）」。
> 範圍界線：**不含**表一高敏感度 16 筆、**不含**表二 9 個部分保護 controller（另案）、**不含** `vms.controller.ts`（高敏感另案）；既有 `@Public()` 端點、OAuth/LIFF 例外一律未動。
> 執行日期：2026-07-31。

## 一、採用的慣例與定級原則

| 項目 | 內容 |
|---|---|
| Guard 組合 | `@UseGuards(CoreJwtGuard, UnifiedRolesGuard)`（repo 內既有 140 處的主流寫法；任務指示的 `@UseGuards(UnifiedRolesGuard)` 以實際慣例為準，`CoreJwtGuard` 負責填 `request.user`） |
| 等級宣告 | `@RequiredLevel(ROLE_LEVELS.X)`，X ∈ `VOLUNTEER(1) / OFFICER(2) / DIRECTOR(3) / CHAIRMAN(4) / OWNER(5)` |
| 定級位置 | **class 級保守**（取該 controller 最寬鬆端點所需的等級），**handler 級覆寫**（寫入／破壞性／管理設定逐一提高） |
| 定級原則 | 唯讀營運／情境資料 L1–L2；一般業務寫入 L2；全站或組織層級的管理設定、破壞性批次操作 L3；系統／基礎設施 L4；既有 inline 已強制系統擁有者者維持 L5 |
| 公開端點 | 依 repo 慣例補 `@Public()`（`shared/guards`）＋一行定級理由註解，而非硬套 Level 等級 |
| 模組接線 | `SharedAuthModule` 為 `@Global()`，`CoreJwtGuard`／`UnifiedRolesGuard` 全域可解析，**不需**修改任何 `*.module.ts` |

處理總數：**27 個 controller**（中 18＋低 9），涵蓋 endpoint **175** 個。其中
- 實際加上 `UnifiedRolesGuard` ＋ `@RequiredLevel`：**20** 個（141 endpoint）
- 補 `@Public()`＋理由註解：**3** 個（`public-audit`、`public-finance`、`public-resources`，16 endpoint）
- 確認為既有合理公開、**不需變更**：**4** 個（2 份 health controller、health-only、public，18 endpoint）

另同步調整 **16 個既有 controller spec**：為新增 class 級 `@UseGuards(CoreJwtGuard, UnifiedRolesGuard)` 補上 `.overrideGuard(...)`（`CoreJwtGuard` 依賴 `JwtService`，測試模組未匯入 `SharedAuthModule` 會在 `compile()` 階段解析失敗）。寫法沿用 repo 既有慣例（見 `activities.controller.spec.ts`）。

---

## 二、中敏感度（18）— controller × 端點 × 定級 × 理由

### 1. `backend/src/modules/social-media-monitor/social-media-monitor.controller.ts`（`social-monitor`, 14）
class：**L2（OFFICER）**。理由：社群輿情監控屬營運情報，含未公開的災情研判與來源帳號。

| 端點 | Level | 理由 |
|---|---|---|
| `GET posts` / `GET export` / `GET trends` / `GET stats` / `GET keywords` / `GET exclude-words` / `GET notifications` | L2（class） | 輿情資料與匯出，幹部研判用 |
| `POST keywords` / `POST exclude-words` / `POST analyze` | L2（class） | 一般營運寫入 |
| `DELETE purge` | **L3** | 破壞性：批次刪除監控歷史資料 |
| `POST/PUT/DELETE notifications[/:id]` | **L3** | 管理設定：全站告警派送規則 |

### 2. `backend/src/modules/equipment-qr/equipment-qr.controller.ts`（`equipment-qr`, 14）
class：**L1（VOLUNTEER）**。理由：裝備清單與 QR 掃描為現場志工日常唯讀需求。

| 端點 | Level | 理由 |
|---|---|---|
| `GET /` `GET category/:category` `GET scan/:qrCode` `GET checkouts/active` `GET checkouts/history/:id` `GET maintenance/pending` `GET maintenance/alerts` `GET stats` `GET alerts/low-stock` | L1（class） | 唯讀庫存與領用狀態 |
| `POST register` | **L2** | 寫入：建立裝備主檔 |
| `POST checkout` / `POST return/:recordId` | **L2** | 寫入：領用核發與歸還驗收（含損壞判定），沿用盤點初判 |
| `POST maintenance/schedule` / `PATCH maintenance/:id/complete` | **L2** | 寫入：維護排程與結案 |

### 3. `backend/src/modules/org-chart/org-chart.controller.ts`（`org-chart`, 11）
class：**L1**。理由：組織樹查詢為全體志工日常唯讀需求。

| 端點 | Level | 理由 |
|---|---|---|
| `GET :id` `GET :id/children` `GET tree/:rootId` `GET :id/path` `GET /`(search) `GET stats` `GET export/flat` | L1（class） | 唯讀組織資料 |
| `POST /` `PUT :id` `DELETE :id` `PUT :id/move` | **L3** | 管理設定：節點增修刪與隸屬調整＝人事任命與組織治理（**高於初判 L2**，見第五節） |

### 4. `backend/src/modules/drill-simulation/drill.controller.ts`（`api/drill`, 9）
class：**L1**。理由：演練狀態／腳本／範本查詢為參演志工唯讀需求。

| 端點 | Level | 理由 |
|---|---|---|
| `GET status` `GET scenarios` `GET scenarios/:id` `GET templates` | L1（class） | 唯讀演練資訊 |
| `POST respond/:eventIndex` | L1（class） | 參演者記錄自身回應時間 |
| `POST scenarios` / `PUT scenarios/:id` | **L2** | 寫入：腳本增修 |
| `POST start/:scenarioId` / `POST stop` | **L3** | 全域狀態：切換全系統演練模式，誤觸會影響真實災況判讀（**高於初判 L2**） |

### 5. `backend/src/modules/shift-calendar/shift-calendar.controller.ts`（`shift-calendar`, 9）
class：**L1**。理由：班表／空缺／模板查詢為志工確認自身班務所需。

| 端點 | Level | 理由 |
|---|---|---|
| `GET calendar` `GET volunteer/:id` `GET vacancies` `GET templates` | L1（class） | 唯讀班表（跨人查詢的個資收斂另案） |
| `POST /` `PUT :shiftId` `DELETE :shiftId` `POST swap` `POST copy-week` | **L2** | 寫入：指派／修改／刪除他人班次、換班核可、批次產生班表 |

### 6. `backend/src/modules/volunteer-points/volunteer-points.controller.ts`（`volunteer-points`, 9）
class：**L1**。理由：積分、排行榜、獎品清單、年度報告為志工本人可見資料。

| 端點 | Level | 理由 |
|---|---|---|
| `GET :volunteerId` `GET rewards/list` `GET leaderboard/top` `GET :id/annual-report/:year` | L1（class） | 唯讀積分資料 |
| `POST :id/redeem/:rewardId` | L1（class） | 本人兌換行為 |
| `POST :id/initialize` `POST :id/add` `POST :id/service-hours` `PATCH :id/redemption/:rid/fulfill` | **L2** | 寫入：開帳、發放積分（等同價值發放）、登錄時數、確認獎品發放 |

### 7. `backend/src/modules/resources/label-templates.controller.ts`（`label-templates`, 7）
class：**L1**。理由：模板查詢為倉儲列印作業所需。

| 端點 | Level | 理由 |
|---|---|---|
| `GET /` `GET :id` `GET applicable/list` | L1（class） | 唯讀模板 |
| `POST /` `PATCH :id` `PATCH :id/active` `DELETE :id` | **L2** | 寫入：管制品標籤模板增修刪。**注意**：各 handler 內既有 `roleLevel < 5` inline 檢查更嚴，本次未動，實際生效為兩者交集（L5） |

### 8. `backend/src/modules/integrity-ledger/public-audit.controller.ts`（`api/public/transparency`, 5）
class：**`@Public()`**。理由：檔頭即載明「無需登入的物資流向查詢」，憑收據編號查詢、僅回傳已公開的物流履歷；default-deny 下不補 `@Public()` 該功能實際不可用。5 個端點全部公開（`GET search` / `resource/:id` / `validate/:id` / `stats` / `recent`）。

### 9. `backend/src/modules/resources/resources-analytics.controller.ts`（`resources/analytics`, 5）
class：**L2**（原僅 `@UseGuards(CoreJwtGuard)`，補上 `UnifiedRolesGuard`）。理由：揭露全域庫存水位、過期與缺料弱點，屬幹部層級營運研判。5 個 `GET` 全部 L2。

### 10. `backend/src/modules/offline-mesh/mesh.controller.ts`（`api/mesh`, 5）
class：**L1**。理由：LoRa 節點狀態為斷網現場志工的必要唯讀情境資料。

| 端點 | Level | 理由 |
|---|---|---|
| `GET nodes` `GET nodes/active` `GET nodes/:id/messages` `GET stats` | L1（class） | 唯讀節點與訊息 |
| `POST sync` | **L2** | 寫入：離線訊息回寫正式資料 |

### 11. `backend/src/modules/resources/label-print.controller.ts`（`labels`, 5）
class：**L1**。理由：列印歷史查詢為倉儲作業唯讀。

| 端點 | Level | 理由 |
|---|---|---|
| `GET history/:targetType/:targetId` | L1（class） | 唯讀列印紀錄 |
| `POST generate/lot` `POST generate/assets` `POST reprint` `POST revoke` | **L2** | 寫入：影響管制品追溯。既有 inline「`roleLevel >= 3` 或 `role === '倉管'`」檢查更嚴，未動，實際生效為交集 |

### 12. `backend/src/modules/performance-report/performance-report.controller.ts`（`api/performance`, 6）
class：**L2**（無 handler 覆寫）。理由：可查詢任意志工／團隊／區域的個人績效並匯出，屬人事管理用途。

### 13. `backend/src/modules/public-finance/public-finance.controller.ts`（`api/public/finance`, 6）
class：**`@Public()`**。理由：非營利組織對外財務揭露（年度摘要、重大支出、專案報告、捐款人感謝、年報下載、即時看板）；已核對 `public-finance.service.ts`，回傳皆為**彙總數據且不含捐款人個資**。

### 14. `backend/src/modules/trend-prediction/trend-prediction.controller.ts`（`api/trends`, 4）
class：**L1**（無 handler 覆寫）。理由：全為唯讀的區域災害風險／資源需求推估，是派遣前情境判斷的基本資料（**低於初判 L2**，見第五節）。

### 15. `backend/src/modules/rag-knowledge/rag-knowledge.controller.ts`（`api/knowledge`, 4）
class：**L1**。理由：知識庫問答與檢索為志工現場查 SOP 所需；內容為內部文件故不列入公開面。

| 端點 | Level | 理由 |
|---|---|---|
| `POST query` `GET search` `GET categories` | L1（class） | 檢索唯讀 |
| `POST documents` | **L2** | 寫入：新增文件會改變全體檢索結果 |

### 16. `backend/src/modules/menu-config/menu-config.controller.ts`（`menu-config`, 2）
class：**L1**（原 `getAll` 完全無 guard、`updateAll` 僅 handler 級 `CoreJwtGuard`）。

| 端點 | Level | 理由 |
|---|---|---|
| `GET /` | L1（class） | 登入後 UI 渲染所需 |
| `PUT /` | **L5（OWNER）** | 管理設定：可竄改全站選單。維持既有 inline「僅系統擁有者」政策並宣告化（**高於初判 L3**，見第五節） |

### 17. `backend/src/modules/prometheus/prometheus.controller.ts`（`metrics`, 2）
class：**L4（CHAIRMAN）**。理由：Prometheus 指標揭露基礎設施拓樸與流量特徵。主要防線仍為網路層（VPC／內網不對外曝露），應用層以 L4 兜底。2 個 `GET` 皆 L4。

### 18. `backend/src/modules/overlays/map-packages.controller.ts`（`map-packages`, 3）
class：**L1**（無 handler 覆寫）。理由：離線地圖包清單與 manifest 供出勤志工事前下載，全為唯讀、無管理端點。

---

## 三、低敏感度（9）

### 19. `backend/src/modules/weather-service/weather.controller.ts`（`weather`, 19）
class：**L1**。理由：氣象查詢屬出勤情境資料；**對外匿名版本已由 `PublicController`（Level 0 façade，`/public/weather`）提供**，故本 controller 維持登入後可讀而非公開。

| 端點 | Level | 理由 |
|---|---|---|
| `GET overview/location/current[/:code]/forecast*(6)/alerts*(3)/risk/risk/severe` | L1（class） | 唯讀氣象與風險 |
| `POST risk/mission/:missionId` | L1（class） | 唯讀性質的可行性試算（不落地資料） |
| `POST alerts` `DELETE alerts/:id` | **L2** | 寫入：發布／解除天氣警報 |
| `POST alerts/sync` `POST sync` | **L2** | 寫入：外部同步作業 |

### 20. `backend/src/modules/public-resources/public-resources.controller.ts`（`public-resources`, 5）
class：**`@Public()`**。理由：避難收容所與 AED 位置屬救命用公開資訊，全為唯讀、無個資，與 `PublicController`(Level 0) 同性質。

### 21. `backend/src/modules/water-resources/water-resources.controller.ts`（`api/water`, 5）
class：**L1**。

| 端點 | Level | 理由 |
|---|---|---|
| `GET river-levels` `GET reservoirs` `GET flood-zones/:region` `GET alerts` | L1（class） | 唯讀水情／淹水潛勢 |
| `POST subscribe` | **L2** | 寫入：登記外部 `callbackUrl`，具 SSRF 與濫發風險 |

### 22. `backend/src/modules/tccip-climate/tccip-climate.controller.ts`（`api/climate`, 5）
class：**L1**（無 handler 覆寫）。理由：全為唯讀的氣候趨勢／脆弱度／歷史災害統計，無寫入端點。

### 23. `backend/src/health/health.controller.ts`（`health`, 4）— **未變更**
4 個 handler 皆已有 `@Public()`＋`@Throttle`，檔頭已載明「Security: All endpoints are @Public() with rate limiting (Policy-B)」，且 `/health`、`/health/detailed`、`/health/live`、`/health/ready` 均已列於 `docs/policy/public-surface.policy.json`。屬**正當公開**，不套等級。

### 24. `backend/src/modules/health/health.controller.ts`（`health`, 4）— **未變更**
class-level `@Public()`，檔頭已註明「Required for Cloud Run startup/liveness probes which don't have JWT tokens」。

### 25. `backend/src/modules/public/public.controller.ts`（`public`, 7）— **未變更**
class-level `@Public()`，`@ApiTags('Public (Level 0)')`，檔頭已明列公開資料的遮罩規範。

### 26. `backend/src/health-only.controller.ts`（`health`, 3）— **未變更**
3 個 handler 皆已有 `@Public()`＋`@Throttle`（CI／DB_REQUIRED=false 模式的精簡健康探針）。

### 27. `backend/src/modules/manuals/manuals.controller.ts`（`manuals`, 3）
class：**L1**（`@UseGuards(OptionalJwtGuard, UnifiedRolesGuard)`）。理由：SOP 實務手冊全為唯讀且為志工執勤必需；內容屬內部文件，**不**列入公開面。
- 同時修正檔頭誤導註解：原寫「公開存取（Level 0）- 匿名訪客可瀏覽」，但 `GlobalAuthGuard` 為 default-deny，`OptionalJwtGuard` 並無放行匿名的效果，匿名本來就進不來。
- 順帶消除該檔既有的**死 import**（`UnifiedRolesGuard`/`RequiredLevel`/`ROLE_LEVELS` 原本 import 但完全未使用，即盤點文件「附錄」提到的 grep 誤判來源）。

---

## 四、公開面（`@Public()`）異動彙整

| Controller | 端點數 | 判定依據 |
|---|---|---|
| `integrity-ledger/public-audit.controller.ts` | 5 | 檔頭明載「無需登入的物資流向查詢」；路由前綴 `api/public/transparency` |
| `public-finance/public-finance.controller.ts` | 6 | NPO 財務揭露；已核對 service 回傳為彙總數據、無個資 |
| `public-resources/public-resources.controller.ts` | 5 | 避難所／AED 救命資訊；與既有 `PublicController` 同性質 |

> **後續必要動作（不在本任務範圍）**：以上 16 個端點需補進 SSOT `docs/policy/public-surface.policy.json`（含 `reason`／`owner`／`throttle`／`dataClassification`），否則 `tools/audit/validate-public-surface.ps1` 的 cross-check 會將其判為「未列白名單的公開端點」。另建議一併補 `@Throttle`（現行 3 個 controller 皆未設節流）。

---

## 五、與盤點初判不同的判例（5 筆）

| # | Controller / 端點 | 初判 | 定案 | 理由 |
|---|---|---|---|---|
| 1 | `org-chart` 寫入端點（`POST /`、`PUT :id`、`DELETE :id`、`PUT :id/move`） | L2 | **L3** | 組織節點增修＝人事任命與組織治理，屬「管理設定」而非一般業務寫入；依定級原則落在 L3–L4 |
| 2 | `drill` 啟停（`POST start/:scenarioId`、`POST stop`） | L2 | **L3** | 切換的是**全系統**演練模式旗標，誤觸會讓真實災情被當成演練處理，屬全域狀態變更 |
| 3 | `menu-config` `PUT /` | L3 | **L5** | 該 handler 內既有 inline 檢查即為 `roleLevel < 5 → Forbidden`（僅系統擁有者）。若宣告 L3 會與實際行為不符、造成誤導；改以 L5 宣告化，行為不變 |
| 4 | `trend-prediction` 全部 | L2 | **L1** | 全為唯讀的區域風險推估，是志工出勤前的基本情境判斷資料，無個資與作戰細節；比照 `mesh`／`map-packages` 等現場情境資料採 L1 |
| 5 | `weather` / `water-resources` / `tccip-climate` | 「L1 或明確 `@Public()`」 | **L1（讀）/ L2（寫）** | 未採 `@Public()`：對外匿名的氣象／避難資訊已由 `PublicController`（Level 0 façade）統一提供，重複開放只會擴大匿名攻擊面；且這三者含 `POST/DELETE` 寫入端點，class 級公開會連寫入一併開放 |

另有 2 筆屬「維持初判但需標註」的情形：
- `public-audit`（初判「建議明確標示 L0 或補 `@Public()`」）→ 採 **`@Public()`**（非 `@RequiredLevel(0)`），與 repo 主流慣例一致。
- `public-finance` 同上。

---

## 六、發現但未修改的既有問題（建議另案）

| # | 位置 | 問題 |
|---|---|---|
| 1 | `resources/label-templates.controller.ts:58,89,108,126` | 檔頭與錯誤訊息寫「**幹部**專用」，但 inline 檢查為 `roleLevel < 5`（＝僅**系統擁有者**）。語意與實作不符，且幹部（L2）實際上無法使用此功能。需由業務端拍板正確等級後，將 inline 檢查收斂為 `@RequiredLevel` 單一來源 |
| 2 | `resources/label-print.controller.ts:26,52,79,108` | 授權邏輯寫死在 handler 內（`roleLevel >= 3 || role === '倉管'`），且以**中文角色字串**比對，繞過 `UnifiedRolesGuard`／`RequiredRoles` 機制。建議改用 `@RequiredRoles('倉管')` 或角色常數 |
| 3 | `menu-config.controller.ts:35` | 同樣是 inline `roleLevel < 5`，本次已用 `@RequiredLevel(OWNER)` 宣告化，但 inline 檢查仍在（重複）。可於後續清理 |
| 4 | `equipment-qr`、`org-chart`、`shift-calendar`、`label-templates` 等 | 仍存在盤點表四所列的 `@Body() data: any` / `Record<string, any>`，屬輸入驗證缺口，不在本任務範圍 |
| 5 | `docs/policy/public-surface.policy.json` | 未收錄 `/public/*`（7 個既有端點）及本次新增的 3 個 controller，SSOT 與實況已漂移 |

---

## 七、驗證結果

| 檢查 | 結果 |
|---|---|
| `npx tsc --noEmit` | **通過**（無輸出） |
| `npx jest`（全套） | **355 suites / 3480 tests：354 suites 通過、1 suite 失敗（4 tests）** |
| 唯一失敗 suite | `backend/src/modules/weather-service/services/forecast.service.spec.ts` — **本次變更前即已紅燈**（已用 `git stash` 於乾淨工作區重跑確認：同樣 4 failed / 3 passed）。失敗原因為 spec 的 `CwaApiService` mock 缺少 `fetch` 方法（`TypeError: this.cwaApi.fetch is not a function`），與授權無關，屬既有技術債 |
| 模組接線 | 未修改任何 `*.module.ts`（`SharedAuthModule` 為 `@Global()`，兩個 guard 全域可解析） |
| 既有 `@Public()` | 表三 20 處全數保留，未刪改；OAuth／LIFF 例外未動 |
| 現有測試相依 | 全部 controller spec 為單元測試（直接呼叫 handler、無 supertest），guard 不進入執行路徑；僅需在 `compile()` 前 override 以避免 DI 解析失敗 |

> 註：任務背景給的基準為「357 suites」，本 worktree 實測基準為 **355 suites**（`backend/jest.config.js` 掃描結果），差異應為統計時點不同。

### 未安裝相依的注意事項

本 worktree 初始無 `backend/node_modules`，且 `npm ci` 會因 `@nestjs/config@3.3.0` 與 `@nestjs/common@10.4.22` 的 peer 衝突失敗；需以 `npm install --legacy-peer-deps` 安裝（安裝造成的 `package-lock.json` 變更已還原，未納入本次 commit）。
