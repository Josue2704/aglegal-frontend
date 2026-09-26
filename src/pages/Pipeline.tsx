import { FormGuidance } from '@/components/FormGuidance'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Megaphone, Search, ArrowRight, Trophy, XCircle, FileText, AlertTriangle, Clock, User as UserIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Link, useNavigate } from 'react-router-dom'
import { pipelineApi } from '@/api/pipeline'
import { catalogoApi } from '@/api/catalogo'
import { clientsApi } from '@/api/clients'
import { usersApi } from '@/api/users'
import type { Oportunidad, OportunidadEstado } from '@/types'
import { CANALES_CAPTACION, ORIGENES_NEGOCIO } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { HelpButton } from '@/components/HelpButton'
import { pipelineHelp } from '@/lib/helpContent'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { WorkflowHistory } from '@/components/WorkflowHistory'
import { OpeningTasks, type OpeningTask } from '@/components/OpeningTasks'
import { casesApi } from '@/api/cases'
import { useSoloMio } from '@/hooks/useSoloMio'

type ApiErr = { response?: { data?: { detail?: string } } }
const errMsg = (e: ApiErr) => e.response?.data?.detail ?? 'Ocurrió un error'

const COLUMNS: { estado: OportunidadEstado; label: string; accent: string }[] = [
  { estado: 'Prospecto', label: 'Prospecto', accent: 'hsl(210 80% 55%)' },
  { estado: 'Cotizado', label: 'Cotizado', accent: 'hsl(43 80% 55%)' },
  { estado: 'Ganado', label: 'Ganado', accent: 'hsl(142 70% 45%)' },
  { estado: 'Perdido', label: 'Perdido', accent: 'hsl(0 70% 55%)' },
]

// Una oportunidad abierta sin próximo paso se enfría sin que nadie lo note; el formulario
// propone seguimiento para dentro de tres días.
const EN_TRES_DIAS = () => new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10)

