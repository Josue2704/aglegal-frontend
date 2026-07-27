import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Search, CalendarDays, X, LayoutList } from 'lucide-react'
import { toast } from 'sonner'
import { casesApi } from '@/api/cases'
import { clientsApi } from '@/api/clients'
import { catalogoApi } from '@/api/catalogo'
import { usersApi } from '@/api/users'
import { finanzasApi } from '@/api/finanzas'
import { comisionesApi } from '@/api/comisiones'
import type { Case, CaseIn, CaseUpdate, CaseEstadoCobro, TipoOrigen } from '@/types'
import { TIPO_ORIGEN_VALUES } from '@/types'
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
const ESTADOS_COBRO: CaseEstadoCobro[] = ['En ejecución', 'Finalizado pendiente de facturar', 'Facturado pendiente de cobro', 'Cobrado', 'Suspendido']

const PRIORITY_COLOR: Record<string, 'success' | 'warning' | 'destructive'> = { Baja: 'success', Media: 'warning', Alta: 'destructive' }
const STATUS_COLOR: Record<string, 'info' | 'warning' | 'secondary' | 'outline'> = { Abierto: 'info', 'En trámite': 'warning', 'En pausa': 'secondary', Cerrado: 'outline' }
const ESTADO_COBRO_COLOR: Record<string, 'secondary' | 'warning' | 'info' | 'success' | 'outline'> = {
  'En ejecución': 'secondary', 'Finalizado pendiente de facturar': 'warning', 'Facturado pendiente de cobro': 'info', 'Cobrado': 'success', 'Suspendido': 'outline',
}
const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

type FormData = {
  client_id: string
  title: string
  status: string
  priority: string
  opened_at: string
  notes: string
  internal_ref: string
  official_ref: string
  opposing_party: string
  court_entity: string
  responsible_username: string
  service_id: string
  honorarios_contratados: string
  costos_directos_estimados: string
  mes_cobro_esperado: string
  estado_cobro: CaseEstadoCobro
  fecha_cierre_estimada: string
  fecha_cierre_real: string
  proxima_accion: string
}

const EMPTY_FORM: FormData = {
  client_id: '', title: '', status: 'Abierto', priority: 'Media', opened_at: today(), notes: '',
  internal_ref: '', official_ref: '', opposing_party: '', court_entity: '', responsible_username: '',
  service_id: '', honorarios_contratados: '', costos_directos_estimados: '', mes_cobro_esperado: '',
  estado_cobro: 'En ejecución', fecha_cierre_estimada: '', fecha_cierre_real: '', proxima_accion: '',
}

// ─── Originadores del negocio (comisión, Fase 8) ────────────────────────────
type OriginadorRow = { personal_id: string; porcentaje_participacion: string; tipo_origen: TipoOrigen }

