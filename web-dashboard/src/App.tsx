import { Routes, Route, Navigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AuthProvider } from './context/AuthContext'
import { RealtimeProvider } from './context/RealtimeContext'
import ProtectedRoute from './components/ProtectedRoute'
import PageWrapper from './components/layout/PageWrapper'
import EventsPage from './pages/EventsPage'
import TasksPage from './pages/TasksPage'
import MapPage from './pages/MapPage'
import NcdrAlertsPage from './pages/NcdrAlertsPage'
import ManualsPage from './pages/ManualsPage'
import ManualDetailPage from './pages/ManualDetailPage'
import { ManualHomePage } from './pages/manual'
import { ComponentShowcase } from './pages/ComponentShowcase'
import ReportPage from './pages/ReportPage'
import VolunteersPage from './pages/VolunteersPage'
import VolunteerDetailPage from './pages/VolunteerDetailPage'
import TrainingPage from './pages/TrainingPage'
import ResourcesPage from './pages/ResourcesPage'
import NotificationsPage from './pages/NotificationsPage'
import ReportsAdminPage from './pages/ReportsAdminPage'
import ReportsExportPage from './pages/ReportsExportPage'
import AnalyticsPage from './pages/AnalyticsPage'
import VolunteerSchedulePage from './pages/VolunteerSchedulePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import PermissionsPage from './pages/PermissionsPage'
import BindLinePage from './pages/BindLinePage'
import VolunteerProfileSetupPage from './pages/VolunteerProfileSetupPage'
import ForecastPage from './pages/ForecastPage'
import DonationsPage from './pages/DonationsPage'
import ResourcesPublicPage from './pages/ResourcesPublicPage'
import ApprovalCenterPage from './pages/ApprovalCenterPage'
import SensitiveAuditPage from './pages/SensitiveAuditPage'
import LabelManagementPage from './pages/LabelManagementPage'
import VehicleManagementPage from './pages/VehicleManagementPage'
import InsuranceManagementPage from './pages/InsuranceManagementPage'
import PointsReportPage from './pages/PointsReportPage'
import CommunityPage from './pages/CommunityPage'
import ActivitiesPage from './pages/ActivitiesPage'
import LeaderboardPage from './pages/LeaderboardPage'
import ReportSchedulePage from './pages/ReportSchedulePage'
import BackupPage from './pages/BackupPage'
import CommandCenterPage from './pages/CommandCenterPage'
import MentalHealthPage from './pages/MentalHealthPage'

// Note: TacticalMapPage, ResourceMatchingPage, ReunificationPage, AISummaryPage, AuditLogPage,
// AccountsPage, TenantsPage, SettingsPage, FeaturesPage now use PageWrapper + Widget system
// Their pageId is used to load page-specific widget configurations

// ===== V2 Domain Architecture Imports =====
import {
  AttendancePage as WorkforceAttendancePage,
  LeaderboardPage as WorkforceLeaderboardPage,
  OrgChartPage as WorkforceOrgChartPage,
  PointsReportPage as WorkforcePointsReportPage,
  ShiftCalendarPage as WorkforceShiftCalendarPage,
} from './pages/domains/workforce'

import {
  MissionCommandPage,
  TriagePage,
} from './pages/domains/mission-command'

import {
  EquipmentPage as LogisticsEquipmentPage,
  ResourcesPage as LogisticsResourcesPage,
} from './pages/domains/logistics'

import {
  ReportsPage as DataInsightReportsPage,
} from './pages/domains/data-insight'

import {
  CommunicationsPage as ConnectivityCommunicationsPage,
} from './pages/domains/connectivity'

import {
  CommunityPage as DomainCommunityPage,
} from './pages/domains/community'

import {
  SettingsPage as CoreSettingsPage,
  DashboardPage as CoreDashboardPage,
} from './pages/domains/core'

import {
  DroneControlPage,
} from './pages/domains/air-ops'

import TaskDispatchPage from './pages/command/TaskDispatchPage'
import ResourceOverviewPage from './pages/resources/ResourceOverviewPage'
import PersonnelManagementPage from './pages/domains/workforce/PersonnelManagementPage'
import CommunityCenterPage from './pages/domains/community/CommunityCenterPage'
import ReportGeneratorPage from './pages/analytics/ReportGeneratorPage'

