# Route × Page × Sidebar × 權限 四方對帳表

- **工作項**：FULL_SYSTEM_REDESIGN_PLAN.md 2.1（FE-1）
- **範圍**：`web-dashboard/src`（前端 SPA），react-router v6
- **產出日期**：2026-07-31
- **狀態**：純掃描，未修改任何程式碼；所有處置建議標註「待 owner 圈選」

> 本文件是純靜態掃描結果，交叉比對 4 個來源：`src/routes/*.routes.tsx`（8 檔）、`src/pages/**`（頁面元件）、
> `src/components/layout/useSidebarConfig.ts`（側欄）、`src/config/page-policy.ts`（Policy SSOT）以及
> `src/components/layout/widget.types.ts` 的 `PAGE_WIDGET_CONFIGS`。掃描方法見各章節「掃描方法」小節，
> 可用同樣的 grep/node 指令重新驗證。

---

## 0. 對照先前深掃結論——本次驗證後的修正

background 提供的先前深掃結論，本次逐條重新掃描後，有 3 點需要**修正**：

| 先前結論 | 本次驗證結果 | 差異說明 |
|---|---|---|
| `LazyPages.tsx` 只掛 81 個 page | **實際 90 個**（`grep -c "lazyWithSuspense(" LazyPages.tsx` = 91，扣掉函式定義本身 1 行 = 90 個 export） | 少算 9 個 |
| 16 條空殼路由「`PAGE_WIDGET_CONFIGS` 無對應 key」 | 空殼路由確實是 **16 條**（用 `<PageWrapper pageId="x" />` 自我閉合、無 children 判定），**但全部 16 個 pageId 在 `PAGE_WIDGET_CONFIGS` 中都「有」對應 key**，不是「無」 | 定性錯誤：這些路由不是純白畫面，而是 `PageWrapper.tsx` 第 36-48 行的邏輯——`pageId in PAGE_WIDGET_CONFIGS` 為真時會 fallback 成 Widget Mode，渲染 `WidgetGrid`。追查 `WidgetContent.tsx` 發現這些 widget 內容（如 `triage-queue`、`triage-workspace`）是**寫死的靜態假資料**（例如固定數字 3/5/2、`Wang`/`Lin`/`Chen` 等假名字），並非真正頁面元件或 API 串接。換言之，16 條空殼路由渲染的是「看起來像頁面、實際是假資料卡片牆」，比「無 key」更隱蔽、更容易被誤認為已完成 |
| 頁面檔約 137 個 | 用「檔名以 `Page.tsx/.ts` 結尾 + `ICSSectionDashboard.tsx`」口徑統計得 **127 個**；`src/pages/**` 下全部 `.ts/.tsx`（含 barrel index、tabs、mock/types 子檔）合計 161 個 | 差異來自口徑（是否含 barrel/子元件/utils），本文採嚴格「頁面元件」口徑，見 §2 掃描方法 |
| 至少 6 組重複入口 | **實際 20 組**「同一元件掛多條路徑」（Type A）+ **18 對**「同名不同檔」（Type B，可能是 mock 版 vs 真版） | 先前只列出的 6 組（volunteers/resources/analytics/mental-health/notifications/leaderboard）都在本次 20 組之中，但規模遠大於「至少 6 組」 |

---

## 1. 主表：Route × Page × Sidebar × 權限 對帳（127 條路由，按 8 個 route group 檔分節）

### 掃描方法
1. 對 `src/routes/*.routes.tsx`（8 檔）逐行 regex 解析：`path=`、`ProtectedRoute requiredLevel={n}`、`PageWrapper pageId=`、是否為 `<PageWrapper pageId="x" />` 自我閉合（空殼判定）、掛載的大寫元件名稱、`<Navigate to=.../>`。
2. 對 `src/components/layout/useSidebarConfig.ts` 的 `DEFAULT_NAV_ITEMS` regex 解析 `path`/`minLevel`/`visible`（共 47 項）。
3. 對 `src/config/page-policy.ts` 的 `PAGE_POLICIES` regex 解析 `path`/`requiredLevel`（共 47 項）。
4. 以 `path` 為 key 三方 join，`PermissionLevel`/`ROLE_LEVELS` 數值對齊後比較（`Anonymous/Guest=0, Volunteer=1, TeamLead/Supervisor=2, Coordinator/Manager=3, Admin=4, SystemOwner=5`，取自 `widget.types.ts` 第 43-53 行）。
5. 「三處一致」欄：三個來源中若有 ≥2 個有值且數值不同 → `✗ 見§5`；若只有 0-1 個來源定義該路徑 → `單一來源`（表示 sidebar 或 policy 未收錄此路徑，不算衝突，但代表三處覆蓋率不完整）；全部一致 → `✓`。
6. 「重複組#」對應 §4a 的 Type A 分組編號（同一元件掛在多條路徑）。

**注意**：sidebar／policy 只收錄了 47 個路徑左右，而 route 有 127 條，所以大部分路由在 sidebar/policy 欄位是「—」（未收錄，屬於「單一來源」，不是矛盾，但代表這兩份清單不是路由的完整鏡像）。

---
### public.routes.tsx（8 條）

| Path | 掛載元件 | 空殼 | Route Lvl | Sidebar minLevel(可見) | Policy Lvl | 三處一致 | 重複組# |
|---|---|---|---|---|---|---|---|
| `/login` | LoginPage | 否 | 無保護 | — | — | 單一來源 | — |
| `/auth/callback` | AuthCallbackPage | 否 | 無保護 | — | — | 單一來源 | — |
| `/forgot-password` | ForgotPasswordPage | 否 | 無保護 | — | — | 單一來源 | — |
| `/reset-password` | ResetPasswordPage | 否 | 無保護 | — | — | 單一來源 | — |
| `/bind-line` | BindLinePage | 否 | 無保護 | — | — | 單一來源 | — |
| `/volunteer-setup` | VolunteerProfileSetupPage | 否 | L1 | — | L1 | ✓ | — |
| `/showcase` | ComponentShowcase | 否 | 無保護 | — | — | 單一來源 | — |
| `/account` | AccountPage | 否 | L1 | — | L0 | ✗ 見§5 | — |

### geo.routes.tsx（6 條）

| Path | 掛載元件 | 空殼 | Route Lvl | Sidebar minLevel(可見) | Policy Lvl | 三處一致 | 重複組# |
|---|---|---|---|---|---|---|---|
| `/geo/map` | MapPage | 否 | 無保護 | Anonymous(顯示) | L0 | ✓ | — |
| `/geo/map-ops` | Navigate->/geo/map | 否 | — | — | — | 單一來源 | — |
| `/geo/tactical-map` | Navigate->/geo/map | 否 | — | — | — | 單一來源 | — |
| `/geo/alerts` | NcdrAlertsPage | 否 | 無保護 | — | — | 單一來源 | #2 |
| `/geo/weather` | ForecastPage | 否 | 無保護 | — | — | 單一來源 | #3 |
| `/geo/shelters` | SheltersPage | 否 | 無保護 | Anonymous(隱藏) | — | ✓ | #4 |

### logistics.routes.tsx（5 條）

