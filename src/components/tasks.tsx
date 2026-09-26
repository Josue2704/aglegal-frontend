import { FormGuidance } from '@/components/FormGuidance'
import { WorkflowHistory } from '@/components/WorkflowHistory'
// Tareas: un solo formulario y una sola fila para todas las pantallas (página Tareas y
// pestaña Tareas del expediente) — antes cada una tenía su propia versión con distintas
// capacidades (una permitía adjuntos y monto adicional, la otra reasignar responsable).
import { useId, useRef, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, ChevronDown, Circle, Clock, Download, FileText, Trash2, Upload, User as UserIcon, X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Attachment, CaseTask, CaseTaskIn } from '@/types'
import { casesApi } from '@/api/cases'
import { attachmentsApi } from '@/api/attachments'
import { usersApi } from '@/api/users'
import { finanzasApi } from '@/api/finanzas'
import { catalogoApi } from '@/api/catalogo'
import { EtiquetaChip } from '@/components/TaskBoard'
import { TaskCierreDialog } from '@/components/TaskCierreDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate, today } from '@/lib/utils'

type ApiError = { response?: { data?: { detail?: string } } }

export function invalidateTasks(qc: QueryClient, caseId?: number) {
  qc.invalidateQueries({ queryKey: ['workflow-history'] })
  qc.invalidateQueries({ queryKey: ['all-tasks'] })
  qc.invalidateQueries({ queryKey: ['case-tasks'] })
  qc.invalidateQueries({ queryKey: ['cases'] })
  qc.invalidateQueries({ queryKey: ['dashboard-alerts'] })
  if (caseId) qc.invalidateQueries({ queryKey: ['case-honorarios-log', caseId] })
}

function useActiveUsers() {
  const { data: users = [] } = useQuery({ queryKey: ['assignment-users'], queryFn: usersApi.choices, retry: false })
  return users
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return '📄'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xls', 'xlsx'].includes(ext)) return '📊'
  return '📎'
}

const LBL = 'text-[10px] font-medium text-muted-foreground uppercase tracking-wider'

/** Las etiquetas del tablero: se eligen marcándolas, como en Trello. */
export function EtiquetaPicker({ seleccionadas, onChange }: {
  seleccionadas: number[]; onChange: (ids: number[]) => void
}) {
  const { data: etiquetas = [] } = useQuery({ queryKey: ['etiquetas-tarea'], queryFn: catalogoApi.listEtiquetas })
  if (!etiquetas.length) return null
  return (
    <div className="space-y-1">
      <label className={LBL}>Etiquetas</label>
      <div className="flex flex-wrap gap-1.5">
        {etiquetas.map((e) => {
          const activa = seleccionadas.includes(e.id)
          return (
            <EtiquetaChip key={e.id} etiqueta={e} activa={activa}
              onClick={() => onChange(activa ? seleccionadas.filter((x) => x !== e.id) : [...seleccionadas, e.id])} />
          )
        })}
      </div>
    </div>
  )
}

