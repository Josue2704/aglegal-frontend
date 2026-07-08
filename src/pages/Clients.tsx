import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, Trash2, Pencil, History, CalendarDays, Briefcase,
  Download, Paperclip, User, Building2, Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { clientsApi } from '@/api/clients'
import { attachmentsApi } from '@/api/attachments'
import type { Attachment, Client, ClientIn, ClientType } from '@/types'
import { EntityAvatar } from '@/components/EntityAvatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AttachmentsDialog } from '@/components/AttachmentsDialog'
import { formatDate, exportCsv, today } from '@/lib/utils'
import { useSortable } from '@/hooks/useSortable'
import { SortableTh } from '@/components/ui/sortable-th'

// ─── Helpers ────────────────────────────────────────────────────────────────

const CLIENT_TYPES: ClientType[] = ['Física', 'Jurídica']

const EMPTY: ClientIn = {
  name: '', client_type: 'Física', id_number: '',
  phone: '', phone2: '', email: '', address: '', notes: '',
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return '📄'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️'
  if (['doc', 'docx'].includes(ext)) return '📝'
  if (['xls', 'xlsx'].includes(ext)) return '📊'
  return '📎'
}

// ─── Inline attachments (used inside edit form) ───────────────────────────

function InlineAttachments({ clientId }: { clientId: number }) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const qKey = ['attachments', 'client', clientId]

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: qKey,
    queryFn: () => attachmentsApi.list('client', clientId),
  })

  const upload = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload('client', clientId, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); toast.success('Archivo subido') },
    onError: () => toast.error('Error al subir el archivo'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => attachmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Fotos y documentos {attachments.length > 0 && `(${attachments.length})`}
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          disabled={upload.isPending}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3 w-3" />
          {upload.isPending ? 'Subiendo...' : 'Subir archivo'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.xls,.xlsx,.txt,.zip"
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach((f) => upload.mutate(f))
            e.target.value = ''
          }}
        />
      </div>

      {attachments.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-4 rounded-lg border border-dashed text-xs text-muted-foreground/60 hover:text-muted-foreground hover:border-muted-foreground/40 transition-colors"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          Haz clic para subir copia de ID, contrato, foto...
        </button>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg group text-xs"
              style={{ background: 'hsl(var(--muted)/0.5)', border: '1px solid hsl(var(--border))' }}
            >
              <span className="text-sm shrink-0">{fileIcon(a.original_name)}</span>
              <span className="flex-1 truncate text-foreground">{a.original_name}</span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  onClick={() => attachmentsApi.download(a.id, a.original_name)}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-primary/10 hover:text-primary transition-colors"
                  title="Descargar"
                >
                  <Download className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm('¿Eliminar archivo?')) remove.mutate(a.id) }}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Clients() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dlg, setDlg] = useState<'form' | 'history' | null>(null)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientIn>(EMPTY)
  const [historyId, setHistoryId] = useState<number | null>(null)
  const [docsClient, setDocsClient] = useState<Client | null>(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list(search || undefined),
  })
  const { sorted, sortKey, sortDir, toggle } = useSortable(
    clients as unknown as Record<string, unknown>[],
    'created_at',
    'desc',
  )

  const { data: history = [] } = useQuery({
    queryKey: ['client-history', historyId],
    queryFn: () => clientsApi.history(historyId!),
    enabled: !!historyId,
  })

  const create = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: (newClient) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente creado')
      setDlg(null)
      // Auto-open docs dialog so user can immediately attach files
      setDocsClient(newClient)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? 'Error al crear cliente'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClientIn }) => clientsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente actualizado')
      setDlg(null)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? 'Error al actualizar'),
  })

  const remove = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente eliminado') },
    onError: () => toast.error('No se pudo eliminar el cliente'),
  })

  function openNew() { setEditing(null); setForm(EMPTY); setDlg('form') }
  function openEdit(c: Client) {
    setEditing(c)
    setForm({
      name: c.name,
      client_type: c.client_type ?? 'Física',
      id_number: c.id_number ?? '',
      phone: c.phone ?? '',
      phone2: c.phone2 ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
    })
    setDlg('form')
  }
  function openHistory(c: Client) { setHistoryId(c.id); setDlg('history') }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    // Duplicate detection
    const others = (clients as Client[]).filter((c) => !editing || c.id !== editing.id)
    if (form.id_number?.trim()) {
      const dupId = others.find((c) => c.id_number && c.id_number.replace(/[-\s]/g, '') === form.id_number!.replace(/[-\s]/g, ''))
      if (dupId) return toast.error(`Ya existe un cliente con esa cédula/ID: ${dupId.name}`)
    }
    const dupName = others.find((c) => c.name.trim().toLowerCase() === form.name.trim().toLowerCase())
    if (dupName) {
      if (!confirm(`Ya existe un cliente con el nombre "${dupName.name}". ¿Desea continuar de todas formas?`)) return
    }
    editing ? update.mutate({ id: editing.id, data: form }) : create.mutate(form)
  }

  const f = (k: keyof ClientIn) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }))

  const isJuridica = form.client_type === 'Jurídica'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">
            {clients.length} cliente{clients.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportCsv(
                `clientes_${today()}.csv`,
                ['Nombre', 'Tipo', 'Cédula/ID', 'Teléfono', 'WhatsApp', 'Email', 'Dirección', 'Sesiones', 'Casos', 'Registro'],
                (sorted as unknown as Client[]).map((c) => [
                  c.name, c.client_type, c.id_number, c.phone, c.phone2,
                  c.email, c.address, c.session_count, c.case_count, c.created_at.slice(0, 10),
                ]),
              )
            }
          >
            <Download className="h-4 w-4" />CSV
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4" />Nuevo cliente</Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, cédula, teléfono..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--c-table-border-h))' }}>
                    <SortableTh label="Cliente" colKey="name" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Contacto</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Email</th>
                    <SortableTh label="Sesiones" colKey="session_count" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <SortableTh label="Casos" colKey="case_count" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <SortableTh label="Registro" colKey="created_at" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(sorted as unknown as Client[]).map((c) => (
                    <tr
                      key={c.id}
                      className="tr-hover transition-all"
                      style={{ borderBottom: '1px solid hsl(var(--c-table-border-r))' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <EntityAvatar
                            entityType="client"
                            entityId={c.id}
                            name={c.name}
                            size={34}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{c.name}</p>
                            {c.id_number && (
                              <p className="text-xs text-muted-foreground font-mono">{c.id_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div>
                          <p>{c.phone || '—'}</p>
                          {c.phone2 && <p className="text-xs text-muted-foreground/70">{c.phone2}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/sessions?client_id=${c.id}&client_name=${encodeURIComponent(c.name)}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all"
                          style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)' }}
                        >
                          <CalendarDays className="h-2.5 w-2.5" />{c.session_count}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/cases?client_id=${c.id}&client_name=${encodeURIComponent(c.name)}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all"
                          style={{ color: 'hsl(var(--accent))', background: 'hsl(var(--accent) / 0.1)', border: '1px solid hsl(var(--accent) / 0.2)' }}
                        >
                          <Briefcase className="h-2.5 w-2.5" />{c.case_count}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at.slice(0, 10))}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Documentos" onClick={() => setDocsClient(c)}>
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openHistory(c)}>
                            <History className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => { if (confirm('¿Eliminar cliente?')) remove.mutate(c.id) }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!clients.length && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No hay clientes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Form Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dlg === 'form'} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Avatar (solo en edición) */}
            {editing && (
              <div className="flex items-center gap-4 py-1">
                <EntityAvatar
                  entityType="client"
                  entityId={editing.id}
                  name={form.name || editing.name}
                  size={64}
                  editable
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{form.name || editing.name}</p>
                  <p className="text-xs text-muted-foreground">Haz clic en la foto para cambiarla</p>
                </div>
              </div>
            )}

            {/* Tipo + ID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={form.client_type ?? 'Física'}
                  onValueChange={(v) => setForm((p) => ({ ...p, client_type: v as ClientType }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        <div className="flex items-center gap-2">
                          {t === 'Jurídica' ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                          {t}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  {isJuridica ? 'Cédula jurídica / RFC' : 'Cédula / Pasaporte / RFC'}
                </Label>
                <Input
                  className="h-9 font-mono"
                  placeholder={isJuridica ? 'Ej: 3-101-123456' : 'Ej: 1-0234-0567'}
                  value={form.id_number ?? ''}
                  onChange={f('id_number')}
                />
              </div>
            </div>

            {/* Nombre */}
            <div className="space-y-1">
              <Label>{isJuridica ? 'Razón social' : 'Nombre completo'} <span className="text-destructive text-xs">*</span></Label>
              <Input
                value={form.name}
                onChange={f('name')}
                placeholder={isJuridica ? 'Empresa S.A. de C.V.' : 'Juan Pérez González'}
              />
            </div>

            {/* Teléfonos */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Teléfono</Label>
                <Input className="h-9" placeholder="8888-8888" value={form.phone ?? ''} onChange={f('phone')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WhatsApp / Tel. 2</Label>
                <Input className="h-9" placeholder="8888-8888" value={form.phone2 ?? ''} onChange={f('phone2')} />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                className="h-9"
                placeholder="cliente@email.com"
                value={form.email ?? ''}
                onChange={f('email')}
              />
            </div>

            {/* Dirección */}
            <div className="space-y-1">
              <Label className="text-xs">Dirección</Label>
              <Input
                className="h-9"
                placeholder="Calle, colonia, ciudad..."
                value={form.address ?? ''}
                onChange={f('address')}
              />
            </div>

            {/* Notas */}
            <div className="space-y-1">
              <Label className="text-xs">Notas internas</Label>
              <Textarea
                rows={2}
                className="resize-none text-sm"
                placeholder="Observaciones, referencias, cómo llegó..."
                value={form.notes ?? ''}
                onChange={f('notes')}
              />
            </div>

            {/* ── Adjuntos inline (solo al editar) ── */}
            {editing && (
              <>
                <div className="border-t pt-4" style={{ borderColor: 'hsl(var(--border))' }}>
                  <InlineAttachments clientId={editing.id} />
                </div>
              </>
            )}

            {/* Aviso para nuevo cliente */}
            {!editing && (
              <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
                <Paperclip className="h-3 w-3 shrink-0" />
                Después de guardar podrás adjuntar fotos e identificaciones del cliente.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDlg(null)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Documents dialog (standalone + auto-opened after create) */}
      {docsClient && (
        <AttachmentsDialog
          entityType="client"
          entityId={docsClient.id}
          label={docsClient.name}
          onClose={() => setDocsClient(null)}
        />
      )}

      {/* History Dialog */}
      <Dialog open={dlg === 'history'} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Historial del cliente</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {history.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge variant={item.type === 'Ingreso' ? 'success' : item.type === 'Caso' ? 'info' : 'secondary'}>
                  {item.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.detail}</p>
                  <p className="text-xs text-muted-foreground">{item.date ? formatDate(item.date) : '—'}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.status}</span>
              </div>
            ))}
            {!history.length && (
              <p className="text-muted-foreground text-sm text-center py-4">Sin historial</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
