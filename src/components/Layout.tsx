import { useState, useRef, useEffect } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { Sun, Moon, Search, X, User, Briefcase, CalendarDays } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { Toaster } from 'sonner'
import { useSettingsStore } from '@/store/settings'
import { dashboardApi } from '@/api/dashboard'

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

// ─── Global Search ────────────────────────────────────────────────────────────
function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: results } = useQuery({
    queryKey: ['global-search', q],
    queryFn: () => dashboardApi.search(q),
    enabled: q.trim().length >= 2,
    staleTime: 10_000,
  })

  const hasResults = results && (results.clients.length + results.cases.length + results.sessions.length) > 0

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') { setOpen(false); setQ('') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) { setOpen(false); setQ('') }
    }
    if (open) document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [open])

  function go(path: string) { navigate(path); setOpen(false); setQ('') }

  return (
    <div className="relative" ref={boxRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
        style={{
          color: 'hsl(var(--c-meta))',
          background: 'hsl(var(--c-nav-pill-bg))',
          border: '1px solid hsl(var(--c-nav-pill-border))',
          minWidth: 180,
        }}
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Buscar...</span>
        <kbd className="px-1 py-0.5 rounded text-[10px]" style={{ background: 'hsl(var(--c-inner-border))', color: 'hsl(var(--c-meta))' }}>Ctrl K</kbd>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-2 right-0 z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{
            width: 'min(440px, 90vw)',
            background: 'hsl(var(--c-panel-bg))',
            border: '1px solid hsl(var(--c-panel-border))',
          }}
        >
          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: '1px solid hsl(var(--c-inner-border))' }}>
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar clientes, expedientes, sesiones..."
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            />
            {q && (
              <button onClick={() => setQ('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {q.trim().length < 2 && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Escribe al menos 2 caracteres</p>
            )}

            {q.trim().length >= 2 && !hasResults && (
              <p className="px-4 py-6 text-center text-xs text-muted-foreground">Sin resultados para "{q}"</p>
            )}

            {hasResults && (
              <div className="p-1.5 space-y-1">
                {results!.clients.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Clientes</p>
                    {results!.clients.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => go(`/clients?search=${encodeURIComponent(c.name)}`)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-primary/8 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--primary) / 0.12)' }}>
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          {(c.phone || c.email) && <p className="text-xs text-muted-foreground truncate">{c.phone ?? c.email}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {results!.cases.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Expedientes</p>
                    {results!.cases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => go(`/cases?search=${encodeURIComponent(c.title)}`)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-accent/8 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--accent) / 0.12)' }}>
                          <Briefcase className="h-3.5 w-3.5 text-accent" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.client_name} · {c.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {results!.sessions.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sesiones</p>
                    {results!.sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => go(`/sessions`)}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--c-surface-1))' }}>
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{s.client_name} — {s.consult_type}</p>
                          <p className="text-xs text-muted-foreground">{s.session_date} · {s.status}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
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

          {/* Global search */}
          <GlobalSearch />

          {/* Quick nav shortcuts */}
          <div className="hidden sm:flex items-center gap-1">
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