| Path | 掛載元件 | 空殼 | Route Lvl | Sidebar minLevel(可見) | Policy Lvl | 三處一致 | 重複組# |
|---|---|---|---|---|---|---|---|
| `/logistics/inventory` | ResourcesPage | 否 | L1 | Volunteer(顯示) | L1 | ✓ | #18 |
| `/logistics/equipment` | EquipmentPage | 否 | L2 | Supervisor(顯示) | L2 | ✓ | — |
| `/logistics/donations` | DonationsPage | 否 | L2 | Supervisor(顯示) | L2 | ✓ | #20 |
| `/logistics/approvals` | ApprovalCenterPage | 否 | L3 | — | — | 單一來源 | #19 |
| `/logistics/unified-resources` | UnifiedResourcesPage | 否 | L2 | Supervisor(隱藏) | L2 | ✓ | — |

### rescue.routes.tsx（11 條）

| Path | 掛載元件 | 空殼 | Route Lvl | Sidebar minLevel(可見) | Policy Lvl | 三處一致 | 重複組# |
|---|---|---|---|---|---|---|---|
| `/rescue/shelters` | SheltersPage | 否 | L1 | Volunteer(隱藏) | — | ✓ | #4 |
| `/rescue/triage` | TriagePage | 否 | L1 | Volunteer(顯示) | — | ✓ | — |
| `/rescue/search-rescue` | SearchRescuePage | 否 | L1 | Supervisor(隱藏) | — | ✗ 見§5 | — |
| `/rescue/reunification` | ReunificationPage | 否 | L1 | Volunteer(隱藏) | — | ✓ | — |
| `/rescue/medical-transport` | MedicalTransportPage | 否 | L2 | Supervisor(隱藏) | — | ✓ | — |
| `/rescue/field-comms` | FieldCommsPage | 否 | L2 | Supervisor(隱藏) | — | ✓ | — |
| `/ics` | ICSSectionDashboard | 否 | L2 | — | — | 單一來源 | #12 |
| `/ics/:section` | ICSSectionDashboard | 否 | L2 | — | — | 單一來源 | #12 |
| `/ics/201` | ICS201BriefingPage | 否 | L2 | — | — | 單一來源 | — |
| `/ics/205` | ICS205CommsPage | 否 | L2 | — | — | 單一來源 | — |
| `/ops/ics-forms` | ICSFormsPage | 否 | L2 | Supervisor(隱藏) | L2 | ✓ | — |

### governance.routes.tsx（9 條）

| Path | 掛載元件 | 空殼 | Route Lvl | Sidebar minLevel(可見) | Policy Lvl | 三處一致 | 重複組# |
|---|---|---|---|---|---|---|---|
| `/governance/iam` | PermissionsPage | 否 | L3 | Manager(顯示) | L3 | ✓ | #5 |
| `/governance/audit` | AuditLogPage | 否 | L3 | Manager(顯示) | L3 | ✓ | #6 |
| `/governance/security` | SecurityPage | 否 | L3 | Manager(隱藏) | L3 | ✓ | — |
| `/governance/webhooks` | WebhooksPage | 否 | L4 | Admin(隱藏) | L4 | ✓ | — |
| `/governance/biometric` | BiometricPage | 否 | L4 | Admin(隱藏) | L4 | ✓ | — |
| `/governance/settings` | SettingsPage | 否 | L4 | Admin(隱藏) | L4 | ✓ | — |
| `/governance/interoperability` | InteroperabilityPage | 否 | L3 | Manager(隱藏) | L3 | ✓ | — |
| `/admin/audit-logs` | AuditLogPage | 否 | L5 | — | L5 | ✓ | #6 |
| `/governance/monitor` | MonitorPage | 否 | L3 | — | — | 單一來源 | — |

### hub.routes.tsx（7 條）

| Path | 掛載元件 | 空殼 | Route Lvl | Sidebar minLevel(可見) | Policy Lvl | 三處一致 | 重複組# |
|---|---|---|---|---|---|---|---|
| `/hub/notifications` | NotificationsPage | 否 | L1 | Volunteer(顯示) | L1 | ✓ | #7 |
| `/hub/geo-alerts` | NcdrAlertsPage | 否 | 無保護 | Anonymous(顯示) | L0 | ✓ | #2 |
| `/hub/weather` | ForecastPage | 否 | 無保護 | Anonymous(隱藏) | L0 | ✓ | #3 |
| `/hub/analytics` | AnalyticsPage | 否 | L2 | Supervisor(顯示) | L2 | ✓ | #8 |
| `/hub/ai` | AITasksPage | 否 | L2 | Supervisor(隱藏) | L2 | ✓ | — |
| `/hub/ai-chat` | AIChatPage | 否 | L1 | Volunteer(隱藏) | L1 | ✓ | — |
| `/hub/offline` | OfflinePrepPage | 否 | 無保護 | Anonymous(隱藏) | L0 | ✓ | — |

### domains.routes.tsx（20 條）

| Path | 掛載元件 | 空殼 | Route Lvl | Sidebar minLevel(可見) | Policy Lvl | 三處一致 | 重複組# |
|---|---|---|---|---|---|---|---|
| `/domains/mission-command` | MissionCommandPage | 否 | L2 | — | — | 單一來源 | — |
| `/domains/mission-command/triage` | (none) | 是(有widget key) | L2 | — | — | 單一來源 | — |
| `/domains/mission-command/task-dispatch` | (none) | 是(有widget key) | L2 | — | — | 單一來源 | — |
| `/domains/workforce/shift-calendar` | (none) | 是(有widget key) | L2 | — | — | 單一來源 | — |
| `/domains/workforce/attendance` | WorkforceAttendancePage | 否 | L2 | — | — | 單一來源 | — |
| `/domains/workforce/org-chart` | WorkforceOrgChartPage | 否 | L2 | — | — | 單一來源 | — |
| `/domains/workforce/leaderboard` | WorkforceLeaderboardPage | 否 | L1 | — | — | 單一來源 | — |
| `/domains/workforce/points-report` | WorkforcePointsReportPage | 否 | L2 | — | — | 單一來源 | — |
| `/domains/workforce/personnel` | (none) | 是(有widget key) | L2 | — | — | 單一來源 | — |
| `/domains/logistics/equipment` | (none) | 是(有widget key) | L2 | — | — | 單一來源 | — |
| `/domains/logistics/resources` | LogisticsResourcesPage | 否 | L2 | — | — | 單一來源 | — |
| `/domains/logistics/resource-overview` | (none) | 是(有widget key) | L2 | — | — | 單一來源 | — |
| `/domains/data-insight/reports` | DataInsightReportsPage | 否 | L2 | — | — | 單一來源 | — |
| `/domains/connectivity/communications` | ConnectivityCommunicationsPage | 否 | L2 | — | — | 單一來源 | — |
| `/domains/community` | DomainCommunityPage | 否 | L1 | — | — | 單一來源 | — |
| `/domains/community/center` | CommunityCenterPage | 否 | L1 | — | — | 單一來源 | #1 |
| `/domains/analytics/report-generator` | ReportGeneratorPage | 否 | L3 | — | — | 單一來源 | — |
| `/domains/core/settings` | CoreSettingsPage | 否 | L3 | — | — | 單一來源 | — |
| `/domains/core/dashboard` | CoreDashboardPage | 否 | L3 | — | — | 單一來源 | — |
| `/domains/air-ops/drone-control` | (none) | 是(有widget key) | L3 | — | — | 單一來源 | — |

### legacy.routes.tsx（61 條）

