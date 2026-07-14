import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks,
  addDays, subDays, format, isToday, parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Pencil, ChevronLeft, ChevronRight, CalendarDays,
  X, CalendarRange, Paperclip, Clock, Search, AlertTriangle,
  Circle, Timer, ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { sessionsApi } from '@/api/sessions'
import { googleCalApi } from '@/api/googleCal'
import { clientsApi } from '@/api/clients'
import { casesApi } from '@/api/cases'
import type { Session, SessionIn, SessionStatus } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate, today } from '@/lib/utils'
import { AttachmentsDialog } from '@/components/AttachmentsDialog'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES: SessionStatus[] = ['Pendiente', 'En proceso', 'Finalizada']

const STATUS_COLOR: Record<SessionStatus, string> = {
  Pendiente: '#f59e0b',
  'En proceso': '#3b82f6',
  Finalizada: '#22c55e',
}
const STATUS_BADGE: Record<SessionStatus, 'warning' | 'info' | 'success'> = {
  Pendiente: 'warning', 'En proceso': 'info', Finalizada: 'success',
}

const CONSULT_PRESETS = [
  'Consulta inicial', 'Revisión de contrato', 'Asesoría laboral',
  'Defensa penal', 'Trámite civil', 'Audiencia', 'Seguimiento de caso',
  'Notaría', 'Mediación', 'Otro',
]

const HOUR_H = 64
const DAY_START = 7
const DAY_END = 21

