import { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks,
  format, isToday,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, CalendarDays, List, X, CalendarRange, Paperclip } from 'lucide-react'
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

const STATUSES: SessionStatus[] = ['Pendiente', 'En proceso', 'Finalizada']
const STATUS_COLOR: Record<SessionStatus, string> = {
  Pendiente: 'bg-yellow-400',
  'En proceso': 'bg-blue-500',
  Finalizada: 'bg-green-500',
}
const STATUS_BADGE: Record<SessionStatus, 'warning' | 'info' | 'success'> = {
  Pendiente: 'warning', 'En proceso': 'info', Finalizada: 'success',
}

type FormData = {
  client_id: string; case_id: string; session_date: string; start_time: string; end_time: string
  consult_type: string; notes: string; status: SessionStatus
}
const EMPTY: FormData = {
  client_id: '', case_id: '', session_date: today(), start_time: '09:00', end_time: '10:00',
  consult_type: '', notes: '', status: 'Pendiente',
}

function formatTimeRange(session: Pick<Session, 'start_time' | 'end_time'>) {
  if (session.start_time && session.end_time) return `${session.start_time} - ${session.end_time}`
  if (session.start_time) return session.start_time
  return 'Sin hora'
}

// ─── Session Form Dialog ──────────────────────────────────────────────────────
function SessionDialog({
  open, onOpenChange, editing, initialDate, clients, onSave,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Session | null
  initialDate?: string
  clients: { id: number; name?: string }[]
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
    } : { ...EMPTY, session_date: initialDate ?? today() }
  )

  const { data: caseChoices = [] } = useQuery({
    queryKey: ['case-choices', form.client_id],
    queryFn: () => casesApi.choices(form.client_id ? Number(form.client_id) : undefined),
  })

  const f = (k: keyof FormData) => (v: string) => setForm((p) => ({ ...p, [k]: v }))

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Editar sesión' : 'Nueva sesión'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Cliente <span className="text-destructive text-xs">*</span></Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v, case_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Caso (opcional)</Label>
              <Select value={form.case_id} onValueChange={f('case_id')}>
                <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Ninguno</SelectItem>
                  {caseChoices.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha <span className="text-destructive text-xs">*</span></Label>
              <Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Hora inicio <span className="text-destructive text-xs">*</span></Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Hora fin <span className="text-destructive text-xs">*</span></Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={f('status')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Tipo de consulta <span className="text-destructive text-xs">*</span></Label>
              <Input value={form.consult_type} onChange={(e) => setForm({ ...form, consult_type: e.target.value })} placeholder="Ej: Consulta inicial, Revisión de contrato..." />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Notas</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Month Calendar ───────────────────────────────────────────────────────────
function MonthCalendar({
  sessions, onNewSession, onEditSession, onDeleteSession, onAttachSession,
}: {
  sessions: Session[]
  onNewSession: (date: string) => void
  onEditSession: (s: Session) => void
  onDeleteSession: (id: number) => void
  onAttachSession: (s: Session) => void
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
  Object.values(sessionsByDate).forEach((items) => {
    items.sort((a, b) => (a.start_time ?? '99:99').localeCompare(b.start_time ?? '99:99'))
  })

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const selectedSessions = selectedDateStr ? (sessionsByDate[selectedDateStr] ?? []) : []

  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" onClick={() => setCurrentMonth(new Date())}>Hoy</Button>
          <Button size="icon" variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Grid */}
      <div className="border rounded-xl overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 divide-x divide-y">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const daySessions = sessionsByDate[dateStr] ?? []
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const isT = isToday(day)

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(-1)) ? null : day)}
                className={[
                  'min-h-[80px] p-1.5 text-left transition-colors',
                  !isCurrentMonth ? 'bg-muted/20 text-muted-foreground/50' : 'hover:bg-muted/30',
                  isSelected ? 'bg-primary/10 ring-1 ring-inset ring-primary' : '',
                ].join(' ')}
              >
                <div className={[
                  'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1',
                  isT ? 'bg-primary text-primary-foreground' : '',
                ].join(' ')}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {daySessions.slice(0, 3).map((s) => (
                    <div key={s.id} className={`text-[10px] leading-tight truncate rounded px-1 py-0.5 text-white ${STATUS_COLOR[s.status]}`}>
                      {s.start_time ? `${s.start_time} · ` : ''}{s.client_name ?? s.consult_type}
                    </div>
                  ))}
                  {daySessions.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{daySessions.length - 3} más</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium capitalize">
                {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <Button size="sm" onClick={() => onNewSession(format(selectedDay, 'yyyy-MM-dd'))}>
                <Plus className="h-3.5 w-3.5" />Agregar sesión
              </Button>
            </div>
            {selectedSessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Sin sesiones este día</p>
            ) : (
              <div className="space-y-2">
                {selectedSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLOR[s.status]}`} />
                      <div>
                        <p className="text-sm font-medium">{s.consult_type}</p>
                        <p className="text-xs text-muted-foreground">{formatTimeRange(s)} · {s.client_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Adjuntos" onClick={() => onAttachSession(s)}><Paperclip className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEditSession(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('¿Eliminar sesión?')) onDeleteSession(s.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Week Calendar ────────────────────────────────────────────────────────────
const HOUR_H = 56        // px per hour
const DAY_START = 7      // 7 am
const DAY_END = 21       // 9 pm

function timeToFrac(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}

function WeekCalendar({
  sessions, onNewSession, onEditSession, onDeleteSession,
}: {
  sessions: Session[]
  onNewSession: (date: string) => void
  onEditSession: (s: Session) => void
  onDeleteSession: (id: number) => void
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const scrollRef = useRef<HTMLDivElement>(null)

  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })
  const totalH = (DAY_END - DAY_START) * HOUR_H
  const hours = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)

  // Scroll to 8am on mount
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (8 - DAY_START) * HOUR_H
  }, [])

  const byDate: Record<string, Session[]> = {}
  sessions.forEach((s) => {
    if (!byDate[s.session_date]) byDate[s.session_date] = []
    byDate[s.session_date].push(s)
  })

  return (
    <div className="space-y-3">
      {/* Header nav */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">
          {format(weekStart, "d 'de' MMM", { locale: es })} — {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d 'de' MMM yyyy", { locale: es })}
        </h2>
        <div className="flex gap-1">
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted/40 transition-colors"
            style={{ borderColor: 'hsl(var(--c-inner-border))' }}
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          ><ChevronLeft className="h-4 w-4" /></button>
          <button
            className="px-3 h-8 rounded-md border text-xs hover:bg-muted/40 transition-colors"
            style={{ borderColor: 'hsl(var(--c-inner-border))' }}
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >Hoy</button>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md border hover:bg-muted/40 transition-colors"
            style={{ borderColor: 'hsl(var(--c-inner-border))' }}
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          ><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--c-inner-border))' }}>
        {/* Day headers */}
        <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', background: 'hsl(var(--c-surface-1))', borderBottom: '1px solid hsl(var(--c-inner-border))' }}>
          <div className="py-2" />
          {days.map((day) => {
            const isT = isToday(day)
            return (
              <div key={day.toISOString()} className="py-2 text-center">
                <p className="text-[10px] font-medium text-muted-foreground uppercase">
                  {format(day, 'EEE', { locale: es })}
                </p>
                <div className={`mx-auto mt-0.5 h-7 w-7 flex items-center justify-center rounded-full text-sm font-semibold ${isT ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            )
          })}
        </div>

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 520 }}>
          <div className="grid relative" style={{ gridTemplateColumns: '52px repeat(7, 1fr)', height: totalH }}>
            {/* Hour labels */}
            <div className="relative">
              {hours.map((h) => (
                <div key={h} className="absolute w-full flex items-start justify-end pr-2"
                  style={{ top: (h - DAY_START) * HOUR_H, height: HOUR_H }}>
                  <span className="text-[10px] text-muted-foreground -translate-y-2">{String(h).padStart(2, '0')}:00</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const daySessions = byDate[dateStr] ?? []
              const timed = daySessions.filter((s) => s.start_time)
              const untimed = daySessions.filter((s) => !s.start_time)

              return (
                <div key={dateStr} className="relative border-l"
                  style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
                  {/* Hour grid lines */}
                  {hours.map((h) => (
                    <div key={h}
                      className="absolute w-full cursor-pointer hover:bg-primary/5 transition-colors"
                      style={{ top: (h - DAY_START) * HOUR_H, height: HOUR_H, borderTop: '1px solid hsl(var(--c-inner-border))' }}
                      onClick={() => onNewSession(dateStr)}
                    />
                  ))}

                  {/* Untimed sessions at top */}
                  {untimed.map((s, i) => (
                    <div key={s.id}
                      className="absolute left-0.5 right-0.5 rounded text-[10px] px-1 py-0.5 cursor-pointer text-white truncate z-10"
                      style={{ top: i * 18, background: STATUS_COLOR[s.status] ?? 'hsl(var(--primary))' }}
                      onClick={() => onEditSession(s)}
                    >
                      {s.client_name ?? s.consult_type}
                    </div>
                  ))}

                  {/* Timed sessions */}
                  {timed.map((s) => {
                    const start = timeToFrac(s.start_time!)
                    const end = s.end_time ? timeToFrac(s.end_time) : start + 1
                    const clampedStart = Math.max(start, DAY_START)
                    const clampedEnd = Math.min(end, DAY_END)
                    if (clampedEnd <= clampedStart) return null
                    const top = (clampedStart - DAY_START) * HOUR_H
                    const height = Math.max((clampedEnd - clampedStart) * HOUR_H - 2, 18)

                    return (
                      <div key={s.id}
                        className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-white cursor-pointer overflow-hidden z-20 group"
                        style={{ top, height, background: STATUS_COLOR[s.status] ?? 'hsl(var(--primary))' }}
                        onClick={(e) => { e.stopPropagation(); onEditSession(s) }}
                      >
                        <p className="text-[10px] font-semibold leading-tight truncate">{s.client_name}</p>
                        {height > 30 && <p className="text-[9px] opacity-80 leading-tight truncate">{s.consult_type}</p>}
                        {height > 46 && <p className="text-[9px] opacity-70">{s.start_time} – {s.end_time}</p>}
                        {/* Delete on hover */}
                        <button
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 h-4 w-4 flex items-center justify-center rounded text-white/80 hover:text-white bg-black/20"
                          onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar sesión?')) onDeleteSession(s.id) }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
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

// ─── List View ────────────────────────────────────────────────────────────────
function ListView({
  sessions, statusFilter, setStatusFilter, startDate, setStartDate, endDate, setEndDate,
  onEdit, onDelete, onAttach,
}: {
  sessions: Session[]
  statusFilter: string; setStatusFilter: (v: string) => void
  startDate: string; setStartDate: (v: string) => void
  endDate: string; setEndDate: (v: string) => void
  onEdit: (s: Session) => void
  onDelete: (id: number) => void
  onAttach: (s: Session) => void
}) {
  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
        <span className="text-muted-foreground text-sm">—</span>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
        {(statusFilter || startDate || endDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setStartDate(''); setEndDate('') }}>Limpiar</Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{['Fecha', 'Hora', 'Cliente', 'Tipo de consulta', 'Caso', 'Estado', ''].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{formatDate(s.session_date)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatTimeRange(s)}</td>
                    <td className="px-4 py-3">{s.client_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.consult_type}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.case_id ? `#${s.case_id}` : '—'}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_BADGE[s.status] ?? 'outline'}>{s.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" title="Adjuntos" onClick={() => onAttach(s)}><Paperclip className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => onEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('¿Eliminar sesión?')) onDelete(s.id) }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!sessions.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin sesiones</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
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
  const [view, setView] = useState<'calendar' | 'week' | 'list'>('calendar')
  const [attachmentSession, setAttachmentSession] = useState<Session | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Read cross-nav params from URL
  const urlClientId = searchParams.get('client_id') ? Number(searchParams.get('client_id')) : undefined
  const urlClientName = searchParams.get('client_name') ?? undefined

  // Apply URL client filter on mount
  useEffect(() => {
    if (urlClientId) setView('list')
  }, [urlClientId])

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

  const create = useMutation({
    mutationFn: (d: SessionIn) => sessionsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Sesión creada'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SessionIn }) => sessionsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Sesión actualizada'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: sessionsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Sesión eliminada') },
  })

  const importGoogle = useMutation({
    mutationFn: googleCalApi.importEvents,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success(`Google Calendar sincronizado: ${result.imported} nuevas, ${result.updated} actualizadas`)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'No se pudo importar Google Calendar'),
  })

  function openNew(date?: string) { setEditing(null); setNewDate(date); setDlg(true) }
  function openEdit(s: Session) { setEditing(s); setNewDate(undefined); setDlg(true) }
  function handleSave(ed: Session | null, payload: SessionIn) {
    ed ? update.mutate({ id: ed.id, data: payload }) : create.mutate(payload)
  }

  const pending = allSessions.filter((s) => s.status === 'Pendiente').length
  const inProgress = allSessions.filter((s) => s.status === 'En proceso').length
  const done = allSessions.filter((s) => s.status === 'Finalizada').length

  return (
    <div className="space-y-5">
      {/* Cross-nav banner */}
      {urlClientId && urlClientName && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)' }}
        >
          <span className="text-primary/80">
            Mostrando sesiones de: <strong className="text-foreground">{urlClientName}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Link to="/clients" className="text-xs text-blue-400 hover:text-blue-300 underline">← Volver a clientes</Link>
            <button onClick={() => setSearchParams({})} className="text-muted-foreground hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-muted-foreground text-sm">
            {allSessions.length} sesiones ·{' '}
            <span className="text-yellow-600">{pending} pendientes</span> ·{' '}
            <span className="text-blue-600">{inProgress} en proceso</span> ·{' '}
            <span className="text-green-600">{done} finalizadas</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => importGoogle.mutate()} disabled={importGoogle.isPending}>
            <CalendarDays className="h-4 w-4" />Traer de Google
          </Button>
          <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendar')}>
            <CalendarDays className="h-4 w-4" />Mes
          </Button>
          <Button variant={view === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setView('week')}>
            <CalendarRange className="h-4 w-4" />Semana
          </Button>
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
            <List className="h-4 w-4" />Lista
          </Button>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="h-4 w-4" />Nueva sesión
          </Button>
        </div>
      </div>

      {view === 'calendar' && (
        <MonthCalendar
          sessions={allSessions}
          onNewSession={openNew}
          onEditSession={openEdit}
          onDeleteSession={(id) => remove.mutate(id)}
          onAttachSession={setAttachmentSession}
        />
      )}
      {view === 'week' && (
        <WeekCalendar
          sessions={allSessions}
          onNewSession={openNew}
          onEditSession={openEdit}
          onDeleteSession={(id) => remove.mutate(id)}
        />
      )}
      {view === 'list' && (
        <ListView
          sessions={filteredSessions}
          statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          startDate={startDate} setStartDate={setStartDate}
          endDate={endDate} setEndDate={setEndDate}
          onEdit={openEdit}
          onDelete={(id) => remove.mutate(id)}
          onAttach={setAttachmentSession}
        />
      )}

      {dlg && (
        <SessionDialog
          open={dlg}
          onOpenChange={setDlg}
          editing={editing}
          initialDate={newDate}
          clients={clients}
          onSave={handleSave}
        />
      )}

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
