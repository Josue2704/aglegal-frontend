import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Coins, Plus, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { casesApi } from '@/api/cases'
import { TASK_ESTADOS, type EtiquetaTarea, type GlobalCaseTask, type TaskEstado } from '@/types'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { TaskCierreDialog } from '@/components/TaskCierreDialog'

/** Colores de etiqueta. Se resuelven aquí y no con clases dinámicas de Tailwind,
 *  que el compilador no vería al purgar. */
export const COLOR_ETIQUETA: Record<string, { bg: string; text: string; border: string }> = {
  red:    { bg: 'hsl(0 72% 51% / 0.12)',   text: 'hsl(0 72% 60%)',   border: 'hsl(0 72% 51% / 0.35)' },
  amber:  { bg: 'hsl(43 90% 50% / 0.12)',  text: 'hsl(43 90% 50%)',  border: 'hsl(43 90% 50% / 0.35)' },
  green:  { bg: 'hsl(142 70% 45% / 0.12)', text: 'hsl(142 70% 45%)', border: 'hsl(142 70% 45% / 0.35)' },
  blue:   { bg: 'hsl(217 91% 60% / 0.12)', text: 'hsl(217 91% 65%)', border: 'hsl(217 91% 60% / 0.35)' },
  violet: { bg: 'hsl(263 70% 60% / 0.12)', text: 'hsl(263 70% 68%)', border: 'hsl(263 70% 60% / 0.35)' },
  rose:   { bg: 'hsl(340 82% 59% / 0.12)', text: 'hsl(340 82% 65%)', border: 'hsl(340 82% 59% / 0.35)' },
  slate:  { bg: 'hsl(215 16% 47% / 0.15)', text: 'hsl(215 16% 70%)', border: 'hsl(215 16% 47% / 0.35)' },
}

export function EtiquetaChip({ etiqueta, onClick, activa }: {
  etiqueta: EtiquetaTarea; onClick?: () => void; activa?: boolean
}) {
  const c = COLOR_ETIQUETA[etiqueta.color] ?? COLOR_ETIQUETA.slate
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: c.bg, color: c.text,
        border: `1px solid ${activa === false ? 'transparent' : c.border}`,
        opacity: activa === false ? 0.45 : 1,
      }}>
      {etiqueta.nombre}
    </span>
  )
}

const COLUMNA_ACENTO: Record<TaskEstado, string> = {
  'Por hacer': 'hsl(215 16% 47%)',
  'En curso':  'hsl(217 91% 60%)',
  'En espera': 'hsl(43 90% 50%)',
  'Hecha':     'hsl(142 70% 45%)',
}

function esVencida(t: GlobalCaseTask) {
  return !t.done && !!t.due_date && t.due_date < today()
}

