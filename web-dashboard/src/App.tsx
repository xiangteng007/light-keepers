import { Routes, Route, Navigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import EventsPage from './pages/EventsPage'
import TasksPage from './pages/TasksPage'
import MapPage from './pages/MapPage'
import NcdrAlertsPage from './pages/NcdrAlertsPage'
import ManualsPage from './pages/ManualsPage'
import ManualDetailPage from './pages/ManualDetailPage'
import ReportPage from './pages/ReportPage'
import VolunteersPage from './pages/VolunteersPage'
import LoginPage from './pages/LoginPage'
import './App.css'

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
    <>
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
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="ncdr-alerts" element={<NcdrAlertsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="manuals" element={<ManualsPage />} />
          <Route path="manuals/:id" element={<ManualDetailPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="volunteers" element={<VolunteersPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