| Path | 掛載元件 | 空殼 | Route Lvl | Sidebar minLevel(可見) | Policy Lvl | 三處一致 | 重複組# |
|---|---|---|---|---|---|---|---|
| `/dashboard` | CommandCenterPage | 否 | L0 | — | L0 | ✓ | #9 |
| `/command-center` | CommandCenterPage | 否 | L0 | Anonymous(顯示) | L0 | ✓ | #9 |
| `/mental-health` | MentalHealthPage | 否 | L0 | — | — | 單一來源 | #10 |
| `/emergency/sos` | EmergencyResponsePage | 否 | L0 | Anonymous(隱藏) | — | ✓ | #11 |
| `/emergency/evacuation` | EmergencyResponsePage | 否 | L0 | Volunteer(隱藏) | — | ✗ 見§5 | #11 |
| `/emergency/hotline` | EmergencyResponsePage | 否 | L0 | Anonymous(隱藏) | — | ✓ | #11 |
| `/command/ic` | ICSSectionDashboard | 否 | L2 | Supervisor(隱藏) | — | ✓ | #12 |
| `(index)` | HomeRedirect | 否 | 無保護 | — | — | 單一來源 | — |
| `/intake` | ReportPage | 否 | L0 | Anonymous(顯示) | L0 | ✓ | #13 |
| `/knowledge/manuals` | ManualsPage | 否 | L0 | Anonymous(顯示) | — | ✓ | — |
| `/knowledge/manuals/:id` | ManualDetailPage | 否 | L0 | — | — | 單一來源 | #14 |
| `/manuals/:id` | ManualDetailPage | 否 | L0 | — | — | 單一來源 | #14 |
| `/manuals-v3` | ManualHomePage | 否 | L0 | — | — | 單一來源 | — |
| `/workforce/people` | VolunteersPage | 否 | L1 | Volunteer(顯示) | L1 | ✓ | #15 |
| `/workforce/shifts` | WorkforceShiftCalendarPage | 否 | L1 | Volunteer(顯示) | L1 | ✓ | — |
| `/workforce/performance` | LeaderboardPage | 否 | L1 | Volunteer(顯示) | L1 | ✓ | #16 |
| `/workforce/mobilization` | VolunteersPage | 否 | L2 | Supervisor(隱藏) | — | ✓ | #15 |
| `/community/hub` | CommunityCenterPage | 否 | L1 | Volunteer(顯示) | L1 | ✓ | #1 |
| `/community/mental-health` | MentalHealthPage | 否 | L0 | Volunteer(隱藏) | — | ✗ 見§5 | #10 |
| `/analytics/reports` | ReportsAdminPage | 否 | L2 | Supervisor(顯示) | L2 | ✓ | #17 |
| `/analytics/unified-reporting` | UnifiedReportingPage | 否 | L2 | Supervisor(隱藏) | L2 | ✓ | — |
| `/analytics/simulation` | SimulationPage | 否 | L2 | Supervisor(隱藏) | L2 | ✓ | — |
| `/events` | EventsPage | 否 | L1 | — | L1 | ✓ | — |
| `/report` | ReportPage | 否 | L1 | — | L1 | ✓ | #13 |
| `/training` | TrainingPage | 否 | L1 | Volunteer(顯示) | L1 | ✓ | — |
| `/notifications` | NotificationsPage | 否 | L1 | — | — | 單一來源 | #7 |
| `/profile` | ProfilePage | 否 | L0 | — | L0 | ✓ | — |
| `/resources-public` | ResourcesPublicPage | 否 | L1 | — | L1 | ✓ | — |
| `/community` | CommunityPage | 否 | L1 | — | L1 | ✓ | — |
| `/reunification` | (none) | 是(有widget key) | L1 | — | L1 | ✓ | — |
| `/activities` | ActivitiesPage | 否 | L1 | — | L1 | ✓ | — |
| `/leaderboard` | LeaderboardPage | 否 | L1 | — | L1 | ✓ | #16 |
| `/my-vehicles` | VehicleManagementPage | 否 | L1 | — | L1 | ✓ | — |
| `/my-insurance` | InsuranceManagementPage | 否 | L1 | — | L1 | ✓ | — |
| `/my-points` | PointsReportPage | 否 | L1 | — | — | 單一來源 | — |
| `/tasks` | TasksPage | 否 | L2 | Volunteer(顯示) | L1 | ✗ 見§5 | — |
| `/volunteers` | VolunteersPage | 否 | L2 | — | — | 單一來源 | #15 |
| `/volunteers/:id` | VolunteerDetailPage | 否 | L2 | — | — | 單一來源 | — |
| `/volunteers/schedule` | VolunteerSchedulePage | 否 | L2 | — | — | 單一來源 | — |
| `/resources` | ResourcesPage | 否 | L2 | — | — | 單一來源 | #18 |
| `/approvals` | ApprovalCenterPage | 否 | L2 | Supervisor(顯示) | L2 | ✓ | #19 |
| `/report-schedules` | ReportSchedulePage | 否 | L2 | — | — | 單一來源 | — |
| `/reports` | Navigate->/reports/admin | 否 | — | — | — | 單一來源 | — |
| `/reports/admin` | ReportsAdminPage | 否 | L2 | — | — | 單一來源 | #17 |
| `/resource-matching` | (none) | 是(有widget key) | L2 | — | — | 單一來源 | — |
| `/ai-summary` | (none) | 是(有widget key) | L2 | — | — | 單一來源 | — |
| `/incidents` | IncidentsPage | 否 | L1 | Volunteer(顯示) | L1 | ✓ | — |
| `/drills` | (none) | 是(有widget key) | L3 | — | — | 單一來源 | — |
| `/aar` | AARPage | 否 | L3 | — | — | 單一來源 | — |
| `/reports/export` | ReportsExportPage | 否 | L3 | — | — | 單一來源 | — |
| `/analytics` | AnalyticsPage | 否 | L3 | — | — | 單一來源 | #8 |
| `/sensitive-audit` | SensitiveAuditPage | 否 | L3 | — | — | 單一來源 | — |
| `/label-management` | LabelManagementPage | 否 | L3 | — | — | 單一來源 | — |
| `/backups` | BackupPage | 否 | L3 | — | — | 單一來源 | — |
| `/audit` | (none) | 是(有widget key) | L3 | — | — | 單一來源 | — |
| `/permissions` | PermissionsPage | 否 | L4 | — | — | 單一來源 | #5 |
| `/accounts` | (none) | 是(有widget key) | L4 | — | — | 單一來源 | — |
| `/donations` | DonationsPage | 否 | L5 | — | — | 單一來源 | #20 |
| `/tenants` | (none) | 是(有widget key) | L5 | — | — | 單一來源 | — |
| `/settings` | (none) | 是(有widget key) | L5 | — | — | 單一來源 | — |
| `/features` | (none) | 是(有widget key) | L5 | — | — | 單一來源 | — |

---

## 2. 孤兒頁清單（43 個檔案——有檔案但未被路由使用）

### 掃描方法
1. 解析 `LazyPages.tsx` 全部 90 個 `export const X = lazyWithSuspense(() => import(...))`，將 import path（含 `.then(m => m.Y)` barrel re-export）解析回實際檔案路徑（barrel 內有 `export { default as Y } from './Y'` 與 `export { Y } from './Y'` 兩種寫法，皆已處理）。
2. 掃描 `src/pages/**` 下全部檔案，篩選出「檔名以 `Page.tsx`/`Page.ts` 結尾」或 `ICSSectionDashboard.tsx`（嚴格頁面口徑），共 127 個候選頁面檔。
3. 交叉比對：
   - **完全未被引用**：檔案從未出現在任一 `LazyPages.tsx` 的 import 目標中。
   - **已 lazy-wrap 但未掛路由**：`LazyPages.tsx` 中有 export，但該 export 名稱從未出現在任何 `routes/*.routes.tsx` 的 JSX 中（即定義了卻沒人用）。
