// Cita / sesión: un solo diálogo para la Agenda y para la pestaña Sesiones del expediente —
// antes la Agenda tenía sugerencias y aviso de choque de horario pero no monto adicional,
// y el expediente tenía monto adicional pero ni sugerencias ni aviso de choque.
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Pencil, Plus, Timer } from 'lucide-react'
import { toast } from 'sonner'
import type { Session, SessionIn, SessionStatus } from '@/types'
import { sessionsApi } from '@/api/sessions'
import { clientsApi } from '@/api/clients'
import { casesApi } from '@/api/cases'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, today } from '@/lib/utils'

export const SESSION_STATUSES: SessionStatus[] = ['Pendiente', 'En proceso', 'Finalizada']
export const SESSION_STATUS_COLOR: Record<SessionStatus, string> = {
  Pendiente: '#f59e0b',
  'En proceso': '#3b82f6',
  Finalizada: '#22c55e',
}
const CONSULT_PRESETS = [
  'Consulta inicial', 'Revisión de contrato', 'Asesoría laboral',
  'Defensa penal', 'Trámite civil', 'Audiencia', 'Seguimiento de caso',
  'Notaría', 'Mediación', 'Otro',
]

export function timeToFrac(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h + m / 60
}
export function fracToTime(frac: number): string {
  const h = Math.floor(frac)
  const m = Math.round((frac - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(Math.min(m, 59)).padStart(2, '0')}`
}
export function formatDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh * 60 + em) - (sh * 60 + sm)
  if (mins <= 0) return ''
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

export function invalidateSessions(qc: ReturnType<typeof useQueryClient>, caseId?: number | null) {
  qc.invalidateQueries({ queryKey: ['sessions'] })
  qc.invalidateQueries({ queryKey: ['case-sessions'] })
  qc.invalidateQueries({ queryKey: ['dashboard-upcoming'] })
  qc.invalidateQueries({ queryKey: ['cases'] })
  if (caseId) qc.invalidateQueries({ queryKey: ['case-honorarios-log', caseId] })
}

type FormData = {
  client_id: string; case_id: string; session_date: string
  start_time: string; end_time: string; consult_type: string
  notes: string; status: SessionStatus; monto_adicional: string
}

export function SessionDialog({
  open, onOpenChange, editing, initialDate, initialTime, initialClientId, fixedClientId, fixedCaseId, onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Session | null
  initialDate?: string
  initialTime?: string
  /** Cliente preseleccionado (editable), p. ej. al venir de la ficha del cliente. */
  initialClientId?: number
  /** Desde un expediente: cliente y expediente ya están definidos y no se piden. */
  fixedClientId?: number
  fixedCaseId?: number
  onSaved?: (s: Session) => void
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormData>(() => editing ? {
    client_id: editing.client_id ? String(editing.client_id) : '',
    case_id: editing.case_id ? String(editing.case_id) : '',
    session_date: editing.session_date,
    start_time: editing.start_time ?? '09:00',
    end_time: editing.end_time ?? '10:00',
    consult_type: editing.consult_type,
    notes: editing.notes ?? '',
    status: editing.status,
    monto_adicional: '',
  } : {
    client_id: fixedClientId ? String(fixedClientId) : initialClientId ? String(initialClientId) : '',
    case_id: fixedCaseId ? String(fixedCaseId) : '',
    session_date: initialDate ?? today(),
    start_time: initialTime ?? '09:00',
    end_time: initialTime ? fracToTime(timeToFrac(initialTime) + 1) : '10:00',
    consult_type: '', notes: '', status: 'Pendiente', monto_adicional: '',
  })
  const [showPresets, setShowPresets] = useState(false)

  const { data: clients = [] } = useQuery({ queryKey: ['client-choices'], queryFn: clientsApi.choices, enabled: open && !fixedClientId })
  const { data: caseChoices = [] } = useQuery({
    queryKey: ['case-choices', form.client_id],
    queryFn: () => casesApi.choices(form.client_id ? Number(form.client_id) : undefined),
    enabled: open && !fixedCaseId,
  })
  // Aviso de choque: citas de todo el despacho ese mismo día.
  const { data: delDia = [] } = useQuery({
    queryKey: ['sessions', { dia: form.session_date }],
    queryFn: () => sessionsApi.list({ start_date: form.session_date, end_date: form.session_date }),
    enabled: open && !!form.session_date,
  })
  const conflict = form.start_time && form.end_time
    ? delDia.find((s) => s.id !== editing?.id && s.start_time && s.end_time
        && form.start_time < s.end_time && form.end_time > s.start_time) ?? null
    : null

  useEffect(() => { if (!open) setShowPresets(false) }, [open])

  const save = useMutation({
    mutationFn: (payload: SessionIn) => editing ? sessionsApi.update(editing.id, payload) : sessionsApi.create(payload),
    onSuccess: (s) => {
      invalidateSessions(qc, s.case_id)
      toast.success(editing ? 'Cita actualizada' : 'Cita agendada')
      onOpenChange(false)
      onSaved?.(s)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error al guardar la cita'),
  })

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm((p) => ({ ...p, [k]: v }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.consult_type.trim()) return toast.error('Cliente y tipo de consulta son requeridos')
    if (!form.session_date) return toast.error('La fecha es requerida')
    if (form.end_time <= form.start_time) return toast.error('La hora fin debe ser mayor que la hora inicio')
    save.mutate({
      client_id: Number(form.client_id),
      case_id: form.case_id ? Number(form.case_id) : null,
      session_date: form.session_date,
      start_time: form.start_time,
      end_time: form.end_time,
      consult_type: form.consult_type.trim(),
      notes: form.notes,
      status: form.status,
      monto_adicional: !editing && form.case_id && form.monto_adicional ? Number(form.monto_adicional) : undefined,
      // El aviso de cruce ya está a la vista en el formulario: si aun así guarda, es su
      // decisión y el backend no tiene que volver a frenarla.
      permitir_solape: Boolean(conflict),
    })
  }

  const presets = CONSULT_PRESETS.filter((p) => !form.consult_type || p.toLowerCase().includes(form.consult_type.toLowerCase()))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editing ? <><Pencil className="h-4 w-4" />Editar cita</> : <><Plus className="h-4 w-4" />Nueva cita</>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!fixedClientId && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Cliente <span className="text-destructive text-xs">*</span></Label>
                <Select value={form.client_id} onValueChange={(v) => setForm((p) => ({ ...p, client_id: v, case_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!fixedCaseId && (
                <div className="space-y-1 col-span-2">
                  <Label>Expediente (opcional)</Label>
                  <Select value={form.case_id} onValueChange={(v) => set('case_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Sin expediente específico" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin expediente específico</SelectItem>
                      {caseChoices.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Fecha <span className="text-destructive text-xs">*</span></Label>
              <Input type="date" value={form.session_date} onChange={(e) => set('session_date', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Inicio</Label>
              <Input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fin</Label>
              <Input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 -mt-2 min-h-[18px]">
            {form.start_time && form.end_time && form.end_time > form.start_time && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" />{formatDuration(form.start_time, form.end_time)}
              </span>
            )}
            {conflict && (
              <span className="text-xs text-amber-500 flex items-center gap-1 ml-auto">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Coincide con {conflict.client_name ?? 'otra cita'} ({conflict.start_time}–{conflict.end_time})
              </span>
            )}
          </div>

          <div className="space-y-1 relative">
            <Label>Tipo de consulta <span className="text-destructive text-xs">*</span></Label>
            <Input
              value={form.consult_type}
              onChange={(e) => { set('consult_type', e.target.value); setShowPresets(true) }}
              onFocus={() => setShowPresets(true)}
              onBlur={() => setTimeout(() => setShowPresets(false), 150)}
              placeholder="Ej: Consulta inicial, Audiencia..."
              autoComplete="off"
            />
            {showPresets && presets.length > 0 && (
              <div className="absolute z-50 w-full rounded-lg border shadow-lg overflow-hidden mt-0.5"
                style={{ background: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}>
                {presets.map((p) => (
                  <button key={p} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
                    onMouseDown={() => { set('consult_type', p); setShowPresets(false) }}>{p}</button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Observaciones, temas a tratar..." />
          </div>

          <div className="space-y-1">
            <Label>Estado</Label>
            <div className="flex gap-2">
              {SESSION_STATUSES.map((st) => (
                <button key={st} type="button" onClick={() => set('status', st)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border"
                  style={form.status === st
                    ? { background: SESSION_STATUS_COLOR[st], color: '#fff', borderColor: 'transparent' }
                    : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                  {st}
                </button>
              ))}
            </div>
          </div>

          {!editing && form.case_id && (
            <div className="space-y-1">
              <Label>Monto adicional a los honorarios ($, opcional)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.monto_adicional}
                onChange={(e) => set('monto_adicional', e.target.value)} />
              {Number(form.monto_adicional) > 0 && (
                <p className="text-[11px] text-amber-600">
                  Sumará {formatCurrency(Number(form.monto_adicional))} a los honorarios contratados del expediente (queda en la bitácora).
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agendar cita'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