import IncidentsPage from './pages/c2/IncidentsPage'
import DrillsPage from './pages/c2/DrillsPage'
import AARPage from './pages/c2/AARPage'

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
    <RealtimeProvider>
      <AuthProvider>
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

        <Routes>
          {/* ===== 獨立頁面 (無需 Layout 包裝) ===== */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/bind-line" element={<BindLinePage />} />
          <Route path="/volunteer-setup" element={<ProtectedRoute requiredLevel={1}><VolunteerProfileSetupPage /></ProtectedRoute>} />
          <Route path="/showcase" element={<ComponentShowcase />} />

          {/* ===== Dashboard 和 Command Center (使用 AppShellLayout) ===== */}
          <Route path="/dashboard" element={<CommandCenterPage />} />
          <Route path="/command-center" element={<CommandCenterPage />} />
          <Route path="/mental-health" element={<PageWrapper pageId="mental-health" />} />

          {/* ===== 根路由重導向 ===== */}
          <Route index element={<Navigate to="/command-center" replace />} />


          {/* ===== v2.2: 舊 redirect routes 已移除 (2026-01-12) ===== */}

          {/* ===== v2.1 新路由處理 ===== */}
          {/* Geo Routes */}
          <Route path="/geo/map-ops" element={<PageWrapper pageId="map-ops"><MapPage /></PageWrapper>} />
          <Route path="/geo/alerts" element={<PageWrapper pageId="geo-alerts"><NcdrAlertsPage /></PageWrapper>} />
          <Route path="/geo/weather" element={<PageWrapper pageId="geo-weather"><ForecastPage /></PageWrapper>} />

          {/* Logistics Routes */}
          <Route path="/logistics/inventory" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="logistics-inventory"><ResourcesPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/logistics/equipment" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-equipment" /></ProtectedRoute>} />
          <Route path="/logistics/donations" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="logistics-donations"><DonationsPage /></PageWrapper></ProtectedRoute>} />

          {/* Workforce Routes */}
          <Route path="/workforce/people" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-people"><VolunteersPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/workforce/shifts" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-shifts" /></ProtectedRoute>} />
          <Route path="/workforce/performance" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="workforce-performance"><LeaderboardPage /></PageWrapper></ProtectedRoute>} />

          {/* Community Routes */}
          <Route path="/community/hub" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="community-hub"><CommunityCenterPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/community/mental-health" element={<PageWrapper pageId="mental-health" />} />

          {/* Analytics Routes */}
          <Route path="/analytics/reports" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="analytics-reports"><ReportsAdminPage /></PageWrapper></ProtectedRoute>} />

          {/* Knowledge Routes */}
          <Route path="/knowledge/manuals" element={<PageWrapper pageId="knowledge-manuals"><ManualsPage /></PageWrapper>} />
          <Route path="/knowledge/manuals/:id" element={<PageWrapper pageId="manual-detail"><ManualDetailPage /></PageWrapper>} />

          {/* Governance Routes */}
          <Route path="/governance/iam" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-iam"><PermissionsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/governance/audit" element={<ProtectedRoute requiredLevel={3}><PageWrapper pageId="governance-audit" /></ProtectedRoute>} />
          <Route path="/governance/settings" element={<ProtectedRoute requiredLevel={4}><PageWrapper pageId="governance-settings" /></ProtectedRoute>} />

          {/* Intake Route (統一通報入口) */}
          <Route path="/intake" element={<PageWrapper pageId="intake"><ReportPage /></PageWrapper>} />

          {/* ===== Hub Routes (v4.0) ===== */}
          <Route path="/hub/notifications" element={<ProtectedRoute requiredLevel={1}><PageWrapper pageId="hub-notifications"><NotificationsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/hub/geo-alerts" element={<PageWrapper pageId="hub-geo-alerts"><NcdrAlertsPage /></PageWrapper>} />
          <Route path="/hub/weather" element={<PageWrapper pageId="hub-weather"><ForecastPage /></PageWrapper>} />
          <Route path="/hub/analytics" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="hub-analytics"><AnalyticsPage /></PageWrapper></ProtectedRoute>} />
          <Route path="/hub/ai" element={<ProtectedRoute requiredLevel={2}><PageWrapper pageId="hub-ai" /></ProtectedRoute>} />
          <Route path="/hub/offline" element={<PageWrapper pageId="hub-offline" />} />

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
      </AuthProvider>
    </RealtimeProvider>
  )
}

export default App
