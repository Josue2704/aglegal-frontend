import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, Clock, Search, Briefcase, AlertTriangle, ListChecks, X } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { casesApi } from '@/api/cases'
import type { GlobalCaseTask } from '@/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDate, today } from '@/lib/utils'

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

export default function Tasks() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterMode>('pending')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['all-tasks'],
    queryFn: () => casesApi.listAllTasks(),
  })

  const toggleDone = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) =>
      casesApi.setTaskDone(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['all-tasks'] }),
    onError: () => toast.error('Error al actualizar la tarea'),
  })

  // Stats
  const pending  = tasks.filter((t) => !t.done && !isOverdue(t)).length
  const overdue  = tasks.filter(isOverdue).length
  const done     = tasks.filter((t) => t.done).length

  const filtered = useMemo(() => {
    let list = tasks
    if (filter === 'pending') list = list.filter((t) => !t.done && !isOverdue(t))
    else if (filter === 'overdue') list = list.filter(isOverdue)
    else if (filter === 'done') list = list.filter((t) => t.done)

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.case_title.toLowerCase().includes(q) ||
          (t.client_name ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [tasks, filter, search])

  // Group by case
  const grouped = useMemo(() => {
    const map = new Map<number, { case_title: string; case_status: string; client_name: string | null; tasks: GlobalCaseTask[] }>()
    for (const t of filtered) {
      if (!map.has(t.case_id)) {
        map.set(t.case_id, { case_title: t.case_title, case_status: t.case_status, client_name: t.client_name, tasks: [] })
      }
      map.get(t.case_id)!.tasks.push(t)
    }
    return Array.from(map.entries())
  }, [filtered])

  const FILTERS: { id: FilterMode; label: string; count?: number; color?: string }[] = [
    { id: 'all',     label: 'Todas',      count: tasks.length },
    { id: 'pending', label: 'Pendientes', count: pending,  color: 'text-blue-400' },
    { id: 'overdue', label: 'Vencidas',   count: overdue,  color: 'text-red-400' },
    { id: 'done',    label: 'Completadas',count: done,     color: 'text-green-400' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-muted-foreground text-sm">Checklist global de todos los expedientes</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Clock className="h-4 w-4 text-blue-400" />} label="Pendientes" value={pending} color="text-blue-400" />
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-red-400" />} label="Vencidas" value={overdue} color="text-red-400" />
        <StatCard icon={<CheckCircle2 className="h-4 w-4 text-green-400" />} label="Completadas" value={done} color="text-green-400" />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-table-border-h))' }}>
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

      {/* Task list */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Cargando...</p>
      ) : grouped.length === 0 ? (
        <div className="py-16 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No hay tareas que coincidan</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([caseId, group]) => (
            <div
              key={caseId}
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid hsl(var(--c-table-border-h))' }}
            >
              {/* Case header */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ background: 'hsl(var(--c-surface-1))', borderBottom: '1px solid hsl(var(--c-inner-border))' }}
              >
                <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/cases`}
                    className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate block"
                  >
                    {group.case_title}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.client_name && <span>{group.client_name} · </span>}
                    <span className={CASE_STATUS_COLOR[group.case_status] ?? ''}>{group.case_status}</span>
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {group.tasks.filter((t) => t.done).length}/{group.tasks.length} completadas
                </span>
              </div>

              {/* Tasks */}
              <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleDone.mutate({ id: task.id, done: !task.done })}
                    isPending={toggleDone.isPending}
                  />
                ))}
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

function TaskRow({ task, onToggle, isPending }: { task: GlobalCaseTask; onToggle: () => void; isPending: boolean }) {
  const overdue = isOverdue(task)

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-all ${task.done ? 'opacity-60' : ''}`}
      style={{ background: 'hsl(var(--background))' }}
    >
      <button
        onClick={onToggle}
        disabled={isPending}
        className="shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
      >
        {task.done
          ? <CheckCircle2 className="h-4.5 w-4.5 text-green-500" style={{ height: '1.125rem', width: '1.125rem' }} />
          : <Circle className="h-4.5 w-4.5" style={{ height: '1.125rem', width: '1.125rem' }} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {task.title}
        </p>
        {task.notes && (
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5 italic">{task.notes}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {task.due_date && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${
              overdue ? 'text-red-400' : task.done ? 'text-muted-foreground' : 'text-muted-foreground'
            }`}
          >
            <Clock className="h-3 w-3" />
            {formatDate(task.due_date)}
            {overdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 ml-0.5">Vencida</Badge>}
          </span>
        )}
      </div>
    </div>
  )
}
