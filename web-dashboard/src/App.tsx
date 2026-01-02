import { Routes, Route, Navigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AuthProvider } from './context/AuthContext'
import { RealtimeProvider } from './context/RealtimeContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import TasksPage from './pages/TasksPage'
import MapPage from './pages/MapPage'
import NcdrAlertsPage from './pages/NcdrAlertsPage'
import ManualsPage from './pages/ManualsPage'
import ManualDetailPage from './pages/ManualDetailPage'
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
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProfilePage from './pages/ProfilePage'
import PermissionsPage from './pages/PermissionsPage'
import BindLinePage from './pages/BindLinePage'
import VolunteerProfileSetupPage from './pages/VolunteerProfileSetupPage'
import VolunteerRegisterPage from './pages/VolunteerRegisterPage'
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
  // PWA Service Worker registration with update prompt
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/bind-line" element={<BindLinePage />} />
          <Route path="/volunteer-setup" element={<ProtectedRoute requiredLevel={1}><VolunteerProfileSetupPage /></ProtectedRoute>} />
          <Route path="/" element={<ProtectedRoute requiredLevel={0}><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            {/* 一般民眾可見 (0) */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="ncdr-alerts" element={<NcdrAlertsPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="manuals" element={<ManualsPage />} />
            <Route path="manuals/:id" element={<ManualDetailPage />} />
            {/* 志工等級 (1) */}
            <Route path="events" element={<ProtectedRoute requiredLevel={1}><EventsPage /></ProtectedRoute>} />
            <Route path="report" element={<ProtectedRoute requiredLevel={1}><ReportPage /></ProtectedRoute>} />
            <Route path="training" element={<ProtectedRoute requiredLevel={1}><TrainingPage /></ProtectedRoute>} />
            <Route path="notifications" element={<ProtectedRoute requiredLevel={1}><NotificationsPage /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute requiredLevel={0}><ProfilePage /></ProtectedRoute>} />
            <Route path="volunteer-register" element={<ProtectedRoute requiredLevel={0}><VolunteerRegisterPage /></ProtectedRoute>} />
            <Route path="resources-public" element={<ProtectedRoute requiredLevel={1}><ResourcesPublicPage /></ProtectedRoute>} />
            <Route path="community" element={<ProtectedRoute requiredLevel={1}><CommunityPage /></ProtectedRoute>} />
            <Route path="activities" element={<ProtectedRoute requiredLevel={1}><ActivitiesPage /></ProtectedRoute>} />
            <Route path="leaderboard" element={<ProtectedRoute requiredLevel={1}><LeaderboardPage /></ProtectedRoute>} />
            {/* VMS 志工個人管理頁面 (1) */}
            <Route path="my-vehicles" element={<ProtectedRoute requiredLevel={1}><VehicleManagementPage /></ProtectedRoute>} />
            <Route path="my-insurance" element={<ProtectedRoute requiredLevel={1}><InsuranceManagementPage /></ProtectedRoute>} />
            <Route path="my-points" element={<ProtectedRoute requiredLevel={1}><PointsReportPage /></ProtectedRoute>} />
            {/* 幹部等級 (2) */}
            <Route path="tasks" element={<ProtectedRoute requiredLevel={2}><TasksPage /></ProtectedRoute>} />
            <Route path="volunteers" element={<ProtectedRoute requiredLevel={2}><VolunteersPage /></ProtectedRoute>} />
            <Route path="volunteers/:id" element={<ProtectedRoute requiredLevel={2}><VolunteerDetailPage /></ProtectedRoute>} />
            <Route path="volunteers/schedule" element={<ProtectedRoute requiredLevel={2}><VolunteerSchedulePage /></ProtectedRoute>} />
            <Route path="resources" element={<ProtectedRoute requiredLevel={2}><ResourcesPage /></ProtectedRoute>} />
            <Route path="approvals" element={<ProtectedRoute requiredLevel={2}><ApprovalCenterPage /></ProtectedRoute>} />
            <Route path="report-schedules" element={<ProtectedRoute requiredLevel={2}><ReportSchedulePage /></ProtectedRoute>} />
            <Route path="reports" element={<Navigate to="/reports/admin" replace />} />
            <Route path="reports/admin" element={<ProtectedRoute requiredLevel={2}><ReportsAdminPage /></ProtectedRoute>} />
            {/* 常務理事等級 (3) */}
            <Route path="reports/export" element={<ProtectedRoute requiredLevel={3}><ReportsExportPage /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute requiredLevel={3}><AnalyticsPage /></ProtectedRoute>} />
            <Route path="sensitive-audit" element={<ProtectedRoute requiredLevel={3}><SensitiveAuditPage /></ProtectedRoute>} />
            <Route path="label-management" element={<ProtectedRoute requiredLevel={3}><LabelManagementPage /></ProtectedRoute>} />
            <Route path="backups" element={<ProtectedRoute requiredLevel={3}><BackupPage /></ProtectedRoute>} />
            {/* 理事長等級 (4) */}
            <Route path="permissions" element={<ProtectedRoute requiredLevel={4}><PermissionsPage /></ProtectedRoute>} />
            {/* 系統擁有者等級 (5) */}
            <Route path="donations" element={<ProtectedRoute requiredLevel={5}><DonationsPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </RealtimeProvider>
  )
}

export default App

