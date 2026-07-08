import { useState, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, FolderOpen } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAlerts } from '@/hooks/useAlerts'
import { formatDate } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { data, totalCount } = useAlerts()

  // Close on outside click
  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [open])

  if (!data && totalCount === 0) return null

  function go(path: string) {
    navigate(path)
    setOpen(false)
  }

  const hasItems = totalCount > 0

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative h-7 w-7 rounded-md flex items-center justify-center transition-all hover:text-primary"
        style={{
          color: hasItems ? 'hsl(var(--destructive))' : 'hsl(var(--c-meta))',
          background: 'hsl(var(--c-nav-pill-bg))',
          border: `1px solid ${hasItems ? 'hsl(var(--destructive) / 0.3)' : 'hsl(var(--c-nav-pill-border))'}`,
        }}
        title="Alertas"
      >
        <Bell className="h-3.5 w-3.5" />
        {hasItems && (
          <span
            className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
            style={{ background: 'hsl(var(--destructive))' }}
          >
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 right-0 z-50 rounded-xl overflow-hidden shadow-2xl"
          style={{
            width: 'min(360px, 90vw)',
            background: 'hsl(var(--c-panel-bg))',
            border: '1px solid hsl(var(--c-panel-border))',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid hsl(var(--c-inner-border))' }}
          >
            <span className="text-sm font-semibold text-foreground">Alertas</span>
            {hasItems && (
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}
              >
                {totalCount} pendiente{totalCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!hasItems && (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs text-muted-foreground">Sin alertas pendientes</p>
              </div>
            )}

            {/* Overdue tasks */}
            {(data?.overdue_tasks.length ?? 0) > 0 && (
              <div>
                <p
                  className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0"
                  style={{ background: 'hsl(var(--c-panel-bg))' }}
                >
                  Tareas vencidas
                </p>
                {data!.overdue_tasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => go(`/tasks?case=${t.case_id}`)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-destructive/5"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.client_name ?? t.case_title} · Venció {formatDate(t.due_date)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Stale cases */}
            {(data?.stale_cases.length ?? 0) > 0 && (
              <div>
                <p
                  className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sticky top-0"
                  style={{ background: 'hsl(var(--c-panel-bg))' }}
                >
                  Expedientes sin actividad
                </p>
                {data!.stale_cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => go(`/cases?search=${encodeURIComponent(c.title)}`)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <FolderOpen className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.client_name} · Última sesión:{' '}
                        {c.last_session ? formatDate(c.last_session) : 'ninguna'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer link */}
          {hasItems && (
            <div style={{ borderTop: '1px solid hsl(var(--c-inner-border))' }}>
              <button
                onClick={() => go('/tasks')}
                className="w-full px-4 py-2.5 text-xs text-center font-medium transition-colors hover:bg-muted/30"
                style={{ color: 'hsl(var(--accent))' }}
              >
                Ver todas las tareas →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