function Tarjeta({ tarea, onAbrir, onArrastrar }: {
  tarea: GlobalCaseTask; onAbrir: () => void; onArrastrar: (e: React.DragEvent | null) => void
}) {
  const vencida = esVencida(tarea)
  const personas = [tarea.responsible_username, ...tarea.asignados.filter((a) => a !== tarea.responsible_username)]
    .filter(Boolean) as string[]

  return (
    <div
      draggable
      onDragEnd={() => onArrastrar(null)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onAbrir() } }}
      onDragStart={onArrastrar}
      onClick={onAbrir}
      className="group rounded-lg p-2.5 space-y-2 cursor-pointer transition-shadow hover:shadow-md active:cursor-grabbing"
      style={{ background: 'hsl(var(--c-panel-bg))', border: '1px solid hsl(var(--c-inner-border))' }}>

      {tarea.etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tarea.etiquetas.map((e) => <EtiquetaChip key={e.id} etiqueta={e} />)}
        </div>
      )}

      <p className={`text-sm leading-snug ${tarea.done ? 'line-through text-muted-foreground' : ''}`}>
        {tarea.es_critico && <AlertTriangle className="inline h-3 w-3 mr-1 mb-0.5 text-destructive" />}
        {tarea.title}
      </p>

      <Link to={`/cases?case_id=${tarea.case_id}`} onClick={(e) => e.stopPropagation()}
        className="block text-[11px] text-muted-foreground truncate hover:text-foreground">
        {tarea.case_title}{tarea.client_name ? ` · ${tarea.client_name}` : ''}
      </Link>

      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          {personas.length > 0 ? (
            <span className="flex items-center gap-1 text-muted-foreground truncate" title={personas.join(', ')}>
              <User className="h-3 w-3 shrink-0" />
              {personas[0]}{personas.length > 1 ? ` +${personas.length - 1}` : ''}
            </span>
          ) : (
            <span className="text-muted-foreground/60">Sin asignar</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tarea.costo_estimado > 0 && !tarea.done && (
            <span className="text-muted-foreground" title="Costo estimado">
              <Coins className="inline h-3 w-3 mb-0.5" /> {formatCurrency(tarea.costo_estimado)}
            </span>
          )}
          {tarea.done && tarea.costo_real > 0 && (
            <span className="text-muted-foreground" title="Costo real">{formatCurrency(tarea.costo_real)}</span>
          )}
          {tarea.due_date && !tarea.done && (
            <span className={vencida ? 'text-destructive font-medium' : 'text-muted-foreground'}>
              {formatDate(tarea.due_date)}
            </span>
          )}
          {tarea.done && tarea.completed_at && (
            <span className="text-green-600">{formatDate(tarea.completed_at)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function TaskBoard({ tareas, onNueva, onAbrirTarea }: {
  tareas: GlobalCaseTask[]
  onNueva: () => void
  onAbrirTarea: (t: GlobalCaseTask) => void
}) {
  const qc = useQueryClient()
  const [arrastrada, setArrastrada] = useState<GlobalCaseTask | null>(null)
  const [columnaActiva, setColumnaActiva] = useState<TaskEstado | null>(null)
  const [porCerrar, setPorCerrar] = useState<GlobalCaseTask | null>(null)


  const mover = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: TaskEstado }) => casesApi.setTaskEstado(id, estado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-tasks'] })
      qc.invalidateQueries({ queryKey: ['case-tasks'] })
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'No se pudo mover la tarea'),
  })

  const porColumna = useMemo(() => {
    const mapa: Record<TaskEstado, GlobalCaseTask[]> = { 'Por hacer': [], 'En curso': [], 'En espera': [], 'Hecha': [] }
    for (const t of tareas) (mapa[t.estado] ?? mapa['Por hacer']).push(t)
    for (const col of TASK_ESTADOS) {
      mapa[col].sort((a, b) => {
        if (a.es_critico !== b.es_critico) return a.es_critico ? -1 : 1
        return (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.id - b.id
      })
    }
    return mapa
  }, [tareas])

  function soltar(columna: TaskEstado) {
    setColumnaActiva(null)
    const t = arrastrada
    setArrastrada(null)
    if (!t || t.estado === columna) return
    // Cerrar una tarea pide decir qué se obtuvo: es el registro de lo que se hizo.
    if (columna === 'Hecha') setPorCerrar(t)
    else mover.mutate({ id: t.id, estado: columna })
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_ESTADOS.map((columna) => (
          <div key={columna}
            onDragOver={(e) => { if (arrastrada) { e.preventDefault(); setColumnaActiva(columna) } }}
            onDragLeave={() => setColumnaActiva((c) => (c === columna ? null : c))}
            onDrop={(e) => { e.preventDefault(); soltar(columna) }}
            className="rounded-xl p-2.5 space-y-2 min-h-[140px] transition-colors"
            style={{
              background: columnaActiva === columna ? 'hsl(var(--accent) / 0.08)' : 'hsl(var(--c-surface-1))',
              border: `1px solid ${columnaActiva === columna ? 'hsl(var(--accent) / 0.4)' : 'hsl(var(--c-table-border-h))'}`,
            }}>
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COLUMNA_ACENTO[columna] }} />
                <span className="text-xs font-semibold">{columna}</span>
                <span className="text-[11px] text-muted-foreground">{porColumna[columna].length}</span>
              </div>
              {columna === 'Por hacer' && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onNueva} title="Nueva tarea">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {porColumna[columna].map((t) => (
              <Tarjeta key={t.id} tarea={t} onAbrir={() => onAbrirTarea(t)}
                onArrastrar={(e) => { setArrastrada(e ? t : null); if (!e) setColumnaActiva(null) }} />
            ))}

            {porColumna[columna].length === 0 && (
              <p className="text-[11px] text-muted-foreground/60 px-1 py-4 text-center">
                {columna === 'En espera' ? 'Nada detenido por terceros' : 'Sin tareas'}
              </p>
            )}
          </div>
        ))}
      </div>

      <TaskCierreDialog tarea={porCerrar} onClose={() => setPorCerrar(null)} />
    </div>
  )
}
