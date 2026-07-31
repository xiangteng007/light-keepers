# 授權等級落地對照表 A（高敏感度）

> 對應 `docs/FULL_SYSTEM_REDESIGN_PLAN.md` 工作項 **1.5**，處理 `docs/audit/AUTHZ_GAP_INVENTORY.md`（工作項 1.4）中：
> - **表一「高敏感度」16 個裸 controller**
> - **表二 7 個有真實缺口的部分保護 controller**（`accounts`、`auth.controller`、`features`、`line-bot`、`ncdr-alerts`、`reports`、`reunification`）
>
> 表一的中／低敏感度項目由平行任務 B 負責，本文件不涉及。
>
> Guard：`@UseGuards(CoreJwtGuard, UnifiedRolesGuard)`；等級：`@RequiredLevel(ROLE_LEVELS.*)`。
> 等級對照：`0 PUBLIC / 1 VOLUNTEER / 2 OFFICER / 3 DIRECTOR / 4 CHAIRMAN / 5 OWNER`。

## 定級原則（本次採用）

| 情境 | Level |
|---|---|
| 讀／寫本人資料（profile、出勤、心情、車籍、保單、積分、報銷申請） | L1 |
| 營運讀取、跨人員清單、派遣與作戰資料寫入 | L2 |
| 簽核／核准、財務審核、個資批次匯出、系統設定讀取、心理健康跨人員彙整 | L3 |
| 金流出帳、全域設定變更、破壞性操作、主檔種子資料 | L4 |
| 稽核軌跡查詢（誰讀過誰的個資） | L5 |

class 級設保守基準，個別 handler 以 `@RequiredLevel` 覆寫收緊或放寬（`UnifiedRolesGuard` 以 `getAllAndOverride` 讀取，handler 優先於 class）。

## 涵蓋範圍與定級分布

| | Controller class | 端點 |
|---|---|---|
| 表一（高敏感度，含 `vms` 的 6 個 class） | 16 檔／21 class | 186（其中 `POST /intake` 維持既有 `@Public()`，未變更） |
| 表二（部分保護，僅補缺口 handler） | 7 檔／7 class | 23 |
| **合計（本次實際定級）** | **23 檔／28 class** | **208** |

| Level | 端點數 |
|---|---|
| L1 VOLUNTEER | 82 |
| L2 OFFICER | 82 |
| L3 DIRECTOR | 36 |
| L4 CHAIRMAN | 6 |
| L5 OWNER | 2 |
| L0（既有 `@Public()`，未動） | 1 |

## 兩條界線（本次刻意不做的事）

1. **不單方面擴大公開介面。** `@RequiredLevel(0)` 在 `GlobalAuthGuard` 中等同 `@Public()`（`global-auth.guard.ts:77`），會把目前被 default-deny 擋住的端點改為匿名可存取。公開介面的 SSOT 是 `docs/policy/public-surface.policy.json`，凡未收錄者本次一律不放寬到 L0（詳見「後續建議」）。
2. **不動既有 `@Public()` 與 OAuth／LIFF 例外。** 亦不對「語意上需要 `@Public()` 但目前漏標」的端點加上等級標記——加了之後日後就無法單靠 `@Public()` 修復。這些端點目前受全域 default-deny 保護，不存在「任何人可存取」的授權缺口，只存在功能面斷線。

**重要實作限制**：`CoreJwtGuard` **不認得 `@Public()`**（見 `core-jwt.guard.ts:46`，無 token 即直接 401）。因此凡 class 底下有 `@Public()` handler 者（`intake`），Guard 只能掛在 handler 而不能掛 class，否則會連匿名端點一起擋掉。

---

## 表一：高敏感度裸 controller（16 個）

### 1. `backend/src/modules/volunteers/vms.controller.ts` — 6 個 class / 40 端點

原狀：class 僅 `@UseGuards(CoreJwtGuard)`，無任何角色判斷（登入即可全改）。

#### SkillsController（`skills`，class 基準 L3）

| 端點 | Level | 理由 |
|---|---|---|
| `GET /skills` | 1 | 志工填寫個人專長需查閱技能清單 |
| `GET /skills/categories` | 1 | 同上，純列舉資料 |
| `GET /skills/:id` | 1 | 同上 |
| `POST /skills` | 3 | 技能主檔異動屬組織治理 |
| `PATCH /skills/:id` | 3 | 同上 |
| `POST /skills/seed` | 4 | 批次覆寫全站主檔，破壞性 |

