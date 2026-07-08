import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Search, CalendarDays, X, LayoutList } from 'lucide-react'
import { toast } from 'sonner'
import { casesApi } from '@/api/cases'
import { clientsApi } from '@/api/clients'
import { categoriesApi } from '@/api/categories'
import { usersApi } from '@/api/users'
import type { Case, CaseIn, CaseUpdate } from '@/types'
import { useSortable } from '@/hooks/useSortable'
import { SortableTh } from '@/components/ui/sortable-th'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate, today } from '@/lib/utils'
import CaseDetailPanel from '@/components/CaseDetailPanel'

const STATUSES = ['Abierto', 'En trámite', 'En pausa', 'Cerrado'] as const
const PRIORITIES = ['Baja', 'Media', 'Alta'] as const
const SERVICE_AREAS = ['Servicios Notariales', 'Bienes Raíces e Inversiones', 'Derecho Corporativo y Empresarial', 'Derecho de Familia', 'Representación en Juicios', 'Derecho Administrativo', 'Migratorio', 'Otro']

const PRIORITY_COLOR: Record<string, 'success' | 'warning' | 'destructive'> = { Baja: 'success', Media: 'warning', Alta: 'destructive' }
const STATUS_COLOR: Record<string, 'info' | 'warning' | 'secondary' | 'outline'> = { Abierto: 'info', 'En trámite': 'warning', 'En pausa': 'secondary', Cerrado: 'outline' }

type FormData = {
  client_id: string
  service_area: string
  title: string
  status: string
  priority: string
  opened_at: string
  notes: string
  service_product_id: string
  internal_ref: string
  official_ref: string
  opposing_party: string
  court_entity: string
  responsible_username: string
}

const EMPTY_FORM: FormData = {
  client_id: '', service_area: 'Otro', title: '', status: 'Abierto', priority: 'Media', opened_at: today(), notes: '', service_product_id: '',
  internal_ref: '', official_ref: '', opposing_party: '', court_entity: '', responsible_username: '',
}