/** Quiénes más trabajan la tarea, además del responsable que responde por ella. */
export function AsignadosPicker({ responsable, seleccionados, onChange }: {
  responsable: string; seleccionados: string[]; onChange: (usuarios: string[]) => void
}) {
  const users = useActiveUsers()
  const labelId = useId()
  const otros = users.filter((u) => u.username !== responsable)
  const elegidos = seleccionados.filter((u) => u !== responsable)
  const nombres = elegidos.map((username) => users.find((u) => u.username === username)?.full_name || username)
  if (!otros.length && !elegidos.length) return null
  return (
    <div className="space-y-1 min-w-0">
      <label id={labelId} className={LBL}>Trabajan con el responsable</label>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button type="button" aria-labelledby={labelId}
            className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="truncate" title={nombres.join(', ')}>
              {nombres.length === 0 ? 'Seleccionar colaboradores...' : nombres.length === 1 ? nombres[0] : `${nombres.length} colaboradores seleccionados`}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="start" sideOffset={4} collisionPadding={16}
            className="z-[60] w-[var(--radix-dropdown-menu-trigger-width)] max-w-[calc(100vw-2rem)] max-h-[min(18rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
            <DropdownMenu.Item onSelect={(e) => { e.preventDefault(); onChange(Array.from(new Set([...elegidos, ...otros.map((u) => u.username)]))) }}
              className="cursor-pointer rounded px-2 py-2 text-xs outline-none focus:bg-accent">Seleccionar todos</DropdownMenu.Item>
            <DropdownMenu.Item disabled={!elegidos.length} onSelect={(e) => { e.preventDefault(); onChange([]) }}
              className="cursor-pointer rounded px-2 py-2 text-xs outline-none focus:bg-accent data-[disabled]:opacity-40">Quitar selección</DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-border" />
            {otros.map((u) => (
              <DropdownMenu.CheckboxItem key={u.username} checked={elegidos.includes(u.username)}
                textValue={u.full_name || u.username}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => onChange(checked ? [...elegidos, u.username] : elegidos.filter((x) => x !== u.username))}
                className="relative cursor-pointer rounded py-2 pl-8 pr-2 text-sm outline-none focus:bg-accent">
                <DropdownMenu.ItemIndicator className="absolute left-2 top-2.5"><CheckCircle2 className="h-4 w-4" /></DropdownMenu.ItemIndicator>
                <span className="break-words">{u.full_name || u.username}</span>
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

/** Cuentas de egreso: el costo de una diligencia se clasifica igual que cualquier gasto. */
function CuentaCostoSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: cuentas = [] } = useQuery({
    queryKey: ['finanzas-cuentas', 'Egreso'],
    queryFn: () => finanzasApi.listCuentas({ tipo: 'Egreso', estado: 'Activo' }),
  })
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Cuenta del gasto..." /></SelectTrigger>
      <SelectContent>
        {cuentas.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.account_code} — {c.nombre}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** Los tres montos de una tarea, que antes vivían en uno solo: lo que se le cobra al
 *  cliente (sube honorarios y va a la factura), lo que nos costó (costo directo del
 *  expediente) y si ese costo se le recupera al cliente. */
function DineroTarea({ valores, onChange }: {
  valores: { monto: string; autorizado: string; costo: string; cuenta: string; reembolsable: boolean; anticipado: boolean }
  onChange: (v: Partial<{ monto: string; autorizado: string; costo: string; cuenta: string; reembolsable: boolean; anticipado: boolean }>) => void
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
        <p className="text-xs font-semibold">Se le cobra al cliente</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={LBL}>Honorario adicional ($)</label>
            <Input type="number" step="0.01" min="0" className="h-8 text-sm" placeholder="0.00"
              value={valores.monto} onChange={(e) => onChange({ monto: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={LBL}>Autorizado por {Number(valores.monto) > 0 && <span className="text-destructive">*</span>}</label>
            <Input className="h-8 text-sm" placeholder="Cliente, socio..."
              value={valores.autorizado} onChange={(e) => onChange({ autorizado: e.target.value })} />
          </div>
        </div>
        {Number(valores.monto) > 0 && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={valores.anticipado} onChange={(e) => onChange({ anticipado: e.target.checked })} />
            Se acordó facturar antes de terminar la tarea
          </label>
        )}
        <p className="text-[11px] text-muted-foreground">Sin honorario adicional, la tarea se considera incluida. Los extras se facturan al completarla, salvo cobro anticipado acordado.</p>
        {Number(valores.monto) > 0 && (
          <p className="text-[11px] text-amber-600">
            Sube {formatCurrency(Number(valores.monto))} los honorarios del expediente y queda en la bitácora con la fecha de hoy.
          </p>
        )}
      </div>

      <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
        <p className="text-xs font-semibold">Gasto real ya realizado</p>
        <p className="text-[11px] text-muted-foreground">Déjalo en cero si todavía no has realizado un gasto. Puedes registrarlo al cerrar la tarea.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className={LBL}>Costo ($)</label>
            <Input type="number" step="0.01" min="0" className="h-8 text-sm" placeholder="0.00"
              value={valores.costo} onChange={(e) => onChange({ costo: e.target.value })} />
          </div>
          {Number(valores.costo) > 0 && (
            <div className="space-y-1 min-w-0">
              <label className={LBL}>Cuenta del gasto <span className="text-destructive">*</span></label>
              <CuentaCostoSelect value={valores.cuenta} onChange={(v) => onChange({ cuenta: v })} />
            </div>
          )}
        </div>
        {Number(valores.costo) > 0 && (
          <>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" className="h-3.5 w-3.5" checked={valores.reembolsable}
                onChange={(e) => onChange({ reembolsable: e.target.checked })} />
              <span>Es reembolsable: se le recupera al cliente</span>
            </label>
            <p className="text-[11px] text-muted-foreground">
              La cuenta clasifica este gasto real. Se registra como costo directo del expediente en Flujo de caja{valores.reembolsable ? ', sin restar utilidad por ser reembolsable' : ' y baja la utilidad del caso'}.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Formulario de nueva tarea ────────────────────────────────────────────────

export function TaskForm({ caseId, onDone, scrollable = false }: { caseId?: number; onDone: () => void; scrollable?: boolean }) {
  const qc = useQueryClient()
  const users = useActiveUsers()
  const [selectedCase, setSelectedCase] = useState(caseId ? String(caseId) : '')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [notes, setNotes] = useState('')
  const [responsible, setResponsible] = useState('')
  const [critico, setCritico] = useState(false)
  const [dinero, setDinero] = useState({ monto: '', autorizado: '', costo: '', cuenta: '', reembolsable: false, anticipado: false })
  const [costoEstimado, setCostoEstimado] = useState('')
  const [asignados, setAsignados] = useState<string[]>([])
  const [etiquetaIds, setEtiquetaIds] = useState<number[]>([])
  const [guideFile, setGuideFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: caseChoices = [] } = useQuery({
    queryKey: ['case-choices'], queryFn: () => casesApi.choices(), enabled: !caseId,
  })

  const create = useMutation({
    mutationFn: async (data: CaseTaskIn) => {
      const task = await casesApi.createTask(Number(selectedCase), data)
      if (guideFile) {
        try { await attachmentsApi.upload('case_task', task.id, guideFile, 'guide') }
        catch { toast.warning('La tarea se creó, pero el documento no se pudo subir. Adjunta el archivo desde la tarea; no hace falta crearla de nuevo.') }
      }
      return task
    },
    onSuccess: () => {
      invalidateTasks(qc, Number(selectedCase))
      qc.invalidateQueries({ queryKey: ['case-attachments'] })
      toast.success('Tarea creada')
      onDone()
    },
    onError: (e: ApiError) => toast.error(e.response?.data?.detail ?? 'Error al crear la tarea'),
  })

  function submit() {
    if (!selectedCase) return toast.error('Selecciona el expediente')
    if (!title.trim()) return toast.error('El título es requerido')
    if (Number(dinero.monto) > 0 && !dinero.autorizado.trim()) return toast.error('Indica quién autorizó el cobro adicional')
    if (Number(dinero.costo) > 0 && !dinero.cuenta) return toast.error('Indica la cuenta contable del costo')
    create.mutate({
      title: title.trim(),
      due_date: due || null,
      notes: notes || null,
      responsible_username: responsible || undefined,
      es_critico: critico,
      monto_adicional: dinero.monto ? Number(dinero.monto) : undefined,
      autorizado_por: dinero.autorizado,
      costo_real: dinero.costo ? Number(dinero.costo) : undefined,
      costo_account_id: dinero.cuenta ? Number(dinero.cuenta) : null,
      costo_es_reembolsable: dinero.reembolsable,
      cobro_anticipado: dinero.anticipado,
      costo_estimado: costoEstimado ? Number(costoEstimado) : undefined,
      asignados,
      etiqueta_ids: etiquetaIds,
    })
  }

  return (
    <div className={scrollable ? "flex min-h-0 flex-col overflow-hidden" : "space-y-3"}>
      <div className={`space-y-3 ${scrollable ? "min-h-0 overflow-y-auto overscroll-contain px-1 pb-3" : ""}`}>
      <FormGuidance required="Expediente y título. Si registras un costo real, cuenta de egreso; si cobras un extra, quién lo autorizó." optional="Descripción, responsable, fecha, colaboradores, etiquetas y documento guía. Costos y cobros vacíos equivalen a cero." missing={[!selectedCase && 'expediente', !title.trim() && 'título', Number(dinero.costo)>0 && !dinero.cuenta && 'cuenta del costo', Number(dinero.monto)>0 && !dinero.autorizado.trim() && 'autorización del extra']} recommended={[!responsible && 'responsable', !due && 'fecha de vencimiento']} />
      {!caseId && (
        <div className="space-y-1">
          <label className={LBL}>Expediente *</label>
          <Select value={selectedCase} onValueChange={setSelectedCase}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar expediente..." /></SelectTrigger>
            <SelectContent>{caseChoices.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <label className={LBL}>Título *</label>
        <Input className="h-8 text-sm" placeholder="Describe la tarea..." value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={LBL}>Fecha de vencimiento</label>
          <Input type="date" className="h-8 text-sm" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className={LBL}>Responsable</label>
          <Select value={responsible || '__sin_asignar__'} onValueChange={(v) => {
            const next = v === '__sin_asignar__' ? '' : v
            setResponsible(next)
            setAsignados((prev) => prev.filter((u) => u !== next))
          }}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__sin_asignar__">Sin asignar</SelectItem>
              {users.map((u) => <SelectItem key={u.username} value={u.username}>{u.full_name || u.username}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <label className={LBL}>Descripción (opcional)</label>
        <Textarea className="text-sm resize-none" rows={2} placeholder="Contexto, instrucciones, referencias..."
          value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer select-none rounded-lg px-2.5 py-2"
        style={{ background: critico ? 'hsl(0 70% 55% / 0.1)' : 'transparent', border: `1px solid ${critico ? 'hsl(0 70% 55% / 0.3)' : 'hsl(var(--c-inner-border))'}` }}>
        <input type="checkbox" checked={critico} onChange={(e) => setCritico(e.target.checked)} className="h-3.5 w-3.5" />
        <AlertTriangle className={`h-3.5 w-3.5 ${critico ? 'text-destructive' : 'text-muted-foreground'}`} />
        <span className={critico ? 'font-medium text-destructive' : 'text-muted-foreground'}>Plazo legal crítico (prescripción, término procesal...)</span>
      </label>
      <AsignadosPicker responsable={responsible} seleccionados={asignados} onChange={setAsignados} />
      <EtiquetaPicker seleccionadas={etiquetaIds} onChange={setEtiquetaIds} />

      <details className="group/finanzas rounded-lg border border-input p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
          <span>Costos y cobros <span className="font-normal text-muted-foreground">(opcional)</span></span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open/finanzas:rotate-180" />
        </summary>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {Number(dinero.costo) > 0 || Number(dinero.monto) > 0 || Number(costoEstimado) > 0
            ? `Estimado: ${formatCurrency(Number(costoEstimado) || 0)} · Gasto: ${formatCurrency(Number(dinero.costo) || 0)} · Cobro: ${formatCurrency(Number(dinero.monto) || 0)}`
            : 'No necesitas una cuenta de gasto para crear la tarea ni para indicar un estimado.'}
        </p>
        <div className="mt-3 space-y-3">
          <div className="space-y-1">
            <label className={LBL}>Costo estimado ($)</label>
            <Input type="number" step="0.01" min="0" className="h-8 text-sm" placeholder="0.00"
              value={costoEstimado} onChange={(e) => setCostoEstimado(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Lo que se calcula que va a costar. Al cerrarla se compara con el real.</p>
          </div>
          <DineroTarea valores={dinero} onChange={(v) => setDinero((p) => ({ ...p, ...v }))} />
        </div>
      </details>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={`${LBL} flex items-center gap-1`}><FileText className="h-3 w-3 text-blue-400" />Documento guía</label>
          <input ref={fileRef} type="file" className="hidden" onChange={(e) => setGuideFile(e.target.files?.[0] ?? null)} />
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex-1 h-8 inline-flex items-center gap-1.5 px-2 rounded-md text-xs border text-muted-foreground hover:text-foreground truncate"
              style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
              <Upload className="h-3 w-3 shrink-0" /><span className="truncate">{guideFile ? guideFile.name : 'Adjuntar...'}</span>
            </button>
            {guideFile && (
              <button type="button" className="text-muted-foreground hover:text-destructive"
                onClick={() => { setGuideFile(null); if (fileRef.current) fileRef.current.value = '' }}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t bg-background pt-3">
        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={onDone}>Cancelar</Button>
        <Button type="button" size="sm" className="h-8 text-xs" disabled={create.isPending} onClick={submit}>
          {create.isPending ? 'Guardando...' : 'Crear tarea'}
        </Button>
      </div>
    </div>
  )
}

// ── Documentos de una tarea (guía / evidencia) ──────────────────────────────

function TaskDocSection({ taskId, role, label, labelColor }: {
  taskId: number; role: 'guide' | 'evidence'; label: string; labelColor: string
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
      for (const f of Array.from(files)) await attachmentsApi.upload('case_task', taskId, f, role)
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
        <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50">
          <Upload className="h-2.5 w-2.5" />{uploading ? 'Subiendo...' : 'Subir'}
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
                <button onClick={() => attachmentsApi.download(a.id, a.original_name)}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-primary/10 hover:text-primary text-muted-foreground">
                  <Download className="h-2.5 w-2.5" />
                </button>
                <button onClick={() => { if (confirm('¿Eliminar?')) deleteDoc.mutate(a.id) }}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground">
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

// ── Fila de tarea (mismas acciones en todas las pantallas) ──────────────────

export function TaskItem({ task, caseLink, defaultExpanded = false }: {
  task: CaseTask
  /** En la vista global, muestra a qué expediente pertenece y enlaza a él. */
  caseLink?: { title: string; clientName?: string | null }
  defaultExpanded?: boolean
}) {
  const qc = useQueryClient()
  const users = useActiveUsers()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [cerrando, setCerrando] = useState(false)
  const [asignados, setAsignados] = useState<string[]>(task.asignados ?? [])
  const [etiquetaIds, setEtiquetaIds] = useState<number[]>((task.etiquetas ?? []).map((e) => e.id))
  const [costoEstimado, setCostoEstimado] = useState(task.costo_estimado ? String(task.costo_estimado) : '')
  const [draft, setDraft] = useState<{ notes: string; completed_notes: string } | null>(null)
  const [dinero, setDinero] = useState({
    monto: task.monto_adicional ? String(task.monto_adicional) : '',
    autorizado: task.autorizado_por ?? '',
    costo: task.costo_real ? String(task.costo_real) : '',
    cuenta: task.costo_account_id ? String(task.costo_account_id) : '',
    reembolsable: task.costo_es_reembolsable,
    anticipado: task.cobro_anticipado ?? false,
  })
  const equipoCambiado =
    JSON.stringify([...asignados].sort()) !== JSON.stringify([...(task.asignados ?? [])].sort())
    || JSON.stringify([...etiquetaIds].sort()) !== JSON.stringify([...(task.etiquetas ?? []).map((e) => e.id)].sort())
    || (Number(costoEstimado) || 0) !== (task.costo_estimado ?? 0)
  const dineroCambiado =
    (Number(dinero.monto) || 0) !== task.monto_adicional ||
    (Number(dinero.costo) || 0) !== task.costo_real ||
    (dinero.cuenta ? Number(dinero.cuenta) : null) !== task.costo_account_id ||
    dinero.reembolsable !== task.costo_es_reembolsable ||
    dinero.anticipado !== (task.cobro_anticipado ?? false) ||
    dinero.autorizado !== (task.autorizado_por ?? '')
  const current = draft ?? { notes: task.notes ?? '', completed_notes: task.completed_notes ?? '' }
  const overdue = !task.done && !!task.due_date && task.due_date < today()
  const responsable = users.find((u) => u.username === task.responsible_username)

  const onError = (e: ApiError) => toast.error(e.response?.data?.detail ?? 'No se pudo actualizar la tarea')
  const refresh = () => invalidateTasks(qc, task.case_id)
  const toggleDone = useMutation({
    mutationFn: () => casesApi.setTaskDone(task.id, !task.done, current.completed_notes || null),
    onSuccess: refresh, onError,
  })
  const toggleCritico = useMutation({
    mutationFn: () => casesApi.setTaskCritico(task.id, !task.es_critico), onSuccess: refresh, onError,
  })
  const assign = useMutation({
    mutationFn: (username: string | null) => casesApi.setTaskResponsible(task.id, username), onSuccess: refresh, onError,
  })
  const saveNotes = useMutation({
    mutationFn: () => casesApi.updateTaskNotes(task.id, current.notes || null, current.completed_notes || null),
    onSuccess: () => { refresh(); setDraft(null); toast.success('Notas guardadas') }, onError,
  })
  const guardarDinero = useMutation({
    mutationFn: () => casesApi.updateTask(task.id, {
      title: task.title,
      due_date: task.due_date,
      notes: task.notes,
      responsible_username: task.responsible_username ?? '',
      es_critico: task.es_critico,
      monto_adicional: dinero.monto ? Number(dinero.monto) : 0,
      autorizado_por: dinero.autorizado,
      costo_real: dinero.costo ? Number(dinero.costo) : 0,
      costo_account_id: dinero.cuenta ? Number(dinero.cuenta) : null,
      costo_es_reembolsable: dinero.reembolsable,
      cobro_anticipado: dinero.anticipado,
      costo_estimado: costoEstimado ? Number(costoEstimado) : 0,
      asignados,
      etiqueta_ids: etiquetaIds,
    }),
    onSuccess: () => { refresh(); toast.success('Registrado en el expediente') }, onError,
  })
  const remove = useMutation({
    mutationFn: () => casesApi.deleteTask(task.id),
    onSuccess: () => { refresh(); toast.success('Tarea eliminada') }, onError,
  })

  return (
    <div className={`rounded-lg overflow-hidden transition-all ${task.done ? 'opacity-70' : ''}`}
      style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5 group">
        <button onClick={() => toggleDone.mutate()} disabled={toggleDone.isPending}
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          title={task.done ? 'Marcar como pendiente' : 'Marcar como hecha'}>
          {task.done ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
          <p className={`text-sm leading-snug flex items-center gap-1.5 ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {task.es_critico && (
              <span className="inline-flex items-center gap-0.5 px-1.5 rounded text-[9px] font-bold uppercase tracking-wide text-destructive"
                style={{ background: 'hsl(0 70% 55% / 0.12)', border: '1px solid hsl(0 70% 55% / 0.3)' }}>
                <AlertTriangle className="h-2.5 w-2.5" />Crítico
              </span>
            )}
            <span className="truncate">{task.title}</span>
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[10px] text-muted-foreground">
            {caseLink && (
              <Link to={`/cases?case_id=${task.case_id}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary truncate max-w-[220px]">
                {caseLink.title}{caseLink.clientName ? ` · ${caseLink.clientName}` : ''}
              </Link>
            )}
            {task.due_date && (
              <span className={`flex items-center gap-0.5 ${overdue ? 'text-red-400 font-medium' : ''}`}>
                <Clock className="h-2.5 w-2.5" />{formatDate(task.due_date)}{overdue ? ' · vencida' : ''}
              </span>
            )}
            {task.monto_adicional > 0 && (
              <span className="text-amber-600" title="Honorario adicional cobrado al cliente">+{formatCurrency(task.monto_adicional)}</span>
            )}
            {task.costo_real > 0 && (
              <span className={task.costo_es_reembolsable ? 'text-blue-400' : 'text-red-400'}
                title={task.costo_es_reembolsable ? 'Costo reembolsable: se recupera del cliente' : 'Costo directo del expediente'}>
                −{formatCurrency(task.costo_real)}
              </span>
            )}
            {(task.etiquetas ?? []).map((e) => <EtiquetaChip key={e.id} etiqueta={e} />)}
            {task.costo_estimado > 0 && !task.done && (
              <span className="text-muted-foreground" title="Costo estimado">est. {formatCurrency(task.costo_estimado)}</span>
            )}
            {task.done && task.completed_at && (
              <span className="text-green-600">hecha {formatDate(task.completed_at)}</span>
            )}
            {task.notes && !expanded && <span className="italic truncate max-w-[180px] opacity-70">{task.notes}</span>}
          </div>
        </div>

        <Select value={task.responsible_username ?? '__sin_asignar__'} onValueChange={(v) => assign.mutate(v === '__sin_asignar__' ? null : v)}>
          <SelectTrigger className="h-6 text-[11px] px-2 gap-1 border-none shadow-none bg-transparent hover:bg-muted/50 w-auto max-w-[140px]" title="Responsable">
            <UserIcon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className={`truncate ${task.responsible_username ? '' : 'text-muted-foreground'}`}>
              {responsable?.full_name || task.responsible_username || 'Sin asignar'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__sin_asignar__">Sin asignar</SelectItem>
            {users.map((u) => <SelectItem key={u.username} value={u.username}>{u.full_name || u.username}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-0.5">
          <button onClick={() => setExpanded((v) => !v)} title="Detalle, notas y documentos"
            className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">
            <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {/* Una tarea ya cobrada no se borra: dejaría a la factura cobrando algo inexistente. */}
          <button onClick={() => {
            if (task.invoice_id) return toast.error('Esta tarea ya está facturada. Quítala de la factura o cancélala antes de borrarla.')
            if (confirm('¿Eliminar tarea?')) remove.mutate()
          }}
            title={task.invoice_id ? 'Ya facturada — no se puede eliminar' : 'Eliminar'}
            className={`h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground transition-opacity ${
              task.invoice_id ? 'opacity-30 cursor-not-allowed' : 'hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100'}`}>
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
          <WorkflowHistory path={`/cases/tasks/${task.id}/historial`}/>
          <div className="pt-2.5">
            <button type="button" onClick={() => toggleCritico.mutate()}
              className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md transition-colors"
              style={task.es_critico
                ? { color: 'hsl(0 70% 55%)', background: 'hsl(0 70% 55% / 0.1)', border: '1px solid hsl(0 70% 55% / 0.3)' }
                : { color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--c-inner-border))' }}>
              <AlertTriangle className="h-3 w-3" />
              {task.es_critico ? 'Quitar plazo crítico' : 'Marcar como plazo legal crítico'}
            </button>
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <label className={LBL}>Descripción</label>
              <Textarea rows={2} className="text-sm resize-none" placeholder="Qué implica esta tarea, contexto, referencias..."
                value={current.notes} onChange={(e) => setDraft({ ...current, notes: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={LBL}>Resultado de cierre (obligatorio al completar)</label>
              <Textarea rows={2} className="text-sm resize-none" placeholder="Qué pasó, cómo se resolvió, resultado final..."
                value={current.completed_notes} onChange={(e) => setDraft({ ...current, completed_notes: e.target.value })} />
            </div>
            {draft && (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDraft(null)}>Cancelar</Button>
                <Button size="sm" className="h-7 text-xs" disabled={saveNotes.isPending} onClick={() => saveNotes.mutate()}>Guardar notas</Button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={LBL}>Costo estimado ($)</label>
              <Input type="number" step="0.01" min="0" className="h-8 text-sm" placeholder="0.00"
                value={costoEstimado} onChange={(e) => setCostoEstimado(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={LBL}>Estado en el tablero</label>
              <p className="h-8 flex items-center text-sm text-muted-foreground">{task.estado}</p>
            </div>
          </div>
          <AsignadosPicker responsable={task.responsible_username ?? ''} seleccionados={asignados} onChange={setAsignados} />
          <EtiquetaPicker seleccionadas={etiquetaIds} onChange={setEtiquetaIds} />

          {task.invoice_id ? (
            <div className="rounded-lg p-3 text-xs" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
              Esta tarea está reservada o facturada: su monto no se puede cambiar desde aquí.
              Corrige la factura si el cobro cambió.
            </div>
          ) : (
            <DineroTarea valores={dinero} onChange={(v) => setDinero((p) => ({ ...p, ...v }))} />
          )}
          {(dineroCambiado || equipoCambiado) && !task.invoice_id && (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDinero({
                monto: task.monto_adicional ? String(task.monto_adicional) : '',
                autorizado: task.autorizado_por ?? '',
                costo: task.costo_real ? String(task.costo_real) : '',
                cuenta: task.costo_account_id ? String(task.costo_account_id) : '',
                reembolsable: task.costo_es_reembolsable,
    anticipado: task.cobro_anticipado ?? false,
              })}>Cancelar</Button>
              <Button size="sm" className="h-7 text-xs" disabled={guardarDinero.isPending}
                onClick={() => {
                  if (Number(dinero.monto) > 0 && !dinero.autorizado.trim()) return toast.error('Indica quién autorizó el cobro adicional')
                  if (Number(dinero.costo) > 0 && !dinero.cuenta) return toast.error('Indica la cuenta contable del costo')
                  guardarDinero.mutate()
                }}>
                Guardar montos
              </Button>
            </div>
          )}

          {!task.done && (
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCerrando(true)}>
                Cerrar tarea con resultado
              </Button>
            </div>
          )}
          <TaskCierreDialog tarea={cerrando ? task : null} onClose={() => { setCerrando(false); refresh() }} />

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span>Estimada: {task.due_date ? formatDate(task.due_date) : 'sin fecha'}</span>
            <span>Real: {task.completed_at ? formatDate(task.completed_at) : 'pendiente'}</span>
            {task.completed_by && <span>Cerrada por {task.completed_by}</span>}
            {task.fecha_autorizacion && <span>Cobro autorizado {formatDate(task.fecha_autorizacion)}</span>}
            {task.invoice_id && <span className="text-green-600">En factura</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg p-3"
            style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--c-inner-border))' }}>
            <TaskDocSection taskId={task.id} role="guide" label="Documento guía" labelColor="text-blue-400" />
            <TaskDocSection taskId={task.id} role="evidence" label="Evidencia" labelColor="text-green-400" />
          </div>
        </div>
      )}
    </div>
  )
}