#### VehiclesController（`vehicles`，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET /vehicles/volunteer/:volunteerId` | 1 | 前台 `/my-vehicles`（L1 自助頁）必需 |
| `GET /vehicles/types` | 1 | 純列舉 |
| `GET /vehicles/purposes` | 1 | 純列舉 |
| `GET /vehicles/expiring` | 2 | 跨人員保險到期名單，批次個資 |
| `GET /vehicles/:id` | 1 | 自助頁編輯需求 |
| `POST /vehicles` | 1 | 志工登錄本人車籍 |
| `PATCH /vehicles/:id` | 1 | 同上 |
| `DELETE /vehicles/:id` | 1 | 停用（軟刪）本人車籍，自助頁必需 |

#### InsuranceController（`insurance`，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET /insurance/volunteer/:volunteerId` | 1 | 前台 `/my-insurance`（L1）必需 |
| `GET /insurance/volunteer/:volunteerId/active` | 1 | 同上 |
| `GET /insurance/types` | 1 | 純列舉 |
| `GET /insurance/expiring` | 2 | 跨人員到期名單，批次個資 |
| `POST /insurance/check-coverage` | 1 | 派工前承保檢核，第一線需求 |
| `GET /insurance/:id` | 1 | 自助頁編輯需求 |
| `POST /insurance` | 1 | 本人保單登錄 |
| `PATCH /insurance/:id` | 1 | 同上 |
| `DELETE /insurance/:id` | 1 | 停用本人保單 |

#### PointsController（`points`，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET /points/volunteer/:volunteerId` | 1 | 前台 `/my-points`（L1）必需 |
| `GET /points/volunteer/:volunteerId/summary` | 1 | 同上 |
| `GET /points/volunteer/:volunteerId/yearly/:year` | 1 | 同上 |
| `POST /points/record` | 2 | 代他人登錄積分，督導職權 |
| `POST /points/task` | 2 | 同上 |
| `POST /points/training` | 2 | 同上 |
| `POST /points/adjust` | 3 | 人工加減分，舞弊風險最高 |
| `GET /points/export` | 3 | 跨人員積分批次匯出 |

#### CheckInController（`checkin`，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `POST /checkin` | 1 | 本人簽到 |
| `POST /checkin/out` | 1 | 本人簽退 |
| `GET /checkin/status/:volunteerId` | 1 | 查本人在勤狀態 |
| `GET /checkin/active` | 2 | 全域在勤名單，跨人員即時狀態 |
| `DELETE /checkin/:volunteerId` | 2 | 代撤銷出勤紀錄，影響時數與保險認定 |

#### ExpiryNotificationController（`expiry-notifications`，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET /expiry-notifications` | 2 | 跨人員證照／保險到期彙整 |
| `GET /expiry-notifications/volunteer/:volunteerId` | 1 | 查本人到期項目 |
| `GET /expiry-notifications/today` | 2 | 同批次個資 |
| `POST /expiry-notifications/send-line` | 3 | 對全體實際發出 LINE 推播，不可回收 |

**殘留風險**：`vehicles` / `insurance` / `points` / `checkin` 皆以 `volunteerId` 參數定位資料且 service 層無擁有者比對，L1 仍可操作他人資料（IDOR）。等級無法修補此類問題，須另案導入 `ResourceOwnerGuard` 或改由 JWT 取 uid。

---

### 2. `backend/src/modules/scalability/scalability.controller.ts`（`scalability`，21 端點，class 基準 L4）

