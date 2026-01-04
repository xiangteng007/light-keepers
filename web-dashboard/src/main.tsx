import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './i18n'
import './styles/senteng-theme.css'
import './styles/theme.css'
import './styles/a11y.css'
import './index.css'
import './styles/CommandCenter.css'

// Skip React rendering for Firebase Auth handler routes
if (window.location.pathname.startsWith('/__/')) {
  console.log('Firebase auth handler route detected, skipping React render');
} else {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
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
