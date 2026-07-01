import { Outlet, useLocation, Link } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Toaster } from 'sonner'
import { useSettingsStore } from '@/store/settings'

const BREADCRUMB: Record<string, { label: string; parent?: string }> = {
  '/':           { label: 'Dashboard' },
  '/clients':    { label: 'Clientes' },
  '/cases':      { label: 'Expedientes', parent: 'Gestión' },
  '/sessions':   { label: 'Agenda', parent: 'Gestión' },
  '/cashflow':   { label: 'Flujo de Caja', parent: 'Finanzas' },
  '/payroll':    { label: 'Nóminas', parent: 'Finanzas' },
  '/categories': { label: 'Categorías', parent: 'Finanzas' },
  '/users':      { label: 'Usuarios', parent: 'Sistema' },
  '/settings':   { label: 'Configuración', parent: 'Sistema' },
}

export function Layout() {
  const { pathname } = useLocation()
  const crumb = BREADCRUMB[pathname] ?? { label: pathname.slice(1) }
  const { theme, toggleTheme } = useSettingsStore()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="shrink-0 flex items-center px-6 py-3 gap-3"
          style={{
            borderBottom: '1px solid hsl(var(--c-header-border))',
            background: 'hsl(var(--c-header-bg))',
          }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            {crumb.parent && (
              <>
                <span className="text-muted-foreground">{crumb.parent}</span>
                <span style={{ color: 'hsl(var(--c-crumb-slash))' }}>/</span>
              </>
            )}
            <span className="font-semibold" style={{ color: 'hsl(var(--c-crumb-text))' }}>
              {crumb.label}
            </span>
          </div>

          <div className="flex-1" />

          {/* Quick nav shortcuts */}
          <div className="flex items-center gap-1">
            {[
              { to: '/sessions', label: 'Agenda' },
              { to: '/cashflow', label: 'Flujo de Caja' },
              { to: '/cases', label: 'Expedientes' },
            ].filter((s) => s.to !== pathname).slice(0, 2).map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-all hover:text-primary"
                style={{
                  color: 'hsl(var(--c-meta))',
                  background: 'hsl(var(--c-nav-pill-bg))',
                  border: '1px solid hsl(var(--c-nav-pill-border))',
                }}
              >
                {s.label}
              </Link>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="h-7 w-7 rounded-md flex items-center justify-center transition-all hover:text-primary"
            style={{
              color: 'hsl(var(--c-meta))',
              background: 'hsl(var(--c-nav-pill-bg))',
              border: '1px solid hsl(var(--c-nav-pill-border))',
            }}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* Status dot */}
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-400 pulse-dot" />
            <span className="text-xs" style={{ color: 'hsl(var(--c-meta))' }}>En línea</span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" theme={theme} />
    </div>
  )
}
