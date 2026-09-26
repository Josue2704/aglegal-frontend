import { useAuthStore } from '@/store/auth'
import { WorkflowHistory } from '@/components/WorkflowHistory'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, CheckSquare, Plus, Trash2, Upload, Download, FileText,
  CalendarDays, Paperclip, Pencil,
  Scale, Building2, UserCheck, Hash, Timer, Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import type { Case, CaseTask, Session, CaseAttachment, SessionStatus, CaseTimeEntryIn } from '@/types'
import { casesApi } from '@/api/cases'
import { sessionsApi } from '@/api/sessions'
import { attachmentsApi } from '@/api/attachments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatCurrency, today } from '@/lib/utils'
import { TaskForm, TaskItem } from '@/components/tasks'
import { SessionDialog, SESSION_STATUSES, invalidateSessions } from '@/components/SessionDialog'
import { AttachmentsDialog } from '@/components/AttachmentsDialog'

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  'Pendiente': 'bg-yellow-400',
  'En proceso': 'bg-blue-500',
  'Finalizada': 'bg-green-500',
}
const STATUS_BADGE: Record<string, string> = {
  'Pendiente': 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  'En proceso': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  'Finalizada': 'text-green-400 border-green-400/30 bg-green-400/10',
}
const CASE_STATUS_BADGE: Record<string, string> = {
  'Abierto': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  'En trámite': 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  'En pausa': 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  'Cerrado': 'text-muted-foreground border-border bg-muted/30',
}
const PRIORITY_BADGE: Record<string, string> = {
  'Alta': 'text-red-400 border-red-400/30 bg-red-400/10',
  'Media': 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  'Baja': 'text-green-400 border-green-400/30 bg-green-400/10',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return '📄'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xls', 'xlsx'].includes(ext)) return '📊'
  return '📎'
}

// ── Tabs ────────────────────────────────────────────────────────────────────

export type Tab = 'sessions' | 'documents' | 'tasks' | 'horas'

// ── Sessions Tab ────────────────────────────────────────────────────────────