function OriginadoresEditor({ caseId }: { caseId: number }) {
  const qc = useQueryClient()
  const { data: personal = [] } = useQuery({ queryKey: ['finanzas-personal', 'Activo'], queryFn: () => finanzasApi.listPersonal('Activo') })
  const { data: originadores = [] } = useQuery({ queryKey: ['comisiones-originadores', caseId], queryFn: () => comisionesApi.listOriginadores(caseId) })
  const [rows, setRows] = useState<OriginadorRow[]>([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setRows(originadores.map((o) => ({ personal_id: String(o.personal_id), porcentaje_participacion: String(o.porcentaje_participacion), tipo_origen: o.tipo_origen })))
    setDirty(false)
  }, [originadores])

  const save = useMutation({
    mutationFn: () => comisionesApi.setOriginadores(
      caseId,
      rows.map((r) => ({ personal_id: Number(r.personal_id), porcentaje_participacion: Number(r.porcentaje_participacion), tipo_origen: r.tipo_origen })),
    ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comisiones-originadores', caseId] }); toast.success('Originadores guardados') },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  const total = rows.reduce((s, r) => s + (Number(r.porcentaje_participacion) || 0), 0)
  const totalOk = rows.length === 0 || Math.abs(total - 100) < 0.01

  function addRow() { setRows([...rows, { personal_id: '', porcentaje_participacion: '', tipo_origen: 'Cliente nuevo' }]); setDirty(true) }
  function removeRow(i: number) { setRows(rows.filter((_, idx) => idx !== i)); setDirty(true) }
  function updateRow(i: number, patch: Partial<OriginadorRow>) { setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r))); setDirty(true) }

  return (
    <div className="pt-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Originadores del negocio (comisión)</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 90px 150px auto' }}>
            <Select value={r.personal_id} onValueChange={(v) => updateRow(i, { personal_id: v })}>
              <SelectTrigger><SelectValue placeholder="Persona..." /></SelectTrigger>
              <SelectContent>{personal.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.persona}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="number" min="0" max="100" step="0.01" value={r.porcentaje_participacion} onChange={(e) => updateRow(i, { porcentaje_participacion: e.target.value })} placeholder="%" />
            <Select value={r.tipo_origen} onValueChange={(v) => updateRow(i, { tipo_origen: v as TipoOrigen })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPO_ORIGEN_VALUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeRow(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
        {!rows.length && <p className="text-xs text-muted-foreground">Sin originadores configurados — este expediente no generará comisión al cobrarse.</p>}
      </div>
      <div className="flex items-center justify-between mt-2">
        <Button type="button" size="sm" variant="outline" onClick={addRow}><Plus className="h-3.5 w-3.5" />Agregar originador</Button>
        <div className="flex items-center gap-2">
          {rows.length > 0 && <span className={`text-xs font-mono ${totalOk ? 'text-muted-foreground' : 'text-destructive'}`}>Total: {total.toFixed(2)}%</span>}
          <Button type="button" size="sm" disabled={!dirty || save.isPending || !totalOk} onClick={() => save.mutate()}>Guardar originadores</Button>
        </div>
      </div>
    </div>
  )
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
  const [serviceSearch, setServiceSearch] = useState('')
  const [selectedService, setSelectedService] = useState<{ id: number; service_code: string; nombre: string; category_code?: string; subcategory_code?: string } | null>(null)

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ['cases', search, statusFilter, urlClientId],
    queryFn: () => casesApi.list({ search: search || undefined, status: statusFilter !== 'Todos' ? statusFilter : undefined, client_id: urlClientId }),
  })
  const { sorted: sortedCases, sortKey, sortDir, toggle } = useSortable(cases as unknown as Record<string, unknown>[], 'opened_at', 'desc')
  const { data: clients = [] } = useQuery({ queryKey: ['client-choices'], queryFn: clientsApi.choices })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })
  const { data: allServicios = [] } = useQuery({
    queryKey: ['catalogo-servicios', 'Activo'],
    queryFn: () => catalogoApi.listServicios({ estado: 'Activo' }),
    enabled: dlg,
  })
  const serviceMatches = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase()
    if (!term) return allServicios
    return allServicios.filter((s) => s.service_code.toLowerCase().includes(term) || s.nombre.toLowerCase().includes(term))
  }, [allServicios, serviceSearch])

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

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setSelectedService(null); setServiceSearch(''); setDlg(true) }
  function openEdit(c: Case) {
    setEditing(c)
    setForm({
      client_id: String(c.client_id), title: c.title, status: c.status,
      priority: c.priority, opened_at: c.opened_at, notes: c.notes ?? '',
      internal_ref: c.internal_ref ?? '', official_ref: c.official_ref ?? '',
      opposing_party: c.opposing_party ?? '', court_entity: c.court_entity ?? '',
      responsible_username: c.responsible_username ?? '',
      service_id: c.service_id ? String(c.service_id) : '',
      honorarios_contratados: c.honorarios_contratados ? String(c.honorarios_contratados) : '',
      costos_directos_estimados: c.costos_directos_estimados ? String(c.costos_directos_estimados) : '',
      mes_cobro_esperado: c.mes_cobro_esperado ?? '',
      estado_cobro: c.estado_cobro ?? 'En ejecución',
      fecha_cierre_estimada: c.fecha_cierre_estimada ?? '',
      fecha_cierre_real: c.fecha_cierre_real ?? '',
      proxima_accion: c.proxima_accion ?? '',
    })
    setSelectedService(c.service_id && c.service_code && c.service_nombre ? { id: c.service_id, service_code: c.service_code, nombre: c.service_nombre, category_code: c.category_code ?? undefined, subcategory_code: c.subcategory_code ?? undefined } : null)
    setServiceSearch('')
    setDlg(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id || !form.title.trim()) return toast.error('Cliente y título son requeridos')
    const payload = {
      client_id: Number(form.client_id), title: form.title,
      status: form.status as CaseIn['status'], priority: form.priority as CaseIn['priority'],
      opened_at: form.opened_at, notes: form.notes,
      internal_ref: editing ? form.internal_ref : undefined, official_ref: form.official_ref,
      opposing_party: form.opposing_party, court_entity: form.court_entity,
      responsible_username: form.responsible_username,
      service_id: form.service_id ? Number(form.service_id) : null,
      honorarios_contratados: form.honorarios_contratados ? Number(form.honorarios_contratados) : null,
      costos_directos_estimados: form.costos_directos_estimados ? Number(form.costos_directos_estimados) : null,
      mes_cobro_esperado: form.mes_cobro_esperado || null,
      estado_cobro: form.estado_cobro,
      fecha_cierre_estimada: form.fecha_cierre_estimada || null,
      fecha_cierre_real: form.fecha_cierre_real || null,
      proxima_accion: form.proxima_accion,
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
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Cobro</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Saldo</th>
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
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {c.service_code ? <><span className="font-mono">{c.service_code}</span><br />{c.service_nombre}</> : '—'}
                      </td>
                      <td className="px-4 py-3"><Badge variant={ESTADO_COBRO_COLOR[c.estado_cobro] ?? 'outline'} className="text-[10px] whitespace-nowrap">{c.estado_cobro}</Badge></td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{money(c.saldo_pendiente)}</td>
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
                  {!cases.length && <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">No hay casos</td></tr>}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar expediente' : 'Nuevo expediente'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Datos generales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Título <span className="text-destructive text-xs">*</span></Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Cliente <span className="text-destructive text-xs">*</span></Label>
                <Select value={form.client_id} onValueChange={f('client_id')}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
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
              <div className="space-y-1"><Label>Fecha apertura</Label><Input type="date" value={form.opened_at} onChange={(e) => setForm({ ...form, opened_at: e.target.value })} /></div>
            </div>

            {/* Clasificación y finanzas (Catálogo Maestro) */}
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Clasificación y finanzas</p>
              <div className="space-y-1 mb-3">
                <Label>Servicio del catálogo</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="Buscar por código o nombre..." className="pl-8" />
                </div>
                {selectedService && (
                  <div className="text-xs px-2 py-1 rounded bg-muted inline-flex items-center gap-1 mt-1">
                    {selectedService.category_code && (
                      <span className="text-muted-foreground">{selectedService.category_code}{selectedService.subcategory_code ? `/${selectedService.subcategory_code}` : ''} ›</span>
                    )}
                    <span className="font-mono">{selectedService.service_code}</span> — {selectedService.nombre}
                    <button type="button" className="text-muted-foreground hover:text-foreground ml-1" onClick={() => { setSelectedService(null); setForm({ ...form, service_id: '' }) }}>×</button>
                  </div>
                )}
                {!selectedService && (
                  <div className="border rounded-md max-h-48 overflow-y-auto mt-1" style={{ borderColor: 'hsl(var(--border))' }}>
                    {serviceMatches.map((s) => (
                      <button type="button" key={s.id} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/50 flex flex-col gap-0.5"
                        onClick={() => { setSelectedService({ id: s.id, service_code: s.service_code, nombre: s.nombre, category_code: s.category_code, subcategory_code: s.subcategory_code }); setForm({ ...form, service_id: String(s.id) }); setServiceSearch('') }}>
                        <span className="flex gap-2"><span className="font-mono text-muted-foreground">{s.service_code}</span><span>{s.nombre}</span></span>
                        <span className="text-[10px] text-muted-foreground/70">{s.category_code} › {s.subcategory_code}</span>
                      </button>
                    ))}
                    {serviceMatches.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">Sin resultados</div>}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">Categoría, subcategoría y familia se completan solas a partir del servicio.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Honorarios contratados ($)</Label><Input type="number" step="0.01" min="0" value={form.honorarios_contratados} onChange={(e) => setForm({ ...form, honorarios_contratados: e.target.value })} placeholder="0.00" /></div>
                <div className="space-y-1"><Label>Costos directos estimados ($)</Label><Input type="number" step="0.01" min="0" value={form.costos_directos_estimados} onChange={(e) => setForm({ ...form, costos_directos_estimados: e.target.value })} placeholder="0.00" /></div>
                <div className="space-y-1"><Label>Mes de cobro esperado</Label><Input type="month" value={form.mes_cobro_esperado} onChange={(e) => setForm({ ...form, mes_cobro_esperado: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Estado de cobro</Label>
                  <Select value={form.estado_cobro} onValueChange={(v) => setForm({ ...form, estado_cobro: v as CaseEstadoCobro })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ESTADOS_COBRO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {editing && (
                  <div className="space-y-1">
                    <Label>Saldo pendiente</Label>
                    <Input className="font-mono bg-muted text-muted-foreground" value={money(editing.saldo_pendiente)} readOnly />
                  </div>
                )}
                {editing && (
                  <div className="space-y-1">
                    <Label>Días de duración</Label>
                    <Input className="font-mono bg-muted text-muted-foreground" value={editing.dias_duracion != null ? `${editing.dias_duracion} días` : '—'} readOnly />
                  </div>
                )}
                <div className="space-y-1"><Label>Fecha de cierre estimada</Label><Input type="date" value={form.fecha_cierre_estimada} onChange={(e) => setForm({ ...form, fecha_cierre_estimada: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Fecha de cierre real</Label>
                  <Input type="date" value={form.fecha_cierre_real} onChange={(e) => setForm({ ...form, fecha_cierre_real: e.target.value })} />
                  <p className="text-[11px] text-muted-foreground">Se completa sola al marcar el expediente como Cerrado.</p>
                </div>
                <div className="space-y-1 col-span-2"><Label>Próxima acción</Label><Input value={form.proxima_accion} onChange={(e) => setForm({ ...form, proxima_accion: e.target.value })} placeholder="Ej: enviar minuta al cliente para revisión" /></div>
              </div>
            </div>

            {editing && <OriginadoresEditor caseId={editing.id} />}

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
