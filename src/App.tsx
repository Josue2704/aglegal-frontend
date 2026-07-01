import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useSettingsStore } from './store/settings'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Cases from './pages/Cases'
import Sessions from './pages/Sessions'
import Cashflow from './pages/Cashflow'
import Categories from './pages/Categories'
import Payroll from './pages/Payroll'
import Users from './pages/Users'
import Settings from './pages/Settings'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme)
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeSync />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="clients" element={<Clients />} />
            <Route path="cases" element={<Cases />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="cashflow" element={<Cashflow />} />
            <Route path="categories" element={<Categories />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
