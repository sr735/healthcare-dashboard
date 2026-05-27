import { StrictMode, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider, CssBaseline } from '@mui/material'
import App from './App'
import { createAppTheme } from './theme'
import { useUiStore } from './store/uiStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// ThemedApp is intentionally defined in main.tsx (not exported) because it
// must live inside QueryClientProvider. Fast Refresh is not needed here.
// eslint-disable-next-line react-refresh/only-export-components
/**
 * Thin wrapper that reads themeMode from the Zustand store and recreates the
 * MUI theme whenever it changes.  Must live inside QueryClientProvider so the
 * store's localStorage initialisation runs in the browser context.
 */
function ThemedApp() {
  const { themeMode } = useUiStore()
  const appTheme = useMemo(() => createAppTheme(themeMode), [themeMode])
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemedApp />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
