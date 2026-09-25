import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { casesApi } from '@/api/cases'
import { finanzasApi } from '@/api/finanzas'
import type { CaseTask, GlobalCaseTask } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatCurrency, today } from '@/lib/utils'

/** Cerrar una tarea es dejar constancia de tres cosas: cuándo se terminó de verdad,
 *  qué costó al final y qué se obtuvo. Antes había que llenarlas por separado. */
export function TaskCierreDialog({ tarea, onClose }: {
  tarea: CaseTask | GlobalCaseTask | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [fecha, setFecha] = useState(today())
  const [resultado, setResultado] = useState('')
  const [costo, setCosto] = useState('')
  const [cuenta, setCuenta] = useState('')
  const [reembolsable, setReembolsable] = useState(false)

  const { data: cuentas = [] } = useQuery({
    queryKey: ['finanzas-cuentas', 'Egreso', 'Activo'],
    queryFn: () => finanzasApi.listCuentas({ tipo: 'Egreso', estado: 'Activo' }),
    enabled: !!tarea,
  })

  useEffect(() => {
    if (!tarea) return
    setFecha(tarea.completed_at ?? today())
    setResultado(tarea.completed_notes ?? '')
    // Se arranca del costo real si ya lo tenía; si no, del estimado, que es la mejor pista.
    const base = tarea.costo_real || tarea.costo_estimado
    setCosto(base ? String(base) : '')
    setCuenta(tarea.costo_account_id ? String(tarea.costo_account_id) : '')
    setReembolsable(tarea.costo_es_reembolsable)
  }, [tarea])

  const cerrar = useMutation({
    mutationFn: () => casesApi.cerrarTask(tarea!.id, {
      completed_at: fecha,
      completed_notes: resultado.trim(),
      costo_real: costo ? Number(costo) : 0,
      costo_account_id: cuenta ? Number(cuenta) : null,
      costo_es_reembolsable: reembolsable,
    }),
    onSuccess: () => {
      for (const key of [['all-tasks'], ['case-tasks'], ['cases'], ['cashflow'], ['dashboard-alerts']]) {
        qc.invalidateQueries({ queryKey: key })
      }
      toast.success('Tarea cerrada')
      onClose()
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'No se pudo cerrar la tarea'),
  })

  const estimado = tarea?.costo_estimado ?? 0
  const diferencia = costo ? Number(costo) - estimado : 0

  return (
    <Dialog open={!!tarea} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Cerrar — {tarea?.title}</DialogTitle></DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>¿Qué se obtuvo? <span className="text-destructive text-xs">*</span></Label>
            <Textarea rows={3} value={resultado} onChange={(e) => setResultado(e.target.value)}
              placeholder="Certificación literal obtenida y entregada al cliente..." autoFocus />
            <p className="text-[11px] text-muted-foreground">
              Esto es lo que queda como constancia de la diligencia en el expediente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha real de cumplimiento</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              {tarea?.due_date && (
                <p className="text-[11px] text-muted-foreground">
                  Estimada: {tarea.due_date}{tarea.due_date < fecha ? ' — se cerró después' : ''}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Costo final ($)</Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" value={costo}
                onChange={(e) => setCosto(e.target.value)} />
              {estimado > 0 && (
                <p className={`text-[11px] ${diferencia > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  Estimado {formatCurrency(estimado)}
                  {costo && diferencia !== 0 && ` · ${diferencia > 0 ? '+' : ''}${formatCurrency(diferencia)}`}
                </p>
              )}
            </div>
          </div>

          {Number(costo) > 0 && (
            <div className="space-y-2 rounded-lg p-3"
              style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
              <div className="space-y-1">
                <Label>Cuenta contable del costo <span className="text-destructive text-xs">*</span></Label>
                <Select value={cuenta} onValueChange={setCuenta}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Cuenta del gasto..." /></SelectTrigger>
                  <SelectContent>
                    {cuentas.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.account_code} — {c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" className="h-3.5 w-3.5" checked={reembolsable}
                  onChange={(e) => setReembolsable(e.target.checked)} />
                <span>Es reembolsable: se le recupera al cliente</span>
              </label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={cerrar.isPending}
            onClick={() => {
              if (!resultado.trim()) return toast.error('Escribe qué se obtuvo antes de cerrarla')
              if (Number(costo) > 0 && !cuenta) return toast.error('Indica la cuenta contable del costo')
              cerrar.mutate()
            }}>
            Cerrar tarea
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