export default function Cases() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const urlClientId = searchParams.get('client_id') ? Number(searchParams.get('client_id')) : undefined
  const urlClientName = searchParams.get('client_name') ?? undefined
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Case | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [detailCase, setDetailCase] = useState<Case | null>(null)

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases', search, statusFilter, urlClientId],
    queryFn: () => casesApi.list({ search: search || undefined, status: statusFilter !== 'Todos' ? statusFilter : undefined, client_id: urlClientId }),
  })
  const { sorted: sortedCases, sortKey, sortDir, toggle } = useSortable(cases as unknown as Record<string, unknown>[], 'opened_at', 'desc')
  const { data: clients = [] } = useQuery({ queryKey: ['client-choices'], queryFn: clientsApi.choices })
  const { data: products = [] } = useQuery({
    queryKey: ['product-choices', form.service_area],
    queryFn: () => categoriesApi.productChoices(form.service_area ? { service_area: form.service_area } : undefined),
    enabled: dlg,
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const createCase = useMutation({
    mutationFn: (d: CaseIn) => casesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); toast.success('Caso creado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const updateCase = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CaseUpdate }) => casesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); toast.success('Caso actualizado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const deleteCase = useMutation({
    mutationFn: casesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cases'] }); toast.success('Caso eliminado') },
  })

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setDlg(true) }
  function openEdit(c: Case) {
    setEditing(c)
    setForm({
      client_id: String(c.client_id), service_area: c.service_area, title: c.title, status: c.status,
      priority: c.priority, opened_at: c.opened_at, notes: c.notes ?? '',
      service_product_id: c.service_product_id ? String(c.service_product_id) : '',
      internal_ref: c.internal_ref ?? '', official_ref: c.official_ref ?? '',
      opposing_party: c.opposing_party ?? '', court_entity: c.court_entity ?? '',
      responsible_username: c.responsible_username ?? '',
    })
    setDlg(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.title.trim()) return toast.error('Cliente y título son requeridos')
    const payload = {
      client_id: Number(form.client_id), service_area: form.service_area, title: form.title,
      status: form.status as CaseIn['status'], priority: form.priority as CaseIn['priority'],
      opened_at: form.opened_at, notes: form.notes,
      service_product_id: form.service_product_id ? Number(form.service_product_id) : null,
      internal_ref: editing ? form.internal_ref : undefined, official_ref: form.official_ref,
      opposing_party: form.opposing_party, court_entity: form.court_entity,
      responsible_username: form.responsible_username,
    }
    editing ? updateCase.mutate({ id: editing.id, data: payload }) : createCase.mutate(payload)
  }

  const f = (k: keyof FormData) => (v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      {/* Cross-nav banner */}
      {urlClientId && urlClientName && (
        <div
          className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
          style={{ background: 'hsl(var(--accent) / 0.08)', border: '1px solid hsl(var(--accent) / 0.2)' }}
        >
          <span className="text-foreground/80">
            Expedientes de: <strong className="text-white">{urlClientName}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Link to="/clients" className="text-xs underline text-accent hover:text-accent/80">← Volver a clientes</Link>
            <button onClick={() => setSearchParams({})} className="text-muted-foreground hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expedientes</h1>
          <p className="text-muted-foreground text-sm">{cases.length} caso{cases.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" />Nuevo expediente</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar caso..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? <p className="text-muted-foreground text-sm">Cargando...</p> : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--c-table-border-h))' }}>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">N° Interno</th>
                    <SortableTh label="Expediente" colKey="title" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <SortableTh label="Cliente" colKey="client_name" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <SortableTh label="Estado" colKey="status" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <SortableTh label="Prioridad" colKey="priority" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Servicio</th>
                    <SortableTh label="Apertura" colKey="opened_at" currentKey={sortKey as string} dir={sortDir} onSort={toggle as (k: string) => void} />
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ir a...</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {(sortedCases as unknown as Case[]).map((c) => (
                    <tr key={c.id} className="tr-hover transition-all" style={{ borderBottom: '1px solid hsl(var(--c-table-border-r))' }}>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{c.internal_ref ?? '—'}</td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <button
                          onClick={() => setDetailCase(c)}
                          className="text-left font-medium text-foreground hover:text-primary transition-colors truncate block w-full"
                          title="Ver detalle del expediente"
                        >
                          {c.title}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/clients?search=${encodeURIComponent(c.client_name ?? '')}`}
                          className="text-muted-foreground hover:text-blue-400 transition-colors text-sm"
                        >
                          {c.client_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><Badge variant={STATUS_COLOR[c.status] ?? 'outline'}>{c.status}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={PRIORITY_COLOR[c.priority] ?? 'outline'}>{c.priority}</Badge></td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{c.product_name ?? c.service_area}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.opened_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setDetailCase(c)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                            style={{ color: 'hsl(var(--accent))', background: 'hsl(var(--accent) / 0.1)', border: '1px solid hsl(var(--accent) / 0.2)' }}
                            title="Ver detalle (sesiones, docs, tareas)"
                          >
                            <LayoutList className="h-3 w-3" />Detalle
                          </button>
                          <Link
                            to={`/sessions?client_id=${c.client_id}&client_name=${encodeURIComponent(c.client_name ?? '')}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                            style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)' }}
                            title="Ver sesiones del cliente"
                          >
                            <CalendarDays className="h-3 w-3" />Agenda
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('¿Eliminar caso?')) deleteCase.mutate(c.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!cases.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No hay casos</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case Detail Panel */}
      {detailCase && (
        <CaseDetailPanel kase={detailCase} onClose={() => setDetailCase(null)} />
      )}

      {/* Form Dialog */}
      <Dialog open={dlg} onOpenChange={(o) => !o && setDlg(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar expediente' : 'Nuevo expediente'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Datos generales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Cliente *</Label>
                <Select value={form.client_id} onValueChange={f('client_id')}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Área de servicio</Label>
                <Select value={form.service_area} onValueChange={(v) => setForm((p) => ({ ...p, service_area: v, service_product_id: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SERVICE_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={f('status')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={f('priority')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Producto/Servicio</Label>
                <Select value={form.service_product_id} onValueChange={f('service_product_id')}>
                  <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ninguno</SelectItem>
                    {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Fecha apertura</Label><Input type="date" value={form.opened_at} onChange={(e) => setForm({ ...form, opened_at: e.target.value })} /></div>
            </div>

            {/* Datos judiciales / expediente */}
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Datos del expediente</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>N° expediente interno</Label>
                  {editing ? (
                    <Input className="font-mono bg-muted text-muted-foreground" value={form.internal_ref} readOnly />
                  ) : (
                    <Input className="font-mono bg-muted text-muted-foreground" value="Se genera automáticamente" readOnly />
                  )}
                </div>
                <div className="space-y-1">
                  <Label>N° expediente judicial/oficial</Label>
                  <Input placeholder="2024-000123-0183" className="font-mono" value={form.official_ref} onChange={(e) => setForm({ ...form, official_ref: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Contraparte</Label>
                  <Input placeholder="Nombre de la contraparte" value={form.opposing_party} onChange={(e) => setForm({ ...form, opposing_party: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Juzgado / Entidad</Label>
                  <Input placeholder="Juzgado Civil de..." value={form.court_entity} onChange={(e) => setForm({ ...form, court_entity: e.target.value })} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Abogado responsable</Label>
                  <Select value={form.responsible_username} onValueChange={f('responsible_username')}>
                    <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {users.filter((u) => u.active).map((u) => (
                        <SelectItem key={u.username} value={u.username}>
                          {u.full_name ? `${u.full_name} (${u.username})` : u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1"><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button>
              <Button type="submit" disabled={createCase.isPending || updateCase.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
