import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, Users, ArrowUpDown, Download, Paperclip, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { incomesApi } from '@/api/incomes'
import { expensesApi } from '@/api/expenses'
import { costsApi } from '@/api/costs'
import { clientsApi } from '@/api/clients'
import { casesApi } from '@/api/cases'
import { catalogoApi } from '@/api/catalogo'
import { finanzasApi } from '@/api/finanzas'
import { dashboardApi } from '@/api/dashboard'
import type { Income, IncomeIn, Expense, ExpenseIn, Cost, CostIn, ClientCashflowItem, Servicio } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency, formatDate, today, exportCsv } from '@/lib/utils'
import { useSortable } from '@/hooks/useSortable'
import { SortableTh } from '@/components/ui/sortable-th'
import { AttachmentsDialog } from '@/components/AttachmentsDialog'

function DateRange({ start, end, onStart, onEnd }: { start: string; end: string; onStart: (v: string) => void; onEnd: (v: string) => void }) {
  return (
    <div className="flex gap-2 items-center">
      <Input type="date" value={start} onChange={(e) => onStart(e.target.value)} className="w-36" />
      <span className="text-muted-foreground text-sm">—</span>
      <Input type="date" value={end} onChange={(e) => onEnd(e.target.value)} className="w-36" />
    </div>
  )
}

// ─── Clasificación contable (compartida por las 3 pestañas) ────────────────────

function CuentaSelect({ tipo, value, onChange }: { tipo: 'Ingreso' | 'Egreso'; value: string; onChange: (v: string) => void }) {
  const { data: cuentas = [] } = useQuery({ queryKey: ['finanzas-cuentas', tipo], queryFn: () => finanzasApi.listCuentas({ tipo }) })
  return (
    <div className="space-y-1">
      <Label>Cuenta contable</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
        <SelectContent>
          {cuentas.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.account_code} — {c.nombre}</SelectItem>)}
        </SelectContent>
      </Select>
      <p className="text-[11px] text-muted-foreground">
        Todo movimiento debe llevar un código de cuenta. ¿No encuentras la categoría que buscas?{' '}
        <Link to="/finanzas" target="_blank" className="underline hover:text-foreground">Créala en Finanzas → Plan de Cuentas</Link>.
      </p>
    </div>
  )
}

