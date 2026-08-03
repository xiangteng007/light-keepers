import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
// R5/T5 主題化圖文系統：字體隨 app 打包，不依賴使用者 OS（災防離線一致性）
import '@fontsource-variable/jetbrains-mono' // 'JetBrains Mono Variable' — 讀數/時間戳/座標
import '@fontsource/rajdhani/500.css' // 'Rajdhani' — stencil 小標
import '@fontsource/rajdhani/600.css'
import '@fontsource/rajdhani/700.css'
import '@fontsource/noto-sans-tc/400.css' // 'Noto Sans TC' — 中文正文
import '@fontsource/noto-sans-tc/500.css'
import '@fontsource/noto-sans-tc/700.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import { defaultQueryRetry } from './api/errors'
import './i18n' // 多語系支援
import './styles/theme.css'
import './styles/a11y.css' // 無障礙樣式
import './styles/EmergencyTheme.css' // 緊急模式主題
import './index.css'
import { appLogger, pwaLogger } from './utils/logger'

// Skip React rendering for Firebase Auth handler routes
// Firebase will handle these internally via their SDK
if (window.location.pathname.startsWith('/__/')) {
  // Let Firebase handle the auth callback - don't render React app
  appLogger.info('Firebase auth handler route detected, skipping React render');
} else {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 分鐘
        // FE-4: 4xx（含 401/403/404）不重試——重試只會在 refresh 失敗後多打無效請求
        retry: defaultQueryRetry,
      },
    },
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ErrorBoundary>
      </QueryClientProvider>
    </StrictMode>,
  )

  // PWA Service Worker Registration - Only in Production
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          pwaLogger.info('Service Worker registered:', registration.scope);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  pwaLogger.info('New content available, refresh to update');
                  // Optionally show update notification to user
                }
              });
            }
          });
        })
        .catch((error) => {
          pwaLogger.warn('Service Worker registration failed:', error);
        });

      // Listen for sync results
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          pwaLogger.info('Sync completed:', event.data.results);
        }
      });
    });
  }
}

