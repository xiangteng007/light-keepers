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
import ForecastPage from './pages/ForecastPage'
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
          <Route path="/" element={<ProtectedRoute requiredLevel={1}><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            {/* 志工等級 (1) */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="training" element={<TrainingPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            {/* 公開頁面 (0) - 但已在 Layout 內，不用另外設 */}
            <Route path="ncdr-alerts" element={<NcdrAlertsPage />} />
            <Route path="map" element={<MapPage />} />
            <Route path="forecast" element={<ForecastPage />} />
            <Route path="manuals" element={<ManualsPage />} />
            <Route path="manuals/:id" element={<ManualDetailPage />} />
            {/* 幹部等級 (2) */}
            <Route path="tasks" element={<ProtectedRoute requiredLevel={2}><TasksPage /></ProtectedRoute>} />
            <Route path="volunteers" element={<ProtectedRoute requiredLevel={2}><VolunteersPage /></ProtectedRoute>} />
            <Route path="volunteers/:id" element={<ProtectedRoute requiredLevel={2}><VolunteerDetailPage /></ProtectedRoute>} />
            <Route path="volunteers/schedule" element={<ProtectedRoute requiredLevel={2}><VolunteerSchedulePage /></ProtectedRoute>} />
            <Route path="resources" element={<ProtectedRoute requiredLevel={2}><ResourcesPage /></ProtectedRoute>} />
            <Route path="reports" element={<Navigate to="/reports/admin" replace />} />
            <Route path="reports/admin" element={<ProtectedRoute requiredLevel={2}><ReportsAdminPage /></ProtectedRoute>} />
            {/* 常務理事等級 (3) */}
            <Route path="reports/export" element={<ProtectedRoute requiredLevel={3}><ReportsExportPage /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute requiredLevel={3}><AnalyticsPage /></ProtectedRoute>} />
            {/* 理事長等級 (4) */}
            <Route path="permissions" element={<ProtectedRoute requiredLevel={4}><PermissionsPage /></ProtectedRoute>} />
          </Route>
        </Routes>
      </AuthProvider>
    </RealtimeProvider>
  )
}

export default App