| 端點 | Level | 理由 |
|---|---|---|
| `GET scalability/health` | 3 | 系統健康揭露基礎設施狀態 |
| `GET offline/:clientId/pending` | 2 | 外勤使用者自己的待同步佇列 |
| `GET offline/:clientId/conflicts` | 2 | 同上 |
| `POST offline/:clientId/sync` | 2 | 同上，第一線作業 |
| `POST offline/queue` | 2 | 同上 |
| `PUT offline/:operationId/resolve` | 2 | 衝突解決屬第一線判斷 |
| `GET api/versions` | 1 | 用戶端相容性查詢，全員需要 |
| `GET api/versions/current` | 1 | 同上 |
| `GET api/versions/:version` | 1 | 同上 |
| `GET api/negotiate` | 1 | 同上 |
| `GET sla/targets` | 3 | 營運指標 |
| `GET sla/metrics` | 3 | 同上 |
| `GET sla/report` | 3 | 同上 |
| `GET sla/compliant` | 3 | 同上 |
| `GET circuits` | 3 | 熔斷器狀態揭露外部依賴拓撲 |
| `GET circuits/:name` | 3 | 同上 |
| `POST circuits/:name/reset` | 4 | 重置韌性機制，影響全系統 |
| `GET rate-limits` | 3 | 限流配置揭露防護門檻 |
| `GET rate-limits/:name/:key` | 3 | 同上 |
| `PUT rate-limits/:name` | 4 | 竄改限流＝解除全系統防護 |
| `POST rate-limits/:name/:key/reset` | 4 | 同上 |

---

### 3. `backend/src/modules/international-standards/international-standards.controller.ts`（`standards`，19 端點，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET ics/templates/:formType` | 1 | 純標準定義，不含營運資料 |
| `GET ics/forms` | 1 | 同上 |
| `GET sphere/indicators` | 1 | 同上 |
| `GET sphere/indicators/:standard` | 1 | 同上 |
| `POST ocha/import` | 3 | 批次寫入共用 3W 資料集，可覆蓋跨機構協調資料 |
| 其餘 14 個（ICS 生成／驗證、HXL 匯出、3W 讀寫、Sphere 檢核等） | 2 | 對外（跨機構、國際組織）交換作戰與資源資料，匯出即離開組織邊界 |

---

### 4. `backend/src/modules/reporting-engine/reporting.controller.ts`（`reports`，18 端點，class 基準 L3）

| 端點 | Level | 理由 |
|---|---|---|
| `GET definitions` / `definitions/:id` | 2 | 查看既有報表定義 |
| `POST definitions` | 3 | 建立定義＝決定能撈到哪些欄位 |
| `POST generate/:definitionId` | 2 | 執行既有定義，日常營運 |
| `GET generated` / `generated/:id` | 2 | 查看產出 |
| `POST export/:reportId` | 2 | 匯出既有報表 |
| `POST generate-and-export/:definitionId` | 2 | 同上 |
| `GET schedules` / `schedules/:id` | 2 | 查看排程 |
| `POST schedules` | 3 | 建立自動外送排程 |
| `PUT schedules/:id` | 3 | 變更外送對象／內容 |
| `DELETE schedules/:id` | 4 | 破壞性 |
| `POST schedules/:id/trigger` | 3 | 手動觸發外送 |
| `GET templates` / `templates/:id` | 2 | 查看範本 |
| `POST templates` | 3 | 建立範本 |
| `POST templates/:id/render` | 2 | 渲染既有範本 |

class 基準 L3 對齊前台 `/reports/export` 的 L3 閘門。

---

### 5. `backend/src/modules/overlays/map-dispatch.controller.ts`（`api/missions/:sessionId/map`，13 端點，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET sectors` | 1 | 外勤執行任務所需態勢圖層 |
| `GET rally-points` | 1 | 同上 |
| `GET routes` | 1 | 同上 |
| `GET eta` | 1 | ETA 試算，行進判斷 |
| 其餘 9 個（建立責任區／集結點／路徑、指派小隊、狀態更新、框選派遣、責任區派遣） | 2 | 直接產生實地任務並指派小隊，屬派遣權責 |

註：集結點含 `contactName`／`contactPhone`，故讀取仍要求 L1 而非 L0。

---

### 6. `backend/src/modules/psychological-support/mood-tracker.controller.ts`（`api/care`，12 端點，class 基準 L3）

以「本人 vs 他人」為軸，而非讀寫為軸。