function SessionsTab({ kase }: { kase: Case }) {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState<{ editing: Session | null } | null>(null)
  const [attach, setAttach] = useState<Session | null>(null)

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['case-sessions', kase.id],
    queryFn: () => casesApi.listSessions(kase.id),
  })
  const setStatus = useMutation({
    mutationFn: ({ s, status }: { s: Session; status: SessionStatus }) => sessionsApi.update(s.id, {
      client_id: s.client_id, case_id: s.case_id, session_date: s.session_date, start_time: s.start_time,
      end_time: s.end_time, consult_type: s.consult_type, notes: s.notes ?? '', status,
    }),
    onSuccess: (s) => invalidateSessions(qc, s.case_id),
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'No se pudo actualizar'),
  })

  const total = sessions.length
  const done = sessions.filter((s) => s.status === 'Finalizada').length
  const inProgress = sessions.filter((s) => s.status === 'En proceso').length
  const pending = sessions.filter((s) => s.status === 'Pendiente').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (isLoading) return <p className="text-muted-foreground text-sm py-8 text-center">Cargando...</p>

  return (
    <div className="space-y-4">
      {total > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-table-border-h))' }}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Citas realizadas</span>
            <span className="font-semibold text-foreground">{pct}%</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {done > 0 && <div className="bg-green-500" style={{ flex: done }} />}
            {inProgress > 0 && <div className="bg-blue-500" style={{ flex: inProgress }} />}
            {pending > 0 && <div className="bg-yellow-400/60" style={{ flex: pending }} />}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Finalizadas: {done}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />En proceso: {inProgress}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />Pendientes: {pending}</span>
          </div>
        </div>
      )}

      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={() => setDlg({ editing: null })}>
        <Plus className="h-3 w-3" />Agendar cita
      </Button>

      {sessions.length === 0 ? (
        <div className="py-8 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No hay citas para este expediente</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px" style={{ background: 'hsl(var(--c-timeline-line))' }} />
          <div className="space-y-3 pl-8">
            {sessions.map((s) => (
              <div key={s.id} className="relative group">
                <span className={`absolute -left-5 top-2 h-2.5 w-2.5 rounded-full border-2 border-card ${STATUS_DOT[s.status] ?? 'bg-muted'}`} />
                <div className="rounded-xl p-3" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{s.consult_type}</span>
                    <Select value={s.status} onValueChange={(v) => setStatus.mutate({ s, status: v as SessionStatus })}>
                      <SelectTrigger className={`h-5 w-auto px-1.5 gap-1 text-[10px] font-medium border rounded ${STATUS_BADGE[s.status] ?? ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>{SESSION_STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}</SelectContent>
                    </Select>
                    {s.monto_adicional > 0 && <span className="text-[10px] text-amber-600">+{formatCurrency(s.monto_adicional)}</span>}
                    <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button title="Adjuntos" onClick={() => setAttach(s)}
                        className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                        <Paperclip className="h-3 w-3" />
                      </button>
                      <button title="Editar / reagendar" onClick={() => setDlg({ editing: s })}
                        className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(s.session_date)}
                    {s.start_time && <span className="ml-1">· {s.start_time}{s.end_time ? `–${s.end_time}` : ''}</span>}
                    {s.notes && <span className="ml-2 text-muted-foreground/70">— {s.notes}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dlg && (
        <SessionDialog open onOpenChange={(o) => !o && setDlg(null)} editing={dlg.editing}
          fixedClientId={kase.client_id} fixedCaseId={kase.id} />
      )}
      {attach && (
        <AttachmentsDialog entityType="session" entityId={attach.id}
          label={`${attach.consult_type} · ${formatDate(attach.session_date)}`} onClose={() => setAttach(null)} />
      )}
    </div>
  )
}

// ── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ kase }: { kase: Case }) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadTarget, setUploadTarget] = useState<{ type: 'case'; id: number } | { type: 'session'; id: number; label: string } | null>(null)

  const { data: attachments = [], isLoading } = useQuery<CaseAttachment[]>({
    queryKey: ['case-attachments', kase.id],
    queryFn: () => attachmentsApi.listForCase(kase.id),
  })

  const deleteAttach = useMutation({
    mutationFn: (id: number) => attachmentsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-attachments', kase.id] }); toast.success('Documento eliminado') },
  })

  async function handleFiles(files: FileList | null, entityType: string, entityId: number) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const f of Array.from(files)) {
        await attachmentsApi.upload(entityType, entityId, f)
      }
      qc.invalidateQueries({ queryKey: ['case-attachments', kase.id] })
      toast.success(`${files.length} documento${files.length > 1 ? 's' : ''} subido${files.length > 1 ? 's' : ''}`)
    } catch {
      toast.error('Error al subir documento')
    } finally {
      qc.invalidateQueries({ queryKey: ['case-attachments', kase.id] })
      setUploading(false)
      setUploadTarget(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const caseDocs = attachments.filter((a) => a.entity_type === 'case')
  const sessionDocs = attachments.filter((a) => a.entity_type === 'session')
  const taskDocs = attachments.filter((a) => a.entity_type === 'case_task')

  const bySession: Record<string, CaseAttachment[]> = {}
  for (const d of sessionDocs) {
    const key = `#${d.entity_id} · ${d.session_date ?? '?'} — ${d.session_type ?? 'Sesión'}`
    if (!bySession[key]) bySession[key] = []
    bySession[key].push(d)
  }

  const byTask: Record<string, CaseAttachment[]> = {}
  for (const d of taskDocs) {
    const key = `#${d.entity_id} · ${d.task_title ?? 'Tarea sin título'}`
    if (!byTask[key]) byTask[key] = []
    byTask[key].push(d)
  }

  if (isLoading) return <p className="text-muted-foreground text-sm py-8 text-center">Cargando...</p>

  return (
    <div className="space-y-4">
      {/* Upload to case button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (uploadTarget) handleFiles(e.target.files, uploadTarget.type, uploadTarget.id)
          }}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => { setUploadTarget({ type: 'case', id: kase.id }); setTimeout(() => fileRef.current?.click(), 50) }}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? 'Subiendo...' : 'Subir al expediente'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Puedes seleccionar varios archivos. Máximo 20 MB por archivo. Se organizan por expediente, sesión o tarea.</p>
      {/* Case docs */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Documentos del expediente ({caseDocs.length})
        </h3>
        {caseDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-2">Sin documentos adjuntos al expediente</p>
        ) : (
          <div className="space-y-1.5">
            {caseDocs.map((a) => (
              <AttachmentRow key={a.id} attach={a} onDelete={() => deleteAttach.mutate(a.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Session docs grouped */}
      {Object.keys(bySession).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" /> Documentos por sesión
          </h3>
          {Object.entries(bySession).map(([label, docs]) => (
            <div key={label} className="space-y-1.5">
              <p className="text-xs font-medium text-blue-400/80 pl-2 border-l border-blue-500/30">{label}</p>
              {docs.map((a) => (
                <AttachmentRow key={a.id} attach={a} onDelete={() => deleteAttach.mutate(a.id)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Task docs grouped by task */}
      {Object.keys(byTask).length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" /> Documentos por tarea
          </h3>
          {Object.entries(byTask).map(([label, docs]) => (
            <div key={label} className="space-y-1.5">
              <p className="text-xs font-medium text-purple-400/80 pl-2 border-l border-purple-500/30">{label}</p>
              {docs.map((a) => (
                <AttachmentRow key={a.id} attach={a} onDelete={() => deleteAttach.mutate(a.id)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {attachments.length === 0 && (
        <div className="py-8 text-center">
          <Paperclip className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No hay documentos adjuntos</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Sube archivos al expediente, sesiones o tareas</p>
        </div>
      )}
    </div>
  )
}

function AttachmentRow({ attach, onDelete }: { attach: CaseAttachment; onDelete: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg group transition-all"
      style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
    >
      <span className="text-base">{fileIcon(attach.original_name)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{attach.original_name}</p>
        <p className="text-[10px] text-muted-foreground">{formatDate(attach.created_at.slice(0, 10))} · {attach.doc_role === 'guide' ? 'Documento guía' : attach.doc_role === 'evidence' ? 'Evidencia' : 'Documento general'}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => attachmentsApi.download(attach.id, attach.original_name)}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
          title="Descargar"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => { if (confirm('¿Eliminar documento?')) onDelete() }}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ kase }: { kase: Case }) {
  const [showForm, setShowForm] = useState(false)
  const { data: tasks = [] } = useQuery<CaseTask[]>({
    queryKey: ['case-tasks', kase.id],
    queryFn: () => casesApi.listTasks(kase.id),
  })
  const doneCount = tasks.filter((t) => t.done).length
  const sinResponsable = tasks.filter(t=>!t.done && !t.responsible_username && !kase.responsible_username).length
  const criticasSinFecha = tasks.filter(t=>!t.done && t.es_critico && !t.due_date).length

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-3 text-xs space-y-1">
        <p>Presupuesto interno del expediente: <strong>{formatCurrency(kase.costos_directos_estimados)}</strong></p>
        <p>Estimación actual de tareas: <strong>{formatCurrency(tasks.reduce((sum,t)=>sum+t.costo_estimado,0))}</strong></p>
        <p>Costos reales del expediente: <strong>{formatCurrency(kase.costos_directos_reales)}</strong></p>
        <p className="text-muted-foreground">Estas cifras se comparan; no se suman entre sí ni aumentan los honorarios. Solo un extra autorizado aumenta el cobro al cliente.</p>
      </div>
      {(!tasks.length || sinResponsable>0 || criticasSinFecha>0) && <div className="rounded-md border border-amber-500/40 p-3 text-xs text-amber-600">
        {!tasks.length && <p>Este expediente todavía no tiene plan de trabajo. Define su primera tarea.</p>}
        {sinResponsable>0 && <p>{sinResponsable} tareas pendientes sin responsable.</p>}
        {criticasSinFecha>0 && <p>{criticasSinFecha} tareas críticas sin fecha límite.</p>}
      </div>}
      {tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--c-table-border-h))' }}>
            <div className="h-full bg-green-500 transition-all" style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{doneCount}/{tasks.length}</span>
        </div>
      )}

      {!showForm ? (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-3 w-3" />Nueva tarea
        </Button>
      ) : (
        <div className="rounded-xl p-4" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
          <p className="text-xs font-semibold text-foreground mb-3">Nueva tarea</p>
          <TaskForm caseId={kase.id} onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((t) => <TaskItem key={t.id} task={t} />)}
        {!tasks.length && <p className="text-center text-muted-foreground text-sm py-6">Sin tareas. Crea una arriba.</p>}
      </div>

      <HonorariosLog caseId={kase.id} />
    </div>
  )
}

function HonorariosLog({ caseId }: { caseId: number }) {
  const [open, setOpen] = useState(false)
  const { data: log = [] } = useQuery({
    queryKey: ['case-honorarios-log', caseId],
    queryFn: () => casesApi.honorariosLog(caseId),
    enabled: open,
  })
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
        Ver bitácora de honorarios
      </button>
    )
  }
  return (
    <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Bitácora de honorarios</p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
      </div>
      {!log.length && <p className="text-xs text-muted-foreground">Sin movimientos automáticos — los honorarios no han cambiado desde que se creó el expediente.</p>}
      {log.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded" style={{ background: 'hsl(var(--c-surface-1))' }}>
          <div className="min-w-0">
            <p className="truncate">{entry.motivo}</p>
            <p className="text-muted-foreground/70">{formatDate(entry.created_at)} · {entry.username}</p>
          </div>
          <span className={`font-mono shrink-0 ml-2 ${entry.monto >= 0 ? 'text-green-500' : 'text-red-400'}`}>
            {entry.monto >= 0 ? '+' : ''}{formatCurrency(entry.monto)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Horas Tab (registro de horas trabajadas, para servicios cobrados "Por hora") ──

const EMPTY_TIME_ENTRY: CaseTimeEntryIn = { work_date: today(), hours: 1, description: '', billable: true }

function HorasTab({ kase }: { kase: Case }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CaseTimeEntryIn>(EMPTY_TIME_ENTRY)

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['case-time-entries', kase.id],
    queryFn: () => casesApi.listTimeEntries(kase.id),
  })

  const create = useMutation({
    mutationFn: () => casesApi.createTimeEntry(kase.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-time-entries', kase.id] })
      toast.success('Horas registradas')
      setForm(EMPTY_TIME_ENTRY)
      setShowForm(false)
    },
    onError: () => toast.error('Error al registrar las horas'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => casesApi.deleteTimeEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-time-entries', kase.id] }),
  })

  const totalHoras = entries.reduce((s, e) => s + e.hours, 0)
  const totalFacturables = entries.filter((e) => e.billable && !e.invoice_id).reduce((s, e) => s + e.hours, 0)

  if (isLoading) return <p className="text-muted-foreground text-sm py-8 text-center">Cargando...</p>

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
        <div>
          <p className="text-xs text-muted-foreground">Horas registradas</p>
          <p className="text-lg font-semibold">{totalHoras.toFixed(2)} h</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Pendientes de facturar</p>
          <p className="text-lg font-semibold text-amber-500">{totalFacturables.toFixed(2)} h</p>
        </div>
      </div>

      {!showForm ? (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-3 w-3" />Registrar horas
        </Button>
      ) : (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fecha</label>
              <Input type="date" className="h-8 text-sm" value={form.work_date} onChange={(e) => setForm((p) => ({ ...p, work_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Horas</label>
              <Input type="number" min="0.25" step="0.25" className="h-8 text-sm" value={form.hours} onChange={(e) => setForm((p) => ({ ...p, hours: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descripción</label>
            <Textarea className="text-sm resize-none" rows={2} placeholder="Qué se trabajó..." value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
            <input type="checkbox" checked={form.billable} onChange={(e) => setForm((p) => ({ ...p, billable: e.target.checked }))} className="h-3.5 w-3.5" />
            Facturable a este cliente
          </label>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowForm(false); setForm(EMPTY_TIME_ENTRY) }}>Cancelar</Button>
            <Button size="sm" className="h-7 text-xs" disabled={form.hours <= 0 || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-lg group text-xs" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
            <Timer className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-foreground">{formatDate(e.work_date)} · <span className="font-semibold">{e.hours}h</span></p>
              {e.description && <p className="text-muted-foreground/70 truncate">{e.description}</p>}
            </div>
            {e.invoice_id ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500"><Receipt className="h-2.5 w-2.5" />Facturado</span>
            ) : !e.billable ? (
              <span className="text-[10px] text-muted-foreground/60">No facturable</span>
            ) : null}
            <button
              onClick={() => { if (confirm('¿Eliminar este registro de horas?')) remove.mutate(e.id) }}
              className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!entries.length && <p className="text-center text-muted-foreground text-sm py-6">Sin horas registradas todavía.</p>}
      </div>
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface CaseDetailPanelProps {
  kase: Case
  onClose: () => void
  /** Abre el formulario de edición del expediente (vive en la página Expedientes). */
  onEdit?: (c: Case) => void
  initialTab?: Tab
}

export default function CaseDetailPanel({ kase: initial, onClose, onEdit, initialTab }: CaseDetailPanelProps) {
  const user=useAuthStore(s=>s.user)
  const can=(module:string)=>!!user&&(user.is_admin||user.permissions.includes(module+'.ver'))
  const allowed:Record<Tab,boolean>={sessions:can('agenda'),documents:can('expedientes'),tasks:can('tareas'),horas:can('expedientes')}
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>(initialTab && allowed[initialTab] ? initialTab : allowed.tasks ? 'tasks' : (Object.keys(allowed) as Tab[]).find(t=>allowed[t]) ?? 'documents')
  const [agendar, setAgendar] = useState(false)
  // Datos frescos: honorarios, saldo y estado cambian al agregar tareas/citas/cobros
  // mientras el panel está abierto — antes mostraba la foto del momento en que se abrió.
  const { data: kase = initial } = useQuery({
    queryKey: ['cases', 'detalle', initial.id],
    queryFn: () => casesApi.get(initial.id),
    initialData: initial,
  })
  const cobrado = kase.honorarios_contratados - kase.saldo_pendiente

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sessions', label: 'Sesiones', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'documents', label: 'Documentos', icon: <Paperclip className="h-4 w-4" /> },
    { id: 'tasks', label: 'Tareas', icon: <CheckSquare className="h-4 w-4" /> },
    { id: 'horas', label: 'Horas', icon: <Timer className="h-4 w-4" /> },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'hsl(var(--c-overlay))', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="ml-auto h-full flex flex-col overflow-hidden"
        style={{
          width: 'min(640px, 90vw)',
          background: 'hsl(var(--c-panel-bg))',
          borderLeft: '1px solid hsl(var(--c-table-border-h))',
          boxShadow: '-20px 0 60px hsl(var(--c-panel-shadow))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 shrink-0 space-y-3" style={{ borderBottom: '1px solid hsl(var(--c-header-border))' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground leading-tight truncate">{kase.title}</h2>
              <Link
                to={`/clients?search=${encodeURIComponent(kase.client_name ?? '')}`}
                className="text-sm text-muted-foreground hover:text-blue-400 transition-colors"
              >
                {kase.client_name}
              </Link>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded border font-medium ${CASE_STATUS_BADGE[kase.status] ?? ''}`}>{kase.status}</span>
            <span className={`px-2 py-0.5 rounded border font-medium ${PRIORITY_BADGE[kase.priority] ?? ''}`}>{kase.priority}</span>
            {kase.service_nombre && (
              <span className="px-2 py-0.5 rounded border text-purple-300 border-purple-500/30 bg-purple-500/10">{kase.service_nombre}</span>
            )}
            <span className="px-2 py-0.5 rounded border text-muted-foreground border-border/50 bg-muted/20 flex items-center gap-1">
              <CalendarDays className="h-2.5 w-2.5" />
              {formatDate(kase.opened_at)}
            </span>
          </div>

          {/* Resumen de cobro */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { label: 'Honorarios', value: kase.honorarios_contratados, cls: 'text-foreground' },
              { label: 'Cobrado', value: cobrado, cls: 'text-green-500' },
              { label: 'Saldo pendiente', value: kase.saldo_pendiente, cls: kase.saldo_pendiente > 0 ? 'text-amber-500' : 'text-muted-foreground' },
              { label: 'Costos del caso', value: kase.costos_directos_reales, cls: kase.costos_directos_reales > 0 ? 'text-red-400' : 'text-muted-foreground' },
            ].map((x) => (
              <div key={x.label} className="rounded-lg px-3 py-2" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{x.label}</p>
                <p className={`font-mono font-semibold ${x.cls}`}>{formatCurrency(x.value)}</p>
              </div>
            ))}
          </div>

          <Link to={`/invoices?new=1&client=${kase.client_id}&case=${kase.id}`} className="inline-flex text-sm font-medium text-primary hover:underline">Preparar factura de este expediente</Link>

          {/* Acciones rápidas — todo lo del expediente sin salir de aquí */}
          <div className="flex flex-wrap gap-1.5">
            {onEdit && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEdit(kase)}>
                <Pencil className="h-3 w-3" />Editar
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAgendar(true)}>
              <CalendarDays className="h-3 w-3" />Agendar cita
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setTab('tasks')}>
              <CheckSquare className="h-3 w-3" />Tareas
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1"
              onClick={() => navigate(`/cashflow?cobro=1&case_id=${kase.id}`)}>
              <Receipt className="h-3 w-3" />Registrar cobro
            </Button>
          </div>

          {/* Datos judiciales del expediente */}
          {(kase.internal_ref || kase.official_ref || kase.opposing_party || kase.court_entity || kase.responsible_username) && (
            <div
              className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs rounded-lg px-3 py-2.5"
              style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
            >
              {kase.internal_ref && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Hash className="h-3 w-3 shrink-0" />
                  <span className="truncate"><span className="text-muted-foreground/60">Interno: </span><span className="font-mono text-foreground">{kase.internal_ref}</span></span>
                </div>
              )}
              {kase.official_ref && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Scale className="h-3 w-3 shrink-0" />
                  <span className="truncate"><span className="text-muted-foreground/60">Judicial: </span><span className="font-mono text-foreground">{kase.official_ref}</span></span>
                </div>
              )}
              {kase.opposing_party && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <UserCheck className="h-3 w-3 shrink-0" />
                  <span className="truncate"><span className="text-muted-foreground/60">Contraparte: </span><span className="text-foreground">{kase.opposing_party}</span></span>
                </div>
              )}
              {kase.court_entity && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate"><span className="text-muted-foreground/60">Juzgado: </span><span className="text-foreground">{kase.court_entity}</span></span>
                </div>
              )}
              {kase.responsible_username && (
                <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                  <UserCheck className="h-3 w-3 shrink-0" />
                  <span className="truncate"><span className="text-muted-foreground/60">Abogado responsable: </span><span className="text-foreground">{kase.responsible_username}</span></span>
                </div>
              )}
            </div>
          )}

          {kase.notes && (
            <p className="text-xs text-muted-foreground/80 italic line-clamp-2">{kase.notes}</p>
          )}

          {/* Tabs */}
          <div className="flex gap-0" style={{ borderBottom: '1px solid hsl(var(--c-inner-border))' }}>
            {tabs.filter(t=>allowed[t.id]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px"
                style={
                  tab === t.id
                    ? { color: 'hsl(var(--primary))', borderBottomColor: 'hsl(var(--primary))', background: 'transparent' }
                    : { color: 'hsl(var(--c-tab-inactive))', borderBottomColor: 'transparent' }
                }
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {agendar && (
          <SessionDialog open onOpenChange={(o) => !o && setAgendar(false)} editing={null}
            fixedClientId={kase.client_id} fixedCaseId={kase.id} onSaved={() => setTab('sessions')} />
        )}

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {allowed.sessions && tab === 'sessions' && <SessionsTab kase={kase} />}
          {allowed.documents && tab === 'documents' && <DocumentsTab kase={kase} />}
          <WorkflowHistory path={`/cases/${kase.id}/historial`}/>
          {allowed.tasks && tab === 'tasks' && <TasksTab kase={kase} />}
          {allowed.horas && tab === 'horas' && <HorasTab kase={kase} />}
        </div>
      </div>
    </div>
  )
}
