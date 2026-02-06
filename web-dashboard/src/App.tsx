import { Routes, Route, Navigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AuthProvider } from './context/AuthContext'
import { RealtimeProvider } from './context/RealtimeContext'
import { EmergencyProvider } from './context/useEmergencyContext'
import { ThemeProvider } from './context/ThemeProvider'
import ProtectedRoute from './components/ProtectedRoute'
import PageWrapper from './components/layout/PageWrapper'
import { CommandPalette } from './components/CommandPalette'

// ===== Lazy-loaded Pages (Code Splitting) =====
// All pages are now dynamically imported for optimal bundle size
import {
  // Core Pages
  LoginPage,
  AuthCallbackPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  BindLinePage,
  ProfilePage,
  
  // Dashboard & Command
  CommandCenterPage,
  MentalHealthPage,
  EmergencyResponsePage,
  
  // Events & Tasks
  EventsPage,
  TasksPage,
  
  // Map & Geo
  MapPage,
  NcdrAlertsPage,
  ForecastPage,
  
  // Knowledge & Manuals
  ManualsPage,
  ManualDetailPage,
  ManualHomePage,
  
  // Volunteers & Workforce
  VolunteersPage,
  VolunteerDetailPage,
  VolunteerSchedulePage,
  VolunteerProfileSetupPage,
  TrainingPage,
  
  // Resources & Logistics
  ResourcesPage,
  ResourcesPublicPage,
  EquipmentPage,
  DonationsPage,
  UnifiedResourcesPage,
  VehicleManagementPage,
  InsuranceManagementPage,
  
  // Reports & Analytics
  ReportPage,
  ReportsAdminPage,
  ReportsExportPage,
  AnalyticsPage,
  ReportSchedulePage,
  UnifiedReportingPage,
  PointsReportPage,
  
  // Community
  CommunityPage,
  ActivitiesPage,
  LeaderboardPage,
  
  // Governance & Admin
  PermissionsPage,
  AuditLogPage,
  BackupPage,
  LabelManagementPage,
  ApprovalCenterPage,
  SensitiveAuditPage,
  
  // Rescue Operations
  SearchRescuePage,
  MedicalTransportPage,
  FieldCommsPage,
  ReunificationPage,
  
  // ICS Forms
  ICSFormsPage,
  
  // AI & Hub
  AITasksPage,
  AIChatPage,
  NotificationsPage,
  OfflinePrepPage,
  
  // Simulation & Interoperability
  SimulationPage,
  InteroperabilityPage,
  
  // v6.0 Governance
  SecurityPage,
  WebhooksPage,
  BiometricPage,
  SettingsPage,
  
  // Domain Pages
  MissionCommandPage,
  TriagePage,
  SheltersPage,
  ICSSectionDashboard,
  ICS201BriefingPage,
  ICS205CommsPage,
  
  // Workforce Domain
  WorkforceAttendancePage,
  WorkforceLeaderboardPage,
  WorkforceOrgChartPage,
  WorkforcePointsReportPage,
  WorkforceShiftCalendarPage,
  
  // Logistics Domain
  LogisticsResourcesPage,
  
  // Data Insight Domain
  DataInsightReportsPage,
  
  // Connectivity Domain
  ConnectivityCommunicationsPage,
  
  // Community Domain
  DomainCommunityPage,
  CommunityCenterPage,
  
  // Core Domain
  CoreSettingsPage,
  CoreDashboardPage,
  
  // C2 Pages
  IncidentsPage,
  AARPage,
  ReportGeneratorPage,
  
  // Account & Showcase
  AccountPage,
  ComponentShowcase,
} from './components/lazy/LazyPages'

import './App.css'



/**
 * 頁面權限等級對應：
 * 0 = 公開 (不用登入)
 * 1 = 登記志工
 * 2 = 幹部
 * 3 = 常務理事
 * 4 = 理事長
 * 5 = 系統擁有者
 */
