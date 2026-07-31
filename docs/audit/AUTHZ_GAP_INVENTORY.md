# 授權缺口盤點（AUTHZ_GAP_INVENTORY）

> 對應 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` 工作項 **1.4：授權缺口盤點**。
> 性質：**純掃描**，本文件不修改任何後端程式碼，僅記錄現況與初判建議，供後續 OPUS 任務逐一拍板並落地修補。
>
> 掃描基準：`backend/src` 全部 `*.controller.ts`（排除 `*.spec.ts`），共 **122** 個 controller。
> 掃描日期：2026-07-31。掃描分支：`worktree-agent-a86f8c68be9ec53f0`（自 main 分出，commit `3aae110` 之後）。
>
> 備註：本 worktree 中找不到 `docs/FULL_SYSTEM_REDESIGN_PLAN.md`（`git log --all` 顯示該文件存在於另一條歷史線 `d14b456`，未併入目前分支），因此「舊數字 31」僅能以任務指示中提供的說明作為比對基準，詳見文末「與舊數字（31）的差異說明」。

## RBAC 等級參考（`backend/src/modules/accounts/entities/role.entity.ts`）

```
0 = PUBLIC    一般民眾
1 = VOLUNTEER 登記志工
2 = OFFICER   幹部
3 = DIRECTOR  常務理事
4 = CHAIRMAN  理事長
5 = OWNER     系統擁有者
```

## 關鍵定義位置（本次掃描判讀依據）

| 符號 | 定義檔 | 說明 |
|---|---|---|
| `UnifiedRolesGuard` | `backend/src/modules/shared/guards/unified-roles.guard.ts:68` | 目前唯一具角色分級判斷能力的 Guard |
| `RequiredLevel`（新版） | `backend/src/modules/shared/guards/unified-roles.guard.ts:36` | 與 `UnifiedRolesGuard` 搭配使用 |
| `RequiredLevel`（**舊版，重複定義**） | `backend/src/common/guards/admin.guard.ts:35` | 舊版 admin guard 用，**與新版同名不同來源**，本次掃描僅以 `@RequiredLevel(` 文字比對，未區分兩者來源，屬已知限制（見方法限制） |
| `RequiredRoles` | `backend/src/modules/shared/guards/unified-roles.guard.ts:48` | 角色白名單式檢查 |
| `CoreJwtGuard` | `backend/src/modules/shared/guards/core-jwt.guard.ts:39` | 僅驗證「已登入」，**不含角色/等級判斷** |
| `GlobalAuthGuard` | `backend/src/modules/shared/guards/global-auth.guard.ts:54` | 全域 default-deny，擋匿名；認可 `@Public()` 放行 |
| `Public`（版本 A） | `backend/src/modules/shared/guards/public.decorator.ts:17`（`IS_PUBLIC_KEY = 'isPublic'`） | 經 `shared/guards/index.ts` 與 `shared-auth.module.ts` re-export，是目前主流引用路徑 |
| `Public`（版本 B，**重複定義**） | `backend/src/modules/auth/decorators/public.decorator.ts:25`（`IS_PUBLIC_KEY = 'isPublic'`） | 獨立檔案，metadata key 字串與版本 A 相同（`'isPublic'`），故功能上仍可被 `GlobalAuthGuard` 正確辨識，**非功能性 bug，但屬技術債（重複定義應合併）** |

`GlobalAuthGuard` 實際 import 的是版本 A 的 `IS_PUBLIC_KEY`（`global-auth.guard.ts:12`），但因兩版 key 字串相同，兩份 `@Public()` 在執行期效果一致。

---

## 摘要統計

| 項目 | 數量 |
|---|---|
| 掃描 controller 總數 | 122 |
| 掃描 endpoint 總數（`@Get/@Post/@Put/@Patch/@Delete/@All/@Options/@Head`） | 1,053 |
| **表一：裸 controller**（class 與 handler 皆無 UnifiedRolesGuard/RequiredLevel/RequiredRoles） | **43**（涉及 361 個 endpoint） |
| ├ 其中純粹「連 CoreJwtGuard 都沒有」（完全依賴全域 GlobalAuthGuard 擋匿名，任何 Level 1+ 皆可呼叫） | 40 |
| ├ 其中「有 CoreJwtGuard 但無角色檢查」（class 或部分 handler） | 3（`resources-analytics`、`vms`、`menu-config`） |
| ├ 其中屬「設計上刻意公開」（`@Public()`，非缺口） | 5（`health-only`、`health`(root)、`health`(modules)、`public`；另有 3 個疑似應公開但未標示，見表一備註） |
| **表二：部分保護 controller**（class 有保護但個別 handler 是例外，或 class 未保護但部分 handler 個別有保護） | **9**（涉及 113 個 endpoint，多數為合理的登入/OAuth 公開端點，僅 2 個 controller 有真正的角色檢查漏洞） |
| **表三：`@Public()` 使用處** | **20** 處，分布於 **8** 個 controller 檔案 |
| **表四：`@Body()` 型別為 `any`/無型別/`Record<string, any>`** | **43** 處 handler 參數 |

---

## 表一：裸 Controller 清單

判定條件：`@Controller` class 本身，以及其下**所有** handler，皆**沒有**出現 `UnifiedRolesGuard`／`@RequiredLevel(`／`@RequiredRoles(`（`@Public()` 的有無不影響此表收錄，因為判準只看角色保護，詳見「方法限制」）。

敏感度初判標準：
- **高**：作戰／戰術資料（任務簡報、態勢、地圖派遣）、個資（含生理/心理/通聯/受災者資料）、稽核、財務
- **中**：營運資料（裝備、排班、分析報表、組織架構等業務資料，外洩影響中等）
- **低**：唯讀、性質上本應公開或近似公開的資料

排序：依敏感度（高→中→低）、同等級依 endpoint 數量遞減。

### 高敏感度（16）

| # | 檔案路徑 | `@Controller` 前綴 | Endpoint 數 | 敏感度理由 | 建議最低 Level（初判） | 備註 |
|---|---|---|---|---|---|---|
| 1 | `backend/src/modules/volunteers/vms.controller.ts` | `skills` | 40 | 個資：志工技能/管理系統，端點量體最大 | L1（讀）/ L2-L3（寫/管理） | class 有 `@UseGuards(CoreJwtGuard)` 但**無任何角色檢查**，形同「只要登入誰都能改」 |
| 2 | `backend/src/modules/scalability/scalability.controller.ts` | `scalability` | 21 | 系統：佇列操作、衝突解決、速率限制設定，遭竄改影響全系統可用性 | L4 | `updateRateLimitConfig`／`resolveConflict`／`queueOperation` 皆為高風險 mutation |
| 3 | `backend/src/modules/international-standards/international-standards.controller.ts` | `standards` | 19 | 作戰：ICS/HXL/Sphere 標準匯出，含任務與資源資料批次匯出/匯入 | L2 | 亦出現在表四（多處 `any`） |
| 4 | `backend/src/modules/reporting-engine/reporting.controller.ts` | `reports` | 18 | 財務/作戰：報表引擎，可建立排程、跨模組資料匯出、範本渲染 | L2 | 亦出現在表四 |
| 5 | `backend/src/modules/overlays/map-dispatch.controller.ts` | `api/missions/:sessionId/map` | 13 | 作戰：戰術地圖派遣 | L2 | |
| 6 | `backend/src/modules/psychological-support/mood-tracker.controller.ts` | `api/care` | 12 | 個資：心理健康資料，極敏感 | L1（本人）/ L2（輔導人員查他人） | |
| 7 | `backend/src/modules/mission-sessions/iap.controller.ts` | `api/missions/:sessionId/iap` | 12 | 作戰：事件行動計畫（IAP） | L2 | |
| 8 | `backend/src/modules/mission-sessions/aar.controller.ts` | `api/missions/:sessionId/aar` | 8 | 作戰：行動後檢討（AAR） | L2 | |
| 9 | `backend/src/modules/mission-sessions/sitrep.controller.ts` | `api/missions/:sessionId/sitrep` | 8 | 作戰：態勢回報（SITREP） | L2 | |
| 10 | `backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts` | `api/expenses` | 7 | 財務：報銷申請/審核/撥款 | L2（送出）/ L3（審核、撥款） | 亦出現在表四（3 個 `any`） |
| 11 | `backend/src/modules/mission-sessions/mission-report.controller.ts` | `mission-reports` | 6 | 作戰：任務報告 | L2 | |
| 12 | `backend/src/modules/line-bot/disaster-report/ai-vision.controller.ts` | `ai` | 5 | 個資：現場影像 AI 辨識，可能含受災者影像 | L1-L2 | |
| 13 | `backend/src/modules/fatigue-detection/fatigue-detection.controller.ts` | `api/fatigue` | 5 | 個資：志工生理/疲勞監測資料 | L1（本人）/ L2（他人查閱） | |
| 14 | `backend/src/modules/voice/voice-call.controller.ts` | `api/voice` | 5 | 個資：通話紀錄 | L2 | |
| 15 | `backend/src/modules/intake/intake.controller.ts` | `intake` | 4 | 個資：災情通報（含通報人聯絡方式、位置、受災描述） | `create` 維持 L0（設計上允許匿名通報）；`findAll`/`findOne`/`findByIncident` 建議 L2 | **註解與實作不符**：`findAll()` 上方註解寫「需要 L2+ 權限」，但實際**完全沒有任何 Guard**，任何登入者可列出全部通報 |
| 16 | `backend/src/modules/resources/sensitive.controller.ts` | `sensitive` | 3 | 稽核/管制：檔名即「敏感資源」，管制品項存取 | L3 | 端點數雖少但語意上風險最高，應優先處理 |

### 中敏感度（18）

| # | 檔案路徑 | `@Controller` 前綴 | Endpoint 數 | 敏感度理由 | 建議最低 Level（初判） | 備註 |
|---|---|---|---|---|---|---|
| 17 | `backend/src/modules/social-media-monitor/social-media-monitor.controller.ts` | `social-monitor` | 14 | 營運：社群輿情監控 | L2 | |
| 18 | `backend/src/modules/equipment-qr/equipment-qr.controller.ts` | `equipment-qr` | 14 | 營運：裝備 QR 領用/歸還 | L1（讀）/ L2（領用） | 亦出現在表四 |
| 19 | `backend/src/modules/org-chart/org-chart.controller.ts` | `org-chart` | 11 | 營運：組織架構，含人員任命節點增修 | L1（讀）/ L2（寫） | 亦出現在表四 |
| 20 | `backend/src/modules/drill-simulation/drill.controller.ts` | `api/drill` | 9 | 營運：演練/兵推排程與紀錄 | L2 | |
| 21 | `backend/src/modules/shift-calendar/shift-calendar.controller.ts` | `shift-calendar` | 9 | 個資/營運：志工排班（含個人班表） | L1（本人）/ L2（管理） | 亦出現在表四 |
| 22 | `backend/src/modules/volunteer-points/volunteer-points.controller.ts` | `volunteer-points` | 9 | 個資：志工積分 | L1（本人）/ L2（管理） | |
| 23 | `backend/src/modules/resources/label-templates.controller.ts` | `label-templates` | 7 | 營運：物資標籤範本管理 | L2 | 亦出現在表四（`Record<string, any>`） |
| 24 | `backend/src/modules/integrity-ledger/public-audit.controller.ts` | `api/public/transparency` | 5 | 稽核：公開透明帳本查詢，**疑似設計上應公開但未標示 `@Public()`** | 建議明確標示 L0 或補 `@Public()` | 路徑含 `public/transparency`，很可能屬「漏標公開」而非「漏保護」，需覆核意圖 |
| 25 | `backend/src/modules/resources/resources-analytics.controller.ts` | `resources/analytics` | 5 | 營運：物資分析報表 | L2 | class 僅 `@UseGuards(CoreJwtGuard)`，無角色檢查 |
| 26 | `backend/src/modules/offline-mesh/mesh.controller.ts` | `api/mesh` | 5 | 營運：離線 mesh 網路節點資料 | L1 | |
| 27 | `backend/src/modules/resources/label-print.controller.ts` | `labels` | 5 | 營運：標籤列印 | L1 | 亦出現在表四 |
| 28 | `backend/src/modules/performance-report/performance-report.controller.ts` | `api/performance` | 6 | 營運：績效報告，可能含志工個人績效 | L2 | |
| 29 | `backend/src/modules/public-finance/public-finance.controller.ts` | `api/public/finance` | 6 | 財務：**疑似設計上應公開但未標示 `@Public()`**（對照 `public.controller.ts` 的 class-level `@Public()` 模式，本 controller 未套用） | 建議明確標示 L0 或補 `@Public()` | 需覆核與 `public-finance` 模組設計意圖是否一致 |
| 30 | `backend/src/modules/trend-prediction/trend-prediction.controller.ts` | `api/trends` | 4 | 營運：趨勢預測分析 | L2 | |
| 31 | `backend/src/modules/rag-knowledge/rag-knowledge.controller.ts` | `api/knowledge` | 4 | 營運：知識庫/RAG 檢索，可能含內部文件 | L1 | |
| 32 | `backend/src/modules/menu-config/menu-config.controller.ts` | `menu-config` | 2 | 營運：前端選單設定；`updateAll` 可竄改全站選單 | L3 | `getAll` 完全無 Guard；`updateAll` 僅 handler 級 `@UseGuards(CoreJwtGuard)`，**無角色檢查** |
| 33 | `backend/src/modules/prometheus/prometheus.controller.ts` | `metrics` | 2 | 系統：Prometheus 監控指標，外洩可能揭露基礎設施資訊 | 建議以網路層（VPC/內網）為主要防線 + L4 | 與 `modules/metrics/metrics.controller.ts`（已受保護）為不同 controller，需留意重複/混淆 |

### 低敏感度（9）

| # | 檔案路徑 | `@Controller` 前綴 | Endpoint 數 | 敏感度理由 | 建議最低 Level（初判） | 備註 |
|---|---|---|---|---|---|---|
| 34 | `backend/src/modules/weather-service/weather.controller.ts` | `weather` | 19 | 唯讀公開性質：氣象資料 | L1 或明確 `@Public()` | |
| 35 | `backend/src/modules/public-resources/public-resources.controller.ts` | `public-resources` | 5 | 唯讀公開：避難所/AED 清單，性質同 `public.controller.ts` | 建議明確 `@Public()` | |
| 36 | `backend/src/modules/water-resources/water-resources.controller.ts` | `api/water` | 5 | 唯讀公開：水資源資料 | L1 或明確 `@Public()` | |
| 37 | `backend/src/modules/tccip-climate/tccip-climate.controller.ts` | `api/climate` | 5 | 唯讀公開：氣候資料 | L1 或明確 `@Public()` | |
| 38 | `backend/src/health/health.controller.ts` | `health` | 4 | 唯讀健康檢查 | L0 | **非缺口**：全部 4 個 handler 皆有 `@Public()`（見表三），僅因未加 `UnifiedRolesGuard` 而落入本表字面定義 |
| 39 | `backend/src/modules/health/health.controller.ts` | `health` | 4 | 唯讀健康檢查 | L0 | **非缺口**：class-level `@Public()`（見表三） |
| 40 | `backend/src/modules/public/public.controller.ts` | `public` | 7 | 唯讀公開資料彙整 | L0 | **非缺口**：class-level `@Public()`（見表三） |
| 41 | `backend/src/health-only.controller.ts` | `health` | 3 | 唯讀健康檢查（CI 精簡版） | L0 | **非缺口**：全部 3 個 handler 皆有 `@Public()`（見表三） |
| 42 | `backend/src/modules/manuals/manuals.controller.ts` | `manuals` | 3 | 唯讀公開：SOP 手冊 | L1 | |

（第 43 筆 `backend/src/modules/overlays/map-packages.controller.ts` 分類調整見下列補充）

| # | 檔案路徑 | `@Controller` 前綴 | Endpoint 數 | 敏感度理由 | 建議最低 Level（初判） | 備註 |
|---|---|---|---|---|---|---|
| 43 | `backend/src/modules/overlays/map-packages.controller.ts` | `map-packages` | 3 | 中敏感：離線地圖包管理（含下載/管理操作） | L1（讀）/ L2（管理） | 分類介於中/低之間，初判為中 |

> 上表共 **43** 筆，涵蓋 endpoint 總數 **361**。其中 5 筆（#38、#39、#40、#41 及 `public-resources`/`public-finance`/`public-audit` 等疑似公開項）实际上是「刻意公開但未被 `UnifiedRolesGuard` 覆蓋」而非真正授權漏洞，請後續 OPUS 任務優先聚焦 **高敏感度 16 筆**與 **`CoreJwtGuard`-only 3 筆**（`vms`、`resources-analytics`、`menu-config`）。

---

## 表二：部分保護 Controller 清單

判定條件：(a) class 有 `UnifiedRolesGuard`/`RequiredLevel`/`RequiredRoles`，但個別 handler 標記 `@Public()` 形成例外；或 (b) class 未達保護門檻，但**部分**（非全部）handler 個別補上了角色檢查，其餘 handler 為缺口例外。

| # | 檔案路徑 | `@Controller` 前綴 | Endpoint 數 | 型態 | 缺口 handler（例外） | 風險說明 |
|---|---|---|---|---|---|---|
| 1 | `backend/src/modules/accounts/accounts.controller.ts` | `accounts` | 12 | (b) 部分 handler 有保護 | `getRoles(Get)`、`getPagePermissions(Get)` | 其餘 10 個 handler 皆有個別 `@RequiredLevel`/`@RequiredRoles`，僅這 2 個角色/頁面權限查詢端點缺漏，任何登入者可讀取角色清單與頁面權限設定，屬**中高風險**（可能被用於權限枚舉/偵察） |
| 2 | `backend/src/modules/auth/auth.controller.ts` | `auth` | 41 | (b) 混合，大部分為合理公開 | `register`/`login`/`forgotPassword`/`resetPassword`/`refreshToken`（皆已標 `@Public()`，屬設計如此）；另有 `getPermissions`、`getRoles`、`logout`、`checkEmailVerification` 及一批 OTP/OAuth 相關 handler **完全無 Guard 也無 `@Public()`** | `getPermissions`/`getRoles`/`logout` 依賴使用者自身 JWT 內容操作，風險相對低，但仍建議至少加 `CoreJwtGuard`（目前連登入檢查都沒有顯式標注，僅靠全域 `GlobalAuthGuard` default-deny）；OTP 系列（`sendPhoneOtp`/`verifyPhoneOtp`/`sendEmailOtp`/`verifyEmailOtp` 等）未標 `@Public()` 但語意上像是需要在登入前使用，需覆核究竟是漏標 `@Public()` 還是漏做角色檢查 |
| 3 | `backend/src/modules/auth/auth-oauth.controller.ts` | `auth` | 8 | (b) 混合 | `lineAuth`/`lineCallback`/`googleAuth`/`googleCallback` 皆已標 `@Public()`（OAuth 流程必須，合理） | 非缺口，OAuth 登入前無 JWT 屬必要設計 |
| 4 | `backend/src/modules/features/feature-flags.controller.ts` | `features` | 8 | (b) 部分 handler 有保護 | `evaluateAll(Get)`、`evaluateFlag(Get)`、`getEnabledFeatures(Get)` — 皆僅有 handler 級 `@UseGuards(CoreJwtGuard)`，**無角色檢查** | 功能旗標查詢外洩風險中等（可能揭露未上線功能），建議補 `RequiredLevel` |
| 5 | `backend/src/modules/line-bot/line-bot.controller.ts` | `line-bot` | 10 | (b) 混合 | `handleWebhook(Post)`、`getRichMenuConfig(Get)`、`getBindingStatus(Get)`、`getStats(Get)` 無任何 Guard/Public 標記 | `handleWebhook` 為 LINE 平台 callback，理論上應為 `@Public()` + 簽章驗證（若程式內有另行驗證 LINE signature 則此為漏標 `@Public()`，若無則為真正漏洞，需覆核 service 內是否已驗證來源）；`getStats`/`getBindingStatus` 建議補角色檢查 |
| 6 | `backend/src/modules/line-liff/line-liff.controller.ts` | `line-liff` | 7 | (b) 部分 handler 有保護 | `getLiffConfig(Get)` 已標 `@Public()`（合理，LIFF 初始化必須公開） | 非缺口 |
| 7 | `backend/src/modules/ncdr-alerts/ncdr-alerts.controller.ts` | `ncdr-alerts` | 10 | (b) 部分 handler 有保護 | `getAlertTypes(Get)`、`findAll(Get)`、`findForMap(Get)`、`getStats(Get)` 無任何 Guard | 國家級災防示警資料，讀取類端點風險中等，其餘 6 個寫入類 handler 已有保護；建議統一補上讀取端點的最低 Level（可能設計上本應公開示警資訊，需覆核） |
| 8 | `backend/src/modules/reports/reports.controller.ts` | `reports` | 11 | (b) 部分 handler 有保護 | `create(Post)`、`findForMap(Get)`、`getStats(Get)` 無任何 Guard | 其餘 8 個 handler 有保護，`create` 可讓任何登入者建立報告缺乏角色門檻，風險中等 |
| 9 | `backend/src/modules/reunification/reunification.controller.ts` | `reunification` | 6 | (b) 部分 handler 有保護 | `searchByQueryCode(Get)` 無任何 Guard | 家庭團聚系統以查詢碼搜尋，語意上可能設計為半公開（憑碼查詢，不需登入角色），但目前完全無 `@Public()` 標記，需覆核是否應公開或補角色檢查 |

> 上表共 **9** 筆。除 `line-liff`（#6）與 `auth-oauth`（#3）屬**完全合理**（OAuth/LIFF 前置流程本就無法要求先登入）外，其餘 7 筆均建議 OPUS 任務逐一覆核；其中 `accounts.controller.ts` 的 `getRoles`/`getPagePermissions` 建議優先處理（角色/權限資訊本身即敏感，可能被用於權限枚舉）。

---

## 表三：`@Public()` 使用清單

判定依據：`^\s*@Public\(\)` 逐行比對（含 class-level 與 handler-level），並回溯確認各檔案 import 的是版本 A（`shared/guards/public.decorator.ts`）或版本 B（`auth/decorators/public.decorator.ts`）。

| # | 檔案:行號 | 對應 endpoint / class | 使用版本 | 合理性初判 | 說明 |
|---|---|---|---|---|---|
| 1 | `backend/src/health-only.controller.ts:17` | `GET /health`（`check`） | B（`auth/decorators`） | 合理 | K8s/CI 健康探針 |
| 2 | `backend/src/health-only.controller.ts:31` | `GET /health/live`（`live`） | B | 合理 | 同上 |
| 3 | `backend/src/health-only.controller.ts:38` | `GET /health/ready`（`ready`） | B | 合理 | 同上 |
| 4 | `backend/src/health/health.controller.ts:41` | `GET /health`（`check`） | B | 合理 | Cloud Run liveness |
| 5 | `backend/src/health/health.controller.ts:52` | `GET /health/detailed`（`detailedCheck`） | B | **需覆核** | 回傳 DB/cache/memory 狀態，屬輕度資訊揭露，建議評估是否應改為需登入或限制欄位 |
| 6 | `backend/src/health/health.controller.ts:78` | `GET /health/live`（`liveness`） | B | 合理 | K8s liveness |
| 7 | `backend/src/health/health.controller.ts:89` | `GET /health/ready`（`readiness`） | B | 合理 | K8s readiness |
| 8 | `backend/src/modules/auth/auth.controller.ts:26` | `POST /auth/register`（`register`） | B | 合理 | 註冊前無 JWT，必要公開 |
| 9 | `backend/src/modules/auth/auth.controller.ts:33` | `POST /auth/login`（`login`） | B | 合理 | 同上 |
| 10 | `backend/src/modules/auth/auth.controller.ts:520` | `POST /auth/forgot-password`（`forgotPassword`） | B | 合理 | 密碼重設流程必要公開 |
| 11 | `backend/src/modules/auth/auth.controller.ts:531` | `POST /auth/reset-password`（`resetPassword`） | B | 合理 | 同上，以 reset token 驗證 |
| 12 | `backend/src/modules/auth/auth.controller.ts:572` | `POST /auth/refresh`（`refreshToken`） | B | 合理 | 以 httpOnly refresh cookie 驗證，非 JWT |
| 13 | `backend/src/modules/auth/auth-oauth.controller.ts:61` | `GET /auth/line`（`lineAuth`） | A（`../shared/guards`） | 合理 | OAuth 導轉，登入前必要公開 |
| 14 | `backend/src/modules/auth/auth-oauth.controller.ts:77` | `GET /auth/line/callback`（`lineCallback`） | A | 合理 | OAuth callback |
| 15 | `backend/src/modules/auth/auth-oauth.controller.ts:176` | `GET /auth/google`（`googleAuth`） | A | 合理 | 同上 |
| 16 | `backend/src/modules/auth/auth-oauth.controller.ts:191` | `GET /auth/google/callback`（`googleCallback`） | A | 合理 | 同上 |
| 17 | `backend/src/modules/intake/intake.controller.ts:27` | `POST /intake`（`create`） | A（經 `../shared/guards`） | 合理 | 允許匿名災情通報，設計文件亦註明「允許匿名通報」 |
| 18 | `backend/src/modules/line-liff/line-liff.controller.ts:29` | `GET /line-liff/config`（`getLiffConfig`） | A（`../shared/guards/public.decorator`） | 合理 | LIFF SDK 初始化必要公開 |
| 19 | `backend/src/modules/health/health.controller.ts:16` | class-level（整個 `HealthController`，4 個 handler） | A（`../shared/shared-auth.module`） | 合理 | Cloud Run 探針，需在無 JWT 情境下存活檢查 |
| 20 | `backend/src/modules/public/public.controller.ts:65` | class-level（整個 `PublicController`，7 個 handler，`Level 0` 標註於 `@ApiTags`） | A（`../shared/shared-auth.module`） | 合理 | 明確設計為 Level 0 公開資料彙整 |

> 20 處中 **18 處合理**（登入前必要流程、健康探針、明確設計為公開），**1 處建議覆核**（`/health/detailed` 資訊揭露程度），另有 **1 處為 class-level 合理設計**。兩份 `Public` 定義（A/B）在本清單中皆有實際使用：health 相關與 `auth.controller.ts` 用版本 B，其餘（`intake`/`line-liff`/`health`(modules)/`public`/`auth-oauth`）用版本 A。建議後續統一收斂為單一定義（刪除 `backend/src/modules/auth/decorators/public.decorator.ts`，全面改用 `shared/guards/public.decorator.ts`）以消除重複定義技術債。

---

## 表四：`@Body()` 型別為 `any` / 無型別 / `Record<string, any>` 清單

判定依據：解析每個 `@Get/@Post/@Put/@Patch/@Delete` handler 的完整參數簽名（含跨行組合後），擷取 `@Body(...)` 修飾的參數，檢查其型別文字是否為（a）整體為 `any`／`any[]`，（b）內嵌欄位含 `any`（如 `{ payload: any }`、`any[]` 陣列欄位），或（c）`Record<string, any>`。全庫掃描結果顯示**沒有**完全無型別標註（如 `@Body() body,`）的案例。

| # | 檔案:行號 | Handler（HTTP method） | 問題型態 | 參數簽名 |
|---|---|---|---|---|
| 1 | `backend/src/modules/equipment-qr/equipment-qr.controller.ts:29` | `register`（POST） | 整體 any | `@Body() data: any` |
| 2 | `backend/src/modules/equipment-qr/equipment-qr.controller.ts:79` | `scheduleMaintenance`（POST） | 整體 any | `@Body() data: any` |
| 3 | `backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts:10` | `submitClaim`（POST） | 整體 any | `@Body() body: any` |
| 4 | `backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts:16` | `reviewClaim`（POST） | 整體 any | `@Body() body: any` |
| 5 | `backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts:22` | `markAsPaid`（POST） | 整體 any | `@Body() body: any` |
| 6 | `backend/src/modules/humanitarian-standards/humanitarian-standards.controller.ts:34` | `exportReportsHxl`（POST） | 內嵌 any 欄位 | `@Body() data: { reports: any[]; options?: HxlExportOptions }` |
| 7 | `backend/src/modules/humanitarian-standards/humanitarian-standards.controller.ts:46` | `exportResourcesHxl`（POST） | 內嵌 any 欄位 | `@Body() data: { distributions: any[]; options?: HxlExportOptions }` |
| 8 | `backend/src/modules/humanitarian-standards/humanitarian-standards.controller.ts:60` | `generateIatiXml`（POST） | 整體 any | `@Body() mission: any` |
| 9 | `backend/src/modules/humanitarian-standards/humanitarian-standards.controller.ts:69` | `generateThreeWMatrix`（POST） | 內嵌 any 欄位 | `@Body() data: { missions: any[]; period: { start: string; end: string } }` |
| 10 | `backend/src/modules/humanitarian-standards/humanitarian-standards.controller.ts:84` | `exportThreeWCsv`（POST） | 內嵌 any 欄位 | `@Body() data: { missions: any[]; period: { start: string; end: string } }` |
| 11 | `backend/src/modules/humanitarian-standards/humanitarian-standards.controller.ts:108` | `assessSphereCompliance`（POST） | 內嵌 any 欄位 | `@Body() data: { facilityData: any; category: SphereStandardCategory; }` |
| 12 | `backend/src/modules/humanitarian-standards/humanitarian-standards.controller.ts:123` | `generateSphereReport`（POST） | 內嵌 any 欄位 | `@Body() data: { facilityData: any; assessor: string }` |
| 13 | `backend/src/modules/integrations/integrations.controller.ts:101` | `testWebhook`（POST） | 內嵌 any 欄位 | `@Body() dto: { url: string; payload: any }` |
| 14 | `backend/src/modules/international-standards/international-standards.controller.ts:20` | `generateIcs201`（POST） | 整體 any | `@Body() data: any` |
| 15 | `backend/src/modules/international-standards/international-standards.controller.ts:26` | `generateIcs214`（POST） | 整體 any | `@Body() data: any` |
| 16 | `backend/src/modules/international-standards/international-standards.controller.ts:32` | `validateIcsForm`（POST） | 整體 any | `@Body() data: any` |
| 17 | `backend/src/modules/international-standards/international-standards.controller.ts:46` | `exportMissionsHxl`（POST） | 整體 any 陣列 | `@Body() missions: any[]` |
| 18 | `backend/src/modules/international-standards/international-standards.controller.ts:53` | `exportResourcesHxl`（POST） | 整體 any 陣列 | `@Body() resources: any[]` |
| 19 | `backend/src/modules/international-standards/international-standards.controller.ts:60` | `export3WHxl`（POST） | 整體 any 陣列 | `@Body() activities: any[]` |
| 20 | `backend/src/modules/international-standards/international-standards.controller.ts:89` | `add3WRecord`（POST） | 整體 any | `@Body() data: any` |
| 21 | `backend/src/modules/international-standards/international-standards.controller.ts:107` | `import3WData`（POST） | 整體 any 陣列 | `@Body() data: any[]` |
| 22 | `backend/src/modules/international-standards/international-standards.controller.ts:136` | `quickSphereCheck`（POST） | 整體 any | `@Body() data: any` |
| 23 | `backend/src/modules/interoperability-adapters/interoperability.controller.ts:79` | `createEdxlDistribution`（POST） | 內嵌 any 欄位 | `@Body() body: { sender: string; type: '...'; payload: any; recipients?: string[]; targetAreas?: string[]; keywords?: string[]; incidentId?: string; }` |
| 24 | `backend/src/modules/mission-sessions/iap.controller.ts:126` | `upsertDocument`（PUT） | `Record<string, any>` | `@Body() body: { content: Record<string, any> }` |
| 25 | `backend/src/modules/mission-sessions/sitrep.controller.ts:113` | `logDecision`（POST） | `Record<string, any>`（x2） | `@Body() body: { ...; beforeState?: Record<string, any>; afterState?: Record<string, any>; }` |
| 26 | `backend/src/modules/org-chart/org-chart.controller.ts:10` | `addNode`（POST） | 內嵌 any 欄位 | `@Body() body: { id?: string; name: string; type: string; parentId: string \| null; managerId?: string; metadata?: any }` |
| 27 | `backend/src/modules/org-chart/org-chart.controller.ts:25` | `updateNode`（PUT） | 整體 any | `@Body() updates: any` |
| 28 | `backend/src/modules/payroll/payroll.controller.ts:27` | `calculateMonthlyPayroll`（POST） | 內嵌 any 陣列欄位 | `@Body() body: { shifts: any[] }` |
| 29 | `backend/src/modules/payroll/payroll.controller.ts:65` | `updateRates`（PUT） | 整體 any | `@Body() body: any` |
| 30 | `backend/src/modules/reporting-engine/reporting.controller.ts:27` | `createDefinition`（POST） | 整體 any | `@Body() data: any` |
| 31 | `backend/src/modules/reporting-engine/reporting.controller.ts:112` | `createSchedule`（POST） | 整體 any | `@Body() data: any` |
| 32 | `backend/src/modules/reporting-engine/reporting.controller.ts:118` | `updateSchedule`（PUT） | 整體 any | `@Body() updates: any` |
| 33 | `backend/src/modules/reporting-engine/reporting.controller.ts:150` | `createTemplate`（POST） | 整體 any | `@Body() data: any` |
| 34 | `backend/src/modules/reporting-engine/reporting.controller.ts:156` | `renderTemplate`（POST） | `Record<string, any>` | `@Body() variables: Record<string, any>` |
| 35 | `backend/src/modules/reports/report-scheduler.controller.ts:55` | `createScheduledReport`（POST） | `Record<string, any>` | `@Body() body: { ...; filters?: Record<string, any>; }` |
| 36 | `backend/src/modules/resources/dispatch.controller.ts:63` | `completePicking`（PATCH） | 內嵌 any 陣列欄位 | `@Body() body: { pickedItems: any[]; operatorName: string }` |
| 37 | `backend/src/modules/resources/label-templates.controller.ts:42` | `create`（POST） | `Record<string, any>` | `@Body() body: { ...; layoutConfig: Record<string, any>; }` |
| 38 | `backend/src/modules/resources/label-templates.controller.ts:72` | `update`（PATCH） | `Record<string, any>` | `@Body() body: Partial<{ ...; layoutConfig: Record<string, any>; ... }>` |
| 39 | `backend/src/modules/scalability/scalability.controller.ts:38` | `queueOperation`（POST） | 整體 any | `@Body() data: any` |
| 40 | `backend/src/modules/scalability/scalability.controller.ts:44` | `resolveConflict`（PUT） | 內嵌 any 欄位 | `@Body() body: { resolution: 'use_client' \| 'use_server' \| 'merge'; mergedData?: any }` |
| 41 | `backend/src/modules/scalability/scalability.controller.ts:146` | `updateRateLimitConfig`（PUT） | 整體 any | `@Body() updates: any` |
| 42 | `backend/src/modules/shift-calendar/shift-calendar.controller.ts:38` | `updateShift`（PUT） | 整體 any | `@Body() body: any` |
| 43 | `backend/src/modules/staff-security/staff-security.controller.ts:110` | `createEvacuationPlan`（POST） | 內嵌 any 欄位 | `@Body() body: { locationId: string; plan: any }` |

> 43 筆中 **18 筆**是「整體參數型別即為 `any`／`any[]`」（完全無法通過 `ValidationPipe`/`class-validator` 檢查），**19 筆**是「使用內嵌 object literal 型別、其中至少一個欄位為 `any`／`any[]`」，**6 筆**是 `Record<string, any>`。內嵌 object literal（無論欄位是否為 `any`）本身也不是 DTO class，同樣無法被 `class-validator` 驗證，此為相關但範圍更廣的問題，不在本次「型別為 any」的字面統計中，建議後續任務一併檢視。
> 重疊警示：`international-standards.controller.ts`（8 筆）、`scalability.controller.ts`（3 筆）、`expense-reimbursement.controller.ts`（3 筆）、`humanitarian-standards.controller.ts`（6 筆）、`reporting-engine/reporting.controller.ts`（5 筆）同時出現在表一「裸 controller」，屬於**授權缺口 + 輸入驗證缺口疊加**的高風險 controller，建議優先處理。

---

## 與舊數字（31）的差異說明

任務背景提供的估計為「約 31 個 controller 沒有 `@UseGuards(UnifiedRolesGuard)`/`@RequiredLevel`」。本次精確掃描結果為：

- **43** 個「裸」controller（class 與 handler 皆無保護，literal 定義）
- 另有 **9** 個「部分保護」controller，其中 **7** 個存在真正的角色檢查缺口（`accounts`、`auth.controller`、`features`、`line-bot`、`ncdr-alerts`、`reports`、`reunification`；`auth-oauth` 與 `line-liff` 的例外屬合理設計）

**差異（43 vs 31，多出 12～19 筆）可能原因**：

1. **範圍成長**：本次掃描到 122 個 controller；若舊估計是在較早期的 commit 上做的，當時 controller 數量可能較少（新模組如 `psychological-support`、`fatigue-detection`、`scalability`、`social-media-monitor` 等疑似為後期加入），"31" 可能只反映當時的程式庫規模。
2. **定義口徑不同**：舊估計可能只計算「class-level 完全沒有 `@UseGuards`」的 controller，未細看 handler-level 是否有補救；本次盤點採「class + handler 都要沒有」才算裸（更嚴格的「完全無保護」定義），理論上這樣算出來的數字應該**更少**而非更多，因此如果舊估計是用這個口徑，43 這個數字代表舊估計本身有低估，或掃描時遺漏了部分子模組（例如 `mission-sessions/*`、`overlays/*` 這些子路由較深的 controller 較容易被手動盤點時漏掉）。
3. **`CoreJwtGuard`-only 是否算「有保護」的認定不同**：若舊估計把「有 `@UseGuards(CoreJwtGuard)`」算作「已保護」（因為看起來像是有 Guard），則會少算 `resources-analytics`、`vms`、`menu-config` 這類「看似有保護但無角色判斷」的 controller；但這只能解釋 3 筆的差異，無法解釋全部落差。
4. **表二「部分保護」是否被計入舊估計**：若舊估計未區分「完全裸」與「部分保護但有缺口」，兩者相加（43 + 7 = 50）與 31 的落差更大，顯示舊數字很可能是抽樣/粗估而非全量掃描結果。

**結論**：本文件的 43（裸）+ 9（部分保護，其中 7 個為真缺口）應視為目前最準確的基準數字，建議後續 OPUS 任務以此為準，「31」僅作為歷史參考，不再使用。

---

## 方法限制（Known Limitations）

1. **Table 1/2 判讀邏輯為自製 Node.js 逐行掃描腳本**（非完整 TypeScript AST），透過「class 宣告前的最後一個 `import` 到 `export class` 之間」視為 class-level decorator 區塊，並以括號深度追蹤方式合併跨行的 handler decorator 與參數簽名。對於極少數裝飾器書寫風格特殊（例如裝飾器與 import 之間插入非裝飾器程式碼）的 controller，可能有誤判風險，建議重跑腳本前先用下方「附錄：掃描指令」的 grep 指令做交叉驗證。
2. `@RequiredLevel(` 字面比對**未區分**新舊兩份同名定義（`unified-roles.guard.ts` vs `common/guards/admin.guard.ts`）；若有 controller 誤用舊版 `admin.guard.ts` 的 `RequiredLevel`（與 `UnifiedRolesGuard` 不搭配），本次會誤判為「已保護」，建議後續任務單獨核對 `@RequiredLevel(` 的 import 來源。
3. 敏感度與建議 Level 為**初判**，僅依 controller/module 命名與程式碼概略內容判斷，未逐一確認底層 Service/Entity 實際欄位是否含個資，最終分級請由後續任務結合資料盤點（DPIA）拍板。
4. 表四僅涵蓋 `@Body()`；`@Query()`/`@Param()` 型別為 `any` 的情形未在本次範圍內，如需要可另立任務。

---

## 附錄：掃描指令（供重跑核對）

### 找出所有 controller 檔案（排除 spec）

```bash
find backend/src -name "*.controller.ts" | grep -v spec | sort
# 122 個
```

### 表一/表二：class + handler 授權掃描方法論

因 NestJS 的 class-level 與 handler-level 裝飾器需要「class 宣告位置」與「跨行參數/裝飾器合併」才能準確判定，單純 grep 無法完整重現本文件表一/表二的統計，需搭配腳本解析：對每個 controller 檔案，

1. 找到 `export class \w+Controller` 所在行，往上回溯到「上一個 `import` 陳述式結束」之間的區塊視為 class-level decorator 區。在此區塊中搜尋 `@UseGuards\(([^)]*)\)` 是否含 `UnifiedRolesGuard`、`@RequiredLevel\(`、`@RequiredRoles\(`。
2. 從 class 宣告之後開始逐行掃描，用「遇到 `@` 開頭視為裝飾器（含括號深度追蹤跨行合併）、遇到符合 `(async )?methodName(` 且前面已收集到 `@Get/@Post/@Put/@Patch/@Delete/@All` 之一才視為一個 handler」的規則，收集每個 handler 的裝飾器清單與完整參數簽名（同樣以括號深度追蹤跨行合併）。
3. 若 class 與所有 handler 皆不含 `UnifiedRolesGuard`/`@RequiredLevel(`/`@RequiredRoles(` → 列入表一；若 class 有保護但存在 handler 標了 `@Public()`，或 class 無保護但部分 handler 個別補了保護 → 列入表二。

以下 grep 指令可作為**快速交叉驗證**（非完整判讀，但可核對特定 controller 是否遺漏）：

```bash
# 檢查某 controller 的 class-level 保護（人工核對用，B 為檔案路徑）
sed -n '1,40p' <B>   # 檢視 import 與 class 宣告之間的裝飾器

# 全庫搜尋 UnifiedRolesGuard / RequiredLevel / RequiredRoles 出現的 controller 檔案
grep -rl "UnifiedRolesGuard\|@RequiredLevel(\|@RequiredRoles(" backend/src --include="*.controller.ts"

# 反向：完全沒出現上述三者的 controller 檔案（粗略下界，未區分 class/handler 位置）
grep -rL "UnifiedRolesGuard\|@RequiredLevel(\|@RequiredRoles(" backend/src --include="*.controller.ts" | grep -v spec
```

已實際重跑上述反向 grep 做交叉驗證：結果為 **42** 個檔案，比表一的 43 少 1 個。差異來自
`backend/src/modules/manuals/manuals.controller.ts`：該檔案第 3 行 `import { OptionalJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';`
**有** import `UnifiedRolesGuard`/`RequiredLevel`，因此純文字 grep 會判定「有出現」而漏掉它；但實際上整份檔案**沒有任何一個 handler 或 class 真正套用**這兩個 import（屬死 import），本文件的腳本正確地將其歸入表一。這個案例也說明了為何表一/表二**不能只靠 grep**，必須以「decorator 是否實際套用在 class/handler 上」為準，也印證了「舊數字 31」若是用簡易 grep 盤點，很可能會低估（如同這裡少算 1 筆的道理）。

### 表三：`@Public()` 使用清單

```bash
grep -rn "^\s*@Public()" backend/src --include="*.controller.ts"
# 20 處

# 找出兩份 Public 定義來源
grep -rn "export const Public = " backend/src
# backend/src/modules/shared/guards/public.decorator.ts:17
# backend/src/modules/auth/decorators/public.decorator.ts:25

# 核對各檔案 import 的是哪一份
grep -rn "import { Public }\|import {.*Public.*} from" backend/src --include="*.controller.ts"
```

### 表四：`@Body()` 型別為 any/無型別/Record<string, any>

```bash
# 列出所有 @Body( 出現位置
grep -rn "@Body(" backend/src --include="*.controller.ts"

# 篩選整體型別為 any 的（跨行案例需人工核對完整參數簽名）
grep -rnE "@Body\(\)\s*\w+\s*:\s*any\b" backend/src --include="*.controller.ts"

# 篩選 Record<string, any>
grep -rn "Record<string, any>\|Record<string,any>" backend/src --include="*.controller.ts"

# 篩選內嵌 any 欄位（含陣列 any[]），需人工排除誤判（如型別名稱含 "Company" 等含 any 子字串的情形）
grep -rnE "@Body\([^)]*\)\s*\w+\s*:\s*\{[^}]*\bany\b" backend/src --include="*.controller.ts"
```