function ServicioPicker({ selected, onSelect, onClear }: { selected: { service_code: string; nombre: string } | null; onSelect: (s: Servicio) => void; onClear: () => void }) {
  const [q, setQ] = useState('')
  const { data: allServicios = [] } = useQuery({ queryKey: ['catalogo-servicios', 'Activo'], queryFn: () => catalogoApi.listServicios({ estado: 'Activo' }) })
  const matches = q.trim()
    ? allServicios.filter((s) => s.service_code.toLowerCase().includes(q.trim().toLowerCase()) || s.nombre.toLowerCase().includes(q.trim().toLowerCase()))
    : allServicios
  return (
    <div className="space-y-1">
      <Label>Servicio (si aplica)</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código o nombre..." className="pl-8" />
      </div>
      {selected && (
        <div className="text-xs px-2 py-1 rounded bg-muted inline-flex items-center gap-1 mt-1">
          <span className="font-mono">{selected.service_code}</span> — {selected.nombre}
          <button type="button" className="text-muted-foreground hover:text-foreground ml-1" onClick={onClear}>×</button>
        </div>
      )}
      {!selected && (
        <div className="border rounded-md max-h-48 overflow-y-auto mt-1" style={{ borderColor: 'hsl(var(--border))' }}>
          {matches.map((s) => (
            <button type="button" key={s.id} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/50 flex flex-col gap-0.5"
              onClick={() => { onSelect(s); setQ('') }}>
              <span className="flex gap-2"><span className="font-mono text-muted-foreground">{s.service_code}</span><span>{s.nombre}</span></span>
              <span className="text-[10px] text-muted-foreground/70">{s.category_code} › {s.subcategory_code}</span>
            </button>
          ))}
          {matches.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">Sin resultados</div>}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">Obligatorio para ingresos jurídicos y costos directos de expediente.</p>
    </div>
  )
}

function NetoPreview({ bruto, iva, reembolsable }: { bruto: string; iva: string; reembolsable: string }) {
  const neto = (Number(bruto) || 0) - (Number(iva) || 0) - (Number(reembolsable) || 0)
  return <p className="text-xs text-muted-foreground">Monto neto operativo (calculado): <span className="font-mono font-medium text-foreground">{formatCurrency(neto)}</span></p>
}

// ─── Income Tab ───────────────────────────────────────────────────────────────
type IncomeForm = {
  amount: string; date: string; client_id: string; case_id: string; detail: string
  account_id: string; service_id: string; monto_iva: string; monto_reembolsable: string
}
const EMPTY_INC: IncomeForm = { amount: '', date: today(), client_id: '', case_id: '', detail: '', account_id: '', service_id: '', monto_iva: '', monto_reembolsable: '' }

function IncomesTab({ start, end }: { start: string; end: string }) {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [form, setForm] = useState<IncomeForm>(EMPTY_INC)
  const [selectedService, setSelectedService] = useState<{ service_code: string; nombre: string } | null>(null)

  const params = { start_date: start || undefined, end_date: end || undefined }
  const { data: incomes = [] } = useQuery({ queryKey: ['incomes', params], queryFn: () => incomesApi.list(params) })
  const { data: clients = [] } = useQuery({ queryKey: ['client-choices'], queryFn: clientsApi.choices })
  const { data: caseChoices = [] } = useQuery({ queryKey: ['case-choices'], queryFn: () => casesApi.choices() })

  const toPayload = (): IncomeIn => ({
    amount: Number(form.amount),
    income_date: form.date,
    client_id: form.client_id ? Number(form.client_id) : null,
    case_id: form.case_id ? Number(form.case_id) : null,
    detail: form.detail,
    account_id: form.account_id ? Number(form.account_id) : null,
    service_id: form.service_id ? Number(form.service_id) : null,
    monto_iva: form.monto_iva ? Number(form.monto_iva) : null,
    monto_reembolsable: form.monto_reembolsable ? Number(form.monto_reembolsable) : null,
  })

  const createInc = useMutation({
    mutationFn: () => incomesApi.create(toPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); toast.success('Ingreso registrado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: (id: number) => incomesApi.update(id, toPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); toast.success('Ingreso actualizado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: incomesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['incomes'] }); toast.success('Eliminado') },
  })

  function openNew() { setEditing(null); setForm(EMPTY_INC); setSelectedService(null); setDlg(true) }
  function openEdit(i: Income) {
    setEditing(i)
    setForm({
      amount: String(i.amount), date: i.income_date, client_id: i.client_id ? String(i.client_id) : '', case_id: i.case_id ? String(i.case_id) : '', detail: i.detail ?? '',
      account_id: i.account_id ? String(i.account_id) : '', service_id: i.service_id ? String(i.service_id) : '',
      monto_iva: i.monto_iva ? String(i.monto_iva) : '', monto_reembolsable: i.monto_reembolsable ? String(i.monto_reembolsable) : '',
    })
    setSelectedService(i.service_id && i.service_code && i.service_nombre ? { service_code: i.service_code, nombre: i.service_nombre } : null)
    setDlg(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date) return toast.error('La fecha es requerida')
    if (!form.amount || Number(form.amount) <= 0) return toast.error('El monto debe ser mayor a 0')
    editing ? update.mutate(editing.id) : createInc.mutate()
  }

  const total = incomes.reduce((s, i) => s + i.amount, 0)
  const f = (k: keyof IncomeForm) => (v: string) => setForm((p) => ({ ...p, [k]: v }))
  const { sorted: sortedInc, sortKey: incKey, sortDir: incDir, toggle: incToggle } = useSortable(incomes as unknown as Record<string, unknown>[], 'income_date', 'desc')

  const [attachIncome, setAttachIncome] = useState<Income | null>(null)

  function downloadCsv() {
    exportCsv(`ingresos_${today()}.csv`,
      ['Fecha', 'Detalle', 'Cliente', 'Caso', 'Cuenta', 'Monto'],
      (sortedInc as unknown as Income[]).map((i) => [i.income_date, i.detail || i.concept, i.client_name, i.case_title, i.account_code, i.amount]),
    )
  }

  return (
    <>
      {attachIncome && (
        <AttachmentsDialog
          entityType="income"
          entityId={attachIncome.id}
          label={`${formatDate(attachIncome.income_date)} · ${attachIncome.detail || attachIncome.concept}`}
          onClose={() => setAttachIncome(null)}
        />
      )}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total: <span className="text-green-700 font-bold text-base">{formatCurrency(total)}</span></CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="h-4 w-4" />CSV</Button>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />Nuevo ingreso</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortableTh label="Fecha" colKey="income_date" currentKey={incKey as string} dir={incDir} onSort={incToggle as (k: string) => void} />
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Detalle</th>
                <SortableTh label="Cliente" colKey="client_name" currentKey={incKey as string} dir={incDir} onSort={incToggle as (k: string) => void} />
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Caso</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Cuenta</th>
                <SortableTh label="Monto" colKey="amount" currentKey={incKey as string} dir={incDir} onSort={incToggle as (k: string) => void} />
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Neto</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(sortedInc as unknown as Income[]).map((i) => (
                <tr key={i.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">{formatDate(i.income_date)}</td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{i.detail || i.concept}</span>
                      {i.invoice_number && (
                        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-blue-500/10 text-blue-500">
                          {i.invoice_number}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{i.client_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs truncate max-w-[120px]">{i.case_title ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-[11px] font-mono">{i.account_code ?? '—'}</td>
                  <td className="px-4 py-2.5 font-semibold text-green-700">{formatCurrency(i.amount)}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-mono text-muted-foreground">{formatCurrency(i.monto_neto_operativo)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Adjuntos" onClick={() => setAttachIncome(i)}><Paperclip className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar ingreso?')) remove.mutate(i.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!incomes.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Sin ingresos en el período</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar ingreso' : 'Nuevo ingreso'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Monto <span className="text-destructive text-xs">*</span></Label><Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-1"><Label>Fecha <span className="text-destructive text-xs">*</span></Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Cliente</Label><Select value={form.client_id} onValueChange={f('client_id')}><SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger><SelectContent><SelectItem value="">Ninguno</SelectItem>{clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Caso</Label><Select value={form.case_id} onValueChange={f('case_id')}><SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger><SelectContent><SelectItem value="">Ninguno</SelectItem>{caseChoices.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1 col-span-2"><Label>Detalle</Label><Input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="Descripción del ingreso" /></div>
              <div className="col-span-2"><CuentaSelect tipo="Ingreso" value={form.account_id} onChange={f('account_id')} /></div>
              <div className="col-span-2">
                <ServicioPicker
                  selected={selectedService}
                  onSelect={(s) => { setSelectedService({ service_code: s.service_code, nombre: s.nombre }); setForm({ ...form, service_id: String(s.id) }) }}
                  onClear={() => { setSelectedService(null); setForm({ ...form, service_id: '' }) }}
                />
              </div>
              <div className="space-y-1"><Label>IVA</Label><Input type="number" step="0.01" min="0" value={form.monto_iva} onChange={(e) => setForm({ ...form, monto_iva: e.target.value })} placeholder="0.00" /></div>
              <div className="space-y-1"><Label>Reembolsable</Label><Input type="number" step="0.01" min="0" value={form.monto_reembolsable} onChange={(e) => setForm({ ...form, monto_reembolsable: e.target.value })} placeholder="0.00" /></div>
              <div className="col-span-2"><NetoPreview bruto={form.amount} iva={form.monto_iva} reembolsable={form.monto_reembolsable} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button><Button type="submit">Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────
type ExpForm = { amount: string; date: string; detail: string; notes: string; account_id: string; monto_iva: string; monto_reembolsable: string }
const EMPTY_EXP: ExpForm = { amount: '', date: today(), detail: '', notes: '', account_id: '', monto_iva: '', monto_reembolsable: '' }

function ExpensesTab({ start, end }: { start: string; end: string }) {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<ExpForm>(EMPTY_EXP)

  const params = { start_date: start || undefined, end_date: end || undefined }
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', params], queryFn: () => expensesApi.list(params) })

  const toPayload = (): ExpenseIn => ({
    amount: Number(form.amount), expense_date: form.date, detail: form.detail, notes: form.notes,
    account_id: form.account_id ? Number(form.account_id) : null,
    monto_iva: form.monto_iva ? Number(form.monto_iva) : null,
    monto_reembolsable: form.monto_reembolsable ? Number(form.monto_reembolsable) : null,
  })

  const create = useMutation({
    mutationFn: () => expensesApi.create(toPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Gasto registrado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: (id: number) => expensesApi.update(id, toPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Gasto actualizado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Eliminado') },
  })

  function openNew() { setEditing(null); setForm(EMPTY_EXP); setDlg(true) }
  function openEdit(e: Expense) {
    setEditing(e)
    setForm({
      amount: String(e.amount), date: e.expense_date, detail: e.detail ?? '', notes: e.notes ?? '',
      account_id: e.account_id ? String(e.account_id) : '',
      monto_iva: e.monto_iva ? String(e.monto_iva) : '',
      monto_reembolsable: e.monto_reembolsable ? String(e.monto_reembolsable) : '',
    })
    setDlg(true)
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.date) return toast.error('La fecha es requerida')
    if (!form.amount || Number(form.amount) <= 0) return toast.error('El monto debe ser mayor a 0')
    if (!form.detail.trim()) return toast.error('El detalle es requerido')
    editing ? update.mutate(editing.id) : create.mutate()
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const { sorted: sortedExp, sortKey: expKey, sortDir: expDir, toggle: expToggle } = useSortable(expenses as unknown as Record<string, unknown>[], 'expense_date', 'desc')
  const [attachExpense, setAttachExpense] = useState<Expense | null>(null)

  function downloadCsv() {
    exportCsv(`gastos_${today()}.csv`,
      ['Fecha', 'Detalle', 'Cuenta', 'Notas', 'Monto'],
      (sortedExp as unknown as Expense[]).map((e) => [e.expense_date, e.detail || e.concept, e.account_code, e.notes, e.amount]),
    )
  }

  return (
    <>
      {attachExpense && (
        <AttachmentsDialog
          entityType="expense"
          entityId={attachExpense.id}
          label={`${formatDate(attachExpense.expense_date)} · ${attachExpense.detail || attachExpense.concept}`}
          onClose={() => setAttachExpense(null)}
        />
      )}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total: <span className="text-red-600 font-bold text-base">{formatCurrency(total)}</span></CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="h-4 w-4" />CSV</Button>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />Nuevo gasto</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortableTh label="Fecha" colKey="expense_date" currentKey={expKey as string} dir={expDir} onSort={expToggle as (k: string) => void} />
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Detalle</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Cuenta</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Notas</th>
                <SortableTh label="Monto" colKey="amount" currentKey={expKey as string} dir={expDir} onSort={expToggle as (k: string) => void} />
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Neto</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(sortedExp as unknown as Expense[]).map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">{formatDate(e.expense_date)}</td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate">{e.detail || e.concept}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.account_code ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[150px] truncate">{e.notes ?? '—'}</td>
                  <td className="px-4 py-2.5 font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatCurrency(e.monto_neto_operativo)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Adjuntos" onClick={() => setAttachExpense(e)}><Paperclip className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar gasto?')) remove.mutate(e.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!expenses.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin gastos en el período</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Monto <span className="text-destructive text-xs">*</span></Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-1"><Label>Fecha <span className="text-destructive text-xs">*</span></Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="col-span-2"><CuentaSelect tipo="Egreso" value={form.account_id} onChange={(v) => setForm({ ...form, account_id: v })} /></div>
              <div className="space-y-1"><Label>IVA</Label><Input type="number" step="0.01" min="0" value={form.monto_iva} onChange={(e) => setForm({ ...form, monto_iva: e.target.value })} placeholder="0.00" /></div>
              <div className="space-y-1"><Label>Reembolsable</Label><Input type="number" step="0.01" min="0" value={form.monto_reembolsable} onChange={(e) => setForm({ ...form, monto_reembolsable: e.target.value })} placeholder="0.00" /></div>
              <div className="col-span-2"><NetoPreview bruto={form.amount} iva={form.monto_iva} reembolsable={form.monto_reembolsable} /></div>
              <div className="space-y-1 col-span-2"><Label>Detalle <span className="text-destructive text-xs">*</span></Label><Input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Costs Tab ────────────────────────────────────────────────────────────────
type CostForm = { amount: string; date: string; client_id: string; case_id: string; detail: string; notes: string; account_id: string; service_id: string; monto_iva: string; monto_reembolsable: string }
const EMPTY_COST: CostForm = { amount: '', date: today(), client_id: '', case_id: '', detail: '', notes: '', account_id: '', service_id: '', monto_iva: '', monto_reembolsable: '' }

function CostsTab({ start, end }: { start: string; end: string }) {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Cost | null>(null)
  const [form, setForm] = useState<CostForm>(EMPTY_COST)
  const [selectedService, setSelectedService] = useState<{ service_code: string; nombre: string } | null>(null)

  const params = { start_date: start || undefined, end_date: end || undefined }
  const { data: costs = [] } = useQuery({ queryKey: ['costs', params], queryFn: () => costsApi.list(params) })
  const { data: clients = [] } = useQuery({ queryKey: ['client-choices'], queryFn: clientsApi.choices })
  const { data: caseChoices = [] } = useQuery({ queryKey: ['case-choices'], queryFn: () => casesApi.choices() })

  const toPayload = (): CostIn => ({
    amount: Number(form.amount),
    cost_date: form.date,
    client_id: form.client_id ? Number(form.client_id) : null,
    case_id: form.case_id ? Number(form.case_id) : null,
    detail: form.detail,
    notes: form.notes,
    account_id: form.account_id ? Number(form.account_id) : null,
    service_id: form.service_id ? Number(form.service_id) : null,
    monto_iva: form.monto_iva ? Number(form.monto_iva) : null,
    monto_reembolsable: form.monto_reembolsable ? Number(form.monto_reembolsable) : null,
  })

  const create = useMutation({
    mutationFn: () => costsApi.create(toPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['costs'] }); toast.success('Costo registrado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: (id: number) => costsApi.update(id, toPayload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['costs'] }); toast.success('Costo actualizado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: costsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['costs'] }); toast.success('Eliminado') },
  })

  function openNew() { setEditing(null); setForm(EMPTY_COST); setSelectedService(null); setDlg(true) }
  function openEdit(c: Cost) {
    setEditing(c)
    setForm({
      amount: String(c.amount), date: c.cost_date, client_id: c.client_id ? String(c.client_id) : '', case_id: c.case_id ? String(c.case_id) : '', detail: c.detail ?? '', notes: c.notes ?? '',
      account_id: c.account_id ? String(c.account_id) : '',
      service_id: c.service_id ? String(c.service_id) : '',
      monto_iva: c.monto_iva ? String(c.monto_iva) : '',
      monto_reembolsable: c.monto_reembolsable ? String(c.monto_reembolsable) : '',
    })
    setSelectedService(c.service_id ? { service_code: c.service_code ?? '', nombre: c.service_nombre ?? '' } : null)
    setDlg(true)
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.date) return toast.error('La fecha es requerida')
    if (!form.amount || Number(form.amount) <= 0) return toast.error('El monto debe ser mayor a 0')
    if (!form.detail.trim()) return toast.error('El detalle es requerido')
    editing ? update.mutate(editing.id) : create.mutate()
  }

  const total = costs.reduce((s, c) => s + c.amount, 0)
  const f = (k: keyof CostForm) => (v: string) => setForm((p) => ({ ...p, [k]: v }))
  const { sorted: sortedCosts, sortKey: costKey, sortDir: costDir, toggle: costToggle } = useSortable(costs as unknown as Record<string, unknown>[], 'cost_date', 'desc')
  const [attachCost, setAttachCost] = useState<Cost | null>(null)

  function downloadCsv() {
    exportCsv(`costos_${today()}.csv`,
      ['Fecha', 'Detalle', 'Cliente', 'Caso', 'Cuenta', 'Monto'],
      (sortedCosts as unknown as Cost[]).map((c) => [c.cost_date, c.detail || c.concept, c.client_name, c.case_title, c.account_code, c.amount]),
    )
  }

  return (
    <>
      {attachCost && (
        <AttachmentsDialog
          entityType="cost"
          entityId={attachCost.id}
          label={`${formatDate(attachCost.cost_date)} · ${attachCost.detail || attachCost.concept}`}
          onClose={() => setAttachCost(null)}
        />
      )}
      <Card>
        <CardHeader className="flex-row items-center justify-between py-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total: <span className="text-orange-600 font-bold text-base">{formatCurrency(total)}</span></CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={downloadCsv}><Download className="h-4 w-4" />CSV</Button>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />Nuevo costo</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <SortableTh label="Fecha" colKey="cost_date" currentKey={costKey as string} dir={costDir} onSort={costToggle as (k: string) => void} />
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Detalle</th>
                <SortableTh label="Cliente" colKey="client_name" currentKey={costKey as string} dir={costDir} onSort={costToggle as (k: string) => void} />
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Caso</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Cuenta</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Servicio</th>
                <SortableTh label="Monto" colKey="amount" currentKey={costKey as string} dir={costDir} onSort={costToggle as (k: string) => void} />
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Neto</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(sortedCosts as unknown as Cost[]).map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">{formatDate(c.cost_date)}</td>
                  <td className="px-4 py-2.5 max-w-[180px] truncate">{c.detail || c.concept}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.client_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs truncate max-w-[120px]">{c.case_title ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.account_code ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs truncate max-w-[120px]">{c.service_code ?? '—'}</td>
                  <td className="px-4 py-2.5 font-semibold text-orange-700">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatCurrency(c.monto_neto_operativo)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Adjuntos" onClick={() => setAttachCost(c)}><Paperclip className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar costo?')) remove.mutate(c.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!costs.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Sin costos en el período</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar costo' : 'Nuevo costo directo'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Monto <span className="text-destructive text-xs">*</span></Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-1"><Label>Fecha <span className="text-destructive text-xs">*</span></Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div className="space-y-1"><Label>Cliente</Label><Select value={form.client_id} onValueChange={f('client_id')}><SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger><SelectContent><SelectItem value="">Ninguno</SelectItem>{clients.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Caso</Label><Select value={form.case_id} onValueChange={f('case_id')}><SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger><SelectContent><SelectItem value="">Ninguno</SelectItem>{caseChoices.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2"><CuentaSelect tipo="Egreso" value={form.account_id} onChange={f('account_id')} /></div>
              <div className="col-span-2">
                <ServicioPicker
                  selected={selectedService}
                  onSelect={(s) => { setSelectedService({ service_code: s.service_code, nombre: s.nombre }); setForm({ ...form, service_id: String(s.id) }) }}
                  onClear={() => { setSelectedService(null); setForm({ ...form, service_id: '' }) }}
                />
              </div>
              <div className="space-y-1"><Label>IVA</Label><Input type="number" step="0.01" min="0" value={form.monto_iva} onChange={(e) => setForm({ ...form, monto_iva: e.target.value })} placeholder="0.00" /></div>
              <div className="space-y-1"><Label>Reembolsable</Label><Input type="number" step="0.01" min="0" value={form.monto_reembolsable} onChange={(e) => setForm({ ...form, monto_reembolsable: e.target.value })} placeholder="0.00" /></div>
              <div className="col-span-2"><NetoPreview bruto={form.amount} iva={form.monto_iva} reembolsable={form.monto_reembolsable} /></div>
              <div className="space-y-1 col-span-2"><Label>Detalle <span className="text-destructive text-xs">*</span></Label><Input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Clients Tab ─────────────────────────────────────────────────────────────
type SortKey = 'income' | 'cost' | 'balance' | 'margin_pct'

function ClientsTab({ start, end }: { start: string; end: string }) {
  const [sortBy, setSortBy] = useState<SortKey>('income')
  const params = { start_date: start || undefined, end_date: end || undefined }

  const { data: raw = [], isLoading } = useQuery<ClientCashflowItem[]>({
    queryKey: ['cashflow-by-client', params],
    queryFn: () => dashboardApi.cashflowByClient(params),
  })

  const items = [...raw].sort((a, b) => b[sortBy] - a[sortBy])

  const maxIncome = Math.max(...items.map((i) => i.income), 1)
  const totalIncome = items.reduce((s, i) => s + i.income, 0)
  const totalCost = items.reduce((s, i) => s + i.cost, 0)
  const totalBalance = totalIncome - totalCost
  const withClient = items.filter((i) => i.client_id !== null)

  const cols: { key: SortKey; label: string }[] = [
    { key: 'income', label: 'Ingresos' },
    { key: 'cost', label: 'Costos' },
    { key: 'balance', label: 'Margen €' },
    { key: 'margin_pct', label: 'Margen %' },
  ]

  if (isLoading) return <p className="text-muted-foreground text-sm py-8 text-center">Cargando...</p>
  if (!items.length) return (
    <div className="py-12 text-center text-muted-foreground">
      <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">No hay ingresos ni costos en el período seleccionado</p>
      <p className="text-xs mt-1 opacity-60">Registra ingresos o costos vinculados a un cliente para verlos aquí</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Clientes activos', value: withClient.length, isNum: false },
          { label: 'Total ingresos', value: formatCurrency(totalIncome), color: 'text-green-500', isNum: false },
          { label: 'Total costos', value: formatCurrency(totalCost), color: 'text-orange-500', isNum: false },
          { label: 'Balance neto', value: formatCurrency(totalBalance), color: totalBalance >= 0 ? 'text-green-500' : 'text-red-500', isNum: false },
        ].map((k) => (
          <div key={k.label} className="rounded-xl p-3" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${k.color ?? 'text-foreground'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground flex items-center gap-1"><ArrowUpDown className="h-3 w-3" />Ordenar por:</span>
        {cols.map((c) => (
          <button
            key={c.key}
            onClick={() => setSortBy(c.key)}
            className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
            style={
              sortBy === c.key
                ? { background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary) / 0.3)' }
                : { background: 'hsl(var(--c-nav-pill-bg))', color: 'hsl(var(--c-meta))', border: '1px solid hsl(var(--c-nav-pill-border))' }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {[...items.filter(i => i.client_id !== null), ...items.filter(i => i.client_id === null)].map((item) => {
          const incPct = maxIncome > 0 ? (item.income / maxIncome) * 100 : 0
          const costPct = maxIncome > 0 ? (item.cost / maxIncome) * 100 : 0
          const isPos = item.balance >= 0
          const isUnassigned = item.client_id === null

          return (
            <div
              key={`${item.client_id}-${item.client_name}`}
              className="rounded-xl p-4 transition-all"
              style={{
                background: isUnassigned ? 'transparent' : 'hsl(var(--card))',
                border: `1px solid hsl(var(--c-inner-border))`,
                opacity: isUnassigned ? 0.7 : 1,
              }}
            >
              <div className="flex items-start gap-4">
                {/* Name */}
                <div className="w-36 shrink-0">
                  {item.client_id ? (
                    <Link
                      to={`/clients?search=${encodeURIComponent(item.client_name)}`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate"
                    >
                      {item.client_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground italic truncate block">{item.client_name}</span>
                  )}
                  {item.client_id && (
                    <div className="flex gap-1 mt-1">
                      <Link
                        to={`/cases?client_id=${item.client_id}&client_name=${encodeURIComponent(item.client_name)}`}
                        className="text-[10px] text-accent hover:underline"
                      >casos</Link>
                      <span className="text-[10px] text-muted-foreground/40">·</span>
                      <Link
                        to={`/sessions?client_id=${item.client_id}&client_name=${encodeURIComponent(item.client_name)}`}
                        className="text-[10px] text-primary hover:underline"
                      >agenda</Link>
                    </div>
                  )}
                </div>

                {/* Bars + amounts */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Income bar */}
                  <div className="flex items-center gap-3">
                    <span className="w-14 text-right text-xs font-medium text-green-500 shrink-0">{formatCurrency(item.income)}</span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--c-surface-track))' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${incPct}%`, background: 'linear-gradient(90deg, hsl(142 70% 45%), hsl(142 70% 55%))' }}
                      />
                    </div>
                    <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
                  </div>
                  {/* Cost bar */}
                  {item.cost > 0 && (
                    <div className="flex items-center gap-3">
                      <span className="w-14 text-right text-xs font-medium text-orange-400 shrink-0">{formatCurrency(item.cost)}</span>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--c-surface-track))' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${costPct}%`, background: 'linear-gradient(90deg, hsl(25 90% 45%), hsl(25 90% 55%))' }}
                        />
                      </div>
                      <TrendingDown className="h-3 w-3 text-orange-400 shrink-0" />
                    </div>
                  )}
                </div>

                {/* Balance + margin */}
                <div className="text-right shrink-0 w-28">
                  <p className={`text-sm font-bold ${isPos ? 'text-green-500' : 'text-red-500'}`}>
                    {isPos ? '+' : ''}{formatCurrency(item.balance)}
                  </p>
                  <span
                    className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    style={
                      isPos
                        ? { background: 'hsl(142 70% 45% / 0.12)', color: 'hsl(142 70% 45%)', border: '1px solid hsl(142 70% 45% / 0.25)' }
                        : { background: 'hsl(0 70% 55% / 0.12)', color: 'hsl(0 70% 60%)', border: '1px solid hsl(0 70% 55% / 0.25)' }
                    }
                  >
                    {item.margin_pct > 0 ? '+' : ''}{item.margin_pct}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Cashflow() {
  const now = new Date()
  const [start, setStart] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [end, setEnd] = useState(today())

  const params = { start_date: start || undefined, end_date: end || undefined }
  const { data: incomes = [] } = useQuery({ queryKey: ['incomes', params], queryFn: () => incomesApi.list(params) })
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', params], queryFn: () => expensesApi.list(params) })
  const { data: costs = [] } = useQuery({ queryKey: ['costs', params], queryFn: () => costsApi.list(params) })

  const totalInc = incomes.reduce((s, i) => s + i.amount, 0)
  const totalExp = expenses.reduce((s, e) => s + e.amount, 0)
  const totalCost = costs.reduce((s, c) => s + c.amount, 0)
  const balance = totalInc - totalExp - totalCost

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Flujo de Caja</h1>
          <p className="text-muted-foreground text-sm">Ingresos, gastos operativos y costos directos</p>
        </div>
        <DateRange start={start} end={end} onStart={setStart} onEnd={setEnd} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ingresos', value: totalInc, color: 'text-green-700' },
          { label: 'Gastos operativos', value: totalExp, color: 'text-red-600' },
          { label: 'Costos directos', value: totalCost, color: 'text-orange-600' },
          { label: 'Balance', value: balance, color: balance >= 0 ? 'text-green-700' : 'text-red-600' },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-xl font-bold mt-1 ${k.color}`}>{formatCurrency(k.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="incomes">
        <TabsList>
          <TabsTrigger value="incomes">Ingresos ({incomes.length})</TabsTrigger>
          <TabsTrigger value="expenses">Gastos ({expenses.length})</TabsTrigger>
          <TabsTrigger value="costs">Costos Directos ({costs.length})</TabsTrigger>
          <TabsTrigger value="by-client">
            <Users className="h-3.5 w-3.5 mr-1" />
            Por cliente
          </TabsTrigger>
        </TabsList>
        <TabsContent value="incomes"><IncomesTab start={start} end={end} /></TabsContent>
        <TabsContent value="expenses"><ExpensesTab start={start} end={end} /></TabsContent>
        <TabsContent value="costs"><CostsTab start={start} end={end} /></TabsContent>
        <TabsContent value="by-client" className="pt-2"><ClientsTab start={start} end={end} /></TabsContent>
      </Tabs>
    </div>
  )
}
