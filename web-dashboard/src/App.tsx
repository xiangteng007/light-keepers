import { Routes } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AuthProvider } from './context/AuthContext'
import { RealtimeProvider } from './context/RealtimeContext'
import { EmergencyProvider } from './context/useEmergencyContext'
import { ThemeProvider } from './context/ThemeProvider'
import { CommandPalette } from './components/CommandPalette'

// ===== Route Groups (extracted for maintainability) =====
import {
  publicRoutes,
  geoRoutes,
  logisticsRoutes,
  rescueRoutes,
  governanceRoutes,
  hubRoutes,
  domainRoutes,
  legacyRoutes,
} from './routes'

import './App.css'
import './styles/map-page.css'
import './styles/ncdr-page.css'
import './styles/manuals-page.css'


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
  // Guard PWA registration — failures should not crash the entire app
  let needRefresh = false;
  let setNeedRefresh = (_v: boolean) => { /* noop */ };
  let updateServiceWorker = async (_reloadPage?: boolean) => { /* noop */ };

  try {
    const swResult = useRegisterSW({
      onRegistered(r) {
        console.log('SW Registered:', r)
      },
      onRegisterError(error) {
        console.log('SW registration error', error)
      },
    });
    needRefresh = swResult.needRefresh[0];
    setNeedRefresh = swResult.needRefresh[1];
    updateServiceWorker = swResult.updateServiceWorker;
  } catch (err) {
    console.warn('[App] PWA registration hook failed, continuing without SW:', err);
  }

  return (
    <ThemeProvider>
    <AuthProvider>
      <RealtimeProvider>
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
          {publicRoutes}
          {legacyRoutes}
          {geoRoutes}
          {logisticsRoutes}
          {rescueRoutes}
          {governanceRoutes}
          {hubRoutes}
          {domainRoutes}
        </Routes>
        </EmergencyProvider>
      </RealtimeProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
