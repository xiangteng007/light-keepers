import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './i18n' // 多語系支援
import './styles/senteng-theme.css'
import './styles/theme.css'
import './styles/a11y.css' // 無障礙樣式
import './index.css'

// Skip React rendering for Firebase Auth handler routes
// Firebase will handle these internally via their SDK
if (window.location.pathname.startsWith('/__/')) {
  // Let Firebase handle the auth callback - don't render React app
  console.log('Firebase auth handler route detected, skipping React render');
} else {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 分鐘
        retry: 1,
      },
    },
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  )

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] New content available, refresh to update');
                  // Optionally show update notification to user
                }
              });
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });

      // Listen for sync results
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          console.log('[PWA] Sync completed:', event.data.results);
        }
      });
    });
  }
}