| 端點 | Level | 理由 |
|---|---|---|
| `POST mood` | 1 | 本人記錄心情（前台 `care/MyMoodPage`） |
| `GET mood/history/:userId` | 1 | 查本人心情歷史 |
| `GET mood/summary/:userId` | 1 | 同上 |
| `GET mood/team-trend` | 3 | 跨人員心理健康彙整 |
| `GET mood/attention` | 3 | **直接點名高風險個人**，外洩造成二次傷害 |
| `GET blessings` | 1 | 祈福牆社群互動 |
| `POST blessings` | 1 | 同上 |
| `POST blessings/:id/like` | 1 | 同上 |
| `POST chat` | 1 | 與 HopeBot 對話，自助療癒 |
| `GET chat/history/:userId` | 1 | 查本人對話紀錄 |
| `POST chat/new-session` | 1 | 同上 |
| `GET stats` | 3 | 跨人員心理支持統計 |

**殘留風險（本模組最高）**：`mood/*`、`chat/history` 以 path param 帶 `userId` 且無擁有者比對，L1 仍可讀他人心情與對話紀錄（IDOR）。須另案以 `ResourceOwnerGuard` 或改由 JWT 取 `userId` 修補。

---

### 7. `backend/src/modules/mission-sessions/iap.controller.ts`（12 端點，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET periods` / `periods/active` | 1 | 出勤人員執行任務的依據 |
| `GET periods/:periodId/documents` / `.../:docType` | 1 | 同上 |
| `GET periods/:periodId/export` | 1 | 同上 |
| `POST periods` / `PUT periods/:periodId` | 2 | 幕僚撰寫作戰計畫 |
| `PUT periods/:periodId/documents/:docType` | 2 | 同上 |
| `POST periods/:periodId/approve` | 3 | 核准＝指揮權行為 |
| `POST periods/:periodId/activate` | 3 | 啟動作戰週期，改變全隊行動依據 |
| `POST periods/:periodId/close` | 3 | 關閉作戰週期 |
| `POST periods/:periodId/documents/:docId/approve` | 3 | 文件核准 |

---

### 8. `backend/src/modules/mission-sessions/aar.controller.ts`（8 端點，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET /` | 1 | 復盤結論為全員學習教材 |
| `GET timeline` | 1 | 同上 |
| `GET statistics` | 1 | 同上 |
| `GET :aarId/export` | 1 | 同上 |
| `POST /` / `POST generate` / `PUT :aarId` | 2 | 撰寫含決策檢討與失誤紀錄的課責文件 |
| `POST :aarId/finalize` | 3 | 定稿＝把對人的評價固化為組織正式紀錄 |

---

### 9. `backend/src/modules/mission-sessions/sitrep.controller.ts`（8 端點，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET /` | 1 | 全隊掌握現況 |
| `GET decisions` | 1 | 決策可追溯性本身即課責機制 |
| `GET decisions/entity/:entityType/:entityId` | 1 | 同上 |
| `POST /` / `POST generate` / `PUT :sitrepId` | 2 | 含傷亡數字與資源缺口，撰寫屬幕僚作業 |
| `POST decisions` | 2 | 記錄決策 |
| `POST :sitrepId/approve` | 3 | 核准＝對外發布定稿情勢報告，指揮官發言權 |

---

### 10. `backend/src/modules/expense-reimbursement/expense-reimbursement.controller.ts`（`api/expenses`，7 端點，class 基準 L3）

維持「申請／審核／撥款」職權分立。

| 端點 | Level | 理由 |
|---|---|---|
| `POST /` | 1 | 志工墊付後提交報銷的權利 |
| `GET submitter/:id` | 1 | 查本人報銷紀錄 |
| `GET categories` | 1 | 填單所需的類別列舉 |
| `POST :id/review` | 3 | 財務把關 |
| `GET pending` | 3 | 待審清單揭露全會經費流向 |
| `GET stats` | 3 | 同上 |
| `POST :id/pay` | 4 | 確認金流出帳 |

---

### 11. `backend/src/modules/mission-sessions/mission-report.controller.ts`（`mission-reports`，6 端點，class 級統一 L2）

六個端點是同一份資料的不同輸出格式（PDF／CSV／JSON × 檢視／下載），風險相同，故不做 handler 覆寫。理由：任務報表把整場任務的人員、時序、決策與受助對象打包成可離線攜出的檔案，下載後即脫離系統控管。

---

### 12. `backend/src/modules/line-bot/disaster-report/ai-vision.controller.ts`（`ai`，5 端點，class 基準 L1）