function App() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  return (
    <ThemeProvider>
    <RealtimeProvider>
      <AuthProvider>
        <EmergencyProvider>
        {/* PWA Update Prompt */}
        {needRefresh && (
          <div className="pwa-update-prompt">
            <div className="pwa-update-prompt__content">
              <span className="pwa-update-prompt__icon">🔄</span>
              <span className="pwa-update-prompt__text">有新版本可用</span>
              <button
                className="pwa-update-prompt__btn pwa-update-prompt__btn--primary"
                onClick={() => updateServiceWorker(true)}
              >
                更新
              </button>
              <button
                className="pwa-update-prompt__btn pwa-update-prompt__btn--secondary"
                onClick={() => setNeedRefresh(false)}
              >
                稍後
              </button>
            </div>
          </div>
        )}
        {/* Command Palette (Cmd+K) */}
        <CommandPalette />

        <Routes>
          {/* ===== 獨立頁面 (無需 Layout 包裝) ===== */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/bind-line" element={<BindLinePage />} />
          <Route path="/volunteer-setup" element={<ProtectedRoute requiredLevel={1}><VolunteerProfileSetupPage /></ProtectedRoute>} />
          <Route path="/showcase" element={<ComponentShowcase />} />
          <Route path="/account" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="account"><AccountPage /></PageWrapper></ProtectedRoute>} />

          {/* ===== Dashboard 和 Command Center (使用 AppShellLayout) ===== */}
          <Route path="/dashboard" element={<ProtectedRoute requiredLevel={1}><CommandCenterPage /></ProtectedRoute>} />
          <Route path="/command-center" element={<ProtectedRoute requiredLevel={1}><CommandCenterPage /></ProtectedRoute>} />
          <Route path="/mental-health" element={<PageWrapper pageId="mental-health"><MentalHealthPage /></PageWrapper>} />

          {/* ===== Emergency 緊急快捷 Routes (Expert Council v3.0) ===== */}
          <Route path="/emergency/sos" element={<PageWrapper pageId="emergency-sos"><EmergencyResponsePage /></PageWrapper>} />
          <Route path="/emergency/evacuation" element={<PageWrapper pageId="emergency-evacuation"><EmergencyResponsePage /></PageWrapper>} />
          <Route path="/emergency/hotline" element={<PageWrapper pageId="emergency-hotline"><EmergencyResponsePage /></PageWrapper>} />
          
          {/* ===== Command IC Dashboard (IC 儀表板) ===== */}
          <Route path="/command/ic" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="command-ic"><ICSSectionDashboard /></PageWrapper></ProtectedRoute>} />

          {/* ===== 根路由重導向 (需認證檢查) ===== */}
          <Route index element={<ProtectedRoute requiredLevel={1}><Navigate to="/command-center" replace /></ProtectedRoute>} />


          {/* ===== v2.2: 舊 redirect routes 已移除 (2026-01-12) ===== */}

          {/* Geo Routes - 整合後 */}
          <Route path="/geo/map" element={<PageWrapper pageId="unified-map"><MapPage /></PageWrapper>} />
          <Route path="/geo/map-ops" element={<Navigate to="/geo/map" replace />} />
          <Route path="/geo/tactical-map" element={<Navigate to="/geo/map" replace />} />
          <Route path="/geo/alerts" element={<PageWrapper pageId="geo-alerts"><NcdrAlertsPage /></PageWrapper>} />
          <Route path="/geo/weather" element={<PageWrapper pageId="geo-weather"><ForecastPage /></PageWrapper>} />
          <Route path="/geo/shelters" element={<PageWrapper pageId="geo-shelters"><SheltersPage /></PageWrapper>} />

          {/* Logistics Routes */}
          <Route path="/logistics/inventory" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="logistics-inventory"><ResourcesPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/logistics/equipment" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-equipment"><EquipmentPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/logistics/donations" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-donations"><DonationsPage /></PageWrapper></ProtectedRoute>} />

          {/* Workforce Routes */}
          <Route path="/workforce/people" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-people"><VolunteersPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/workforce/shifts" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-shifts"><WorkforceShiftCalendarPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/workforce/performance" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-performance"><LeaderboardPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/workforce/mobilization" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="workforce-mobilization"><VolunteersPage /></PageWrapper></ProtectedRoute>} />

          {/* Community Routes */}
          <Route path="/community/hub" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community-hub"><CommunityCenterPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/community/mental-health" element={<PageWrapper pageId="mental-health"><MentalHealthPage /></PageWrapper>} />

          {/* Analytics Routes */}
          <Route path="/analytics/reports" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-reports"><ReportsAdminPage /></PageWrapper></ProtectedRoute>} />

          {/* Knowledge Routes */}
          <Route path="/knowledge/manuals" element={<PageWrapper pageId="knowledge-manuals"><ManualsPage /></PageWrapper>} />
          <Route path="/knowledge/manuals/:id" element={<PageWrapper pageId="manual-detail"><ManualDetailPage /></PageWrapper>} />

          {/* Governance Routes */}
          <Route path="/governance/iam" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-iam"><PermissionsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/governance/audit" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-audit"><AuditLogPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/governance/security" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-security"><SecurityPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/governance/webhooks" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="governance-webhooks"><WebhooksPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/governance/biometric" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="governance-biometric"><BiometricPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/governance/settings" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="governance-settings"><SettingsPage /></PageWrapper></ProtectedRoute>} />

          {/* Admin Audit Route (alias) */}
          <Route path="/admin/audit-logs" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="admin-audit-logs"><AuditLogPage /></PageWrapper></ProtectedRoute>} />

          {/* ===== Ops Routes (for sidebar items) ===== */}
          <Route path="/ops/ics-forms" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ops-ics-forms"><ICSFormsPage /></PageWrapper></ProtectedRoute>} />

          {/* ===== Rescue Routes (Expert Council Navigation v3.0) ===== */}
          <Route path="/rescue/shelters" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="rescue-shelters"><SheltersPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/rescue/triage" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="rescue-triage"><TriagePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/rescue/search-rescue" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="rescue-search"><SearchRescuePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/rescue/reunification" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="rescue-reunification"><ReunificationPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/rescue/medical-transport" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="rescue-medical"><MedicalTransportPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/rescue/field-comms" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="rescue-comms"><FieldCommsPage /></PageWrapper></ProtectedRoute>} />

          {/* ===== ICS Section Dashboard (Expert Council Navigation v3.0) ===== */}
          <Route path="/ics" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ics-dashboard"><ICSSectionDashboard /></PageWrapper></ProtectedRoute>} />
          <Route path="/ics/:section" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ics-section"><ICSSectionDashboard /></PageWrapper></ProtectedRoute>} />
          <Route path="/ics/201" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ics-201"><ICS201BriefingPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/ics/205" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ics-205"><ICS205CommsPage /></PageWrapper></ProtectedRoute>} />

          {/* ===== Additional Logistics Routes ===== */}
          <Route path="/logistics/unified-resources" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-unified-resources"><UnifiedResourcesPage /></PageWrapper></ProtectedRoute>} />

          {/* ===== Additional Analytics Routes ===== */}
          <Route path="/analytics/unified-reporting" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-unified-reporting"><UnifiedReportingPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/analytics/simulation" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-simulation"><SimulationPage /></PageWrapper></ProtectedRoute>} />

          {/* ===== Additional Governance Routes ===== */}
          <Route path="/governance/interoperability" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-interoperability"><InteroperabilityPage /></PageWrapper></ProtectedRoute>} />


          {/* Intake Route (統一通報入口) */}
          <Route path="/intake" element={<PageWrapper pageId="intake"><ReportPage /></PageWrapper>} />

          {/* ===== Hub Routes (v4.0) ===== */}
          <Route path="/hub/notifications" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="hub-notifications"><NotificationsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/hub/geo-alerts" element={<PageWrapper pageId="hub-geo-alerts"><NcdrAlertsPage /></PageWrapper>} />
          <Route path="/hub/weather" element={<PageWrapper pageId="hub-weather"><ForecastPage /></PageWrapper>} />
          <Route path="/hub/analytics" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="hub-analytics"><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/hub/ai" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="hub-ai"><AITasksPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/hub/ai-chat" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="hub-ai-chat"><AIChatPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/hub/offline" element={<PageWrapper pageId="hub-offline"><OfflinePrepPage /></PageWrapper>} />

          {/* ===== 舊路由保留 (未在 redirect 中處理的) ===== */}
          <Route path="/manuals/:id" element={<PageWrapper pageId="manual-detail"><ManualDetailPage /></PageWrapper>} />
          <Route path="/manuals-v3" element={<PageWrapper pageId="manuals-v3"><ManualHomePage /></PageWrapper>} />

          {/* ===== 志工等級 (1) ===== */}
          <Route path="/events" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="events"><EventsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="report"><ReportPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/training" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="training"><TrainingPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="notifications"><NotificationsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute requiredLevel={0}><PageWrapper pageId="profile"><ProfilePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/resources-public" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="resources-public"><ResourcesPublicPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community"><CommunityPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/reunification" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="reunification" /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="activities"><ActivitiesPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="leaderboard"><LeaderboardPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/my-vehicles" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-vehicles"><VehicleManagementPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/my-insurance" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-insurance"><InsuranceManagementPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/my-points" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="my-points"><PointsReportPage /></PageWrapper></ProtectedRoute>} />

          {/* ===== 幹部等級 (2) ===== */}
          <Route path="/tasks" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="tasks"><TasksPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/volunteers" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="volunteers"><VolunteersPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/volunteers/:id" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="volunteer-detail"><VolunteerDetailPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/volunteers/schedule" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="volunteer-schedule"><VolunteerSchedulePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="resources"><ResourcesPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="approvals"><ApprovalCenterPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/report-schedules" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="report-schedules"><ReportSchedulePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/reports" element={<Navigate to="/reports/admin" replace />} />
          <Route path="/reports/admin" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="reports-admin"><ReportsAdminPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/resource-matching" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="resource-matching" /></ProtectedRoute>} />
          <Route path="/ai-summary" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="ai-summary" /></ProtectedRoute>} />

          {/* ===== 常務理事等級 (3) ===== */}
          <Route path="/reports/export" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="reports-export"><ReportsExportPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="analytics"><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/sensitive-audit" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="sensitive-audit"><SensitiveAuditPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/label-management" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="label-management"><LabelManagementPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/backups" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="backups"><BackupPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="audit" /></ProtectedRoute>} />

          {/* ===== 理事長等級 (4) ===== */}
          <Route path="/permissions" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="permissions"><PermissionsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/accounts" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="accounts" /></ProtectedRoute>} />

          {/* ===== 系統擁有者等級 (5) ===== */}
          <Route path="/donations" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="donations"><DonationsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/tenants" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="tenants" /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="settings" /></ProtectedRoute>} />
          <Route path="/features" element={<ProtectedRoute requiredLevel={5}><PageWrapper pageId="features" /></ProtectedRoute>} />

          {/* ===== V2 Domain Architecture Routes ===== */}
          {/* Mission Command Domain */}
          <Route path="/domains/mission-command" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="mission-command"><MissionCommandPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/domains/mission-command/triage" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="triage" /></ProtectedRoute>} />
          <Route path="/domains/mission-command/task-dispatch" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="task-dispatch" /></ProtectedRoute>} />

          {/* C2 Additional Pages */}
          <Route path="/incidents" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="incidents"><IncidentsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/drills" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="drills" /></ProtectedRoute>} />
          <Route path="/aar" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="aar"><AARPage /></PageWrapper></ProtectedRoute>} />

          {/* Workforce Domain */}
          <Route path="/domains/workforce/shift-calendar" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="shift-calendar" /></ProtectedRoute>} />
          <Route path="/domains/workforce/attendance" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="attendance"><WorkforceAttendancePage /></PageWrapper></ProtectedRoute>} />
          <Route path="/domains/workforce/org-chart" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="org-chart"><WorkforceOrgChartPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/domains/workforce/leaderboard" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-leaderboard"><WorkforceLeaderboardPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/domains/workforce/points-report" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="workforce-points"><WorkforcePointsReportPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/domains/workforce/personnel" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="personnel" /></ProtectedRoute>} />

          {/* Logistics Domain */}
          <Route path="/domains/logistics/equipment" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="equipment" /></ProtectedRoute>} />
          <Route path="/domains/logistics/resources" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-resources"><LogisticsResourcesPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/domains/logistics/resource-overview" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="resource-overview" /></ProtectedRoute>} />

          {/* Data Insight Domain */}
          <Route path="/domains/data-insight/reports" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="data-reports"><DataInsightReportsPage /></PageWrapper></ProtectedRoute>} />

          {/* Connectivity Domain */}
          <Route path="/domains/connectivity/communications" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="communications"><ConnectivityCommunicationsPage /></PageWrapper></ProtectedRoute>} />

          {/* Community Domain */}
          <Route path="/domains/community" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="domain-community"><DomainCommunityPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/domains/community/center" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community-center"><CommunityCenterPage /></PageWrapper></ProtectedRoute>} />

          {/* Analytics Domain */}
          <Route path="/domains/analytics/report-generator" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="report-generator"><ReportGeneratorPage /></PageWrapper></ProtectedRoute>} />

          {/* Core Domain */}
          <Route path="/domains/core/settings" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="core-settings"><CoreSettingsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/domains/core/dashboard" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="core-dashboard"><CoreDashboardPage /></PageWrapper></ProtectedRoute>} />

          {/* Air Ops Domain */}
          <Route path="/domains/air-ops/drone-control" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="drone-control" /></ProtectedRoute>} />
        </Routes>
        </EmergencyProvider>
      </AuthProvider>
    </RealtimeProvider>
    </ThemeProvider>
  )
}

export default App
