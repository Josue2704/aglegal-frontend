import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Clock, Search, Briefcase, AlertTriangle, ListChecks, X, Plus, LayoutGrid, List, Tag, ChevronDown } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { casesApi } from '@/api/cases'
import { catalogoApi } from '@/api/catalogo'
import { usersApi } from '@/api/users'
import type { GlobalCaseTask } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { today } from '@/lib/utils'
import { TaskForm, TaskItem } from '@/components/tasks'
import { TaskBoard } from '@/components/TaskBoard'
import { EtiquetasDialog } from '@/components/EtiquetasDialog'
import { useSoloMio } from '@/hooks/useSoloMio'
import { HelpButton } from '@/components/HelpButton'
import { tasksHelp } from '@/lib/helpContent'

type FilterMode = 'all' | 'pending' | 'overdue' | 'done'

const CASE_STATUS_COLOR: Record<string, string> = {
  'Abierto':    'text-blue-400',
  'En trámite': 'text-yellow-400',
  'En pausa':   'text-orange-400',
  'Cerrado':    'text-muted-foreground',
}

function isOverdue(task: GlobalCaseTask): boolean {
  return !task.done && !!task.due_date && task.due_date < today()
}

// ─── Nueva tarea (sin tener que entrar primero al expediente) ─────────────────
// Mismo formulario que la pestaña Tareas del expediente, con selector de expediente.
function NewTaskDialog({ open, onClose, caseId }: { open: boolean; onClose: () => void; caseId?: number }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader><DialogTitle>Nueva tarea</DialogTitle></DialogHeader>
        {open && <TaskForm caseId={caseId} onDone={onClose} scrollable />}
      </DialogContent>
    </Dialog>
  )
}

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('all')
  const [responsableFilter, setResponsableFilter] = useState('')
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('')
  const [newCaseId, setNewCaseId] = useState<number | undefined>()
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [newDlg, setNewDlg] = useState(false)
  const [etiquetasDlg, setEtiquetasDlg] = useState(false)
  const [detalle, setDetalle] = useState<GlobalCaseTask | null>(null)
  const vista = searchParams.get('vista') === 'tablero' ? 'tablero' : 'lista'
  const setVista = (v: 'lista' | 'tablero') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'tablero') next.set('vista', 'tablero')
    else next.delete('vista')
    setSearchParams(next, { replace: true })
  }
  const { soloMio, setSoloMio, esMio, username } = useSoloMio()
  // ?case=ID (desde notificaciones/expediente) filtra por expediente; ?new=1 abre el formulario.
  const caseFilter = searchParams.get('case') ? Number(searchParams.get('case')) : undefined
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewCaseId(caseFilter)
      setNewDlg(true)
      const next = new URLSearchParams(searchParams); next.delete('new'); setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, caseFilter])
  const selectCase = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === '__todos__') next.delete('case')
    else next.set('case', value)
    setSearchParams(next, { replace: true })
  }
  const openNew = (id?: number) => { setNewCaseId(id); setNewDlg(true) }


  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => casesApi.listAllTasks(),
  })
  const { data: users = [] } = useQuery({ queryKey: ['assignment-users'], queryFn: usersApi.choices })

  const { data: etiquetas = [] } = useQuery({ queryKey: ['etiquetas-tarea'], queryFn: catalogoApi.listEtiquetas })
  const caseOptions = useMemo(() => Array.from(new Map(tasks.map((t) => [t.case_id, t])).values())
    .sort((a, b) => a.case_title.localeCompare(b.case_title, 'es', { numeric: true })), [tasks])

  // Counts reflect the selected scope, before applying the status tabs.
  const scoped = useMemo(() => {
    let list = caseFilter ? tasks.filter((t) => t.case_id === caseFilter) : tasks
    list = list.filter((t) => esMio(t.responsible_username, t.case_responsible_username)
      || (soloMio && !!username && t.asignados.includes(username)))
    if (filtroEtiqueta) list = list.filter((t) => t.etiquetas.some((e) => e.id === Number(filtroEtiqueta)))
    if (responsableFilter) {
      list = responsableFilter === '__sin_asignar__'
        ? list.filter((t) => !t.responsible_username)
        : list.filter((t) => t.responsible_username === responsableFilter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (t) =>
          String(t.case_id).includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.case_title.toLowerCase().includes(q) ||
          (t.client_name ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [tasks, search, responsableFilter, caseFilter, esMio, soloMio, username, filtroEtiqueta])
  const pending = scoped.filter((t) => !t.done && !isOverdue(t)).length
  const overdue = scoped.filter(isOverdue).length
  const done = scoped.filter((t) => t.done).length
  const filtered = useMemo(() => scoped.filter((t) =>
    filter === 'pending' ? !t.done && !isOverdue(t) :
    filter === 'overdue' ? isOverdue(t) : filter === 'done' ? t.done : true), [scoped, filter])

  // Group by case
  const grouped = useMemo(() => {
    const map = new Map<number, { case_title: string; case_status: string; client_name: string | null; tasks: GlobalCaseTask[] }>()
    for (const t of filtered) {
      if (!map.has(t.case_id)) {
        map.set(t.case_id, { case_title: t.case_title, case_status: t.case_status, client_name: t.client_name, tasks: [] })
      }
      map.get(t.case_id)!.tasks.push(t)
    }
    for (const group of map.values()) {
      group.tasks.sort((a, b) => Number(a.done) - Number(b.done)
        || Number(b.es_critico) - Number(a.es_critico)
        || (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.id - b.id)
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[1].case_title.localeCompare(b[1].case_title, 'es', { numeric: true }) || a[0] - b[0])
  }, [filtered])

  const FILTERS: { id: FilterMode; label: string; count?: number; color?: string }[] = [
    { id: 'all',     label: 'Todas',      count: scoped.length },
    { id: 'pending', label: 'Pendientes', count: pending,  color: 'text-blue-400' },
    { id: 'overdue', label: 'Vencidas',   count: overdue,  color: 'text-red-400' },
    { id: 'done',    label: 'Completadas',count: done,     color: 'text-green-400' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Tareas</h1>
            <HelpButton content={tasksHelp} />
          </div>
          <p className="text-muted-foreground text-sm">Tareas organizadas por expediente en lista y tablero</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 p-1 rounded-lg" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-table-border-h))' }}>
          {[{ v: true, label: 'Míos' }, { v: false, label: 'Todos' }].map((o) => (
            <button key={o.label} onClick={() => setSoloMio(o.v)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${soloMio === o.v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 p-1 rounded-lg" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-table-border-h))' }}>
          {[{ v: 'lista' as const, label: 'Lista', icon: List }, { v: 'tablero' as const, label: 'Tablero', icon: LayoutGrid }].map((o) => (
            <button key={o.v} onClick={() => setVista(o.v)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${vista === o.v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <o.icon className="h-3.5 w-3.5" />{o.label}
            </button>
          ))}
        </div>
          <Button variant="outline" onClick={() => setEtiquetasDlg(true)} title="Administrar etiquetas">
            <Tag className="h-4 w-4" />
          </Button>
          <Button onClick={() => openNew(caseFilter)}><Plus className="h-4 w-4" />Nueva tarea</Button>
        </div>
      </div>

      <NewTaskDialog open={newDlg} onClose={() => setNewDlg(false)} caseId={newCaseId ?? caseFilter} />
      <EtiquetasDialog open={etiquetasDlg} onClose={() => setEtiquetasDlg(false)} />
      <Dialog open={!!detalle} onOpenChange={(o) => !o && setDetalle(null)}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detalle?.title}</DialogTitle></DialogHeader>
          {detalle && (
            <TaskItem task={detalle} defaultExpanded
              caseLink={{ title: detalle.case_title, clientName: detalle.client_name }} />
          )}
        </DialogContent>
      </Dialog>

      {caseFilter && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'hsl(var(--accent) / 0.08)', border: '1px solid hsl(var(--accent) / 0.2)' }}>
          <span className="text-foreground/80">
            Tareas del expediente: <strong>{tasks.find((t) => t.case_id === caseFilter)?.case_title ?? `#${caseFilter}`}</strong>
          </span>
          <button onClick={() => selectCase('__todos__')} className="text-muted-foreground hover:text-foreground" title="Ver todas">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={<Clock className="h-4 w-4 text-blue-400" />} label="Pendientes" value={pending} color="text-blue-400" />
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-red-400" />} label="Vencidas" value={overdue} color="text-red-400" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-green-400" />} label="Completadas" value={done} color="text-green-400" />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-1 p-1 rounded-lg" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-table-border-h))' }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                filter === f.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className={`${filter === f.id ? 'opacity-80' : (f.color ?? '')}`}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
        <Select value={caseFilter ? String(caseFilter) : '__todos__'} onValueChange={selectCase}>
          <SelectTrigger className="w-full sm:w-64" aria-label="Filtrar por expediente"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los expedientes</SelectItem>
            {caseOptions.map((t) => <SelectItem key={t.case_id} value={String(t.case_id)}>#{t.case_id} · {t.case_title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroEtiqueta || '__todas__'} onValueChange={(v) => setFiltroEtiqueta(v === '__todas__' ? '' : v)}>
          <SelectTrigger className="w-44" aria-label="Filtrar por etiqueta"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas__">Todas las etiquetas</SelectItem>
            {etiquetas.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={responsableFilter || '__todos__'} onValueChange={(v) => setResponsableFilter(v === '__todos__' ? '' : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Responsable" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todos los responsables</SelectItem>
            <SelectItem value="__sin_asignar__">Sin asignar</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.username} value={u.username}>{u.full_name || u.username}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarea, expediente, cliente..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Cargando...</p>
      ) : isError ? (
        <p role="alert" className="text-destructive py-8 text-center">No se pudieron cargar las tareas. Intenta recargar la página.</p>
      ) : grouped.length === 0 ? (
        <div className="py-16 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No hay tareas que coincidan</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{grouped.length} expedientes · {filtered.length} tareas · Orden alfabético</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setCollapsed(new Set())}>Expandir todos</Button>
              <Button size="sm" variant="ghost" onClick={() => setCollapsed(new Set(grouped.map(([id]) => id)))}>Contraer todos</Button>
            </div>
          </div>
          {grouped.map(([caseId, group]) => (
            <div
              key={caseId}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid hsl(var(--c-table-border-h))' }}
            >
              {/* Case header */}
              <div
                className="flex flex-wrap items-center gap-3 px-4 py-4"
                style={{ background: 'hsl(var(--c-surface-1))', borderBottom: '1px solid hsl(var(--c-inner-border))' }}
              >
                <button aria-label={`${collapsed.has(caseId) ? 'Expandir' : 'Contraer'} expediente ${group.case_title}`}
                  aria-expanded={!collapsed.has(caseId)} aria-controls={`case-tasks-${caseId}`}
                  className="p-1 rounded hover:bg-muted"
                  onClick={() => setCollapsed((prev) => { const next = new Set(prev); if (next.has(caseId)) next.delete(caseId); else next.add(caseId); return next })}>
                  <ChevronDown className={`h-4 w-4 transition-transform ${collapsed.has(caseId) ? '-rotate-90' : ''}`} />
                </button>
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/cases?case_id=${caseId}`}
                    className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block"
                  >
                    #{caseId} · {group.case_title}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.client_name && <span>{group.client_name} · </span>}
                    <span className={CASE_STATUS_COLOR[group.case_status] ?? ''}>{group.case_status}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {group.tasks.length} tareas mostradas
                  {group.tasks.some(isOverdue) && <span className="block text-red-400">{group.tasks.filter(isOverdue).length} vencidas</span>}
                </span>
                <Button size="sm" variant="outline" onClick={() => openNew(caseId)}><Plus className="h-3.5 w-3.5" />Nueva tarea</Button>
              </div>

              {/* Tasks */}
              <div id={`case-tasks-${caseId}`} hidden={collapsed.has(caseId)} className="p-3" style={{ background: 'hsl(var(--background))' }}>
                {vista === 'tablero' ? (
                  <TaskBoard tareas={group.tasks} onNueva={() => openNew(caseId)} onAbrirTarea={setDetalle} />
                ) : (
                  <div className="space-y-1.5">{group.tasks.map((task) => <TaskItem key={task.id} task={task} />)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-table-border-h))' }}
    >
      {icon}
      <div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