| 端點 | Level | 理由 |
|---|---|---|
| `POST vision/analyze` | 1 | 回報災情是第一線核心動作 |
| `POST vision/flood-level` | 1 | 同上 |
| `POST vision/damage-assessment` | 1 | 同上 |
| `POST classify` | 1 | 同上 |
| `POST classify/batch` | 2 | 批次（最多 10 筆），成本與資料量級不同 |

風險面向有二：現場影像可能含受災者／傷患／門牌住址（送入 AI ＝交給外部模型）；每次呼叫消耗付費 AI 額度（無門檻＝成本濫用管道）。

---

### 13. `backend/src/modules/fatigue-detection/fatigue-detection.controller.ts`（`api/fatigue`，5 端點，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET volunteer/:id` | 1 | 志工需知道自己還能不能上工 |
| `GET thresholds` | 1 | 同上，純設定列舉 |
| `GET needs-rest` | 2 | 跨人員健康狀態名單 |
| `POST validate-shift` | 2 | 排班驗證屬督導職權 |
| `POST record-duty` | 2 | 出勤登錄屬督導職權 |

---

### 14. `backend/src/modules/voice/voice-call.controller.ts`（`api/voice`，5 端點，class 基準 L2）

| 端點 | Level | 理由 |
|---|---|---|
| `GET users/online` | 1 | 撥打前的必要資訊 |
| `GET turn-credentials` | 1 | 建立 WebRTC 連線所需 |
| `GET stats` | 2 | 營運指標 |
| `POST call/line` | 2 | 對特定人發起通話邀請，主動觸及 |
| `POST broadcast/:missionId` | 2 | 對整個任務廣播，不可回收 |

**既有缺陷（非本次範圍）**：`turn-credentials` 直接回傳 `TURN_SERVER_SECRET`，應改為 time-limited HMAC 憑證。已加註於程式碼。

---

### 15. `backend/src/modules/intake/intake.controller.ts`（`intake`，4 端點）

| 端點 | Level | 理由 |
|---|---|---|
| `POST /intake` | 0（`@Public()`，**未改**） | 設計上允許匿名通報，已列於 `public-surface.policy.json` |
| `GET /intake` | 2 | 讓實作對齊既有註解「需要 L2+ 權限」 |
| `GET /intake/:id` | 2 | 同上 |
| `GET /intake/incident/:incidentId` | 2 | 同上 |

修補的是「原始碼註解寫需要 L2、實際卻完全沒有 Guard，任何登入者可列出全部災情通報個資」的落差。
Guard 掛在 handler 而非 class——因為 `CoreJwtGuard` 不認 `@Public()`，掛 class 會擋掉匿名通報。

---

### 16. `backend/src/modules/resources/sensitive.controller.ts`（`sensitive`，3 端點，class 基準 L5）

| 端點 | Level | 理由 |
|---|---|---|
| `POST sensitive/read` | 2 | 取用受管制個資需具業務理由；對齊前台 `/approvals` 的 L2 閘門 |
| `POST sensitive/audit-logs` | 5 | 稽核軌跡查詢（誰讀過誰的個資） |
| `POST sensitive/read-logs` | 5 | 同上 |

method 內既有的 `roleLevel < 5` 硬編碼檢查刻意保留為第二道防線。

---

## 表二：部分保護 controller（7 個真缺口）

