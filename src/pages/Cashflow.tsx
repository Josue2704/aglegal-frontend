import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, TrendingUp, TrendingDown, Users, ArrowUpDown, Download, Paperclip } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { incomesApi } from '@/api/incomes'
import { expensesApi } from '@/api/expenses'
import { costsApi } from '@/api/costs'
import { clientsApi } from '@/api/clients'
import { casesApi } from '@/api/cases'
import { categoriesApi } from '@/api/categories'
import { dashboardApi } from '@/api/dashboard'
import type { Income, IncomeIn, Expense, ExpenseIn, Cost, CostIn, ClientCashflowItem } from '@/types'
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

// ─── Income Tab ───────────────────────────────────────────────────────────────
type IncomeForm = { amount: string; date: string; client_id: string; case_id: string; category_id: string; detail: string }
const EMPTY_INC: IncomeForm = { amount: '', date: today(), client_id: '', case_id: '', category_id: '', detail: '' }

function IncomesTab({ start, end }: { start: string; end: string }) {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Income | null>(null)
  const [form, setForm] = useState<IncomeForm>(EMPTY_INC)

  const params = { start_date: start || undefined, end_date: end || undefined }
  const { data: incomes = [] } = useQuery({ queryKey: ['incomes', params], queryFn: () => incomesApi.list(params) })
  const { data: clients = [] } = useQuery({ queryKey: ['client-choices'], queryFn: clientsApi.choices })
  const { data: caseChoices = [] } = useQuery({ queryKey: ['case-choices'], queryFn: () => casesApi.choices() })
  const { data: cats = [] } = useQuery({ queryKey: ['categories', 'income'], queryFn: () => categoriesApi.list('income') })

  const toPayload = (): IncomeIn => ({
    amount: Number(form.amount),
    income_date: form.date,
    client_id: form.client_id ? Number(form.client_id) : null,
    case_id: form.case_id ? Number(form.case_id) : null,
    category_id: form.category_id ? Number(form.category_id) : null,
    detail: form.detail,
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

  function openNew() { setEditing(null); setForm(EMPTY_INC); setDlg(true) }
  function openEdit(i: Income) {
    setEditing(i)
    setForm({ amount: String(i.amount), date: i.income_date, client_id: i.client_id ? String(i.client_id) : '', case_id: i.case_id ? String(i.case_id) : '', category_id: i.category_id ? String(i.category_id) : '', detail: i.detail ?? '' })
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
      ['Fecha', 'Detalle', 'Cliente', 'Caso', 'Categoría', 'Monto'],
      (sortedInc as unknown as Income[]).map((i) => [i.income_date, i.detail || i.concept, i.client_name, i.case_title, i.category_name, i.amount]),
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
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Categoría</th>
                <SortableTh label="Monto" colKey="amount" currentKey={incKey as string} dir={incDir} onSort={incToggle as (k: string) => void} />
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
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{i.category_name ?? '—'}</td>
                  <td className="px-4 py-2.5 font-semibold text-green-700">{formatCurrency(i.amount)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Adjuntos" onClick={() => setAttachIncome(i)}><Paperclip className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(i)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar ingreso?')) remove.mutate(i.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!incomes.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin ingresos en el período</td></tr>}
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
              <div className="space-y-1 col-span-2"><Label>Categoría</Label><Select value={form.category_id} onValueChange={f('category_id')}><SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger><SelectContent><SelectItem value="">Ninguna</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1 col-span-2"><Label>Detalle</Label><Input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} placeholder="Descripción del ingreso" /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button><Button type="submit">Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────
type ExpForm = { amount: string; date: string; category_id: string; detail: string; notes: string }
const EMPTY_EXP: ExpForm = { amount: '', date: today(), category_id: '', detail: '', notes: '' }

function ExpensesTab({ start, end }: { start: string; end: string }) {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<ExpForm>(EMPTY_EXP)

  const params = { start_date: start || undefined, end_date: end || undefined }
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', params], queryFn: () => expensesApi.list(params) })
  const { data: cats = [] } = useQuery({ queryKey: ['categories', 'expense'], queryFn: () => categoriesApi.list('expense') })

  const toPayload = (): ExpenseIn => ({ amount: Number(form.amount), expense_date: form.date, category_id: form.category_id ? Number(form.category_id) : null, detail: form.detail, notes: form.notes })

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
  function openEdit(e: Expense) { setEditing(e); setForm({ amount: String(e.amount), date: e.expense_date, category_id: e.category_id ? String(e.category_id) : '', detail: e.detail ?? '', notes: e.notes ?? '' }); setDlg(true) }

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
      ['Fecha', 'Detalle', 'Categoría', 'Notas', 'Monto'],
      (sortedExp as unknown as Expense[]).map((e) => [e.expense_date, e.detail || e.concept, e.category_name, e.notes, e.amount]),
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
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Categoría</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Notas</th>
                <SortableTh label="Monto" colKey="amount" currentKey={expKey as string} dir={expDir} onSort={expToggle as (k: string) => void} />
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {(sortedExp as unknown as Expense[]).map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5">{formatDate(e.expense_date)}</td>
                  <td className="px-4 py-2.5 max-w-[200px] truncate">{e.detail || e.concept}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.category_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-[150px] truncate">{e.notes ?? '—'}</td>
                  <td className="px-4 py-2.5 font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Adjuntos" onClick={() => setAttachExpense(e)}><Paperclip className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar gasto?')) remove.mutate(e.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!expenses.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin gastos en el período</td></tr>}
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
              <div className="space-y-1 col-span-2"><Label>Categoría</Label><Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}><SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger><SelectContent><SelectItem value="">Ninguna</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
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
type CostForm = { amount: string; date: string; client_id: string; case_id: string; category_id: string; detail: string; notes: string }
const EMPTY_COST: CostForm = { amount: '', date: today(), client_id: '', case_id: '', category_id: '', detail: '', notes: '' }

function CostsTab({ start, end }: { start: string; end: string }) {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Cost | null>(null)
  const [form, setForm] = useState<CostForm>(EMPTY_COST)

  const params = { start_date: start || undefined, end_date: end || undefined }
  const { data: costs = [] } = useQuery({ queryKey: ['costs', params], queryFn: () => costsApi.list(params) })
  const { data: clients = [] } = useQuery({ queryKey: ['client-choices'], queryFn: clientsApi.choices })
  const { data: caseChoices = [] } = useQuery({ queryKey: ['case-choices'], queryFn: () => casesApi.choices() })
  const { data: cats = [] } = useQuery({ queryKey: ['categories', 'cost'], queryFn: () => categoriesApi.list('cost') })

  const toPayload = (): CostIn => ({
    amount: Number(form.amount),
    cost_date: form.date,
    client_id: form.client_id ? Number(form.client_id) : null,
    case_id: form.case_id ? Number(form.case_id) : null,
    category_id: form.category_id ? Number(form.category_id) : null,
    detail: form.detail,
    notes: form.notes,
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

  function openNew() { setEditing(null); setForm(EMPTY_COST); setDlg(true) }
  function openEdit(c: Cost) { setEditing(c); setForm({ amount: String(c.amount), date: c.cost_date, client_id: c.client_id ? String(c.client_id) : '', case_id: c.case_id ? String(c.case_id) : '', category_id: c.category_id ? String(c.category_id) : '', detail: c.detail ?? '', notes: c.notes ?? '' }); setDlg(true) }

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
      ['Fecha', 'Detalle', 'Cliente', 'Caso', 'Categoría', 'Monto'],
      (sortedCosts as unknown as Cost[]).map((c) => [c.cost_date, c.detail || c.concept, c.client_name, c.case_title, c.category_name, c.amount]),
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
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Categoría</th>
                <SortableTh label="Monto" colKey="amount" currentKey={costKey as string} dir={costDir} onSort={costToggle as (k: string) => void} />
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
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.category_name ?? '—'}</td>
                  <td className="px-4 py-2.5 font-semibold text-orange-700">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Adjuntos" onClick={() => setAttachCost(c)}><Paperclip className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar costo?')) remove.mutate(c.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!costs.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Sin costos en el período</td></tr>}
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
              <div className="space-y-1 col-span-2"><Label>Categoría</Label><Select value={form.category_id} onValueChange={f('category_id')}><SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger><SelectContent><SelectItem value="">Ninguna</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
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