// ─── Utils ────────────────────────────────────────────────────────────────────
function timeToFrac(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

function fracToTime(frac: number): string {
  const h = Math.floor(frac)
  const m = Math.round((frac - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(Math.min(m, 59)).padStart(2, '0')}`
}

function formatDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatTimeRange(session: Pick<Session, 'start_time' | 'end_time'>) {
  if (session.start_time && session.end_time) return `${session.start_time} – ${session.end_time}`
  if (session.start_time) return session.start_time
  return 'Sin hora'
}

function clientInitial(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function hasConflict(
  sessions: Session[],
  session_date: string,
  start: string,
  end: string,
  excludeId?: number,
): Session | null {
  const same = sessions.filter(
    (s) => s.session_date === session_date && s.id !== excludeId && s.start_time && s.end_time,
  )
  for (const s of same) {
    if (start < s.end_time! && end > s.start_time!) return s
  }
  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────
type FormData = {
  client_id: string; case_id: string; session_date: string
  start_time: string; end_time: string; consult_type: string
  notes: string; status: SessionStatus
}
const EMPTY: FormData = {
  client_id: '', case_id: '', session_date: today(), start_time: '09:00', end_time: '10:00',
  consult_type: '', notes: '', status: 'Pendiente',
}

// ─── Session Form Dialog ──────────────────────────────────────────────────────
function SessionDialog({
  open, onOpenChange, editing, initialDate, initialTime, clients, allSessions, onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Session | null
  initialDate?: string
  initialTime?: string
  clients: { id: number; name?: string }[]
  allSessions: Session[]
  onSave: (editing: Session | null, payload: SessionIn) => void
}) {
  const [form, setForm] = useState<FormData>(() =>
    editing ? {
      client_id: editing.client_id ? String(editing.client_id) : '',
      case_id: editing.case_id ? String(editing.case_id) : '',
      session_date: editing.session_date,
      start_time: editing.start_time ?? '09:00',
      end_time: editing.end_time ?? '10:00',
      consult_type: editing.consult_type,
      notes: editing.notes ?? '',
      status: editing.status,
    } : {
      ...EMPTY,
      session_date: initialDate ?? today(),
      start_time: initialTime ?? '09:00',
      end_time: initialTime ? fracToTime(timeToFrac(initialTime) + 1) : '10:00',
    }
  )
  const [typeInput, setTypeInput] = useState(form.consult_type)
  const [showPresets, setShowPresets] = useState(false)
  const [conflict, setConflict] = useState<Session | null>(null)

  const { data: caseChoices = [] } = useQuery({
    queryKey: ['case-choices', form.client_id],
    queryFn: () => casesApi.choices(form.client_id ? Number(form.client_id) : undefined),
  })

  const f = (k: keyof FormData) => (v: string) => {
    setForm((p) => {
      const next = { ...p, [k]: v }
      if ((k === 'start_time' || k === 'end_time' || k === 'session_date') && next.start_time && next.end_time) {
        setConflict(hasConflict(allSessions, next.session_date, next.start_time, next.end_time, editing?.id))
      }
      return next
    })
  }

  useEffect(() => {
    setForm((p) => ({ ...p, consult_type: typeInput }))
  }, [typeInput])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.consult_type.trim()) return toast.error('Cliente y tipo de consulta son requeridos')
    if (!form.session_date) return toast.error('La fecha es requerida')
    if (form.end_time <= form.start_time) return toast.error('La hora fin debe ser mayor que la hora inicio')
    onSave(editing, {
      client_id: form.client_id ? Number(form.client_id) : null,
      case_id: form.case_id ? Number(form.case_id) : null,
      session_date: form.session_date,
      start_time: form.start_time,
      end_time: form.end_time,
      consult_type: form.consult_type,
      notes: form.notes,
      status: form.status,
    })
  }

  const filteredPresets = CONSULT_PRESETS.filter(
    (p) => !typeInput || p.toLowerCase().includes(typeInput.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editing ? <><Pencil className="h-4 w-4" />Editar sesión</> : <><Plus className="h-4 w-4" />Nueva sesión</>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client & Case */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Cliente <span className="text-destructive text-xs">*</span></Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v, case_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Caso (opcional)</Label>
              <Select value={form.case_id} onValueChange={f('case_id')}>
                <SelectTrigger><SelectValue placeholder="Sin caso específico" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin caso específico</SelectItem>
                  {caseChoices.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1 col-span-3 sm:col-span-1">
              <Label>Fecha <span className="text-destructive text-xs">*</span></Label>
              <Input type="date" value={form.session_date} onChange={(e) => f('session_date')(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Inicio</Label>
              <Input type="time" value={form.start_time} onChange={(e) => f('start_time')(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fin</Label>
              <Input type="time" value={form.end_time} onChange={(e) => f('end_time')(e.target.value)} />
            </div>
          </div>

          {/* Duration & conflict feedback */}
          <div className="flex items-center gap-2 -mt-2 min-h-[18px]">
            {form.start_time && form.end_time && form.end_time > form.start_time && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" />
                {formatDuration(form.start_time, form.end_time)}
              </span>
            )}
            {conflict && (
              <span className="text-xs text-amber-500 flex items-center gap-1 ml-auto">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Coincide con {conflict.client_name} ({conflict.start_time}–{conflict.end_time})
              </span>
            )}
          </div>

          {/* Consultation type with presets */}
          <div className="space-y-1 relative">
            <Label>Tipo de consulta <span className="text-destructive text-xs">*</span></Label>
            <Input
              value={typeInput}
              onChange={(e) => { setTypeInput(e.target.value); setShowPresets(true) }}
              onFocus={() => setShowPresets(true)}
              onBlur={() => setTimeout(() => setShowPresets(false), 150)}
              placeholder="Ej: Consulta inicial, Audiencia..."
              autoComplete="off"
            />
            {showPresets && filteredPresets.length > 0 && (
              <div className="absolute z-50 w-full rounded-lg border shadow-lg overflow-hidden mt-0.5"
                style={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}>
                {filteredPresets.map((p) => (
                  <button
                    key={p} type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                    onMouseDown={() => { setTypeInput(p); setShowPresets(false) }}
                  >{p}</button>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => f('notes')(e.target.value)} placeholder="Observaciones, temas a tratar..." />
          </div>

          {/* Status toggle */}
          <div className="space-y-1">
            <Label>Estado</Label>
            <div className="flex gap-2">
              {STATUSES.map((st) => (
                <button
                  key={st} type="button"
                  onClick={() => f('status')(st)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border"
                  style={form.status === st
                    ? { background: STATUS_COLOR[st], color: '#fff', borderColor: 'transparent' }
                    : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">{editing ? 'Guardar cambios' : 'Crear sesión'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Session Detail Panel ─────────────────────────────────────────────────────
function SessionDetailPanel({
  session,
  onClose,
  onEdit,
  onDelete,
  onAttach,
  onStatusChange,
}: {
  session: Session
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onAttach: () => void
  onStatusChange: (s: SessionStatus) => void
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const dur = session.start_time && session.end_time ? formatDuration(session.start_time, session.end_time) : null

  return (
    <div className="flex flex-col h-full" style={{ background: 'hsl(var(--c-surface-1))' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--c-inner-border))' }}>
        <h3 className="font-semibold text-sm">Detalle de sesión</h3>
        <button
          onClick={onClose}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Client avatar */}
        <div className="flex items-center gap-3.5">
          <div
            className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 select-none"
            style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}
          >
            {clientInitial(session.client_name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{session.client_name ?? 'Sin cliente'}</p>
            {session.case_id && <p className="text-xs text-muted-foreground">Caso #{session.case_id}</p>}
          </div>
        </div>

        {/* Date & Time */}
        <div className="rounded-xl p-3.5 space-y-2.5" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--c-inner-border))' }}>
          <div className="flex items-center gap-2.5 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium capitalize text-sm">
              {format(parseISO(session.session_date), "EEEE d 'de' MMMM yyyy", { locale: es })}
            </span>
          </div>
          {session.start_time && (
            <div className="flex items-center gap-2.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{session.start_time}{session.end_time ? ` → ${session.end_time}` : ''}</span>
              {dur && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium tabular-nums"
                  style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}>
                  {dur}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Consult type */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tipo de consulta</p>
          <p className="text-sm font-medium">{session.consult_type}</p>
        </div>

        {/* Status */}
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Estado</p>
          <div className="flex gap-2">
            {STATUSES.map((st) => {
              const active = session.status === st
              return (
                <button
                  key={st}
                  onClick={() => onStatusChange(st)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border"
                  style={active
                    ? { background: STATUS_COLOR[st], color: '#fff', borderColor: 'transparent' }
                    : { borderColor: 'hsl(var(--c-inner-border))', color: 'hsl(var(--muted-foreground))' }}
                >
                  {st}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        {session.notes && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Notas</p>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{session.notes}</p>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/50">
          Creada el {format(parseISO(session.created_at), "d 'de' MMM yyyy", { locale: es })}
        </p>
      </div>

      {/* Actions */}
      <div className="p-4 flex gap-2" style={{ borderTop: '1px solid hsl(var(--c-inner-border))' }}>
        <Button size="sm" className="flex-1 gap-1.5" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />Editar
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 px-3" title="Adjuntos" onClick={onAttach}>
          <Paperclip className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm" variant="outline" title="Eliminar"
          className="gap-1.5 px-3 text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
          onClick={() => { if (confirm('¿Eliminar esta sesión?')) onDelete() }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ sessions, onViewDay }: { sessions: Session[]; onViewDay: (d: string) => void }) {
  const todayStr = today()
  const nowStr = format(new Date(), 'HH:mm')

  const todaySessions = sessions.filter((s) => s.session_date === todayStr)
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekSessions = sessions.filter((s) => s.session_date >= todayStr && s.session_date <= weekEnd)
  const pending = sessions.filter((s) => s.status === 'Pendiente')
  const inProgressToday = todaySessions.filter((s) => s.status === 'En proceso')

  const nextSession = sessions
    .filter((s) =>
      s.session_date > todayStr ||
      (s.session_date === todayStr && (s.start_time ?? '99:99') > nowStr)
    )
    .sort((a, b) => {
      const da = a.session_date + (a.start_time ?? '99:99')
      const db = b.session_date + (b.start_time ?? '99:99')
      return da.localeCompare(db)
    })[0] ?? null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <button
        onClick={() => onViewDay(todayStr)}
        className="rounded-xl p-4 text-left transition-all hover:shadow-sm active:scale-[0.98] group"
        style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hoy</span>
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{todaySessions.length}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {inProgressToday.length > 0
            ? <span style={{ color: STATUS_COLOR['En proceso'] }}>{inProgressToday.length} en proceso</span>
            : 'sesiones'}
        </p>
      </button>

      <div className="rounded-xl p-4" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Semana</span>
          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{weekSessions.length}</p>
        <p className="text-xs text-muted-foreground mt-1">sesiones</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pendientes</span>
          <Circle className="h-3.5 w-3.5" style={{ color: STATUS_COLOR.Pendiente }} />
        </div>
        <p className="text-3xl font-bold tabular-nums" style={pending.length > 0 ? { color: STATUS_COLOR.Pendiente } : {}}>
          {pending.length}
        </p>
        <p className="text-xs text-muted-foreground mt-1">por confirmar</p>
      </div>

      <div className="rounded-xl p-4" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Próxima</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        {nextSession ? (
          <>
            <p className="text-xl font-bold tabular-nums truncate">{nextSession.start_time ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {nextSession.session_date === todayStr
                ? 'Hoy · '
                : format(parseISO(nextSession.session_date), "d MMM · ", { locale: es })}
              {nextSession.client_name ?? nextSession.consult_type}
            </p>
          </>
        ) : (
          <>
            <p className="text-xl font-bold text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground mt-1">sin próximas</p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Month Calendar ───────────────────────────────────────────────────────────
function MonthCalendar({
  sessions, onNewSession, onSelectSession,
}: {
  sessions: Session[]
  onNewSession: (date: string) => void
  onSelectSession: (s: Session) => void
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const sessionsByDate: Record<string, Session[]> = {}
  sessions.forEach((s) => {
    if (!sessionsByDate[s.session_date]) sessionsByDate[s.session_date] = []
    sessionsByDate[s.session_date].push(s)
  })
  Object.values(sessionsByDate).forEach((items) =>
    items.sort((a, b) => (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99'))
  )

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const selectedSessions = selectedDateStr ? (sessionsByDate[selectedDateStr] ?? []) : []
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-1">
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted/40 transition-colors"
            style={{ borderColor: 'hsl(var(--c-inner-border))' }}
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          ><ChevronLeft className="h-4 w-4" /></button>
          <button
            className="px-3 h-8 rounded-md border text-xs hover:bg-muted/40 transition-colors"
            style={{ borderColor: 'hsl(var(--c-inner-border))' }}
            onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}
          >Hoy</button>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted/40 transition-colors"
            style={{ borderColor: 'hsl(var(--c-inner-border))' }}
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          ><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--c-inner-border))' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ background: 'hsl(var(--c-surface-1))' }}>
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground py-2.5 tracking-wide uppercase">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7" style={{ borderTop: '1px solid hsl(var(--c-inner-border))' }}>
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const daySessions = sessionsByDate[dateStr] ?? []
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const isT = isToday(day)
            const hasPending = daySessions.some((s) => s.status === 'Pendiente')
            const hasFinished = daySessions.some((s) => s.status === 'Finalizada')

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className="relative min-h-[88px] p-1.5 text-left transition-colors"
                style={{
                  borderTop: '1px solid hsl(var(--c-inner-border))',
                  borderRight: '1px solid hsl(var(--c-inner-border))',
                  opacity: !isCurrentMonth ? 0.38 : 1,
                  background: isSelected ? 'hsl(var(--primary) / 0.07)' : undefined,
                }}
              >
                {isSelected && (
                  <div className="absolute inset-0 ring-1 ring-inset ring-primary pointer-events-none" />
                )}
                <div className={[
                  'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                  isT ? 'text-white' : '',
                ].join(' ')}
                  style={isT ? { background: 'hsl(var(--primary))' } : {}}>
                  {format(day, 'd')}
                </div>

                <div className="space-y-0.5">
                  {daySessions.slice(0, 3).map((s) => (
                    <div
                      key={s.id}
                      className="text-[10px] leading-tight truncate rounded-sm px-1 py-0.5 text-white font-medium cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: STATUS_COLOR[s.status] }}
                      onClick={(e) => { e.stopPropagation(); onSelectSession(s) }}
                    >
                      {s.start_time ? `${s.start_time} · ` : ''}{s.client_name ?? s.consult_type}
                    </div>
                  ))}
                  {daySessions.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1 font-medium">+{daySessions.length - 3} más</div>
                  )}
                </div>

                {/* Status dots */}
                {daySessions.length > 0 && (
                  <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                    {hasFinished && <div className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR.Finalizada }} />}
                    {hasPending && <div className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR.Pendiente }} />}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold capitalize text-sm">
                {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => onNewSession(format(selectedDay, 'yyyy-MM-dd'))}>
                <Plus className="h-3 w-3" />Agregar
              </Button>
            </div>
            {selectedSessions.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted-foreground text-sm mb-2">Sin sesiones este día</p>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => onNewSession(format(selectedDay, 'yyyy-MM-dd'))}>
                  <Plus className="h-3 w-3 mr-1" />Crear primera sesión
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSessions.map((s) => {
                  const dur = s.start_time && s.end_time ? formatDuration(s.start_time, s.end_time) : null
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelectSession(s)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted/30 transition-colors group"
                      style={{ border: '1px solid hsl(var(--c-inner-border))' }}
                    >
                      <div className="w-1 h-10 rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.consult_type}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatTimeRange(s)}{dur ? ` · ${dur}` : ''} · {s.client_name}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Shared Time Grid (Week + Day) ────────────────────────────────────────────
function TimeGrid({
  days, sessions, onNewSession, onSelectSession, onReschedule, headerNav,
}: {
  days: Date[]
  sessions: Session[]
  onNewSession: (date: string, time: string) => void
  onSelectSession: (s: Session) => void
  onReschedule: (id: number, date: string, start: string, end: string | null) => void
  headerNav: React.ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(new Date())
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (8 - DAY_START) * HOUR_H
  }, [])

  const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)
  const totalH = (DAY_END - DAY_START) * HOUR_H

  const byDate: Record<string, Session[]> = {}
  sessions.forEach((s) => {
    if (!byDate[s.session_date]) byDate[s.session_date] = []
    byDate[s.session_date].push(s)
  })

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const nowFrac = now.getHours() + now.getMinutes() / 60
  const nowTop = (nowFrac - DAY_START) * HOUR_H

  const cols = days.length === 1 ? '64px 1fr' : `64px repeat(${days.length}, 1fr)`

  function handleDrop(e: React.DragEvent, dateStr: string, h: number) {
    e.preventDefault()
    setDragOverCell(null)
    if (draggingId == null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = Math.max(0, Math.min(e.clientY - rect.top, HOUR_H - 1))
    const addMins = Math.round((offsetY / HOUR_H) * 60 / 15) * 15
    const newStartFrac = h + addMins / 60
    const newStart = fracToTime(newStartFrac)
    const session = sessions.find((s) => s.id === draggingId)
    let newEnd: string | null = null
    if (session?.start_time && session?.end_time) {
      const dur = timeToFrac(session.end_time) - timeToFrac(session.start_time)
      newEnd = fracToTime(newStartFrac + dur)
    }
    onReschedule(draggingId, dateStr, newStart, newEnd)
    setDraggingId(null)
  }

  return (
    <div className="space-y-3">
      {headerNav}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--c-inner-border))' }}>
        {/* Day headers */}
        <div className="grid" style={{ gridTemplateColumns: cols, background: 'hsl(var(--c-surface-1))', borderBottom: '1px solid hsl(var(--c-inner-border))' }}>
          <div className="py-3" />
          {days.map((day) => {
            const isT = isToday(day)
            return (
              <div key={day.toISOString()} className="py-2.5 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {format(day, 'EEE', { locale: es })}
                </p>
                <div
                  className="mx-auto mt-0.5 h-8 w-8 flex items-center justify-center rounded-full text-sm font-bold"
                  style={isT ? { background: 'hsl(var(--primary))', color: '#fff' } : { color: 'hsl(var(--foreground))' }}
                >
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 560 }}>
          <div className="grid relative" style={{ gridTemplateColumns: cols, height: totalH }}>
            {/* Hour labels column */}
            <div className="relative select-none">
              {hours.map((h) => (
                <div key={h} className="absolute w-full flex items-start justify-end pr-3"
                  style={{ top: (h - DAY_START) * HOUR_H, height: HOUR_H }}>
                  <span className="text-[10px] font-medium text-muted-foreground -translate-y-2">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const daySessions = byDate[dateStr] ?? []
              const timed = daySessions.filter((s) => s.start_time)
              const untimed = daySessions.filter((s) => !s.start_time)
              const isCurrentDay = dateStr === todayStr

              return (
                <div key={dateStr} className="relative" style={{ borderLeft: '1px solid hsl(var(--c-inner-border))' }}>
                  {/* Hour cells */}
                  {hours.map((h) => {
                    const cellKey = `${dateStr}-${h}`
                    const isOver = dragOverCell === cellKey
                    return (
                      <div
                        key={h}
                        className="absolute w-full cursor-pointer transition-colors"
                        style={{
                          top: (h - DAY_START) * HOUR_H,
                          height: HOUR_H,
                          borderTop: '1px solid hsl(var(--c-inner-border))',
                          background: isOver ? 'hsl(var(--primary) / 0.08)' : undefined,
                        }}
                        onClick={() => onNewSession(dateStr, `${String(h).padStart(2, '0')}:00`)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverCell(cellKey) }}
                        onDragLeave={() => setDragOverCell((prev) => prev === cellKey ? null : prev)}
                        onDrop={(e) => handleDrop(e, dateStr, h)}
                      >
                        <div className="absolute w-full" style={{ top: HOUR_H / 2, borderTop: '1px dashed hsl(var(--c-inner-border) / 0.4)' }} />
                      </div>
                    )
                  })}

                  {/* Now indicator */}
                  {isCurrentDay && nowFrac >= DAY_START && nowFrac <= DAY_END && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                      style={{ top: nowTop }}
                    >
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 -ml-1.5" style={{ background: '#ef4444' }} />
                      <div className="flex-1 h-[1.5px]" style={{ background: '#ef4444' }} />
                    </div>
                  )}

                  {/* Untimed sessions */}
                  {untimed.map((s, i) => (
                    <div
                      key={s.id}
                      className="absolute left-0.5 right-0.5 rounded text-[10px] px-1.5 py-0.5 cursor-pointer text-white truncate z-10 font-semibold"
                      style={{ top: 2 + i * 20, background: STATUS_COLOR[s.status] }}
                      onClick={(e) => { e.stopPropagation(); onSelectSession(s) }}
                    >
                      {s.client_name ?? s.consult_type}
                    </div>
                  ))}

                  {/* Timed sessions */}
                  {timed.map((s) => {
                    const start = timeToFrac(s.start_time!)
                    const end = s.end_time ? timeToFrac(s.end_time) : start + 1
                    const cs = Math.max(start, DAY_START)
                    const ce = Math.min(end, DAY_END)
                    if (ce <= cs) return null
                    const top = (cs - DAY_START) * HOUR_H
                    const height = Math.max((ce - cs) * HOUR_H - 2, 22)
                    const isDragging = draggingId === s.id
                    const dur = s.end_time ? formatDuration(s.start_time!, s.end_time) : null

                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); setDraggingId(s.id) }}
                        onDragEnd={() => setDraggingId(null)}
                        className="absolute left-1 right-1 rounded-lg px-2 py-1 text-white cursor-grab active:cursor-grabbing overflow-hidden z-20 select-none"
                        style={{
                          top,
                          height,
                          background: STATUS_COLOR[s.status],
                          opacity: isDragging ? 0.45 : 1,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                          transition: 'opacity 0.15s',
                        }}
                        onClick={(e) => { e.stopPropagation(); onSelectSession(s) }}
                      >
                        <p className="text-[11px] font-bold leading-tight truncate">{s.client_name ?? '—'}</p>
                        {height > 34 && <p className="text-[10px] opacity-80 leading-tight truncate mt-0.5">{s.consult_type}</p>}
                        {height > 52 && (
                          <p className="text-[10px] opacity-70 mt-0.5 tabular-nums">
                            {s.start_time} – {s.end_time}{dur ? ` · ${dur}` : ''}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function WeekCalendar(props: {
  sessions: Session[]
  onNewSession: (date: string, time: string) => void
  onSelectSession: (s: Session) => void
  onReschedule: (id: number, date: string, start: string, end: string | null) => void
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })

  return (
    <TimeGrid
      days={days}
      sessions={props.sessions}
      onNewSession={props.onNewSession}
      onSelectSession={props.onSelectSession}
      onReschedule={props.onReschedule}
      headerNav={
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">
            {format(weekStart, "d 'de' MMM", { locale: es })} — {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d 'de' MMM yyyy", { locale: es })}
          </h2>
          <div className="flex gap-1">
            <button className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted/40 transition-colors"
              style={{ borderColor: 'hsl(var(--c-inner-border))' }}
              onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="px-3 h-8 rounded-md border text-xs hover:bg-muted/40 transition-colors"
              style={{ borderColor: 'hsl(var(--c-inner-border))' }}
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Hoy
            </button>
            <button className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted/40 transition-colors"
              style={{ borderColor: 'hsl(var(--c-inner-border))' }}
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      }
    />
  )
}

function DayCalendar(props: {
  date: Date
  onDateChange: (d: Date) => void
  sessions: Session[]
  onNewSession: (date: string, time: string) => void
  onSelectSession: (s: Session) => void
  onReschedule: (id: number, date: string, start: string, end: string | null) => void
}) {
  return (
    <TimeGrid
      days={[props.date]}
      sessions={props.sessions}
      onNewSession={props.onNewSession}
      onSelectSession={props.onSelectSession}
      onReschedule={props.onReschedule}
      headerNav={
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base capitalize">
            {format(props.date, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </h2>
          <div className="flex gap-1">
            <button className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted/40 transition-colors"
              style={{ borderColor: 'hsl(var(--c-inner-border))' }}
              onClick={() => props.onDateChange(subDays(props.date, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="px-3 h-8 rounded-md border text-xs hover:bg-muted/40 transition-colors"
              style={{ borderColor: 'hsl(var(--c-inner-border))' }}
              onClick={() => props.onDateChange(new Date())}>
              Hoy
            </button>
            <button className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted/40 transition-colors"
              style={{ borderColor: 'hsl(var(--c-inner-border))' }}
              onClick={() => props.onDateChange(addDays(props.date, 1))}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      }
    />
  )
}

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({
  sessions, statusFilter, setStatusFilter, startDate, setStartDate, endDate, setEndDate, onSelect,
}: {
  sessions: Session[]
  statusFilter: string; setStatusFilter: (v: string) => void
  startDate: string; setStartDate: (v: string) => void
  endDate: string; setEndDate: (v: string) => void
  onSelect: (s: Session) => void
}) {
  const grouped: Record<string, Session[]> = {}
  sessions.forEach((s) => {
    if (!grouped[s.session_date]) grouped[s.session_date] = []
    grouped[s.session_date].push(s)
  })
  const dates = Object.keys(grouped).sort()
  const todayStr = today()

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos los estados</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
        <span className="text-muted-foreground text-sm">—</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
        {(statusFilter || startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setStartDate(''); setEndDate('') }}>
            <X className="h-3 w-3 mr-1" />Limpiar
          </Button>
        )}
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">Sin sesiones</div>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-2.5">
                <h3 className="text-sm font-semibold capitalize whitespace-nowrap"
                  style={date === todayStr ? { color: 'hsl(var(--primary))' } : {}}>
                  {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                  {date === todayStr && <span className="ml-1.5 text-xs font-normal opacity-70">(hoy)</span>}
                </h3>
                <div className="flex-1 h-px" style={{ background: 'hsl(var(--c-inner-border))' }} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {grouped[date].length} sesión{grouped[date].length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[date]
                  .sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
                  .map((s) => {
                    const dur = s.start_time && s.end_time ? formatDuration(s.start_time, s.end_time) : null
                    return (
                      <button
                        key={s.id}
                        onClick={() => onSelect(s)}
                        className="w-full flex items-center gap-4 p-3.5 rounded-xl border text-left hover:bg-muted/20 transition-colors group"
                        style={{ borderColor: 'hsl(var(--c-inner-border))', background: 'hsl(var(--c-surface-1))' }}
                      >
                        <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: STATUS_COLOR[s.status] }} />
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none"
                          style={{ background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }}
                        >
                          {clientInitial(s.client_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{s.client_name ?? 'Sin cliente'}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.consult_type}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums">{formatTimeRange(s)}</p>
                          {dur && <p className="text-xs text-muted-foreground">{dur}</p>}
                        </div>
                        <Badge variant={STATUS_BADGE[s.status] ?? 'outline'} className="shrink-0 hidden sm:flex">{s.status}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Sessions() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Session | null>(null)
  const [newDate, setNewDate] = useState<string | undefined>()
  const [newTime, setNewTime] = useState<string | undefined>()
  const [view, setView] = useState<'calendar' | 'week' | 'day' | 'list'>('calendar')
  const [dayDate, setDayDate] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [attachmentSession, setAttachmentSession] = useState<Session | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchText, setSearchText] = useState('')

  const urlClientId = searchParams.get('client_id') ? Number(searchParams.get('client_id')) : undefined
  const urlClientName = searchParams.get('client_name') ?? undefined

  useEffect(() => { if (urlClientId) setView('list') }, [urlClientId])

  const params = {
    client_id: urlClientId,
    status: statusFilter || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
  }

  const { data: allSessions = [] } = useQuery({
    queryKey: ['sessions', { client_id: urlClientId }],
    queryFn: () => sessionsApi.list({ client_id: urlClientId }),
  })
  const { data: filteredSessions = [] } = useQuery({
    queryKey: ['sessions', params],
    queryFn: () => sessionsApi.list(params),
    enabled: view === 'list',
  })
  const { data: clients = [] } = useQuery({ queryKey: ['client-choices'], queryFn: clientsApi.choices })

  const invalidate = useCallback(() => qc.invalidateQueries({ queryKey: ['sessions'] }), [qc])

  const create = useMutation({
    mutationFn: (d: SessionIn) => sessionsApi.create(d),
    onSuccess: () => { invalidate(); toast.success('Sesión creada'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SessionIn }) => sessionsApi.update(id, data),
    onSuccess: (updated) => {
      invalidate()
      toast.success('Sesión actualizada')
      setDlg(false)
      setSelectedSession(updated)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: () => { invalidate(); toast.success('Sesión eliminada'); setSelectedSession(null) },
  })
  const importGoogle = useMutation({
    mutationFn: googleCalApi.importEvents,
    onSuccess: (r) => { invalidate(); toast.success(`Google Calendar: ${r.imported} nuevas, ${r.updated} actualizadas`) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error importando'),
  })

  function openNew(date?: string, time?: string) {
    setEditing(null); setNewDate(date); setNewTime(time); setDlg(true)
  }
  function openEdit(s: Session) {
    setEditing(s); setNewDate(undefined); setNewTime(undefined); setDlg(true)
  }
  function handleSave(ed: Session | null, payload: SessionIn) {
    ed ? update.mutate({ id: ed.id, data: payload }) : create.mutate(payload)
  }
  function handleReschedule(id: number, date: string, start: string, end: string | null) {
    const session = allSessions.find((s) => s.id === id)
    if (!session) return
    update.mutate({
      id,
      data: {
        client_id: session.client_id,
        case_id: session.case_id,
        session_date: date,
        start_time: start,
        end_time: end,
        consult_type: session.consult_type,
        notes: session.notes ?? '',
        status: session.status,
      },
    })
    toast.success('Sesión reagendada')
  }
  function handleStatusChange(status: SessionStatus) {
    if (!selectedSession) return
    update.mutate({
      id: selectedSession.id,
      data: {
        client_id: selectedSession.client_id,
        case_id: selectedSession.case_id,
        session_date: selectedSession.session_date,
        start_time: selectedSession.start_time,
        end_time: selectedSession.end_time,
        consult_type: selectedSession.consult_type,
        notes: selectedSession.notes ?? '',
        status,
      },
    })
  }

  const searchFiltered = searchText
    ? allSessions.filter((s) => {
        const q = searchText.toLowerCase()
        return (
          s.client_name?.toLowerCase().includes(q) ||
          s.consult_type.toLowerCase().includes(q) ||
          s.notes?.toLowerCase().includes(q)
        )
      })
    : allSessions

  const displayedSessions = view === 'list'
    ? (searchText ? searchFiltered : filteredSessions)
    : searchFiltered

  const pending = allSessions.filter((s) => s.status === 'Pendiente').length
  const inProgress = allSessions.filter((s) => s.status === 'En proceso').length
  const done = allSessions.filter((s) => s.status === 'Finalizada').length

  const viewLabels: Record<typeof view, string> = { calendar: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' }

  return (
    <div className="space-y-5">
      {/* Cross-nav banner */}
      {urlClientId && urlClientName && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)' }}
        >
          <span className="text-primary/80">
            Sesiones de: <strong className="text-foreground">{urlClientName}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Link to="/clients" className="text-xs text-blue-400 hover:text-blue-300 underline">← Volver a clientes</Link>
            <button onClick={() => setSearchParams({})} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      {/* Stats bar */}
      <StatsBar
        sessions={allSessions}
        onViewDay={(d) => { setDayDate(parseISO(d)); setView('day') }}
      />

      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {allSessions.length} sesiones ·{' '}
            <span style={{ color: STATUS_COLOR.Pendiente }}>{pending} pendientes</span> ·{' '}
            <span style={{ color: STATUS_COLOR['En proceso'] }}>{inProgress} en proceso</span> ·{' '}
            <span style={{ color: STATUS_COLOR.Finalizada }}>{done} finalizadas</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 w-40 h-8 text-sm"
            />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => importGoogle.mutate()} disabled={importGoogle.isPending} className="hidden sm:flex">
            <CalendarDays className="h-4 w-4" />Google
          </Button>

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--c-inner-border))' }}>
            {(['calendar', 'week', 'day', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 h-8 text-xs font-semibold transition-colors"
                style={view === v
                  ? { background: 'hsl(var(--primary))', color: '#fff' }
                  : { background: 'transparent', color: 'hsl(var(--muted-foreground))' }}
              >
                {viewLabels[v]}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => openNew()} className="gap-1.5">
            <Plus className="h-4 w-4" />Nueva sesión
          </Button>
        </div>
      </div>

      {/* Main + detail panel */}
      <div className="flex gap-5 items-start">
        {/* Calendar area */}
        <div className="flex-1 min-w-0">
          {view === 'calendar' && (
            <MonthCalendar
              sessions={displayedSessions}
              onNewSession={(d) => openNew(d)}
              onSelectSession={setSelectedSession}
            />
          )}
          {view === 'week' && (
            <WeekCalendar
              sessions={displayedSessions}
              onNewSession={openNew}
              onSelectSession={setSelectedSession}
              onReschedule={handleReschedule}
            />
          )}
          {view === 'day' && (
            <DayCalendar
              date={dayDate}
              onDateChange={setDayDate}
              sessions={displayedSessions}
              onNewSession={openNew}
              onSelectSession={setSelectedSession}
              onReschedule={handleReschedule}
            />
          )}
          {view === 'list' && (
            <ListView
              sessions={displayedSessions}
              statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              startDate={startDate} setStartDate={setStartDate}
              endDate={endDate} setEndDate={setEndDate}
              onSelect={setSelectedSession}
            />
          )}
        </div>

        {/* Desktop detail panel */}
        {selectedSession && (
          <div
            className="w-80 shrink-0 rounded-xl overflow-hidden sticky top-4 hidden lg:block"
            style={{ border: '1px solid hsl(var(--c-inner-border))', maxHeight: 'calc(100vh - 6rem)' }}
          >
            <SessionDetailPanel
              session={selectedSession}
              onClose={() => setSelectedSession(null)}
              onEdit={() => openEdit(selectedSession)}
              onDelete={() => remove.mutate(selectedSession.id)}
              onAttach={() => setAttachmentSession(selectedSession)}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>

      {/* Mobile detail dialog */}
      {selectedSession && (
        <Dialog open onOpenChange={(v) => { if (!v) setSelectedSession(null) }}>
          <DialogContent className="p-0 max-w-sm lg:hidden">
            <SessionDetailPanel
              session={selectedSession}
              onClose={() => setSelectedSession(null)}
              onEdit={() => { openEdit(selectedSession); setSelectedSession(null) }}
              onDelete={() => remove.mutate(selectedSession.id)}
              onAttach={() => { setAttachmentSession(selectedSession); setSelectedSession(null) }}
              onStatusChange={handleStatusChange}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Session form */}
      {dlg && (
        <SessionDialog
          open={dlg}
          onOpenChange={setDlg}
          editing={editing}
          initialDate={newDate}
          initialTime={newTime}
          clients={clients}
          allSessions={allSessions}
          onSave={handleSave}
        />
      )}

      {/* Attachments */}
      {attachmentSession && (
        <AttachmentsDialog
          entityType="session"
          entityId={attachmentSession.id}
          label={`${attachmentSession.client_name ?? 'Sin cliente'} · ${formatDate(attachmentSession.session_date)}`}
          onClose={() => setAttachmentSession(null)}
        />
      )}
    </div>
  )
}