| # | 檔案 | 端點 | Level | 理由 |
|---|---|---|---|---|
| 1 | `accounts/accounts.controller.ts` | `GET /accounts/roles` | 3 | 角色清單含 level 對照＝提權偵察起點；僅被 L3-L4 權限管理頁使用 |
| | | `GET /accounts/page-permissions` | 1 | `PermissionsProvider` 為每位登入者載入；拉高會讓志工選單退回前端預設值。防線在寫入端（`PATCH` 已是 L5） |
| 2 | `auth/auth.controller.ts` | `GET /auth/permissions` | 3 | 與 `/accounts/page-permissions` 重複且全庫無呼叫端，以保守標準定級 |
| | | `GET /auth/roles` | 3 | 與 `/accounts/roles` 重複且無呼叫端，兩者一致 |
| 3 | `features/feature-flags.controller.ts` | `GET /features/evaluate/all` | 1 | 用戶端啟動必需；回傳的是本人情境評估結果而非旗標定義全文 |
| | | `GET /features/evaluate/:key` | 1 | 同上 |
| | | `GET /features/client/enabled` | 1 | 同上 |
| 4 | `line-bot/line-bot.controller.ts` | `GET /line-bot/rich-menu-config` | 3 | 對外通道的系統設定 |
| | | `GET /line-bot/binding-status/:lineUserId` | 1 | 本人帳號綁定狀態自助查詢 |
| | | `GET /line-bot/stats` | 2 | 揭露已綁定用戶總數（組織規模指標） |
| | | `POST /line-bot/webhook` | 未動 | LINE 平台 callback，呼叫方永無 JWT；來源驗證由 method 內 `x-line-signature` HMAC 負責。需要的是 `@Public()`＋政策收錄，屬功能面決策 |
| 5 | `ncdr-alerts/ncdr-alerts.controller.ts` | `GET /ncdr-alerts/types` | 1 | 政府發布的國家級示警，同內容已由 `GET /public/alerts` 匿名提供，不需營運等級 |
| | | `GET /ncdr-alerts` | 1 | 同上 |
| | | `GET /ncdr-alerts/map` | 1 | 同上 |
| | | `GET /ncdr-alerts/stats` | 1 | 同上 |
| 6 | `reports/reports.controller.ts` | `POST /reports` | 1 | 第一線核心動作，不宜收到 L2；匿名管道由 `POST /intake` 承擔 |
| | | `GET /reports/map` | 1 | 僅回傳已確認回報，但含災情位置 |
| | | `GET /reports/stats` | 1 | 同上 |
| 7 | `reunification/reunification.controller.ts` | `GET /reunification/search` | 1 | 憑查詢碼查詢；不單方面擴大為匿名端點 |
| | | `POST /reunification/reports` | 2 | 原本掛了 Guard 卻無 `@RequiredLevel`＝只驗登入 |
| | | `GET /reunification/missions/:id` | 2 | 同上；跨人員失蹤者個資清單 |
| | | `GET /reunification/missions/:id/stats` | 2 | 同上 |
| | | `PUT /reunification/:id/found` | 2 | 同上；改寫個案狀態會連動家屬期待 |
| | | `PUT /reunification/:id/reunited` | 2 | 同上 |

**`reunification` 的額外發現**：五個「管理端 API」原本已掛 `@UseGuards(CoreJwtGuard, UnifiedRolesGuard)`，但**完全沒有 `@RequiredLevel`**。依 `UnifiedRolesGuard` 實作（`unified-roles.guard.ts:92`），未設定等級即直接 `return true`——看起來有保護，實際只驗登入。這是 1.4 盤點未捕捉到的一類缺口，建議另立掃描規則：「有 `UnifiedRolesGuard` 但同一 handler／class 無 `@RequiredLevel`／`@RequiredRoles`」。

---

## 與 1.4（SONNET）初判不同的判例

