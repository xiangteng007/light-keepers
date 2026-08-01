# 頁面檔案處置提案（待 owner 圈選）

- **工作項**：R1 / FE-7（IA 收斂落地）
- **產出日期**：2026-08-01
- **原則**：本任務**只做 redirect / 收斂，未刪除任何頁面檔案**。
  下列清單供 owner 圈選處置；刪除需 owner 明確核可後另開工作項執行。
- **依據**：`docs/audit/ROUTE_IA_RECONCILIATION.md`（2026-07-31 掃描）＋ R1 收斂後重新機器掃描
  （方法同對帳表 §2：解析 `LazyPages.tsx` 全部 export → 對照 `routes/*.routes.tsx` 實際掛載 → 與
  `src/pages/**` 頁面檔交叉比對）。

## 0. 對帳表之後的狀態變化（掃描差異說明）

對帳表列 43 個孤兒；本次重掃為 **36 個**。差異原因：

1. FE-4/3.3 已把真版 `pages/MissionCommandPage.tsx`、`pages/TriagePage.tsx` 接上路由
   （`LazyPages.tsx:143-150`），對應的 `domains/mission-command/*` 假資料版反轉成孤兒。
2. `domains/workforce/*` 的部分假資料副本（Volunteers/Training/VolunteerDetail/
   VolunteerSchedule/VolunteerProfileSetup/ShiftCalendar）已在先前 stub 清理中移除。
3. R1 收斂只動路由（redirect/placeholder），未改變任何頁面檔的孤兒狀態。

---

## 1. 建議刪除（假資料版，真版已上線）——共 6 檔

| 圈選 | 檔案 | 理由 |
|---|---|---|
| ☐ | `src/pages/domains/mission-command/MissionCommandPage.tsx` | 假資料版；真版 `pages/MissionCommandPage.tsx` 已掛 `/domains/mission-command` |
| ☐ | `src/pages/domains/mission-command/TriagePage.tsx` | 假資料版；真版 `pages/TriagePage.tsx` 已掛 `/rescue/triage` |
| ☐ | `src/pages/domains/mission-command/TasksPage.tsx` | 假資料版；真版 `pages/TasksPage.tsx` 已掛 `/tasks` |
| ☐ | `src/pages/OrgChartPage.tsx` | 假資料版；真版 `domains/workforce/OrgChartPage.tsx` 已掛 `/domains/workforce/org-chart` |
| ☐ | `src/pages/ShiftCalendarPage.tsx` | 假資料版；`/workforce/shifts` 由 `WorkforceShiftCalendarPage` 供應（注意：該版本仍是假資料，見 §5-3） |
| ☐ | `src/pages/geo/TacticalMapPage.tsx` | `/geo/tactical-map` 已是 `/geo/map` 的 redirect，此檔為轉址前舊實作 |

## 2. 建議刪除（功能重疊，既有上線版覆蓋）——共 5 檔

| 圈選 | 檔案 | 重疊對象 |
|---|---|---|
| ☐ | `src/pages/analytics/AnalyticsDashboardPage.tsx` | `pages/AnalyticsPage.tsx`（`/hub/analytics`） |
| ☐ | `src/pages/notifications/NotificationCenterPage.tsx` | `pages/NotificationsPage.tsx`（`/hub/notifications`） |
| ☐ | `src/pages/weather/WeatherPage.tsx` | `pages/ForecastPage.tsx`（`/hub/weather`） |
| ☐ | `src/pages/AccountPage.tsx`（頂層版） | `pages/account/AccountPage.tsx`（`/account`） |
| ☐ | `src/pages/admin/WebhookManagementPage.tsx` | `pages/governance/WebhooksPage.tsx`（`/governance/webhooks`） |

## 3. 待 owner 業務決策：接上 or 刪除（已 lazy-wrap、有對應空殼路由）——共 6 檔

R1 已把對應空殼路由改掛「頁面建置中」placeholder；若 owner 決定啟用，把 placeholder 換回元件即可
（需先驗證元件是否串真實 API）。

| 圈選（接上/刪除） | 檔案 | 對應 placeholder 路由 |
|---|---|---|
| ☐ 接上 / ☐ 刪除 | `src/pages/command/TaskDispatchPage.tsx`（export `TaskDispatchPage`） | `/domains/mission-command/task-dispatch` |
| ☐ 接上 / ☐ 刪除 | `src/pages/domains/workforce/PersonnelManagementPage.tsx` | `/domains/workforce/personnel` |
| ☐ 接上 / ☐ 刪除 | `src/pages/domains/logistics/EquipmentPage.tsx`（export `LogisticsEquipmentPage`） | `/domains/logistics/equipment` |
| ☐ 接上 / ☐ 刪除 | `src/pages/resources/ResourceOverviewPage.tsx` | `/domains/logistics/resource-overview` |
| ☐ 接上 / ☐ 刪除 | `src/pages/domains/air-ops/DroneControlPage.tsx` | `/domains/air-ops/drone-control` |
| ☐ 接上 / ☐ 刪除 | `src/pages/c2/DrillsPage.tsx` | `/drills` |

