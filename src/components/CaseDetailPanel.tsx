import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X, CheckSquare, Plus, Trash2, Upload, Download, FileText,
  CalendarDays, Clock, CheckCircle2, Circle, Paperclip, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import type { Case, CaseTask, CaseTaskIn, Session, CaseAttachment } from '@/types'
import { casesApi } from '@/api/cases'
import { attachmentsApi } from '@/api/attachments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

function SessionsTab({ kase }: { kase: Case }) {
  const { data: sessions = [], isLoading } = useQuery<Session[]>({
    queryKey: ['case-sessions', kase.id],
    queryFn: () => casesApi.listSessions(kase.id),
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
          {/* Segmented bar */}
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

      {/* Add session link */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">{total} sesión{total !== 1 ? 'es' : ''}</h3>
        <Link
          to={`/sessions?client_id=${kase.client_id}&client_name=${encodeURIComponent(kase.client_name ?? '')}&case_id=${kase.id}`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)' }}
        >
          <Plus className="h-3 w-3" /> Nueva sesión
        </Link>
      </div>

      {/* Timeline */}
      {sessions.length === 0 ? (
        <div className="py-8 text-center">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No hay sesiones para este expediente</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-px" style={{ background: 'hsl(var(--c-timeline-line))' }} />
          <div className="space-y-3 pl-8">
            {sessions.map((s) => (
              <div key={s.id} className="relative">
                {/* Dot */}
                <span className={`absolute -left-5 top-2 h-2.5 w-2.5 rounded-full border-2 border-card ${STATUS_DOT[s.status] ?? 'bg-muted'}`} />
                <div
                  className="rounded-xl p-3 transition-all"
                  style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{s.consult_type}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${STATUS_BADGE[s.status] ?? ''}`}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(s.session_date)}
                        {s.notes && <span className="ml-2 text-muted-foreground/70">— {s.notes}</span>}
                      </p>
                    </div>
                    <Link
                      to={`/sessions?client_id=${kase.client_id}&client_name=${encodeURIComponent(kase.client_name ?? '')}`}
                      className="shrink-0 text-muted-foreground/50 hover:text-primary transition-colors"
                      title="Ver en agenda"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
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

  const bySession: Record<string, CaseAttachment[]> = {}
  for (const d of sessionDocs) {
    const key = `${d.session_date ?? '?'} — ${d.session_type ?? 'Sesión'}`
    if (!bySession[key]) bySession[key] = []
    bySession[key].push(d)
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

      {attachments.length === 0 && (
        <div className="py-8 text-center">
          <Paperclip className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No hay documentos adjuntos</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Sube archivos al expediente o a sus sesiones</p>
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
        <a
          href={`${attachmentsApi.downloadUrl(attach.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-primary/10 hover:text-primary transition-colors"
          title="Descargar"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
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
  const qc = useQueryClient()
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')

  const { data: tasks = [] } = useQuery<CaseTask[]>({
    queryKey: ['case-tasks', kase.id],
    queryFn: () => casesApi.listTasks(kase.id),
  })

  const createTask = useMutation({
    mutationFn: (data: CaseTaskIn) => casesApi.createTask(kase.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['case-tasks', kase.id] }); setNewTitle(''); setNewDue('') },
  })

  const toggleTask = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => casesApi.setTaskDone(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-tasks', kase.id] }),
  })

  const deleteTask = useMutation({
    mutationFn: (id: number) => casesApi.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['case-tasks', kase.id] }),
  })

  const done = tasks.filter((t) => t.done).length

  return (
    <div className="space-y-4">
      {tasks.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--c-table-border-h))' }}>
            <div className="h-full bg-green-500 transition-all" style={{ width: `${(done / tasks.length) * 100}%` }} />
          </div>
          <span className="text-xs">{done}/{tasks.length}</span>
        </div>
      )}

      {/* Add task */}
      <div className="flex gap-2">
        <Input
          placeholder="Nueva tarea..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newTitle.trim()) createTask.mutate({ title: newTitle.trim(), due_date: newDue || null }) }}
          className="flex-1 h-8 text-sm"
        />
        <Input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="w-36 h-8 text-sm" />
        <Button size="sm" className="h-8" disabled={!newTitle.trim()} onClick={() => createTask.mutate({ title: newTitle.trim(), due_date: newDue || null })}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Task list */}
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all ${t.done ? 'opacity-60' : ''}`}
            style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
          >
            <button
              onClick={() => toggleTask.mutate({ id: t.id, done: !t.done })}
              className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
            >
              {t.done ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${t.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title}</p>
              {t.due_date && (
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />{formatDate(t.due_date)}
                </p>
              )}
            </div>
            <button
              onClick={() => deleteTask.mutate(t.id)}
              className="h-6 w-6 inline-flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {!tasks.length && (
          <p className="text-center text-muted-foreground text-sm py-6">Sin tareas</p>
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
