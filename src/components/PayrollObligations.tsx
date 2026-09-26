import { FormGuidance } from '@/components/FormGuidance'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { payrollApi, type PayrollObligation } from '@/api/payroll'
import { usePermission } from '@/hooks/usePermission'
import { formatCurrency, formatDate, today } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function PayrollObligations({ period, employee }: { period: string; employee: string }) {
  const qc = useQueryClient()
  const canPay = usePermission('nominas', 'crear')
  const canReverse = usePermission('nominas', 'eliminar')
  const { data = [], isError } = useQuery({ queryKey: ['payroll-obligations'], queryFn: payrollApi.obligations })
  const [selected, setSelected] = useState<PayrollObligation | null>(null)
  const [date, setDate] = useState(today())
  const [reference, setReference] = useState('')
  const rows = data.filter(r => (!period || r.period === period) && (employee === 'all' || (r.personal_id ? `person:${r.personal_id}` : `manual:${r.employee_name}`) === employee))
  const action = useMutation({
    mutationFn: () => selected!.expense_id
      ? payrollApi.reverseObligation(selected!.id, reference)
      : payrollApi.payObligation(selected!.id, { payment_date: date, reference }),
    onSuccess: () => { qc.invalidateQueries(); setSelected(null); toast.success('Obligación actualizada') },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'No se pudo registrar'),
  })
  return <section className="space-y-3 rounded-xl border p-4">
    <h2 className="font-semibold">Obligaciones de planilla</h2>
    <p className="text-sm text-muted-foreground">Pendiente de remitir: <strong>{formatCurrency(rows.filter(r => !r.expense_id).reduce((s,r) => s + r.amount,0))}</strong>. ISSS y AFP incluyen la parte del empleado y la patronal. Registra el pago después de realizar la transferencia; esta acción no mueve dinero en el banco.</p>
    {isError && <p role="alert" className="text-destructive">No se pudieron cargar las obligaciones.</p>}
    {!rows.length && !isError && <p className="text-sm text-muted-foreground">Sin obligaciones para este filtro. Los registros anteriores conservan su contabilización original.</p>}
    <div className="space-y-2">{rows.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
      <div className="min-w-0 break-words"><p className="font-medium">{r.kind} · {r.employee_name} · {r.period}</p><p>{formatCurrency(r.amount)} · {r.expense_id ? `Pagado ${formatDate(r.payment_date!)} · ${r.reference}` : 'Pendiente'}</p></div>
      {((r.expense_id && canReverse) || (!r.expense_id && canPay)) && <Button size="sm" variant="outline" onClick={() => { setSelected(r); setDate(today()); setReference('') }}>{r.expense_id ? 'Anular pago' : 'Registrar pago'}</Button>}
    </div>)}</div>
    <Dialog open={!!selected} onOpenChange={o => !action.isPending && !o && setSelected(null)}><DialogContent><DialogHeader><DialogTitle>{selected?.expense_id ? 'Anular pago' : 'Registrar pago'} de {selected?.kind}</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); action.mutate() }}>
        <FormGuidance required={selected?.expense_id ? 'Motivo de anulación.' : 'Fecha efectiva de pago y referencia o comprobante.'} optional="Ninguno de los campos mostrados." missing={[!reference.trim() && (selected?.expense_id ? 'motivo' : 'comprobante'), !selected?.expense_id && !date && 'fecha']} /><p className="text-sm">{selected?.employee_name} · {formatCurrency(selected?.amount ?? 0)}</p>
        {!selected?.expense_id && <div className="space-y-1"><Label>Fecha efectiva de pago</Label><Input required type="date" value={date} onChange={e => setDate(e.target.value)} /></div>}
        <div className="space-y-1"><Label>{selected?.expense_id ? 'Motivo de anulación' : 'Referencia o comprobante'}</Label><Input required value={reference} onChange={e => setReference(e.target.value)} /></div>
        <DialogFooter><Button type="button" variant="outline" disabled={action.isPending} onClick={() => setSelected(null)}>Cancelar</Button><Button disabled={action.isPending || !reference.trim()}>Confirmar</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </section>
}
