import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, CheckSquare, Plus, Trash2, Upload, Download, FileText,
  CalendarDays, Clock, CheckCircle2, Circle, Paperclip, ChevronDown,
  Scale, Building2, UserCheck, Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import type { Case, CaseTask, CaseTaskIn, Session, CaseAttachment, SessionStatus, Attachment } from '@/types'
import { casesApi } from '@/api/cases'
import { sessionsApi } from '@/api/sessions'
import { attachmentsApi } from '@/api/attachments'
import { usersApi } from '@/api/users'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate } from '@/lib/utils'

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

type Tab = 'sessions' | 'documents' | 'tasks'

// ── Sessions Tab ────────────────────────────────────────────────────────────

const SESSION_STATUSES: SessionStatus[] = ['Pendiente', 'En proceso', 'Finalizada']

const EMPTY_SESSION_FORM = {
  session_date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  end_time: '10:00',
  consult_type: '',
  notes: '',
  status: 'Pendiente' as SessionStatus,
}

function SessionsTab({ kase }: { kase: Case }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_SESSION_FORM)

  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['case-sessions', kase.id],
    queryFn: () => casesApi.listSessions(kase.id),
  })

  const createSession = useMutation({
    mutationFn: () =>
      sessionsApi.create({
        client_id: kase.client_id,
        case_id: kase.id,
        session_date: form.session_date,
        start_time: form.start_time,
        end_time: form.end_time,
        consult_type: form.consult_type.trim(),
        notes: form.notes,
        status: form.status,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-sessions', kase.id] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
      toast.success('Sesión creada')
      setShowForm(false)
      setForm(EMPTY_SESSION_FORM)
    },
    onError: () => toast.error('Error al crear la sesión'),
  })

  const total = sessions.length
  const done = sessions.filter((s) => s.status === 'Finalizada').length
  const inProgress = sessions.filter((s) => s.status === 'En proceso').length
  const pending = sessions.filter((s) => s.status === 'Pendiente').length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  if (isLoading) return <p className="text-muted-foreground text-sm py-8 text-center">Cargando...</p>

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      {total > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-table-border-h))' }}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progreso del expediente</span>
            <span className="font-semibold text-foreground">{pct}% completado</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            {done > 0 && <div className="bg-green-500 transition-all" style={{ flex: done }} />}
            {inProgress > 0 && <div className="bg-blue-500 transition-all" style={{ flex: inProgress }} />}
            {pending > 0 && <div className="bg-yellow-400/60 transition-all" style={{ flex: pending }} />}
          </div>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" />Finalizadas: {done}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" />En proceso: {inProgress}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />Pendientes: {pending}</span>
          </div>
        </div>
      )}

      {/* Header + nueva sesión */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">{total} sesión{total !== 1 ? 'es' : ''}</h3>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-3 w-3" />
          {showForm ? 'Cancelar' : 'Nueva sesión'}
        </Button>
      </div>

      {/* Inline new-session form */}
      {showForm && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tipo de consulta *</label>
              <Input
                className="h-8 text-sm"
                placeholder="Ej: Revisión de contrato, Audiencia..."
                value={form.consult_type}
                onChange={(e) => setForm((p) => ({ ...p, consult_type: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fecha *</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={form.session_date}
                onChange={(e) => setForm((p) => ({ ...p, session_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estado</label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as SessionStatus }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SESSION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hora inicio</label>
              <Input
                type="time"
                className="h-8 text-sm"
                value={form.start_time}
                onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Hora fin</label>
              <Input
                type="time"
                className="h-8 text-sm"
                value={form.end_time}
                onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Notas</label>
              <Textarea
                className="text-sm resize-none"
                rows={2}
                placeholder="Observaciones de la sesión..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => { setShowForm(false); setForm(EMPTY_SESSION_FORM) }}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              disabled={!form.consult_type.trim() || createSession.isPending}
              onClick={() => createSession.mutate()}
            >
              {createSession.isPending ? 'Guardando...' : 'Crear sesión'}
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {sessions.length === 0 ? (
        <div className="py-8 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No hay sesiones para este expediente</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px" style={{ background: 'hsl(var(--c-timeline-line))' }} />
          <div className="space-y-3 pl-8">
            {sessions.map((s) => (
              <div key={s.id} className="relative">
                <span className={`absolute -left-5 top-2 h-2.5 w-2.5 rounded-full border-2 border-card ${STATUS_DOT[s.status] ?? 'bg-muted'}`} />
                <div
                  className="rounded-xl p-3 transition-all"
                  style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{s.consult_type}</span>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_BADGE[s.status] ?? ''}`}>
                      {s.status}
                    </span>
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
    const key = `${d.session_date ?? '?'} — ${d.session_type ?? 'Sesión'}`
    if (!bySession[key]) bySession[key] = []
    bySession[key].push(d)
  }

  const byTask: Record<string, CaseAttachment[]> = {}
  for (const d of taskDocs) {
    const key = d.task_title ?? 'Tarea sin título'
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
        <p className="text-[10px] text-muted-foreground">{formatDate(attach.created_at.slice(0, 10))}</p>
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

// ── Task Attachments sub-component ───────────────────────────────────────────

function TaskDocSection({
  taskId,
  role,
  label,
  labelColor,
}: {
  taskId: number
  role: 'guide' | 'evidence'
  label: string
  labelColor: string
}) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const { data: all = [] } = useQuery<Attachment[]>({
    queryKey: ['task-attachments', taskId],
    queryFn: () => attachmentsApi.list('case_task', taskId),
  })
  const docs = all.filter((a) => a.doc_role === role)

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const f of Array.from(files)) {
        await attachmentsApi.upload('case_task', taskId, f, role)
      }
      qc.invalidateQueries({ queryKey: ['task-attachments', taskId] })
      qc.invalidateQueries({ queryKey: ['case-attachments'] })
      toast.success('Documento subido')
    } catch {
      toast.error('Error al subir documento')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const deleteDoc = useMutation({
    mutationFn: (id: number) => attachmentsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-attachments', taskId] })
      qc.invalidateQueries({ queryKey: ['case-attachments'] })
    },
  })

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor}`}>{label}</label>
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Upload className="h-2.5 w-2.5" />
          {uploading ? 'Subiendo...' : 'Subir'}
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
      </div>
      {docs.length === 0 ? (
        <p className="text-[10px] text-muted-foreground/50 italic">Sin documentos</p>
      ) : (
        <div className="space-y-1">
          {docs.map((a) => (
            <div key={a.id} className="flex items-center gap-2 group">
              <span className="text-xs">{fileIcon(a.original_name)}</span>
              <span className="flex-1 text-[11px] text-foreground truncate">{a.original_name}</span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => attachmentsApi.download(a.id, a.original_name)}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors"
                >
                  <Download className="h-2.5 w-2.5" />
                </button>
                <button
                  onClick={() => { if (confirm('¿Eliminar?')) deleteDoc.mutate(a.id) }}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ kase }: { kase: Case }) {
  const qc = useQueryClient()

  // New task form state
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newResponsible, setNewResponsible] = useState('')
  const [newGuideFile, setNewGuideFile] = useState<File | null>(null)
  const guideFileRef = useRef<HTMLInputElement>(null)

  // Per-task expanded + draft notes state
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [draftNotes, setDraftNotes] = useState<Record<number, { notes: string; completed_notes: string }>>({})

  const { data: tasks = [] } = useQuery<CaseTask[]>({
    queryKey: ['case-tasks', kase.id],
    queryFn: () => casesApi.listTasks(kase.id),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  })

  function resetForm() {
    setNewTitle(''); setNewDue(''); setNewNotes(''); setNewResponsible(''); setNewGuideFile(null)
    if (guideFileRef.current) guideFileRef.current.value = ''
    setShowForm(false)
  }

  const createTask = useMutation({
    mutationFn: async (data: CaseTaskIn) => {
      const task = await casesApi.createTask(kase.id, data)
      if (newGuideFile) {
        await attachmentsApi.upload('case_task', task.id, newGuideFile, 'guide')
        qc.invalidateQueries({ queryKey: ['task-attachments', task.id] })
        qc.invalidateQueries({ queryKey: ['case-attachments', kase.id] })
      }
      return task
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['case-tasks', kase.id] })
      toast.success('Tarea creada')
      resetForm()
    },
    onError: () => toast.error('Error al crear la tarea'),
  })

  const toggleTask = useMutation({
    mutationFn: ({ id, done, completed_notes }: { id: number; done: boolean; completed_notes?: string }) =>
      casesApi.setTaskDone(id, done, completed_notes || null),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-tasks', kase.id] }),
  })

  const saveNotes = useMutation({
    mutationFn: ({ id, notes, completed_notes }: { id: number; notes: string; completed_notes: string }) =>
      casesApi.updateTaskNotes(id, notes || null, completed_notes || null),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['case-tasks', kase.id] })
      setDraftNotes((prev) => { const n = { ...prev }; delete n[vars.id]; return n })
      toast.success('Notas guardadas')
    },
  })

  const deleteTask = useMutation({
    mutationFn: (id: number) => casesApi.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-tasks', kase.id] }),
  })

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function getDraft(t: CaseTask) {
    return draftNotes[t.id] ?? { notes: t.notes ?? '', completed_notes: t.completed_notes ?? '' }
  }

  function setDraft(id: number, field: 'notes' | 'completed_notes', val: string) {
    setDraftNotes((prev) => {
      const cur = prev[id] ?? { notes: '', completed_notes: '' }
      return { ...prev, [id]: { ...cur, [field]: val } }
    })
  }

  const doneCount = tasks.filter((t) => t.done).length
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-4">
      {tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--c-table-border-h))' }}>
            <div className="h-full bg-green-500 transition-all" style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{doneCount}/{tasks.length}</span>
        </div>
      )}

      {/* ── Nueva tarea button / form ── */}
      {!showForm ? (
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-3 w-3" />Nueva tarea
        </Button>
      ) : (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
          <p className="text-xs font-semibold text-foreground">Nueva tarea</p>

          {/* Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Título *</label>
            <Input
              className="h-8 text-sm"
              placeholder="Describe la tarea..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Due date + Responsible */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Fecha vencimiento</label>
              <Input type="date" className="h-8 text-sm" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Responsable</label>
              <Select value={newResponsible} onValueChange={setNewResponsible}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin asignar</SelectItem>
                  {users.filter((u) => u.active).map((u) => (
                    <SelectItem key={u.username} value={u.username}>
                      {u.full_name || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descripción (opcional)</label>
            <Textarea
              className="text-sm resize-none"
              rows={2}
              placeholder="Contexto, instrucciones, referencias..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
            />
          </div>

          {/* Guide document */}
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="h-3 w-3 text-blue-400" />
              Documento guía (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={guideFileRef}
                type="file"
                className="hidden"
                onChange={(e) => setNewGuideFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => guideFileRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
                style={{ borderColor: 'hsl(var(--c-inner-border))' }}
              >
                <Upload className="h-3 w-3" />
                {newGuideFile ? newGuideFile.name : 'Seleccionar archivo...'}
              </button>
              {newGuideFile && (
                <button
                  type="button"
                  onClick={() => { setNewGuideFile(null); if (guideFileRef.current) guideFileRef.current.value = '' }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={resetForm}>Cancelar</Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!newTitle.trim() || createTask.isPending}
              onClick={() => createTask.mutate({
                title: newTitle.trim(),
                due_date: newDue || null,
                notes: newNotes || null,
                responsible_username: newResponsible || undefined,
              })}
            >
              {createTask.isPending ? 'Guardando...' : 'Crear tarea'}
            </Button>
          </div>
        </div>
      )}

      {/* ── Task list ── */}
      <div className="space-y-2">
        {tasks.map((t) => {
          const isExpanded = expanded.has(t.id)
          const draft = getDraft(t)
          const hasDraft = draftNotes[t.id] !== undefined
          const isOverdue = !t.done && !!t.due_date && t.due_date < today

          return (
            <div
              key={t.id}
              className={`rounded-lg overflow-hidden transition-all ${t.done ? 'opacity-70' : ''}`}
              style={{ background: 'hsl(var(--c-surface-1))', border: `1px solid hsl(var(--c-inner-border))` }}
            >
              {/* Header row */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 group">
                <button
                  onClick={() => toggleTask.mutate({ id: t.id, done: !t.done, completed_notes: draft.completed_notes })}
                  className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                >
                  {t.done
                    ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                    : <Circle className="h-4 w-4" />}
                </button>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(t.id)}>
                  <p className={`text-sm leading-snug ${t.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {t.due_date && (
                      <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                        <Clock className="h-2.5 w-2.5" />{formatDate(t.due_date)}{isOverdue ? ' · vencida' : ''}
                      </span>
                    )}
                    {t.responsible_username && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <UserCheck className="h-2.5 w-2.5" />{t.responsible_username}
                      </span>
                    )}
                    {t.notes && !isExpanded && (
                      <span className="text-[10px] text-muted-foreground/60 italic truncate max-w-[180px]">{t.notes}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleExpand(t.id)}
                    className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar tarea?')) deleteTask.mutate(t.id) }}
                    className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
                  {/* Notes */}
                  <div className="pt-2.5 space-y-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Descripción</label>
                      <Textarea
                        placeholder="Qué implica esta tarea, contexto, referencias..."
                        value={draft.notes}
                        onChange={(e) => setDraft(t.id, 'notes', e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Notas de cierre {t.done ? '' : '(opcional, al completar)'}
                      </label>
                      <Textarea
                        placeholder="Qué pasó, cómo se resolvió, resultado final..."
                        value={draft.completed_notes}
                        onChange={(e) => setDraft(t.id, 'completed_notes', e.target.value)}
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                    {hasDraft && (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => setDraftNotes((prev) => { const n = { ...prev }; delete n[t.id]; return n })}>
                          Cancelar
                        </Button>
                        <Button size="sm" className="h-7 text-xs" disabled={saveNotes.isPending}
                          onClick={() => saveNotes.mutate({ id: t.id, notes: draft.notes, completed_notes: draft.completed_notes })}>
                          Guardar notas
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Documents: guide + evidence */}
                  <div
                    className="grid grid-cols-2 gap-3 rounded-lg p-3"
                    style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--c-inner-border))' }}
                  >
                    <TaskDocSection taskId={t.id} role="guide" label="Documento guía" labelColor="text-blue-400" />
                    <TaskDocSection taskId={t.id} role="evidence" label="Evidencia" labelColor="text-green-400" />
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {!tasks.length && (
          <p className="text-center text-muted-foreground text-sm py-6">Sin tareas. Crea una arriba.</p>
        )}
      </div>
    </div>
  )
}

// ── Main Panel ───────────────────────────────────────────────────────────────

interface CaseDetailPanelProps {
  kase: Case
  onClose: () => void
}

export default function CaseDetailPanel({ kase, onClose }: CaseDetailPanelProps) {
  const [tab, setTab] = useState<Tab>('sessions')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'sessions', label: 'Sesiones', icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'documents', label: 'Documentos', icon: <Paperclip className="h-4 w-4" /> },
    { id: 'tasks', label: 'Tareas', icon: <CheckSquare className="h-4 w-4" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'hsl(var(--c-overlay))', backdropFilter: 'blur(4px)' }} onClick={onClose}>
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
                to={`/clients`}
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
            {kase.service_area && (
              <span className="px-2 py-0.5 rounded border text-muted-foreground border-border/50 bg-muted/20">{kase.service_area}</span>
            )}
            {kase.product_name && (
              <span className="px-2 py-0.5 rounded border text-purple-300 border-purple-500/30 bg-purple-500/10">{kase.product_name}</span>
            )}
            <span className="px-2 py-0.5 rounded border text-muted-foreground border-border/50 bg-muted/20 flex items-center gap-1">
              <CalendarDays className="h-2.5 w-2.5" />
              {formatDate(kase.opened_at)}
            </span>
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
            {tabs.map((t) => (
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

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'sessions' && <SessionsTab kase={kase} />}
          {tab === 'documents' && <DocumentsTab kase={kase} />}
          {tab === 'tasks' && <TasksTab kase={kase} />}
        </div>
      </div>
    </div>
  )
}