| 項目 | SONNET 初判 | 本次定案 | 改判理由 |
|---|---|---|---|
| `sensitive` 全體 | L3 | `read` L2、`audit-logs`／`read-logs` L5 | method 內既有 `roleLevel < 5` 檢查，實際門檻本就是 OWNER。宣告式等級對齊實際行為以「零行為變更」為優先；`read` 反而下修至 L2 以對齊前台 `/approvals` 的 L2 閘門，否則一線審核作業無法進行 |
| `mood-tracker` 讀他人 | L2（輔導人員查他人） | L3 | 「需關注使用者」名單直接點名高風險個人，屬特種個資，外洩造成二次傷害；對齊 `sensitive-audit` 的 L3 閘門 |
| `vms` 寫入 | L2-L3 | 車籍／保單／出勤的增改停用皆 L1 | 前台 `/my-vehicles`、`/my-insurance` 是 L1 自助頁面且會呼叫 create／update／delete，定 L2 會直接讓 L1 頁面全毀。改以「殘留 IDOR 另案處理」的方式記錄 |
| `international-standards` 全體 | L2 | 標準定義查詢 L1、`ocha/import` L3 | 表單範本與 Sphere 指標不含營運資料，無收 L2 之必要；反之匯入會覆蓋跨機構共用資料集，需高於基準 |
| `scalability` 全體 | L4 | API 版本 L1、離線同步 L2、其餘 L3-L4 | 版本協商是所有用戶端啟動時的相容性查詢，離線佇列是外勤本人的資料，一律 L4 會讓離線模式無法運作 |
| `reporting-engine` 全體 | L2 | class L3，執行／匯出 L2，刪除排程 L4 | 報表引擎是通用資料匯出管道，「建立定義」決定能撈到哪些欄位，與「執行既有定義」的風險不同級 |
| `intake` 查詢類 | L2 | L2（一致） | 一致；但實作上只能掛 handler 級 Guard（`CoreJwtGuard` 不認 `@Public()`） |
| `expense-reimbursement` | L2 送出／L3 審核撥款 | L1 送出、L3 審核、L4 撥款 | 送出報銷是墊付志工的權利（L2 會排除一線）；撥款＝確認金流出帳，應與審核分權至 L4 |
| `ncdr-alerts` GET | 「可能設計上本應公開，需覆核」 | L1（非 L0） | 多項證據顯示設計意圖為 L0（本檔註解、`seed.service.ts` 的 `RoleLevel.PUBLIC`、前端路由未包 `ProtectedRoute`、`client.ts` 的 publicPaths），但 `public-surface.policy.json` 未收錄。不由安全強化任務單方面擴大公開介面 |
| `reports` create/map/stats | 「風險中等」 | 全部 L1 | 原碼標「公開」實則無 Guard；`create` 若收到 L2 會擋掉第一線回報，匿名需求已由 `POST /intake` 承擔 |
| `accounts` getPagePermissions | 「中高風險，可能被用於權限枚舉」 | L1（僅 getRoles 收到 L3） | `PermissionsProvider` 為每位登入者載入此端點，收緊會讓志工選單退回前端硬編碼預設值；真正的風險在寫入端，該端已是 L5 |
| `auth` OTP／OAuth／logout | 「需覆核是漏標 `@Public()` 還是漏做角色檢查」 | 確認為漏標 `@Public()`，本次不動 | 加上等級標記會讓日後無法只靠 `@Public()` 修復；且全域 default-deny 下不存在授權缺口，只有功能面斷線 |
| `line-bot` webhook | 「若已驗簽章則為漏標 `@Public()`」 | 確認已驗簽章（`x-line-signature` HMAC），本次不動 | 同上 |

---

## 後續建議（不在本次範圍）

1. **公開介面治理**：`docs/policy/public-surface.policy.json` 目前僅收錄 12 條，與實際的 `@Public()` 使用（20 處，含整個 `PublicController`）嚴重不同步。建議先補齊政策檔，再一次性決定下列端點是否恢復匿名：`/ncdr-alerts` 讀取（4）、`/reports` map+stats、`/reunification/search`、`/line-bot/webhook`、`auth` 的 OAuth／LIFF／Firebase／OTP 系列（約 15）、`POST /auth/logout`、`/public/*`、`/line-liff/config`。
2. **IDOR**：`vms`（vehicles／insurance／points／checkin）、`mood-tracker`、`fatigue-detection` 皆以 URL 參數定位個人資料而無擁有者比對。導入 `ResourceOwnerGuard`，或改由 JWT 取 uid 而非信任參數。
3. **掃描規則補強**：新增「有 `UnifiedRolesGuard` 但無 `@RequiredLevel`／`@RequiredRoles`」的偵測（`reunification` 有 5 個、`auth` 有多個此類 handler）——目前看起來有保護，實際只驗登入。
4. **`CoreJwtGuard` 與 `@Public()` 不相容**：建議讓 `CoreJwtGuard` 也讀取 `IS_PUBLIC_KEY` 並放行，否則 class 級 Guard 永遠無法用在含公開端點的 controller 上。
5. **`turn-credentials` 洩漏 TURN 共用密鑰**（`voice-call.controller.ts`），應改為 time-limited HMAC 憑證。
6. **前端斷線**：`PublicSearchPage` 呼叫 `/api/reunification/search/{code}`，後端實際是 `/reunification/search?code=`，路徑與參數形式皆不符。
