import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { payrollApi } from '@/api/payroll'
import type { PayrollIn } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency, formatDate, today } from '@/lib/utils'

const ROLES = ['Abogado', 'Asistente', 'Contador', 'Recepcionista', 'Notario', 'Pasante', 'Otro']

type FormData = { employee_name: string; role: string; period: string; amount: string; payment_date: string; notes: string }

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const EMPTY: FormData = { employee_name: '', role: 'Abogado', period: currentPeriod(), amount: '', payment_date: today(), notes: '' }

export default function Payroll() {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [filterPeriod, setFilterPeriod] = useState(currentPeriod())

  const { data: all = [], isLoading } = useQuery({ queryKey: ['payroll'], queryFn: payrollApi.list })

  const entries = filterPeriod ? all.filter((e) => e.period === filterPeriod) : all

  const create = useMutation({
    mutationFn: (d: PayrollIn) => payrollApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Registro creado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: payrollApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payroll'] }); toast.success('Eliminado') },
  })

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.employee_name.trim() || !form.amount || !form.period) return toast.error('Nombre, período y monto son requeridos')
    create.mutate({ employee_name: form.employee_name, role: form.role, period: form.period, amount: Number(form.amount), payment_date: form.payment_date, notes: form.notes })
  }

  const f = (k: keyof FormData) => (v: string) => setForm((p) => ({ ...p, [k]: v }))
  const total = entries.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Planilla</h1>
          <p className="text-muted-foreground text-sm">Gestión de pagos a colaboradores</p>
        </div>
        <div className="flex gap-3">
          <Input type="month" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="w-40" />
          <Button onClick={() => { setForm(EMPTY); setDlg(true) }}><Plus className="h-4 w-4" />Nuevo pago</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Registros en período</p><p className="text-xl font-bold mt-1">{entries.length}</p></CardContent></Card>
        <Card><CardContent className="pt-5"><p className="text-xs text-muted-foreground">Total pagado</p><p className="text-xl font-bold mt-1 text-red-600">{formatCurrency(total)}</p></CardContent></Card>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Cargando...</p> : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{['Fecha', 'Colaborador', 'Rol', 'Período', 'Monto', ''].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">{formatDate(e.payment_date)}</td>
                    <td className="px-4 py-3 font-medium">{e.employee_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.role ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{e.period}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-3">
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar registro?')) remove.mutate(e.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
                {!entries.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin registros en {filterPeriod || 'este período'}</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo pago de planilla</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Nombre colaborador *</Label><Input value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Rol</Label><Select value={form.role} onValueChange={f('role')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label>Período *</Label><Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
              <div className="space-y-1"><Label>Monto *</Label><Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div className="space-y-1"><Label>Fecha de pago</Label><Input type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
              <div className="space-y-1 col-span-2"><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