4. 兩類合併去重 = 43 個孤兒檔案。日期用 `git log -1 --format=%ad --date=short -- <file>`（在 worktree 內執行）。

### 清單

| 檔案路徑 | 最後 commit 日期 | 狀態 | 說明／初判 |
|---|---|---|---|
| `pages/AccountPage.tsx` | 2026-02-07 | 未被 LazyPages 引用 | 與 `pages/account/AccountPage.tsx`（已掛 `/account`）同名不同檔；舊版帳戶頁，內容需與新版比對（詳見 §4b duplicate-B） |
| `pages/AttendancePage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 個人 GPS/QR 簽到 UI，與 `domains/workforce/AttendancePage.tsx`（已掛 `/domains/workforce/attendance`，串真實 API）功能範疇不同，非單純 mock 版（詳見 §4b） |
| `pages/CommandPostMapPage.tsx` | 2026-02-05 | 未被 LazyPages 引用 | 無同名對照組，功能未知，需 owner 確認是否為未完成的指揮所地圖頁 |
| `pages/DroneControlPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 與 `domains/air-ops/DroneControlPage.tsx` 同名不同檔；後者已 lazy-wrap 但兩者皆未掛路由，`/domains/air-ops/drone-control` 為空殼（詳見 §3/§4b） |
| `pages/MissionCommandPage.tsx` | 2026-02-05 | 未被 LazyPages 引用 | ★真實版（串 useFieldReports/useAiQueue/地圖/SOS），但完全未接路由；`/domains/mission-command` 目前掛的是 `domains/mission-command/MissionCommandPage.tsx` 假資料版（詳見 §4b） |
| `pages/OrgChartPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 純前端假資料版；`domains/workforce/OrgChartPage.tsx`（已掛 `/domains/workforce/org-chart`）才是串真實 API 的版本（詳見 §4b） |
| `pages/PackageLibraryPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 無同名對照組，功能未知，需 owner 確認 |
| `pages/PublicSearchPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 無同名對照組，功能未知，需 owner 確認 |
| `pages/ShiftCalendarPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 假資料版；對照 `domains/workforce/ShiftCalendarPage.tsx`（已掛 `/workforce/shifts`）本身也是假資料，兩版皆非真實（詳見 §4b） |
| `pages/TriagePage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | ★真實版（串 services/api），但完全未接路由；`/rescue/triage`（側欄可見「傷患分類」）目前掛的是 `domains/mission-command/TriagePage.tsx` 假資料版（詳見 §4b） |
| `pages/TwoFactorSetupPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 與 `pages/security/TwoFactorSetupPage.tsx` 同名不同檔，兩者皆未接路由，2FA 設定功能完全未上線 |
| `pages/admin/DashboardEditorPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 屬於整個未接線的 `pages/admin/*` 模組（見下方 7 檔），儀表板編輯器 |
| `pages/admin/DrillCenterPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 屬於未接線 `pages/admin/*` 模組；與 `/drills` 空殼（pageId=drills）、`pages/c2/DrillsPage.tsx` 可能功能重疊，需 owner 釐清三者關係 |
| `pages/admin/FeatureFlagsPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | ★屬於未接線 `pages/admin/*` 模組；與 `/features` 空殼路由（L5）高度疑似對應，是現成可接的候選元件 |
| `pages/admin/GeofencingPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 屬於未接線 `pages/admin/*` 模組，地理圍欄管理 |
| `pages/admin/SchedulerPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 屬於未接線 `pages/admin/*` 模組，排程器 |
| `pages/admin/SystemSettingsPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | ★屬於未接線 `pages/admin/*` 模組；與 `/settings` 空殼路由（L5）高度疑似對應，是現成可接的候選元件 |
| `pages/admin/WebhookManagementPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 屬於未接線 `pages/admin/*` 模組；與已上線的 `pages/governance/WebhooksPage.tsx`（`/governance/webhooks`）功能疑似重疊，需 owner 確認是否為重工 |
| `pages/analytics/AnalyticsDashboardPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 與已上線的 `pages/AnalyticsPage.tsx`（`/analytics`, `/hub/analytics`）功能疑似重疊 |
| `pages/c2/DrillsPage.tsx` | 2026-02-23 | 已 lazy-wrap 未掛路由 (export: DrillsPage) | 已 lazy-wrap（export DrillsPage）但未掛路由；為 `/drills` 空殼（pageId=drills）的現成候選元件，需先確認是否為真實版或假資料版 |
| `pages/care/MyMoodPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 心理健康自我追蹤頁，與 `/mental-health`、`/community/mental-health`（MentalHealthPage）功能疑似相關但未接線 |
| `pages/command/AARPlaybackPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 與已上線 `pages/c2/AARPage.tsx`（`/aar`）功能疑似重疊/擴充 |
| `pages/command/IAPManagerPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | ICS IAP（事故行動計畫）管理頁，未接線，功能未知 |
| `pages/command/SITREPViewerPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | SITREP 檢視頁，未接線，功能未知 |
| `pages/command/TaskDispatchPage.tsx` | 2026-02-23 | 已 lazy-wrap 未掛路由 (export: TaskDispatchPage) | 已 lazy-wrap（export TaskDispatchPage）但未掛路由；為 `/domains/mission-command/task-dispatch` 空殼（pageId=task-dispatch）的現成候選元件 |
| `pages/domains/air-ops/DroneControlPage.tsx` | 2026-01-08 | 已 lazy-wrap 未掛路由 (export: DroneControlPage) | 已 lazy-wrap（export DroneControlPage）但未掛路由；為 `/domains/air-ops/drone-control` 空殼（pageId=drone-control）的現成候選元件；同名檔 `pages/DroneControlPage.tsx` 亦孤兒（詳見上） |
| `pages/domains/data-insight/AnalyticsPage.tsx` | 2026-01-08 | 未被 LazyPages 引用 | 與已上線 `pages/AnalyticsPage.tsx` 同名不同資料夾，功能未知，未接線 |
| `pages/domains/logistics/EquipmentPage.tsx` | 2026-02-23 | 已 lazy-wrap 未掛路由 (export: LogisticsEquipmentPage) | 已 lazy-wrap（export LogisticsEquipmentPage）但未掛路由；為 `/domains/logistics/equipment` 空殼（pageId=equipment）的現成候選元件；注意已有另一條真實路由 `/logistics/equipment` 掛 `pages/EquipmentPage.tsx` |
| `pages/domains/mission-command/TasksPage.tsx` | 2026-01-08 | 未被 LazyPages 引用 | 假資料版，且從未被 LazyPages 引用（連 lazy-wrap 都沒有）；真實版為 `pages/TasksPage.tsx`（已掛 `/tasks`，串 useQuery/useMutation）（詳見 §4b） |
| `pages/domains/workforce/PersonnelManagementPage.tsx` | 2026-01-12 | 已 lazy-wrap 未掛路由 (export: PersonnelManagementPage) | 已 lazy-wrap（export PersonnelManagementPage）但未掛路由；為 `/domains/workforce/personnel` 空殼（pageId=personnel）的現成候選元件 |
| `pages/domains/workforce/TrainingPage.tsx` | 2026-01-08 | 未被 LazyPages 引用 | 假資料版；真實版為 `pages/TrainingPage.tsx`（已掛 `/training`，串 getScrapedCourses API）（詳見 §4b） |
| `pages/domains/workforce/VolunteerDetailPage.tsx` | 2026-01-08 | 未被 LazyPages 引用 | 假資料版；真實版為 `pages/VolunteerDetailPage.tsx`（已掛 `/volunteers/:id`，串 getVolunteer API）（詳見 §4b） |
| `pages/domains/workforce/VolunteerProfileSetupPage.tsx` | 2026-01-08 | 未被 LazyPages 引用 | 與 `pages/VolunteerProfileSetupPage.tsx`（已掛 `/volunteer-setup`）同名不同檔，需比對兩版內容（詳見 §4b） |
| `pages/domains/workforce/VolunteerSchedulePage.tsx` | 2026-01-08 | 未被 LazyPages 引用 | 假資料版；真實版為 `pages/VolunteerSchedulePage.tsx`（已掛 `/volunteers/schedule`，串 useQuery+getAccounts API）（詳見 §4b） |
| `pages/domains/workforce/VolunteersPage.tsx` | 2026-01-08 | 未被 LazyPages 引用 | 假資料版；真實版為 `pages/VolunteersPage.tsx`（已掛 `/workforce/people`、`/volunteers`、`/workforce/mobilization`，串 getApprovedVolunteers 等 API）（詳見 §4b） |
| `pages/geo/TacticalMapPage.tsx` | 2026-02-05 | 未被 LazyPages 引用 | `/geo/tactical-map` 路由目前是對 `/geo/map` 的 Navigate 轉址，此檔完全未被引用，可能是轉址前的舊實作 |
| `pages/monitor/MeshMonitorPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | Mesh 網路監控頁，與已上線 `pages/MonitorPage.tsx`（`/governance/monitor`）功能疑似相關，未接線 |
| `pages/notifications/NotificationCenterPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 與已上線 `pages/NotificationsPage.tsx`（`/hub/notifications`、`/notifications`）功能疑似重疊 |
| `pages/public/TransparencyPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 公開透明度頁，未接線，無對應路由 |
| `pages/resources/ResourceOverviewPage.tsx` | 2026-02-23 | 已 lazy-wrap 未掛路由 (export: ResourceOverviewPage) | 已 lazy-wrap（export ResourceOverviewPage）但未掛路由；為 `/domains/logistics/resource-overview` 空殼（pageId=resource-overview）的現成候選元件 |
| `pages/security/TwoFactorSetupPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 與 `pages/TwoFactorSetupPage.tsx` 同名不同檔，兩者皆未接路由，2FA 設定功能完全未上線 |
| `pages/voice/VoiceCallPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 語音通話頁，未接線，無對應路由 |
| `pages/weather/WeatherPage.tsx` | 2026-01-07 | 未被 LazyPages 引用 | 與已上線 `pages/ForecastPage.tsx`（`/geo/weather`、`/hub/weather`）功能疑似重疊 |

**重點分組**：
- **`pages/admin/*` 整包未接線模組（7 檔）**：`DashboardEditorPage`、`DrillCenterPage`、`FeatureFlagsPage`、`GeofencingPage`、`SchedulerPage`、`SystemSettingsPage`、`WebhookManagementPage`——有自己的 barrel `pages/admin/index.ts`，但這個 barrel 從未被 `LazyPages.tsx` import，等於一整個管理後台子系統做好了卻沒接上任何路由。其中 `FeatureFlagsPage`／`SystemSettingsPage` 高度疑似是 `/features`／`/settings` 兩個空殼路由（§3）原本該接的元件。
- **`domains/mission-command`、`domains/workforce`、`domains/logistics`、`domains/air-ops` 底下多個「假資料版」孤兒**：與已上線頁面同名但放在 `domains/*` 資料夾，內容是 `useState` + 寫死陣列，從未被路由使用（詳見 §4b 逐條驗證）。
- **`pages/MissionCommandPage.tsx`、`pages/TriagePage.tsx`（頂層，標 ★）是兩個「真實 API 版但完全未接路由」的頁面**，其對應的假資料版反而是目前線上在跑的版本，見 §4b 與下方摘要。

---

## 3. 空殼路由清單（16 條，含判定證據）

### 掃描方法與判定證據
1. **空殼判定**：在 `routes/*.routes.tsx` 中比對 `<Route path="..." element={<ProtectedRoute...><PageWrapper pageId="x" /></ProtectedRoute>} />` 這種 **`PageWrapper` 自我閉合、無 children** 的寫法，與有 children（`<PageWrapper pageId="x"><RealPage /></PageWrapper>`）的路由區分開來。全庫比對後共 16 條符合。
2. **PAGE_WIDGET_CONFIGS 對照**：解析 `widget.types.ts` 第 232 行起的 `PAGE_WIDGET_CONFIGS` 物件所有 key（共 57 個），逐一比對 16 個空殼的 `pageId`。**結果：16/16 全部命中**（此點修正了 §0 提到的先前結論）。
3. **`PageWrapper.tsx` 邏輯追查**（第 34-48 行）：`hasWidgetConfig = pageId in PAGE_WIDGET_CONFIGS`；`children` 為 `undefined` 時 `shouldUseWidgets = hasWidgetConfig`；為真時渲染 `<AppShellLayout pageId={pageId}>`（無 children），由 `AppShellLayout` 內的 `WidgetGrid` 依 `PAGE_WIDGET_CONFIGS[pageId]` 畫出卡片版位。
4. **WidgetContent 內容追查**：以 `triage` 為例，`widget.types.ts` 定義了 3 個 widget（`triage-queue`/`triage-stats`/`triage-workspace`），對應到 `WidgetContent.tsx` 第 1732-1790 行左右的 JSX，內容是寫死陣列（`{ type: '傷患', count: 3 }` 等）與寫死的 `MetricCard` 數字（10/5/23/38），**沒有任何 API 呼叫、沒有 props、沒有互動邏輯**——確認是純展示用假資料卡片，非真實頁面。
5. **現成候選元件欄**：交叉比對 §2 的孤兒清單，若該 pageId 對應的真實功能有現成（哪怕未掛路由）的元件，列出檔案路徑。

### 清單

| Path | pageId | Route Lvl | PAGE_WIDGET_CONFIGS 是否有 key | WidgetContent 實際內容 | 現成候選元件（未掛） | 建議處置 |
|---|---|---|---|---|---|---|
| `/domains/mission-command/triage` | `triage` | L2 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/domains/mission-command/TriagePage.tsx`（假資料版，已掛在別處 `/rescue/triage`）；真正可用的真實版 `pages/TriagePage.tsx` 完全未 lazy-wrap | 接上真實版 `pages/TriagePage.tsx`，並將 `/rescue/triage` 目前掛的假資料版下線或合併 |
| `/domains/mission-command/task-dispatch` | `task-dispatch` | L2 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/command/TaskDispatchPage.tsx`（已 lazy-wrap, export TaskDispatchPage, 未掛路由） | 接上 TaskDispatchPage（先驗證是否為真實資料源） |
| `/domains/workforce/shift-calendar` | `shift-calendar` | L2 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/domains/workforce/ShiftCalendarPage.tsx`（假資料版，已掛在別處 `/workforce/shifts`）；`pages/ShiftCalendarPage.tsx` 亦為假資料且未 lazy-wrap | 兩版皆假資料，需重新評估：接上真實 API 或暫時 redirect 到 `/workforce/shifts` |
| `/domains/workforce/personnel` | `personnel` | L2 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/domains/workforce/PersonnelManagementPage.tsx`（已 lazy-wrap, export PersonnelManagementPage, 未掛路由） | 接上 PersonnelManagementPage（先驗證是否為真實資料源） |
| `/domains/logistics/equipment` | `equipment` | L2 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/domains/logistics/EquipmentPage.tsx`（已 lazy-wrap, export LogisticsEquipmentPage, 未掛路由） | 接上 LogisticsEquipmentPage，並與既有 `/logistics/equipment`（真實版 EquipmentPage）釐清定位差異 |
| `/domains/logistics/resource-overview` | `resource-overview` | L2 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/resources/ResourceOverviewPage.tsx`（已 lazy-wrap, export ResourceOverviewPage, 未掛路由） | 接上 ResourceOverviewPage（先驗證是否為真實資料源） |
| `/domains/air-ops/drone-control` | `drone-control` | L3 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/domains/air-ops/DroneControlPage.tsx`（已 lazy-wrap, export DroneControlPage, 未掛路由） | 接上 DroneControlPage（先驗證是否為真實資料源） |
| `/reunification` | `reunification` | L1 | 有 | 靜態假資料 widget grid（見 §3 說明） | 同義路由 `/rescue/reunification` 已掛 `ReunificationPage`（真實元件），此路徑可直接 redirect | Redirect 到 `/rescue/reunification` |
| `/resource-matching` | `resource-matching` | L2 | 有 | 靜態假資料 widget grid（見 §3 說明） | （無現成元件，LazyPages 中無對應 export） | 刪除或標記為 roadmap（無元件可接） |
| `/ai-summary` | `ai-summary` | L2 | 有 | 靜態假資料 widget grid（見 §3 說明） | （無現成元件，LazyPages 中無對應 export） | 刪除或標記為 roadmap（無元件可接） |
| `/drills` | `drills` | L3 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/c2/DrillsPage.tsx`（已 lazy-wrap, export DrillsPage, 未掛路由）；另有 `pages/admin/DrillCenterPage.tsx` 疑似重疊 | 接上 DrillsPage，並與 admin/DrillCenterPage 釐清是否重複 |
| `/audit` | `audit` | L3 | 有 | 靜態假資料 widget grid（見 §3 說明） | 同義路由 `/governance/audit`、`/admin/audit-logs` 已掛 `AuditLogPage`（真實元件），此路徑可直接 redirect | Redirect 到 `/governance/audit` |
| `/accounts` | `accounts` | L4 | 有 | 靜態假資料 widget grid（見 §3 說明） | （無現成元件；`pages/AccountPage.tsx`/`pages/account/AccountPage.tsx` 是個人帳戶頁，非管理端帳號列表，概念不同） | 刪除或標記為 roadmap（無元件可接，概念未定義） |
| `/tenants` | `tenants` | L5 | 有 | 靜態假資料 widget grid（見 §3 說明） | （無現成元件，多租戶功能尚未建置） | 刪除或標記為 roadmap（多租戶尚未建置） |
| `/settings` | `settings` | L5 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/admin/SystemSettingsPage.tsx`（未接線）疑似對應，或與 `/governance/settings`（`SettingsPage`, L4）功能重疊需釐清 | 待 owner 決定：接上 admin/SystemSettingsPage，或直接 redirect 到 `/governance/settings` |
| `/features` | `features` | L5 | 有 | 靜態假資料 widget grid（見 §3 說明） | `pages/admin/FeatureFlagsPage.tsx`（未接線）高度疑似對應，是現成可接候選元件 | 接上 FeatureFlagsPage（先驗證是否為真實資料源） |

---

## 4. 重複入口分組表

### 4a. Type A——同一元件掛在多條路徑（20 組）

#### 掃描方法
掃描全部 127 條路由，以「掛載元件名稱」為 key 分組，篩選出組內路徑數 ≥2 者。

| # | 元件 | 路徑（全部） | 路徑數 | 備註 |
|---|---|---|---|---|
| 1 | CommunityCenterPage | `/domains/community/center`, `/community/hub` | 2 | 同元件雙掛，L1/L1 一致 |
| 2 | NcdrAlertsPage | `/geo/alerts`, `/hub/geo-alerts` | 2 | 皆無路由保護 |
| 3 | ForecastPage | `/geo/weather`, `/hub/weather` | 2 | 皆無路由保護 |
| 4 | SheltersPage | `/geo/shelters`, `/rescue/shelters` | 2 | route 皆無保護；sidebar 只收錄兩者且皆隱藏 |
| 5 | PermissionsPage | `/governance/iam`, `/permissions` | 2 | L3 / L4 **不同**（legacy `/permissions` 較嚴格），需確認何者為權威路徑 |
| 6 | AuditLogPage | `/governance/audit`, `/admin/audit-logs` | 2 | L3 / L5 **不同**，兩條路徑保護等級差 2 級 |
| 7 | NotificationsPage | `/hub/notifications`, `/notifications` | 2 | 皆 L1 |
| 8 | AnalyticsPage | `/hub/analytics`, `/analytics` | 2 | L2 / L3 **不同** |
| 9 | CommandCenterPage | `/dashboard`, `/command-center` | 2 | 皆 L0 |
| 10 | MentalHealthPage | `/mental-health`, `/community/mental-health` | 2 | 皆 L0（route），但 sidebar 只在 `/community/mental-health` 有記錄且要求 Volunteer，見 §5 |
| 11 | EmergencyResponsePage | `/emergency/sos`, `/emergency/evacuation`, `/emergency/hotline` | 3 | 三條共用同一元件、皆 L0，用參數/query 或內部邏輯區分場景 |
| 12 | ICSSectionDashboard | `/command/ic`, `/ics`, `/ics/:section` | 3 | 皆 L2 |
| 13 | ReportPage | `/intake`, `/report` | 2 | L0 / L1 **不同** |
| 14 | ManualDetailPage | `/knowledge/manuals/:id`, `/manuals/:id` | 2 | 皆 L0，純路徑別名 |
| 15 | VolunteersPage | `/workforce/people`, `/workforce/mobilization`, `/volunteers` | 3 | L1 / L2 / L2，同元件不同保護層級由路由各自決定 |
| 16 | LeaderboardPage | `/workforce/performance`, `/leaderboard` | 2 | 皆 L1 |
| 17 | ReportsAdminPage | `/analytics/reports`, `/reports/admin` | 2 | 皆 L2 |
| 18 | ResourcesPage | `/resources`, `/logistics/inventory` | 2 | L2 / L1 **不同** |
| 19 | ApprovalCenterPage | `/approvals`, `/logistics/approvals` | 2 | L2 / L3 **不同** |
| 20 | DonationsPage | `/donations`, `/logistics/donations` | 2 | L5 / L2 **不同**，差距達 3 級，需確認何者才是正確權限 |

> Type A 中權限「不同」的組（#5、#6、#8、#13、#15、#18、#19、#20）代表**同一支元件在不同進入路徑下被要求不同權限等級**——若使用者從較低權限的路徑直接輸入 URL，可能繞過較高權限路徑的保護意圖。這是比 §5「三處不一致」更嚴重的路由層級設計問題，建議與 §5 一併呈給 owner。

### 4b. Type B——同名不同檔（18 對，命名衝突，逐條查證掛載狀態與真假資料）

#### 掃描方法
掃描 `src/pages/**` 全部檔案，以 basename 分組找出跨資料夾同名檔（排除 `index.ts` barrel），共 18 對。逐對用 `grep -n "mockData|api/services|api\.get|useQuery|fetch("` 搭配 `Read` 檔案前 20-40 行判斷是「真實 API 版」或「寫死假資料版」，再對照 `lazy_exports_resolved` 判斷哪一版實際掛在路由上。

| 檔名 | 頂層版 `pages/X.tsx` | `domains/**/X.tsx`（或其他子資料夾）版 | 實際掛載結論 |
|---|---|---|---|
| MissionCommandPage.tsx | **真實版**（`useFieldReports`/`useAiQueue`/`MapContainer`/`SOSButton`/`useAuth`），**孤兒，完全未接路由** | 假資料版（`useState` + 3 筆寫死 `TW-KHH-330-001` 等任務），**已掛 `/domains/mission-command`（L2）** | ⚠️ **掛的是假資料版，真實版被晾在一邊** |
| TriagePage.tsx | **真實版**（`import api from '../services/api'`），**孤兒，完全未接路由** | 假資料版（4 筆寫死傷患案例），**已掛 `/rescue/triage`（L1，側欄「傷患分類」項 `visible:true`）** | ⚠️ **側欄可見的真實入口渲染的是假資料版** |
| TasksPage.tsx | **真實版**（`useQuery`/`useMutation`/`useQueryClient`），**已掛 `/tasks`（L2）** | 假資料版（4 筆寫死任務），**連 lazy-wrap 都沒有，純孤兒檔** | ✅ 掛載的是真實版；假資料版完全未使用 |
| VolunteersPage.tsx | **真實版**（`getApprovedVolunteers`/`getVolunteerStats`/`getPendingVolunteers` 等 API），**已掛 `/workforce/people`、`/volunteers`、`/workforce/mobilization`** | 假資料版（`mockData` 陣列），**已 lazy-wrap 但未掛任何路由，純孤兒** | ✅ 掛載的是真實版 |
| TrainingPage.tsx | **真實版**（`getScrapedCourses`/`triggerScrape` API），**已掛 `/training`** | 假資料版（`mockData` 陣列），**孤兒** | ✅ 掛載的是真實版 |
| VolunteerDetailPage.tsx | **真實版**（`getVolunteer` API），**已掛 `/volunteers/:id`** | 假資料版（`mockData` 物件），**孤兒** | ✅ 掛載的是真實版 |
| VolunteerSchedulePage.tsx | **真實版**（`useQuery` + `getAccounts` API），**已掛 `/volunteers/schedule`** | 假資料版（`mockData` 陣列），**孤兒** | ✅ 掛載的是真實版 |
| VolunteerProfileSetupPage.tsx | 已掛 `/volunteer-setup`（L1），內容未逐行核對 | 孤兒，未接線 | 待補：兩版內容差異尚未逐行核對 |
| OrgChartPage.tsx | 假資料版（`initialData` 寫死組織樹），**孤兒，未接線** | **真實版**（`api.get('/org-chart/stats')`、`api.get('/org-chart/tree/...')`），**已掛 `/domains/workforce/org-chart`** | ✅ 掛載的是真實版（此組與 Mission/Triage 相反：`domains/**` 才是真的） |
| AttendancePage.tsx | 個人 GPS/QR 簽到 UI（`navigator.geolocation`），**孤兒，未接線**——功能與下列版本不同，非單純假資料副本 | **真實版**（`api.get('/attendance/daily-summary')`），**已掛 `/domains/workforce/attendance`** | ✅ 掛載的是真實版；頂層版是完全不同的「個人簽到」功能，不是同一功能的 mock，建議 owner 確認是否仍需要 |
| ShiftCalendarPage.tsx | 假資料版（寫死 3 筆班表），**孤兒** | 假資料版（同樣寫死 3 筆班表，經由 `WorkforceShiftCalendarPage` export），**已掛 `/workforce/shifts`（L1，側欄可見「排班日曆」）** | ⚠️ **兩版都是假資料**，目前線上入口渲染的也是假資料，非單純孤兒問題 |
| AccountPage.tsx | 孤兒，內容未逐行核對 | `pages/account/AccountPage.tsx`（barrel 版），**已掛 `/account`（L1）** | 待補：頂層版內容尚未逐行核對 |
| AnalyticsPage.tsx | **已掛 `/analytics`（L3）、`/hub/analytics`（L2）** | `domains/data-insight/AnalyticsPage.tsx`，**孤兒**，內容未核對 | 待補 |
| CommunityPage.tsx | **已掛 `/community`（L1）** | `domains/community/CommunityPage.tsx`（**DomainCommunityPage**），**已掛 `/domains/community`（L1）** | 兩者皆掛載中，非孤兒，但同名不同資料夾仍屬命名衛生問題 |
| DroneControlPage.tsx | 孤兒，未接線 | `domains/air-ops/DroneControlPage.tsx`，**已 lazy-wrap 但未掛路由（`/domains/air-ops/drone-control` 空殼的候選元件，見 §3）** | 兩版皆未上線 |
| SettingsPage.tsx | `governance/SettingsPage.tsx`，**已掛 `/governance/settings`（L4）** | `domains/core/SettingsPage.tsx`（**CoreSettingsPage**），**已掛 `/domains/core/settings`（L3）** | 兩者皆掛載中，功能疑似不同（治理設定 vs 核心網域設定），需 owner 確認是否重疊 |
| EquipmentPage.tsx | **已掛 `/logistics/equipment`（L2）** | `domains/logistics/EquipmentPage.tsx`，**已 lazy-wrap 但未掛路由（`/domains/logistics/equipment` 空殼的候選元件，見 §3）** | 頂層版上線中，domains 版孤兒 |
| ResourcesPage.tsx | **已掛 `/resources`（L2）、`/logistics/inventory`（L1）** | `domains/logistics/ResourcesPage.tsx`（**LogisticsResourcesPage**），**已掛 `/domains/logistics/resources`（L2）** | 兩者皆掛載中 |
| LeaderboardPage.tsx / PointsReportPage.tsx / TwoFactorSetupPage.tsx | 見上方 Type A 或孤兒清單 | `domains/workforce/*` 版皆已掛載於 `/domains/workforce/leaderboard`、`/domains/workforce/points-report` | 兩者皆掛載中（各自路徑不同，非互斥） |

**Workforce 網域「mock 版 vs 真版」實際掛載結論（摘要，回應題目要求）**：
- **沒有統一規律**。同屬 `domains/workforce/*` 的一批同名檔案，掛載狀態與真假資料呈**雙向混合**：
  - `Volunteers/Training/VolunteerDetail/VolunteerSchedule`：**頂層版是真版且已上線**，`domains/workforce/*` 版是假資料且是孤兒。
  - `Attendance/OrgChart`：**`domains/workforce/*` 版是真版且已上線**，頂層版是假資料（或功能不同）且是孤兒。
  - `ShiftCalendar`：**兩版都是假資料**，`domains/workforce/*` 版透過 `WorkforceShiftCalendarPage` 掛在側欄可見的 `/workforce/shifts`，代表這個「看起來正常」的入口其實顯示假資料。
  - `PersonnelManagement`：`domains/workforce/*` 版存在且已 lazy-wrap，但完全沒有頂層對照版，且未掛任何路由（`/domains/workforce/personnel` 是空殼）。
- 同樣的「跨資料夾真假隨機分佈」也出現在 Mission Command 網域（`MissionCommand`、`Triage` 兩者都是「`domains/mission-command/*` 假版上線、頂層真版孤兒」，與 workforce 部分頁面方向相反）。**結論：不能假設「`domains/*` 前綴 = 新版/真版」或「頂層 = 舊版/真版」，每一對都必須逐檔確認，不可套用統一規則。**

---

## 5. 權限不一致清單（route requiredLevel × sidebar minLevel × page-policy requiredLevel 三方比對）

### 掃描方法
數值化後比對三個來源（見 §1 掃描方法步驟 4）；三者中有值的來源之間數值不同即列入。共找到 **5 條**真正的數值衝突（另有 Type A 中 8 組「同元件不同路徑保護等級不同」，性質不同，列在 §4a 備註中）。

| Path | Route requiredLevel | Sidebar minLevel | Policy requiredLevel | 問題說明 |
|---|---|---|---|---|
| `/tasks` | **L2** | Volunteer (L1) | L1 | **最嚴重**：側欄「任務看板」對 L1 志工可見（`visible:true`），page-policy 也定義為 L1，但實際路由 `ProtectedRoute requiredLevel={2}` 要求 L2。L1 使用者會在側欄看到入口，點擊後卻被 `ProtectedRoute` 擋下——三處中路由本身是異常值 |
| `/rescue/search-rescue` | L1 | **Supervisor (L2)** | — | 側欄要求 L2 才顯示，但路由本身允許 L1 存取；L1 使用者不會在側欄看到「搜救任務」，但知道網址仍可直接進入 |
| `/emergency/evacuation` | L0 | **Volunteer (L1)** | — | route 允許匿名／公開存取（`requiredLevel={0}`），但 sidebar 設定要 L1 才顯示（`visible:false` 目前也隱藏，實際影響較小，但 minLevel 設定本身與 route 不一致） |
| `/community/mental-health` | L0 | **Volunteer (L1)** | — | 同上模式：route 公開，sidebar minLevel 要求 L1 |
| `/account` | **L1** | — | Policy: L0 | page-policy.ts 定義 `/account` 為 `requiredLevel: 0`（公開），但 `public.routes.tsx` 實際用 `ProtectedRoute requiredLevel={1}` 保護，兩者不一致；`getRequiredLevelByPath('/account')` 若被其他元件用來做 UI 判斷會與實際路由行為矛盾 |

### Top 5（依嚴重度排序，供摘要引用）
1. `/tasks` — sidebar/policy 說 L1 可進，route 實際要 L2（會導致「看得到入口、點了被擋」的使用者體驗 bug）
2. `/account` — policy 說公開（L0），route 實際要 L1（`getRequiredLevelByPath` 若被信任會誤判為可公開存取）
3. `/rescue/search-rescue` — route 比 sidebar 寬鬆（L1 route vs L2 sidebar），存在「側欄看不到但網址可直接進入」的隱藏入口
4. `/emergency/evacuation` — route 公開（L0）但 sidebar 要 L1
5. `/community/mental-health` — route 公開（L0）但 sidebar 要 L1

> 另外，§4a 中 `PermissionsPage`（L3 vs L4）、`AuditLogPage`（L3 vs L5）、`AnalyticsPage`（L2 vs L3）、`ReportPage`（L0 vs L1）、`ResourcesPage`（L2 vs L1）、`ApprovalCenterPage`（L2 vs L3）、`DonationsPage`（L5 vs L2，差距最大）7 組，屬於「同一元件在不同路徑被要求不同權限」，建議與上表一併交給 owner 決策是否統一。

---

## 6. 附錄：統計總數

| 項目 | 數量 | 備註 |
|---|---|---|
| 路由總數 | 127 | 8 個 route group 檔加總 |
| 頁面元件檔（嚴格口徑） | 127 | `*Page.tsx/.ts` + `ICSSectionDashboard.tsx` |
| `src/pages/**` 全部檔案（含 barrel/tabs/mock/utils） | 161 | 寬鬆口徑 |
| `LazyPages.tsx` 實際 export 數 | 90 | 修正先前「81」的說法 |
| 已 lazy-wrap 但未掛任何路由 | 6 | `PersonnelManagementPage`, `LogisticsEquipmentPage`, `DroneControlPage`, `TaskDispatchPage`, `ResourceOverviewPage`, `DrillsPage` |
| 孤兒頁面檔（含上述 6 個） | 43 | 見 §2 |
| 空殼路由 | 16 | 見 §3；16/16 皆有 `PAGE_WIDGET_CONFIGS` key（修正先前「無對應 key」說法） |
| Type A 重複入口組（同元件多路徑） | 20 | 見 §4a |
| Type B 命名衝突對（同名不同檔） | 18 | 見 §4b |
| Sidebar nav items | 47 | `useSidebarConfig.ts` `DEFAULT_NAV_ITEMS`，8 群組 |
| Page-policy 項目 | 47 | `page-policy.ts` `PAGE_POLICIES` |
| 三方權限數值衝突 | 5 | 見 §5 |

---

## 附：待 owner 圈選的處置總覽

以下彙整 §2/§3/§4 中所有標記「待 owner 確認」「待補」「待 owner 圈選」的項目類別，供 owner 快速決策：

1. **可直接接上既有元件的空殼路由（6 條）**：`/domains/mission-command/task-dispatch`、`/domains/workforce/personnel`、`/domains/logistics/equipment`、`/domains/logistics/resource-overview`、`/domains/air-ops/drone-control`、`/drills`——各有現成 lazy-wrap 元件，接上前建議先確認元件本身是否已串真實 API（部分可能仍是假資料）。
2. **可直接 redirect 的空殼路由（2 條）**：`/reunification`（→ `/rescue/reunification`）、`/audit`（→ `/governance/audit`）。
3. **建議刪除或明確標記 roadmap 的空殼路由（4 條）**：`/resource-matching`、`/ai-summary`、`/accounts`、`/tenants`——無任何現成元件可接。
4. **需要業務判斷的空殼路由（4 條）**：`/settings`、`/features`（`pages/admin/*` 模組疑似對應但整包未接線，需一併決定是否啟用整個 admin 模組）、`/domains/mission-command/triage`、`/domains/workforce/shift-calendar`（真實版與假資料版並存，需決定去留）。
5. **Mission Command / Triage「假版上線、真版孤兒」（2 條，高優先）**：建議儘快將 `pages/MissionCommandPage.tsx`、`pages/TriagePage.tsx` 接上對應路由，取代目前線上的假資料版，避免使用者看到寫死的示範資料。
6. **`pages/admin/*` 整包未接線模組（7 檔）**：需 owner 決定是否啟用此管理後台子系統，若啟用需同時解決與 `WebhooksPage`（`/governance/webhooks`）等既有頁面的功能重疊。
7. **權限不一致 5 條 + Type A 权限不同 7 組**：需 owner 決定以 route／sidebar／policy 三者中的哪一個為權威值，並回填其餘兩處。
8. **命名衝突但內容尚未逐行核對的 3 對**：`VolunteerProfileSetupPage`、`AccountPage`、`AnalyticsPage`（domains 版）——建議下一輪逐行核對後補上真假資料結論。
