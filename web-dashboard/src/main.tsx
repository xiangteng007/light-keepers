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
}

