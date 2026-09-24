import { Fragment, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, Calculator, ChevronDown, ChevronUp, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { payrollApi } from '@/api/payroll'
import { finanzasApi } from '@/api/finanzas'
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
  personal_id: '', employee_name: '', role: 'Abogado', period: currentPeriod(), payment_date: today(), notes: '',
  amount: '', salario_base: '', horas_extra_cantidad: '0', nocturnidad_horas: '0', bonificaciones: '0',
  otros_ingresos: '0', descuento_faltas: '0', descuento_prestamos: '0', otros_descuentos: '0',
}

function money(n: number) {
  return formatCurrency(n)
}

export default function Payroll() {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [configDlg, setConfigDlg] = useState(false)
  const [prestacionesDlg, setPrestacionesDlg] = useState(false)
  const [modo, setModo] = useState<PayrollModo>('calculado')
  const [form, setForm] = useState<FormData>(EMPTY)
  const [filterPeriod, setFilterPeriod] = useState(currentPeriod())
  const [preview, setPreview] = useState<PayrollPreview | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [editing, setEditing] = useState<PayrollEntry | null>(null)
  const [editForm, setEditForm] = useState({ payment_date: '', notes: '', amount: '' })

  const { data: all = [], isLoading } = useQuery({ queryKey: ['payroll'], queryFn: payrollApi.list })
  const { data: personal = [] } = useQuery({ queryKey: ['finanzas-personal', 'Activo'], queryFn: () => finanzasApi.listPersonal('Activo') })

  const entries = filterPeriod ? all.filter((e) => e.period === filterPeriod) : all
  const usaOtro = form.personal_id === OTRO
  const personaSeleccionada = personal.find((p) => String(p.id) === form.personal_id)

  const create = useMutation({
    mutationFn: (d: PayrollIn) => payrollApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Registro creado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: payrollApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Eliminado') },
  })
  const update = useMutation({
    mutationFn: (d: { id: number; payment_date: string; notes: string; amount: number }) =>
      payrollApi.update(d.id, { payment_date: d.payment_date, notes: d.notes, amount: d.amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Corregido'); setEditing(null) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const previewMut = useMutation({
    mutationFn: () => payrollApi.preview({
      salario_base: Number(form.salario_base || 0),
      horas_extra_cantidad: Number(form.horas_extra_cantidad || 0),
      nocturnidad_horas: Number(form.nocturnidad_horas || 0),
      bonificaciones: Number(form.bonificaciones || 0),
      otros_ingresos: Number(form.otros_ingresos || 0),
      descuento_faltas: Number(form.descuento_faltas || 0),
      descuento_prestamos: Number(form.descuento_prestamos || 0),
      otros_descuentos: Number(form.otros_descuentos || 0),
      fecha: form.payment_date,
    }),
    onSuccess: setPreview,
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'No se pudo calcular'),
  })

  function openNew() {
    setForm(EMPTY)
    setModo('calculado')
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
    if (!form.period) return toast.error('El período es requerido')

    create.mutate({
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

  const f = (k: keyof FormData) => (v: string) => { setForm((p) => ({ ...p, [k]: v })); setPreview(null) }
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
        <div className="flex gap-3">
          <Input type="month" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="w-40" />
          <Button variant="outline" onClick={() => setPrestacionesDlg(true)}><Calculator className="h-4 w-4" />Prestaciones</Button>
          <Button variant="outline" onClick={() => setConfigDlg(true)}><Settings2 className="h-4 w-4" />Config. de ley</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4" />Nuevo pago</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Registros en período</p><p className="text-xl font-bold mt-1">{entries.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Total pagado (neto)</p><p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(total)}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Costo para el despacho</p><p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(totalCosto)}</p><p className="text-[11px] text-muted-foreground mt-0.5">Devengado + aporte patronal</p></CardContent></Card>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Cargando...</p> : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{['', 'Fecha', 'Colaborador', 'Rol', 'Período', 'Modo', 'Neto', 'Costo despacho', ''].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr>
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
                      <td className="px-4 py-3 font-semibold" title="Devengado + aporte patronal: es lo que sale de la caja y llega a Flujo de caja">
                        {formatCurrency(e.costo_empresa || e.amount)}
                      </td>
                      <td className="px-4 py-3 flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(e); setEditForm({ payment_date: e.payment_date, notes: e.notes ?? '', amount: String(e.amount) }) }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar registro? Se borrará también el gasto asociado.')) remove.mutate(e.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </td>
                    </tr>
                    {expanded === e.id && e.modo === 'calculado' && (
                      <tr className="border-t bg-muted/20">
                        <td colSpan={8} className="px-6 py-3">
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
                              {' '}El gasto que llega a Flujo de caja es el costo para el despacho: devengado {money(e.total_devengado)} + patronal = <span className="font-medium">{money(e.costo_empresa || e.amount)}</span>,
                              porque lo retenido a la persona también lo desembolsa la firma (hacia ISSS, AFP y Hacienda).
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {!entries.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Sin registros en {filterPeriod || 'este período'}</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo pago de planilla</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg">
              <button type="button" onClick={() => { setModo('calculado'); setPreview(null) }} className={`py-1.5 rounded-md text-sm font-medium transition-colors ${modo === 'calculado' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Planilla calculada</button>
              <button type="button" onClick={() => { setModo('manual'); setPreview(null) }} className={`py-1.5 rounded-md text-sm font-medium transition-colors ${modo === 'manual' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Pago manual (bono/ajuste)</button>
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
                    {personal.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.persona} — {p.cargo}</SelectItem>)}
                    {modo === 'manual' && <SelectItem value={OTRO}>Otro (no está en el catálogo de Personal)</SelectItem>}
                  </SelectContent>
                </Select>
                {modo === 'calculado' && personaSeleccionada && !personaSeleccionada.account_id && (
                  <p className="text-[11px] text-destructive">Esta persona no tiene cuenta contable enlazada — asígnala en Finanzas → Personal antes de guardar.</p>
                )}
              </div>
              {modo === 'manual' && usaOtro && (
                <>
                  <div className="space-y-1 col-span-2"><Label>Nombre colaborador <span className="text-destructive text-xs">*</span></Label><Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Rol</Label><Select value={form.role} onValueChange={f('role')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
                </>
              )}
              <div className="space-y-1"><Label>Período <span className="text-destructive text-xs">*</span></Label><Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
              <div className="space-y-1"><Label>Fecha de pago</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>

              {modo === 'manual' ? (
                <div className="space-y-1 col-span-2"><Label>Monto <span className="text-destructive text-xs">*</span></Label><Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              ) : (
                <>
                  <div className="space-y-1"><Label>Salario base ($) <span className="text-destructive text-xs">*</span></Label><Input type="number" step="0.01" value={form.salario_base} onChange={(e) => f('salario_base')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Horas extra</Label><Input type="number" step="0.5" min="0" value={form.horas_extra_cantidad} onChange={(e) => f('horas_extra_cantidad')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Horas de nocturnidad</Label><Input type="number" step="0.5" min="0" value={form.nocturnidad_horas} onChange={(e) => f('nocturnidad_horas')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Bonificaciones ($)</Label><Input type="number" step="0.01" min="0" value={form.bonificaciones} onChange={(e) => f('bonificaciones')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Otros ingresos ($)</Label><Input type="number" step="0.01" min="0" value={form.otros_ingresos} onChange={(e) => f('otros_ingresos')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Descuento por faltas ($)</Label><Input type="number" step="0.01" min="0" value={form.descuento_faltas} onChange={(e) => f('descuento_faltas')(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Descuento por préstamos ($)</Label><Input type="number" step="0.01" min="0" value={form.descuento_prestamos} onChange={(e) => f('descuento_prestamos')(e.target.value)} /></div>
                  <div className="space-y-1 col-span-2"><Label>Otros descuentos ($)</Label><Input type="number" step="0.01" min="0" value={form.otros_descuentos} onChange={(e) => f('otros_descuentos')(e.target.value)} /></div>
                </>
              )}
              <div className="space-y-1 col-span-2"><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>

            {modo === 'calculado' && (
              <div className="space-y-2">
                <Button type="button" variant="outline" size="sm" className="w-full" disabled={!form.salario_base || previewMut.isPending} onClick={() => previewMut.mutate()}>
                  <Calculator className="h-3.5 w-3.5" />Calcular vista previa
                </Button>
                {preview && (
                  <div className="rounded-lg border p-3 space-y-1.5 text-xs bg-muted/30">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total devengado</span><span className="font-medium">{money(preview.total_devengado)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">ISSS empleado</span><span>−{money(preview.isss_empleado)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">AFP empleado</span><span>−{money(preview.afp_empleado)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Renta (ISR)</span><span>−{money(preview.renta)}</span></div>
                    {(preview.descuento_faltas + preview.descuento_prestamos + preview.otros_descuentos) > 0 && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Faltas/préstamos/otros</span><span>−{money(preview.descuento_faltas + preview.descuento_prestamos + preview.otros_descuentos)}</span></div>
                    )}
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
            <p className="text-xs text-muted-foreground">Solo se puede corregir fecha, notas y el neto — el desglose de ley no se recalcula aquí. Cada corrección queda registrada. Para cambiar el salario base o las variables del mes, elimina y vuelve a crear el pago.</p>
            <div className="space-y-1"><Label>Fecha de pago</Label><Input type="date" value={editForm.payment_date} onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Monto (neto)</Label><Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notas</Label><Textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" disabled={update.isPending}>Guardar corrección</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PayrollConfigDialog open={configDlg} onClose={() => setConfigDlg(false)} />
      <PrestacionesDialog open={prestacionesDlg} onClose={() => setPrestacionesDlg(false)} />
    </div>
  )
}
