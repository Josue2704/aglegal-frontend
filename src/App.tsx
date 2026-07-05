import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useSettingsStore } from './store/settings'
import { useAuthStore } from './store/auth'
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
import Invoices from './pages/Invoices'
import Tasks from './pages/Tasks'
import Roles from './pages/Roles'

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

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.is_admin || user.permissions.includes(permission)) return <>{children}</>
  return <Navigate to="/" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (user.is_admin) return <>{children}</>
  return <Navigate to="/" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <Toaster richColors position="top-right" />
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
            <Route path="clients" element={<PermissionRoute permission="clientes.ver"><Clients /></PermissionRoute>} />
            <Route path="cases" element={<PermissionRoute permission="expedientes.ver"><Cases /></PermissionRoute>} />
            <Route path="tasks" element={<PermissionRoute permission="tareas.ver"><Tasks /></PermissionRoute>} />
            <Route path="sessions" element={<PermissionRoute permission="agenda.ver"><Sessions /></PermissionRoute>} />
            <Route path="cashflow" element={<PermissionRoute permission="flujo_caja.ver"><Cashflow /></PermissionRoute>} />
            <Route path="categories" element={<PermissionRoute permission="categorias.ver"><Categories /></PermissionRoute>} />
            <Route path="payroll" element={<PermissionRoute permission="nominas.ver"><Payroll /></PermissionRoute>} />
            <Route path="invoices" element={<PermissionRoute permission="facturas.ver"><Invoices /></PermissionRoute>} />
            <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
            <Route path="roles" element={<AdminRoute><Roles /></AdminRoute>} />
            <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