## 4. 待 owner 業務決策：`pages/admin/*` 整包未接線模組——共 7 檔

整個管理後台子系統做好了卻從未接上路由（barrel `pages/admin/index.ts` 無人 import）。
需一次性決定：啟用整包（另開工作項接線）或整包刪除。

| 圈選 | 檔案 | 備註 |
|---|---|---|
| ☐ | `src/pages/admin/FeatureFlagsPage.tsx` | 高度疑似 `/features` placeholder 該接的元件 |
| ☐ | `src/pages/admin/SystemSettingsPage.tsx` | 高度疑似 `/settings` placeholder 該接的元件（或與 `/governance/settings` 重疊） |
| ☐ | `src/pages/admin/DashboardEditorPage.tsx` | 儀表板編輯器 |
| ☐ | `src/pages/admin/DrillCenterPage.tsx` | 與 `/drills`、`pages/c2/DrillsPage.tsx` 三方重疊需釐清 |
| ☐ | `src/pages/admin/GeofencingPage.tsx` | 地理圍欄 |
| ☐ | `src/pages/admin/SchedulerPage.tsx` | 排程器 |
| ☐ | `src/pages/admin/WebhookManagementPage.tsx` | 亦列於 §2（重疊） |

## 5. 待 owner 確認功能定位（無對照組或功能不同）——共 12 檔

| 圈選（保留/刪除） | 檔案 | 說明 |
|---|---|---|
| ☐ | `src/pages/AttendancePage.tsx` | 個人 GPS/QR 簽到 UI，與 `/domains/workforce/attendance`（管理端）功能不同；若「個人簽到」是災時需求（R1 設計語言把「簽到」列為關鍵動作），建議接上而非刪除 |
| ☐ | `src/pages/CommandPostMapPage.tsx` | 指揮所地圖，功能未知 |
| ☐ | `src/pages/PackageLibraryPage.tsx` | 功能未知 |
| ☐ | `src/pages/PublicSearchPage.tsx` | 功能未知 |
| ☐ | `src/pages/DroneControlPage.tsx`（頂層版） | 與 `domains/air-ops/DroneControlPage.tsx` 同名不同檔，擇一 |
| ☐ | `src/pages/TwoFactorSetupPage.tsx` ＋ `src/pages/security/TwoFactorSetupPage.tsx` | 兩版 2FA 設定皆未上線；資安功能建議擇一接上 |
| ☐ | `src/pages/care/MyMoodPage.tsx` | 心理健康自我追蹤，與 `/community/mental-health` 相關 |
| ☐ | `src/pages/command/AARPlaybackPage.tsx` | 與 `/aar` 疑似擴充 |
| ☐ | `src/pages/command/IAPManagerPage.tsx` | ICS IAP 管理 |
| ☐ | `src/pages/command/SITREPViewerPage.tsx` | SITREP 檢視 |
| ☐ | `src/pages/monitor/MeshMonitorPage.tsx` | 與 `/governance/monitor` 疑似相關 |
| ☐ | `src/pages/public/TransparencyPage.tsx`、`src/pages/voice/VoiceCallPage.tsx` | 公開透明度頁 / 語音通話，未接線 |

## 6. Shell 舊元件（R1 重建後不再使用）——共 3 檔

R1 新殼（`AppSidebar.tsx` + 重建的 `AppShellLayout.tsx`）上線後，下列舊元件零引用
（`EmergencyQuickActions` 僅被舊 `Sidebar.tsx` 引用；`Sidebar.tsx` 在 R1 之前即無人掛載）：

| 圈選 | 檔案 | 備註 |
|---|---|---|
| ☐ | `src/components/layout/Sidebar.tsx`（＋`Sidebar.css`） | 舊 v3 側欄，從未被掛載 |
| ☐ | `src/components/layout/EmergencyQuickActions.tsx`（＋css） | 快捷功能已由 AppSidebar quickActions 取代 |
| ☐ | `src/components/layout/RoleBasedNav.tsx`（＋css） | 零引用（掃描見對帳表） |

## 7. 其餘既知重複（維持現狀，R2/R3 處理）

- `components/ui/`（deprecated 元件庫）：待 design-system 補齊 Skeleton/Textarea/ConfirmModal 後刪除
  （`DESIGN_SYSTEM_CONSOLIDATION.md` §6-4）。
- 16 條空殼路由中的 `resource-matching` / `ai-summary` / `accounts` / `tenants` 無元件可接，
  已掛「建置中」placeholder；若 owner 判定為 roadmap 外，可直接移除路由（不涉及頁面檔）。
- `PAGE_WIDGET_CONFIGS` 中對應空殼路由的靜態假資料 widget 定義（`WidgetContent.tsx`）：
  placeholder 上線後已無入口，R3 批次時可一併清理。