const FORM_VACIO = {
  client_id: '', prospecto_nombre: '', prospecto_contacto: '', service_id: '',
  canal_captacion: 'Referido', origen_negocio: '', honorarios_estimados: '',
  responsable_username: '', proxima_accion: '', fecha_proxima_accion: '',
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
      style={{ background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.2)', color: 'hsl(var(--muted-foreground))' }}>
      <Megaphone className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

// ─── Alta / edición de la oportunidad ────────────────────────────────────────

function OportunidadDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Oportunidad | null }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'cliente' | 'prospecto'>('prospecto')
  const [form, setForm] = useState(FORM_VACIO)
  const [serviceSearch, setServiceSearch] = useState('')

  const { data: clientes = [] } = useQuery({ queryKey: ['clientes-choices'], queryFn: clientsApi.choices })
  const { data: usuarios = [] } = useQuery({ queryKey: ['assignment-users'], queryFn: usersApi.choices, retry: false })
  const { data: servicios = [] } = useQuery({ queryKey: ['servicio-choices', serviceSearch], queryFn: () => catalogoApi.servicioChoices({ q: serviceSearch || undefined, limit: 15 }) })

  // Duplicados y conflicto de interés, consultados mientras se escribe el nombre: antes se
  // revisaba al abrir el expediente, cuando ya se había cotizado y comprometido.
  const nombreBuscado = mode === 'prospecto' ? form.prospecto_nombre.trim() : ''
  const { data: parecidos } = useQuery({
    queryKey: ['contactos-parecidos', nombreBuscado, form.prospecto_contacto],
    queryFn: () => pipelineApi.contactosParecidos(nombreBuscado, form.prospecto_contacto),
    enabled: open && nombreBuscado.length >= 3,
    staleTime: 10_000,
  })
  const hayParecidos = !!parecidos && (parecidos.clientes.length + parecidos.oportunidades.length + parecidos.contrapartes.length) > 0

  useEffect(() => {
    if (!open) return
    if (editing) {
      setMode(editing.client_id ? 'cliente' : 'prospecto')
      setForm({
        client_id: editing.client_id ? String(editing.client_id) : '', prospecto_nombre: editing.prospecto_nombre ?? '',
        prospecto_contacto: editing.prospecto_contacto ?? '', service_id: editing.service_id ? String(editing.service_id) : '',
        canal_captacion: editing.canal_captacion, origen_negocio: editing.origen_negocio,
        honorarios_estimados: editing.honorarios_estimados != null ? String(editing.honorarios_estimados) : '',
        responsable_username: editing.responsable_username ?? '',
        proxima_accion: editing.proxima_accion ?? '',
        fecha_proxima_accion: editing.fecha_proxima_accion ?? '',
      })
    } else {
      setMode('prospecto')
      setForm({ ...FORM_VACIO, fecha_proxima_accion: EN_TRES_DIAS() })
    }
  }, [open, editing])

  const payload = () => ({
    client_id: mode === 'cliente' && form.client_id ? Number(form.client_id) : null,
    prospecto_nombre: mode === 'prospecto' ? form.prospecto_nombre : '',
    prospecto_contacto: mode === 'prospecto' ? form.prospecto_contacto : '',
    service_id: form.service_id ? Number(form.service_id) : null,
    canal_captacion: form.canal_captacion,
    origen_negocio: form.origen_negocio,
    honorarios_estimados: form.honorarios_estimados ? Number(form.honorarios_estimados) : null,
    responsable_username: form.responsable_username,
    proxima_accion: form.proxima_accion,
    fecha_proxima_accion: form.fecha_proxima_accion || null,
  })

  const create = useMutation({
    mutationFn: () => pipelineApi.create(payload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oportunidades'] }); qc.invalidateQueries({ queryKey: ['dashboard-alerts'] }); toast.success('Oportunidad creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => pipelineApi.update(editing!.id, payload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oportunidades'] }); qc.invalidateQueries({ queryKey: ['dashboard-alerts'] }); toast.success('Actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'cliente' && !form.client_id) return toast.error('Selecciona un cliente')
    if (mode === 'prospecto' && !form.prospecto_nombre.trim()) return toast.error('Ingresa el nombre del prospecto')
    editing ? update.mutate() : create.mutate()
  }

  const selectedService = servicios.find((s) => String(s.id) === form.service_id)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar oportunidad' : 'Nueva oportunidad'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <FormGuidance required="Cliente existente o nombre del prospecto, canal y origen del negocio." optional="Contacto, servicio, honorarios estimados, responsable, próximo paso y fecha. Servicio, responsable y acuerdo serán necesarios al ganar y abrir el expediente." missing={[mode === 'cliente' ? !form.client_id && 'cliente' : !form.prospecto_nombre.trim() && 'nombre del prospecto']} recommended={[mode === 'prospecto' && !form.prospecto_contacto.trim() && 'contacto del prospecto', !form.responsable_username && 'responsable del seguimiento']} />
          <div className="flex gap-1 rounded-lg p-1" style={{ background: 'hsl(var(--muted))' }}>
            <button type="button" onClick={() => setMode('prospecto')} className="flex-1 text-sm py-1.5 rounded-md transition-colors"
              style={mode === 'prospecto' ? { background: 'hsl(var(--background))', fontWeight: 600 } : {}}>Prospecto nuevo</button>
            <button type="button" onClick={() => setMode('cliente')} className="flex-1 text-sm py-1.5 rounded-md transition-colors"
              style={mode === 'cliente' ? { background: 'hsl(var(--background))', fontWeight: 600 } : {}}>Cliente existente</button>
          </div>

          {mode === 'prospecto' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nombre del prospecto <span className="text-destructive text-xs">*</span></Label><Input value={form.prospecto_nombre} onChange={(e) => setForm({ ...form, prospecto_nombre: e.target.value })} autoFocus /></div>
              <div className="space-y-1"><Label>Contacto</Label><Input value={form.prospecto_contacto} onChange={(e) => setForm({ ...form, prospecto_contacto: e.target.value })} placeholder="Teléfono o email" /></div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Cliente <span className="text-destructive text-xs">*</span></Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          {hayParecidos && (
            <div className="rounded-lg px-3 py-2 space-y-1 text-xs"
              style={{ background: 'hsl(38 90% 50% / 0.08)', border: '1px solid hsl(38 90% 50% / 0.3)' }}>
              <p className="flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />Revisa antes de registrar
              </p>
              {parecidos!.clientes.map((c) => (
                <p key={`cl-${c.id}`} className="text-muted-foreground">
                  <strong>{c.name}</strong> ya es cliente{c.phone ? ` · ${c.phone}` : ''} — conviene usar "Cliente existente".
                </p>
              ))}
              {parecidos!.oportunidades.map((o) => (
                <p key={`op-${o.id}`} className="text-muted-foreground">
                  Ya hay una oportunidad <strong>{o.estado}</strong> de {o.nombre}{o.responsable_username ? ` (${o.responsable_username})` : ''}.
                </p>
              ))}
              {parecidos!.contrapartes.map((c) => (
                <p key={`cp-${c.id}`} className="text-destructive">
                  Posible conflicto de interés: es contraparte en "{c.title}"{c.client_name ? ` (${c.client_name})` : ''}.
                </p>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label>Servicio de interés</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="Buscar por código o nombre..." className="pl-8" />
            </div>
            {selectedService ? (
              <div className="text-xs px-2 py-1 rounded bg-muted inline-flex items-center gap-1 mt-1">
                <span className="font-mono">{selectedService.service_code}</span> — {selectedService.nombre}
                <button type="button" className="text-muted-foreground hover:text-foreground ml-1" onClick={() => setForm({ ...form, service_id: '' })}>×</button>
              </div>
            ) : (
              <div className="border rounded-md max-h-40 overflow-y-auto mt-1" style={{ borderColor: 'hsl(var(--border))' }}>
                {servicios.map((s) => (
                  <button type="button" key={s.id} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/50"
                    onClick={() => { setForm({ ...form, service_id: String(s.id) }); setServiceSearch('') }}>
                    <span className="font-mono text-muted-foreground">{s.service_code}</span> {s.nombre}
                  </button>
                ))}
                {servicios.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">Sin resultados</div>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Honorarios estimados</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.honorarios_estimados} onChange={(e) => setForm({ ...form, honorarios_estimados: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Le da seguimiento</Label>
              <Select value={form.responsable_username || '__none__'} onValueChange={(v) => setForm({ ...form, responsable_username: v === '__none__' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin asignar</SelectItem>
                  {usuarios.map((u) => <SelectItem key={u.username} value={u.username}>{u.full_name || u.username}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Canal de captación</Label>
              <Select value={form.canal_captacion} onValueChange={(v) => setForm({ ...form, canal_captacion: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CANALES_CAPTACION.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Origen del negocio</Label>
              <Select value={form.origen_negocio} onValueChange={(v) => setForm({ ...form, origen_negocio: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORIGENES_NEGOCIO.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(var(--muted))' }}>
            <p className="text-xs font-semibold">Seguimiento</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Próximo paso</Label>
                <Input className="h-8 text-sm" value={form.proxima_accion} placeholder="Ej: llamar para confirmar la propuesta"
                  onChange={(e) => setForm({ ...form, proxima_accion: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cuándo</Label>
                <Input type="date" className="h-8 text-sm" value={form.fecha_proxima_accion}
                  onChange={(e) => setForm({ ...form, fecha_proxima_accion: e.target.value })} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Si la fecha se vence, la oportunidad aparece en Mi día y en las alertas.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Ganar: registra al prospecto como cliente y abre el expediente ──────────

function GanarDialog({ oportunidad, onClose }: { oportunidad: Oportunidad | null; onClose: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [documento, setDocumento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [responsable, setResponsable] = useState('')
  const { data: usuarios = [] } = useQuery({ queryKey: ['assignment-users'], queryFn: usersApi.choices, retry: false })

  const [mesCobro, setMesCobro] = useState('')
  const [probabilidad, setProbabilidad] = useState('70')
  const [pactado, setPactado] = useState('')
  const [presupuesto, setPresupuesto] = useState('')
  const [alcance, setAlcance] = useState('')
  const [condiciones, setCondiciones] = useState('')
  const [revision, setRevision] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [contraparte, setContraparte] = useState('')
  const [clienteExistente, setClienteExistente] = useState('')
  const [originador, setOriginador] = useState('')
  const {data: originadores=[]} = useQuery({queryKey:['pipeline-originadores'],queryFn:pipelineApi.originadores,enabled:!!oportunidad})
  const [plan, setPlan] = useState<OpeningTask[]>([])
  const planCargado = useRef<number | null>(null)
  const { data: clientes = [] } = useQuery({ queryKey: ['clientes-choices'], queryFn: clientsApi.choices })
  const { data: plantilla, isLoading: cargandoPlan, isError: errorPlan } = useQuery({
    queryKey: ['plantilla-tareas', oportunidad?.service_id],
    queryFn: () => catalogoApi.listPlantillaTareas(oportunidad!.service_id!), enabled: !!oportunidad?.service_id,
  })
  const { data: coincidencias } = useQuery({ queryKey: ['revision-contacto', oportunidad?.id],
    queryFn: () => pipelineApi.contactosParecidos(oportunidad!.prospecto_nombre || oportunidad!.client_name || '', oportunidad!.prospecto_contacto || ''), enabled: !!oportunidad })
  const { data: conflictos } = useQuery({queryKey:['conflicto-interes',contraparte],queryFn:()=>casesApi.conflictoInteres(contraparte),enabled:contraparte.trim().length>=3})
  const esProspecto = !!oportunidad && !oportunidad.client_id

  useEffect(() => {
    if (!oportunidad) { planCargado.current=null; return }
    const contacto = (oportunidad.prospecto_contacto ?? '').trim()
    setPactado(oportunidad.honorarios_estimados != null ? String(oportunidad.honorarios_estimados) : '')
    setPresupuesto(''); setMesCobro(''); setProbabilidad('70')
    setAlcance(''); setCondiciones(''); setRevision(false); setObservaciones(''); setContraparte(''); setClienteExistente(''); setOriginador('')
    setDocumento('')
    setTelefono(contacto.includes('@') ? '' : contacto)
    setEmail(contacto.includes('@') ? contacto : '')
    setResponsable(oportunidad.responsable_username ?? '')
  }, [oportunidad])

  useEffect(() => {
    if (!plantilla || !oportunidad || planCargado.current===oportunidad.id) return
    planCargado.current=oportunidad.id
    setPlan(plantilla.length ? plantilla.map(p=>({titulo:p.titulo, notes:p.descripcion || '',
      due_date:new Date(new Date(today()+'T12:00:00').getTime()+(p.dias_plazo_relativo ?? 0)*86400000).toISOString().slice(0,10),
      responsible_username:p.responsable_sugerido || '',es_critico:p.es_critico_default,incluida:true,
      costo_estimado:p.costo_estimado,etiqueta_ids:p.etiquetas.map(e=>e.id)})) :
      [{titulo:'Revisar documentos y confirmar próximos pasos',due_date:today(),es_critico:false,incluida:true}])
  }, [plantilla, oportunidad?.id])

  const ganar = useMutation({
    mutationFn: () => pipelineApi.transicion(oportunidad!.id, {
      estado: 'Ganado',
      crear_cliente: esProspecto && !clienteExistente,
      client_id_existente: clienteExistente ? Number(clienteExistente) : null,
      originador_id: originador ? Number(originador) : null,
      mes_cobro_esperado: mesCobro, probabilidad_cobro: Number(probabilidad)/100,
      honorarios_pactados: Number(pactado), costos_directos_estimados: presupuesto !== '' ? Number(presupuesto) : undefined, alcance, condiciones_cobro: condiciones,
      revision_confirmada: revision, revision_observaciones: observaciones, opposing_party: contraparte,
      tareas_iniciales: plan.filter(t=>t.incluida).map(t=>({...t,responsible_username:t.responsible_username || responsable})),
      cliente_documento: documento,
      cliente_telefono: telefono,
      cliente_email: email,
      responsable_expediente: responsable,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['oportunidades'] })
      qc.invalidateQueries({ queryKey: ['oportunidades-conversion'] })
      qc.invalidateQueries({ queryKey: ['cases'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['clientes-choices'] })
      onClose()
      toast.success(res.case_internal_ref ? `¡Ganado! Expediente ${res.case_internal_ref} creado` : 'Marcada como ganada')
      if (res.case_id) navigate(`/cases?case_id=${res.case_id}`)
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  if (!oportunidad) return null
  const nombre = oportunidad.client_name ?? oportunidad.prospecto_nombre ?? 'Sin nombre'

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader><DialogTitle>Preparar apertura: {nombre}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); ganar.mutate() }} className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3 overflow-hidden">
          <div className="min-h-0 overflow-y-auto space-y-3 pr-1">
          <FormGuidance required="Servicio, responsable, honorarios, alcance, condiciones, revisión confirmada, mes y probabilidad de cobro y tareas iniciales con título y fecha." optional="Documento y contacto del nuevo cliente, contraparte y observaciones. Presupuesto vacío: suma estimada de tareas. Originador vacío: sin comisión. Número interno: automático." missing={[!oportunidad.service_id && 'servicio en la oportunidad', !responsable && 'responsable', pactado === '' && 'honorarios', !alcance.trim() && 'alcance', !condiciones.trim() && 'condiciones', !revision && 'revisión', !mesCobro && 'mes de cobro', probabilidad === '' && 'probabilidad', (!plan.some(t=>t.incluida) || plan.some(t=>t.incluida && (!t.titulo.trim() || !t.due_date))) && 'plan inicial con títulos y fechas']} />
          {!oportunidad.service_id && (
            <p className="text-xs text-destructive">Primero elige el servicio en la oportunidad: de ahí salen la clasificación y la tarifa del expediente.</p>
          )}

          {esProspecto && <div className="space-y-2"><Label>Ficha del cliente</Label>
            <select className="w-full h-9 border rounded-md bg-background px-2 text-sm" value={clienteExistente} onChange={e=>setClienteExistente(e.target.value)}>
              <option value="">Registrar nuevo cliente</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>}
          {esProspecto && !clienteExistente && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(var(--muted))' }}>
              <p className="text-xs font-semibold">Se registra como cliente</p>
              <p className="text-[11px] text-muted-foreground">Con lo capturado al primer contacto. Completa lo que falte; el resto de la ficha se llena luego.</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input className="h-8 text-sm font-mono" placeholder="DUI / NIT" value={documento} onChange={(e) => setDocumento(e.target.value)} />
                <Input className="h-8 text-sm" placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
                <Input className="h-8 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Abogado responsable del expediente</Label>
            <Select value={responsable || '__none__'} onValueChange={v => setResponsable(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin asignar</SelectItem>
                {usuarios.map((u) => <SelectItem key={u.username} value={u.username}>{u.full_name || u.username}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Mes esperado de cobro *</Label><Input required type="month" min={today().slice(0,7)} value={mesCobro} onChange={e=>setMesCobro(e.target.value)}/></div>
              <div><Label>Probabilidad de cobro (%) *</Label><Input required type="number" min="0" max="100" value={probabilidad} onChange={e=>setProbabilidad(e.target.value)}/></div>
            </div>
            <Label>Honorarios pactados ($)</Label><Input aria-label="Honorarios pactados" type="number" min="0" step="0.01" value={pactado} onChange={e=>setPactado(e.target.value)}/>
            <Label>Presupuesto interno de costos ($)</Label><Input aria-label="Presupuesto interno de costos" type="number" min="0" step="0.01" value={presupuesto} onChange={e=>setPresupuesto(e.target.value)} placeholder={String(plan.filter(t=>t.incluida).reduce((total,t)=>total+(t.costo_estimado || 0),0))}/>
            <p className="text-xs text-muted-foreground">Si lo dejas vacío se toma la suma de costos estimados del plan inicial. No se suma a los honorarios del cliente.</p>
            <Label>Alcance aceptado por el cliente</Label><Textarea value={alcance} onChange={e=>setAlcance(e.target.value)} placeholder="Trabajo incluido, exclusiones y cómo confirmó su aceptación"/>
            <Label>Condiciones de cobro acordadas</Label><Textarea value={condiciones} onChange={e=>setCondiciones(e.target.value)} placeholder="Anticipo, cuotas o hitos. Esto no registra un pago."/>
            <Label>Originador del negocio</Label><select className="w-full h-9 border rounded-md bg-background px-2 text-sm" value={originador} onChange={e=>setOriginador(e.target.value)}>
              <option value="">Según origen comercial; pendiente si no hay coincidencia única</option>{originadores.map(p=><option key={p.id} value={p.id}>{p.persona}</option>)}
            </select>
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Label>Contraparte, si corresponde</Label><Input value={contraparte} onChange={e=>setContraparte(e.target.value)}/>
            {coincidencias?.clientes.map(c=><p key={c.id} className="text-xs text-amber-600">Cliente parecido: {c.name}. Puedes vincular su ficha arriba.</p>)}
            {coincidencias?.contrapartes.map(c=><p key={c.id} className="text-xs text-amber-600">Figura como contraparte: {c.opposing_party} · {c.title}</p>)}
            {coincidencias?.oportunidades.filter(o=>o.id!==oportunidad.id).map(o=><p key={o.id} className="text-xs text-amber-600">Oportunidad abierta similar: #{o.id} · {o.nombre}</p>)}
            {(conflictos?.clientes.length || conflictos?.casos.length) ? <p className="text-xs text-amber-600">La contraparte coincide con registros existentes. Revisa y documenta antes de abrir.</p> : null}
            <Textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)} placeholder="Resultado de la revisión, resolución de coincidencias y documentos pendientes"/>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={revision} onChange={e=>setRevision(e.target.checked)}/> Confirmé cliente, acuerdo y revisión de posibles conflictos.</label>
          </div>
          {cargandoPlan ? <p>Cargando tareas del servicio…</p> : errorPlan ? <p className="text-destructive">No se pudo cargar la plantilla. Cierra y vuelve a abrir para reintentar.</p> : <OpeningTasks tasks={plan} onChange={setPlan} users={usuarios} defaultResponsible={responsable} date={today()}/>}

          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={ganar.isPending || !oportunidad.service_id || cargandoPlan || errorPlan || !revision || !responsable || pactado === '' || Number(pactado)<0 || !alcance.trim() || !condiciones.trim() || !plan.some(t=>t.incluida) || plan.some(t=>t.incluida && (!t.titulo.trim() || !t.due_date))}>
              {ganar.isPending ? 'Creando...' : 'Ganar y abrir expediente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Perder: la causa se clasifica para poder medirla ───────────────────────

function PerderDialog({ oportunidad, onClose }: { oportunidad: Oportunidad | null; onClose: () => void }) {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState('')
  const [nota, setNota] = useState('')
  const { data: motivos = [] } = useQuery({ queryKey: ['motivos-perdida'], queryFn: pipelineApi.motivosPerdida })

  useEffect(() => { setTipo(''); setNota('') }, [oportunidad])

  const perder = useMutation({
    mutationFn: () => pipelineApi.transicion(oportunidad!.id, { estado: 'Perdido', motivo_perdida_tipo: tipo, motivo_perdida: nota }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oportunidades'] })
      qc.invalidateQueries({ queryKey: ['oportunidades-conversion'] })
      qc.invalidateQueries({ queryKey: ['cases'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] })
      qc.invalidateQueries({ queryKey: ['dashboard-alerts'] })
      toast.success('Marcada como perdida')
      onClose()
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  if (!oportunidad) return null

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Marcar como perdida</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!tipo) return toast.error('Elige la causa'); perder.mutate() }} className="space-y-3">
          <div className="space-y-1">
            <FormGuidance required="Causa de la pérdida." optional="Detalle adicional." missing={[!tipo && 'causa']} /><Label>Causa <span className="text-destructive text-xs">*</span></Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue placeholder="Elegir causa..." /></SelectTrigger>
              <SelectContent>{motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Clasificarla permite ver después qué canal trae negocio que no se cierra.</p>
          </div>
          <div className="space-y-1">
            <Label>Detalle (opcional)</Label>
            <Textarea rows={2} className="resize-none" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: pedía 30% menos y no había margen" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={perder.isPending}>Marcar perdida</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tarjeta ────────────────────────────────────────────────────────────────

function OportunidadCard({ op, onEdit, onCotizar, onGanar, onPerder }: {
  op: Oportunidad; onEdit: () => void; onCotizar: () => void; onGanar: () => void; onPerder: () => void
}) {
  const nombre = op.client_name ?? op.prospecto_nombre ?? 'Sin nombre'
  const abierta = op.estado === 'Prospecto' || op.estado === 'Cotizado'
  const seguimientoIncompleto = abierta && (!op.responsable_username || !op.proxima_accion || !op.fecha_proxima_accion)
  const seguimientoVencido = abierta && !!op.fecha_proxima_accion && op.fecha_proxima_accion < today()
  const estancada = abierta && (op.dias_en_etapa ?? 0) >= 10

  return (
    <Card className="cursor-pointer" onClick={onEdit}
      style={seguimientoVencido ? { borderColor: 'hsl(38 90% 50% / 0.5)' } : undefined}>
      <CardContent className="p-3 space-y-2">
        {seguimientoIncompleto && <p className="text-xs text-amber-600 mb-2">Seguimiento incompleto: revisa responsable, próxima acción y fecha.</p>}

        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm">{nombre}</span>
          {!op.client_id && <Badge variant="info" className="text-[10px] shrink-0">prospecto</Badge>}
        </div>

        {op.service_nombre ? (
          <div className="text-xs text-muted-foreground"><span className="font-mono">{op.service_code}</span> · {op.service_nombre}</div>
        ) : (
          <div className="text-xs text-muted-foreground/60 italic">Sin servicio definido</div>
        )}

        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          {op.honorarios_estimados != null && (
            <span className="font-semibold" style={{ color: 'hsl(43 70% 55%)' }}>{formatCurrency(op.honorarios_estimados)}</span>
          )}
          {op.responsable_username && (
            <span className="text-muted-foreground flex items-center gap-0.5"><UserIcon className="h-3 w-3" />{op.responsable_username}</span>
          )}
          {abierta && op.dias_en_etapa != null && (
            <span className={`flex items-center gap-0.5 ${estancada ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`}
              title={estancada ? 'Lleva más de 10 días sin avanzar' : 'Días en esta etapa'}>
              <Clock className="h-3 w-3" />{op.dias_en_etapa}d
            </span>
          )}
        </div>

        {abierta && (
          op.proxima_accion || op.fecha_proxima_accion ? (
            <div className={`text-[11px] rounded px-2 py-1 ${seguimientoVencido ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}
              style={{ background: seguimientoVencido ? 'hsl(38 90% 50% / 0.1)' : 'hsl(var(--muted))' }}>
              {op.proxima_accion || 'Seguimiento'}
              {op.fecha_proxima_accion && <span className="ml-1">· {formatDate(op.fecha_proxima_accion)}{seguimientoVencido ? ' (vencido)' : ''}</span>}
            </div>
          ) : (
            <div className="text-[11px] text-amber-600 dark:text-amber-400">Sin próximo paso definido</div>
          )
        )}

        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px]">{op.canal_captacion}</Badge>
          <Badge variant="secondary" className="text-[10px]">{op.origen_negocio}</Badge>
        </div>

        {op.estado === 'Perdido' && (op.motivo_perdida_tipo || op.motivo_perdida) && (
          <div className="text-xs text-destructive/80 border-t pt-1.5 mt-1.5" style={{ borderColor: 'hsl(var(--border))' }}>
            {op.motivo_perdida_tipo && <strong>{op.motivo_perdida_tipo}</strong>}
            {op.motivo_perdida ? `${op.motivo_perdida_tipo ? ' · ' : ''}${op.motivo_perdida}` : ''}
          </div>
        )}

        {op.estado === 'Ganado' && op.case_id && (
          <Link to={`/cases?case_id=${op.case_id}`} onClick={(e) => e.stopPropagation()}
            className="text-xs flex items-center gap-1 border-t pt-1.5 mt-1.5 hover:underline" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(142 70% 45%)' }}>
            <FileText className="h-3 w-3" /><span className="font-mono">{op.case_internal_ref ?? 'Ver expediente'}</span>
          </Link>
        )}

        {abierta && (
          <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
            {op.estado === 'Prospecto' && (
              <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" onClick={onCotizar}><ArrowRight className="h-3 w-3" />Cotizar</Button>
            )}
            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" onClick={onGanar}>
              <Trophy className="h-3 w-3" />Ganado
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1 text-destructive" onClick={onPerder}><XCircle className="h-3 w-3" />Perdido</Button>
          </div>
        )}
        <WorkflowHistory path={`/oportunidades/${op.id}/historial`}/>
      </CardContent>
    </Card>
  )
}

// ─── Tablero ────────────────────────────────────────────────────────────────

export default function Pipeline() {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Oportunidad | null>(null)
  const [perdiendo, setPerdiendo] = useState<Oportunidad | null>(null)
  const [ganando, setGanando] = useState<Oportunidad | null>(null)
  const { soloMio, setSoloMio, esMio } = useSoloMio()

  const { data: todas = [] } = useQuery({ queryKey: ['oportunidades'], queryFn: () => pipelineApi.list() })
  const [metricMonth,setMetricMonth]=useState('')
  const [metricOrigin,setMetricOrigin]=useState('')
  const [metricService,setMetricService]=useState('')
  const { data: conversion } = useQuery({ queryKey: ['oportunidades-conversion',metricMonth,metricOrigin,metricService], queryFn: ()=>pipelineApi.conversion({mes:metricMonth || undefined,origen:metricOrigin || undefined,service_id:metricService?Number(metricService):undefined}) })
  const oportunidades = todas.filter((o) => esMio(o.responsable_username))

  const cotizar = useMutation({
    mutationFn: (id: number) => pipelineApi.transicion(id, { estado: 'Cotizado' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oportunidades'] }); toast.success('Marcada como cotizada') },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  const vencidas = oportunidades.filter((o) => (o.estado === 'Prospecto' || o.estado === 'Cotizado')
    && !!o.fecha_proxima_accion && o.fecha_proxima_accion < today()).length
  const sinSeguimiento = oportunidades.filter(o=>['Prospecto','Cotizado'].includes(o.estado) && (!o.responsable_username || !o.proxima_accion || !o.fecha_proxima_accion)).length

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Pipeline comercial</h1>
            <HelpButton content={pipelineHelp} />
          </div>
          <p className="text-muted-foreground text-sm">Del primer contacto al expediente: prospecto → cotizado → ganado o perdido</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-table-border-h))' }}>
            {[{ v: true, label: 'Mías' }, { v: false, label: 'Todas' }].map((o) => (
              <button key={o.label} onClick={() => setSoloMio(o.v)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${soloMio === o.v ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <Button onClick={() => { setEditing(null); setDlg(true) }}><Plus className="h-4 w-4" />Nueva oportunidad</Button>
        </div>
      </div>

      {sinSeguimiento>0 && <InfoBanner>{sinSeguimiento} oportunidades necesitan completar responsable, próxima acción o fecha.</InfoBanner>}
      {vencidas > 0 ? (
        <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
          style={{ background: 'hsl(38 90% 50% / 0.08)', border: '1px solid hsl(38 90% 50% / 0.3)', color: 'hsl(var(--muted-foreground))' }}>
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          <span><strong>{vencidas}</strong> oportunidad{vencidas > 1 ? 'es' : ''} con el seguimiento vencido. Son las que se enfrían.</span>
        </div>
      ) : (
        <InfoBanner>Al marcar <strong>Ganado</strong>, el prospecto se registra como cliente y se abre su expediente en un solo paso.</InfoBanner>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Conversión por mes de cotización: mide cuántas propuestas de ese período se han ganado. Los prospectos sin cotizar se agrupan por mes de captación.</p>
        <div className="flex flex-wrap gap-2">
          <Input aria-label="Mes de conversión" type="month" className="w-40" value={metricMonth} onChange={e=>setMetricMonth(e.target.value)}/>
          <select aria-label="Origen de conversión" className="border rounded-md bg-background p-2" value={metricOrigin} onChange={e=>setMetricOrigin(e.target.value)}><option value="">Todos los orígenes</option>{[...new Set(todas.map(o=>o.origen_negocio))].map(o=><option key={o}>{o}</option>)}</select>
          <select aria-label="Servicio de conversión" className="border rounded-md bg-background p-2 max-w-full" value={metricService} onChange={e=>setMetricService(e.target.value)}><option value="">Todos los servicios</option>{[...new Map(todas.filter(o=>o.service_id).map(o=>[o.service_id,o.service_nombre])).entries()].map(([id,name])=><option key={id} value={id!}>{name}</option>)}</select>
          <Button variant="ghost" onClick={()=>{setMetricMonth('');setMetricOrigin('');setMetricService('')}}>Limpiar filtros</Button>
        </div>
      </div>
      {conversion && (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Prospectos</div><div className="text-lg font-semibold">{conversion.prospectos}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Cotizados</div><div className="text-lg font-semibold">{conversion.cotizados}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Ganados</div><div className="text-lg font-semibold" style={{ color: 'hsl(142 70% 45%)' }}>{conversion.ganados}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Perdidos</div><div className="text-lg font-semibold text-destructive">{conversion.perdidos}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Conversión</div><div className="text-lg font-semibold">{conversion.conversion_pct != null ? `${(conversion.conversion_pct * 100).toFixed(0)}%` : '—'}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Valor del embudo</div><div className="text-lg font-semibold" style={{ color: 'hsl(43 70% 55%)' }}>{formatCurrency(conversion.valor_pipeline)}</div></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const items = oportunidades.filter((o) => o.estado === col.estado)
          const total = items.reduce((s, o) => s + (o.honorarios_estimados ?? 0), 0)
          return (
            <div key={col.estado} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                <span className="font-semibold text-sm">{col.label}</span>
                <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                {total > 0 && <span className="text-[11px] font-mono ml-auto" style={{ color: 'hsl(43 70% 55%)' }}>{formatCurrency(total)}</span>}
              </div>
              <div className="space-y-2 min-h-[80px]">
                {items.map((op) => (
                  <OportunidadCard
                    key={op.id}
                    op={op}
                    onEdit={() => { setEditing(op); setDlg(true) }}
                    onCotizar={() => cotizar.mutate(op.id)}
                    onGanar={() => setGanando(op)}
                    onPerder={() => setPerdiendo(op)}
                  />
                ))}
                {items.length === 0 && <div className="text-xs text-muted-foreground/50 text-center py-6 border-2 border-dashed rounded-lg" style={{ borderColor: 'hsl(var(--border))' }}>Vacío</div>}
              </div>
            </div>
          )
        })}
      </div>

      <OportunidadDialog open={dlg} onClose={() => setDlg(false)} editing={editing} />
      <GanarDialog oportunidad={ganando} onClose={() => setGanando(null)} />
      <PerderDialog oportunidad={perdiendo} onClose={() => setPerdiendo(null)} />
    </div>
  )
}
