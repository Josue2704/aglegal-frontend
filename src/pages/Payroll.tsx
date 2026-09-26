import { FormGuidance } from '@/components/FormGuidance'
import { Fragment, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Calculator, ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { payrollApi } from '@/api/payroll'
import { usePermission } from '@/hooks/usePermission'
import { PayrollObligations } from '@/components/PayrollObligations'
import type { PayrollEntry, PayrollIn, PayrollPreview, PayrollModo } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { HelpButton } from '@/components/HelpButton'
import { payrollHelp } from '@/lib/helpContent'
import { PayrollConfigDialog } from '@/components/PayrollConfigDialog'
import { PrestacionesDialog } from '@/components/PrestacionesDialog'

const ROLES = ['Abogado', 'Asistente', 'Contador', 'Recepcionista', 'Notario', 'Pasante', 'Otro']
const OTRO = '__otro__'

type FormData = {
  account_id: string
  personal_id: string
  employee_name: string
  role: string
  period: string
  payment_date: string
  notes: string
  // manual
  amount: string
  // calculado
  salario_base: string
  horas_extra_cantidad: string
  nocturnidad_horas: string
  bonificaciones: string
  otros_ingresos: string
  descuento_faltas: string
  descuento_prestamos: string
  otros_descuentos: string
}

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const EMPTY: FormData = {
  account_id: '', personal_id: '', employee_name: '', role: 'Abogado', period: currentPeriod(), payment_date: today(), notes: '',
  amount: '', salario_base: '', horas_extra_cantidad: '0', nocturnidad_horas: '0', bonificaciones: '0',
  otros_ingresos: '0', descuento_faltas: '0', descuento_prestamos: '0', otros_descuentos: '0',
}

function employeeKey(e: { personal_id?: number | null; employee_name: string }) {
  return e.personal_id ? `person:${e.personal_id}` : `manual:${e.employee_name}`
}

function money(n: number) {
  return formatCurrency(n)
}

export default function Payroll() {
  const qc = useQueryClient()
  const canCreate = usePermission('nominas', 'crear')
  const canEdit = usePermission('nominas', 'editar')
  const canDelete = usePermission('nominas', 'eliminar')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [auditId, setAuditId] = useState<number | null>(null)
  const { data: audit = [] } = useQuery({ queryKey: ['payroll-audit', auditId], queryFn: () => payrollApi.auditLog(auditId!), enabled: auditId !== null })
  const [dlg, setDlg] = useState(false)
  const [configDlg, setConfigDlg] = useState(false)
  const [prestacionesDlg, setPrestacionesDlg] = useState(false)
  const [modo, setModo] = useState<PayrollModo>('calculado')
  const [form, setForm] = useState<FormData>(EMPTY)
  const [filterPeriod, setFilterPeriod] = useState(currentPeriod())
  const previewVersion = useRef(0)
  const [preview, setPreview] = useState<PayrollPreview | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<PayrollEntry | null>(null)
  const [editForm, setEditForm] = useState({ payment_date: '', notes: '', amount: '' })

  const { data: all = [], isLoading, isError } = useQuery({ queryKey: ['payroll'], queryFn: payrollApi.list })
  const { data: accounts = [] } = useQuery({ queryKey: ['payroll-accounts'], queryFn: payrollApi.accounts, enabled: dlg && canCreate && modo === 'manual' && form.personal_id === OTRO })
  const { data: personal = [] } = useQuery({ queryKey: ['payroll-personal'], queryFn: payrollApi.personal })

  const entries = all.filter(e => (!filterPeriod || e.period === filterPeriod) && (employeeFilter === 'all' || employeeKey(e) === employeeFilter))
  const usaOtro = form.personal_id === OTRO
  const personaSeleccionada = personal.find((p) => String(p.id) === form.personal_id)

  const create = useMutation({
    mutationFn: (d: PayrollIn) => payrollApi.create(d),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Registro creado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: payrollApi.delete,
    onSuccess: () => { qc.invalidateQueries(); toast.success('Anulado') },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'No se pudo anular'),
  })
  const update = useMutation({
    mutationFn: (d: { id: number; payment_date: string; notes: string; amount: number }) =>
      payrollApi.update(d.id, { payment_date: d.payment_date, notes: d.notes, amount: d.amount }),
    onSuccess: () => { qc.invalidateQueries(); toast.success('Corregido'); setEditing(null) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const previewMut = useMutation({
    mutationFn: async () => {
      const version = previewVersion.current
      const result = await payrollApi.preview({
      salario_base: Number(form.salario_base || 0),
      horas_extra_cantidad: Number(form.horas_extra_cantidad || 0),
      nocturnidad_horas: Number(form.nocturnidad_horas || 0),
      bonificaciones: Number(form.bonificaciones || 0),
      otros_ingresos: Number(form.otros_ingresos || 0),
      descuento_faltas: Number(form.descuento_faltas || 0),
      descuento_prestamos: Number(form.descuento_prestamos || 0),
      otros_descuentos: Number(form.otros_descuentos || 0),
      fecha: form.payment_date,
      })
      return { result, version }
    },
    onSuccess: ({ result, version }) => { if (version === previewVersion.current) setPreview(result) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'No se pudo calcular'),
  })

  function openNew() {
    setForm({ ...EMPTY, period: currentPeriod(), payment_date: today() })
    setModo('calculado')
    previewVersion.current++
    setPreview(null)
    setDlg(true)
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (modo === 'calculado') {
      if (!form.personal_id || usaOtro) return toast.error('Una planilla calculada requiere seleccionar a la persona del catálogo')
      if (!form.salario_base || Number(form.salario_base) <= 0) return toast.error('El salario base debe ser mayor a 0')
    } else {
      if (usaOtro && !form.employee_name.trim()) return toast.error('El nombre del colaborador es requerido')
      if (!usaOtro && !form.personal_id) return toast.error('Selecciona un colaborador del catálogo de Personal')
      if (!form.amount || Number(form.amount) <= 0) return toast.error('El monto debe ser mayor a 0')
    }
    if (!form.payment_date) return toast.error('Completa la fecha de pago')
    if (!form.period) return toast.error('El período es requerido')

    if (usaOtro && !form.account_id) return toast.error('Selecciona la cuenta de egreso para este pago')
    create.mutate({
      account_id: usaOtro ? Number(form.account_id) : undefined,
      personal_id: usaOtro ? null : (form.personal_id ? Number(form.personal_id) : null),
      employee_name: usaOtro ? form.employee_name : undefined,
      role: usaOtro ? form.role : undefined,
      period: form.period, payment_date: form.payment_date, notes: form.notes,
      modo,
      ...(modo === 'manual'
        ? { amount: Number(form.amount) }
        : {
            salario_base: Number(form.salario_base || 0),
            horas_extra_cantidad: Number(form.horas_extra_cantidad || 0),
            nocturnidad_horas: Number(form.nocturnidad_horas || 0),
            bonificaciones: Number(form.bonificaciones || 0),
            otros_ingresos: Number(form.otros_ingresos || 0),
            descuento_faltas: Number(form.descuento_faltas || 0),
            descuento_prestamos: Number(form.descuento_prestamos || 0),
            otros_descuentos: Number(form.otros_descuentos || 0),
          }),
    })
  }

  const f = (k: keyof FormData) => (v: string) => { previewVersion.current++; setForm((p) => ({ ...p, [k]: v })); setPreview(null) }
  const total = entries.reduce((s, e) => s + e.amount, 0)
  const totalCosto = entries.reduce((s, e) => s + (e.costo_empresa || e.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Planilla</h1>
            <HelpButton content={payrollHelp} />
          </div>
          <p className="text-muted-foreground text-sm">Cálculo de planilla (ISSS, AFP, renta, horas extra) y pagos a colaboradores</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Input type="month" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={() => setPrestacionesDlg(true)}><Calculator className="h-4 w-4" />Prestaciones</Button>
          {canEdit && <Button variant="outline" onClick={() => setConfigDlg(true)}><Settings2 className="h-4 w-4" />Config. de ley</Button>}
          {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4" />Nuevo pago</Button>}
        </div>
      </div>

      <div className="max-w-sm"><Label>Colaborador</Label><Select value={employeeFilter} onValueChange={setEmployeeFilter}>
        <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos los colaboradores</SelectItem>
        {[...new Map(all.map(e => [employeeKey(e), e])).entries()].map(([key,e]) => <SelectItem key={key} value={key}>{e.employee_name}{e.personal_id ? ` · #${e.personal_id}` : ' · Manual'}</SelectItem>)}
        </SelectContent></Select></div>
      <p className="text-xs text-muted-foreground">El período identifica el mes trabajado; caja utiliza la fecha efectiva de cada pago. Las comisiones se liquidan en Comisiones y no se agregan automáticamente aquí.</p>
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Registros en período</p><p className="text-xl font-bold mt-1">{entries.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Total pagado (neto)</p><p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(total)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Costo para el despacho</p><p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(totalCosto)}</p><p className="text-[11px] text-muted-foreground mt-0.5">Devengado + aporte patronal</p></CardContent></Card>
      </div>

      {isError ? <p role="alert" className="text-destructive">No se pudo cargar la planilla. Recarga la página para intentar nuevamente.</p> : isLoading ? <p className="text-muted-foreground text-sm">Cargando...</p> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{['', 'Fecha', 'Colaborador', 'Rol', 'Período', 'Modo', 'Neto', 'Costo despacho', ''].map((h, i) => <th key={i} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <Fragment key={e.id}>
                    <tr className="border-t hover:bg-muted/30">
                      <td className="px-2 py-3">
                        {e.modo === 'calculado' && (
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                            {expanded === e.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatDate(e.payment_date)}</td>
                      <td className="px-4 py-3 font-medium">{e.employee_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.role ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{e.period}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${e.modo === 'calculado' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {e.modo === 'calculado' ? 'Calculado' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(e.amount)}</td>
                      <td className="px-4 py-3 font-semibold" title="Devengado más aporte patronal; la caja registra cada desembolso por separado">
                        {formatCurrency(e.costo_empresa || e.amount)}
                      </td>
                      <td className="px-4 py-3 flex gap-1">
                        {canEdit && <Button aria-label="Corregir pago" size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(e); setEditForm({ payment_date: e.payment_date, notes: e.notes ?? '', amount: String(e.amount) }) }}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {canDelete && <Button aria-label="Anular pago" size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Anular este registro y su gasto? La anulación conservará trazabilidad.')) remove.mutate(e.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>}
                        <Button size="sm" variant="ghost" onClick={() => setAuditId(e.id)}>Historial</Button>
                      </td>
                    </tr>
                    {expanded === e.id && e.modo === 'calculado' && (
                      <tr className="border-t bg-muted/20">
                        <td colSpan={9} className="px-6 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1.5 text-xs">
                            <div><span className="text-muted-foreground">Salario base:</span> {money(e.salario_base ?? 0)}</div>
                            <div><span className="text-muted-foreground">Horas extra:</span> {money(e.horas_extra_monto)} ({e.horas_extra_cantidad}h)</div>
                            <div><span className="text-muted-foreground">Nocturnidad:</span> {money(e.nocturnidad_monto)} ({e.nocturnidad_horas}h)</div>
                            <div><span className="text-muted-foreground">Bonificaciones:</span> {money(e.bonificaciones)}</div>
                            <div className="font-medium">Total devengado: {money(e.total_devengado)}</div>
                            <div><span className="text-muted-foreground">ISSS empleado:</span> {money(e.isss_empleado)}</div>
                            <div><span className="text-muted-foreground">AFP empleado:</span> {money(e.afp_empleado)}</div>
                            <div><span className="text-muted-foreground">Renta:</span> {money(e.renta)}</div>
                            <div><span className="text-muted-foreground">Descuento faltas:</span> {money(e.descuento_faltas)}</div>
                            <div><span className="text-muted-foreground">Préstamos:</span> {money(e.descuento_prestamos)}</div>
                            <div><span className="text-muted-foreground">Otros descuentos:</span> {money(e.otros_descuentos)}</div>
                            <div className="font-medium">Total descuentos: {money(e.total_descuentos)}</div>
                            <div className="col-span-2 md:col-span-4 pt-1 border-t text-[11px] text-muted-foreground">
                              Aporte patronal (no incluido en el neto): ISSS {money(e.isss_patronal)} + AFP {money(e.afp_patronal)} = {money(e.isss_patronal + e.afp_patronal)}.
                              {' '}{e.cash_model === 'separado'
                                ? 'Caja registra el neto y, por separado, cada obligación al pagarla. Los préstamos y otros descuentos no se pagan automáticamente a terceros.'
                                : 'Registro anterior: caja conserva el costo total registrado originalmente; no genera obligaciones nuevas para evitar duplicarlo.'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!entries.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Sin registros en {filterPeriod || 'este período'}</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <PayrollObligations period={filterPeriod} employee={employeeFilter} />

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo pago de planilla</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FormGuidance required={modo === 'calculado' ? 'Persona del catálogo, período, fecha de pago y salario base mayor a cero.' : 'Colaborador, período, fecha de pago y monto mayor a cero. Para Otro: nombre y cuenta de egreso.'} optional="Notas y rol del colaborador externo. En planilla calculada, horas extra, bonificaciones, otros ingresos y descuentos vacíos equivalen a cero. La cuenta de una persona del catálogo se toma de su configuración." missing={[!form.period && 'período', !form.payment_date && 'fecha de pago', !usaOtro && !form.personal_id && 'colaborador', usaOtro && !form.employee_name.trim() && 'nombre', usaOtro && !form.account_id && 'cuenta de egreso', modo === 'calculado' ? !(Number(form.salario_base) > 0) && 'salario base mayor a cero' : !(Number(form.amount) > 0) && 'monto mayor a cero']} />
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg">
              <button type="button" onClick={() => { setModo('calculado'); previewVersion.current++; setPreview(null) }} className={`py-1.5 rounded-md text-sm font-medium transition-colors ${modo === 'calculado' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Planilla calculada</button>
              <button type="button" onClick={() => { setModo('manual'); previewVersion.current++; setPreview(null) }} className={`py-1.5 rounded-md text-sm font-medium transition-colors ${modo === 'manual' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Pago manual (bono/ajuste)</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Colaborador <span className="text-destructive text-xs">*</span></Label>
                <Select value={form.personal_id} onValueChange={(v) => {
                  f('personal_id')(v)
                  const p = personal.find((x) => String(x.id) === v)
                  if (p && modo === 'calculado') setForm((prev) => ({ ...prev, salario_base: String(p.monto_mensual) }))
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar del catálogo de Personal..." /></SelectTrigger>
                  <SelectContent>
                    {personal.filter(p => form.period >= p.mes_inicio && (!p.mes_fin || form.period <= p.mes_fin) && (p.estado === 'Activo' || !!p.mes_fin)).map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.persona} — {p.cargo}</SelectItem>)}
                    {modo === 'manual' && <SelectItem value={OTRO}>Otro (no está en el catálogo de Personal)</SelectItem>}
                  </SelectContent>
                </Select>
                {modo === 'calculado' && personaSeleccionada && !personaSeleccionada.account_id && (
                  <p className="text-[11px] text-destructive">Esta persona no tiene cuenta contable enlazada — asígnala en Finanzas → Personal antes de guardar.</p>
                )}
              </div>
              {modo === 'manual' && usaOtro && (
                <>
                  <div className="space-y-1 col-span-2"><Label>Cuenta del pago</Label><Select value={form.account_id} onValueChange={f('account_id')}><SelectTrigger><SelectValue placeholder="Seleccionar cuenta de egreso..." /></SelectTrigger><SelectContent>{accounts.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.account_code} · {a.nombre}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1 col-span-2"><Label>Nombre colaborador <span className="text-destructive text-xs">*</span></Label><Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Rol</Label><Select value={form.role} onValueChange={f('role')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                </>
              )}
              <div className="space-y-1"><Label>Período <span className="text-destructive text-xs">*</span></Label><Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
              <div className="space-y-1"><Label>Fecha de pago</Label><Input type="date" value={form.payment_date} onChange={(e) => f('payment_date')(e.target.value)} /></div>

              {modo === 'manual' ? (
                <div className="space-y-1 col-span-2"><Label>Monto <span className="text-destructive text-xs">*</span></Label><Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              ) : (
                <>
                  <div className="space-y-1"><Label>Salario base ($) <span className="text-destructive text-xs">*</span></Label><Input type="number" step="0.01" value={form.salario_base} onChange={(e) => f('salario_base')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Horas extra diurnas</Label><Input type="number" step="0.5" min="0" value={form.horas_extra_cantidad} onChange={(e) => f('horas_extra_cantidad')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Horas ordinarias nocturnas</Label><Input type="number" step="0.5" min="0" value={form.nocturnidad_horas} onChange={(e) => f('nocturnidad_horas')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Bonificaciones salariales ($)</Label><Input type="number" step="0.01" min="0" value={form.bonificaciones} onChange={(e) => f('bonificaciones')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Otros ingresos salariales ($)</Label><Input type="number" step="0.01" min="0" value={form.otros_ingresos} onChange={(e) => f('otros_ingresos')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Descuento por faltas ($)</Label><Input type="number" step="0.01" min="0" value={form.descuento_faltas} onChange={(e) => f('descuento_faltas')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Descuento por préstamos ($)</Label><Input type="number" step="0.01" min="0" value={form.descuento_prestamos} onChange={(e) => f('descuento_prestamos')(e.target.value)} /></div>
                  <div className="space-y-1 col-span-2"><Label>Otros descuentos ($)</Label><Input type="number" step="0.01" min="0" value={form.otros_descuentos} onChange={(e) => f('otros_descuentos')(e.target.value)} /></div>
                </>
              )}
              <div className="space-y-1 col-span-2"><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>

            {modo === 'calculado' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Bonificaciones y otros ingresos son remuneración salarial cotizable. No incluyas viáticos, aguinaldo ni comisiones ya liquidadas. Las faltas reducen el devengado. Esta planilla es mensual; las prestaciones tienen su calculadora independiente.</p>
                <Button type="button" variant="outline" size="sm" className="w-full" disabled={!form.salario_base || previewMut.isPending} onClick={() => previewMut.mutate()}>
                  <Calculator className="h-3.5 w-3.5" />Calcular vista previa
                </Button>
                {preview && (
                  <div className="rounded-lg border p-3 space-y-1.5 text-xs bg-muted/30">
                    {preview.descuento_faltas > 0 && <p>Faltas: {money(preview.descuento_faltas)}, ya descontadas del devengado.</p>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Total devengado</span><span className="font-medium">{money(preview.total_devengado)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">ISSS empleado</span><span>−{money(preview.isss_empleado)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">AFP empleado</span><span>−{money(preview.afp_empleado)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Renta (ISR)</span><span>−{money(preview.renta)}</span></div>
                    {(preview.descuento_prestamos + preview.otros_descuentos) > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Préstamos/otros</span><span>−{money(preview.descuento_prestamos + preview.otros_descuentos)}</span></div>
                    )}
                    <div className="flex justify-between"><span>Costo laboral (devengado + patronal)</span><span>{money(preview.total_devengado + preview.isss_patronal + preview.afp_patronal)}</span></div>
                    <div className="flex justify-between pt-1.5 border-t font-semibold text-sm"><span>Neto a pagar</span><span className={preview.neto < 0 ? 'text-destructive' : ''}>{money(preview.neto)}</span></div>
                    {preview.advertencias.map((a, i) => <p key={i} className="text-amber-600 pt-1">⚠ {a}</p>)}
                  </div>
                )}
              </div>
            )}

            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Corregir pago — {editing?.employee_name}</DialogTitle></DialogHeader>
          <form onSubmit={(ev) => { ev.preventDefault(); if (editing) update.mutate({ id: editing.id, payment_date: editForm.payment_date, notes: editForm.notes, amount: Number(editForm.amount) }) }} className="space-y-3">
            <p className="text-xs text-muted-foreground">Puedes corregir fecha y notas. El monto solo es editable en pagos manuales. Para cambiar el cálculo, anula y genera nuevamente la planilla. Cada corrección queda registrada.</p>
            <FormGuidance required="Fecha de pago y monto neto válido; el neto calculado no se edita." optional="Notas." missing={[!editForm.payment_date && 'fecha de pago', !(Number(editForm.amount)>0) && 'monto positivo']} /><div className="space-y-1"><Label>Fecha de pago *</Label><Input required type="date" value={editForm.payment_date} onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Monto (neto)</Label><Input disabled={editing?.modo === 'calculado'} type="number" min="0.01" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notas</Label><Textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={update.isPending}>Guardar corrección</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={auditId !== null} onOpenChange={o => !o && setAuditId(null)}><DialogContent><DialogHeader><DialogTitle>Historial de correcciones</DialogTitle></DialogHeader>
        {audit.length ? audit.map(a => <div key={a.id} className="text-sm border-b pb-2 break-words"><p>{a.campo}: {a.valor_anterior} → {a.valor_nuevo}</p><p className="text-xs text-muted-foreground">{a.username} · {formatDate(a.changed_at)}</p></div>) : <p className="text-sm text-muted-foreground">Sin correcciones.</p>}
      </DialogContent></Dialog>
      <PayrollConfigDialog open={configDlg} onClose={() => setConfigDlg(false)} />
      <PrestacionesDialog open={prestacionesDlg} onClose={() => setPrestacionesDlg(false)} />
    </div>
  )
}
