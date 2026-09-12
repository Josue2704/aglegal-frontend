import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { payrollApi } from '@/api/payroll'
import type { AguinaldoResultado, VacacionesResultado, IndemnizacionResultado } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'

const money = formatCurrency

export function PrestacionesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState('aguinaldo')

  // Aguinaldo
  const [agSalario, setAgSalario] = useState('')
  const [agAnios, setAgAnios] = useState('')
  const [agDias, setAgDias] = useState('')
  const [agResultado, setAgResultado] = useState<AguinaldoResultado | null>(null)
  const aguinaldoMut = useMutation({
    mutationFn: () => payrollApi.calcularAguinaldo({
      salario_base: Number(agSalario), anios_antiguedad: Number(agAnios),
      dias_trabajados_en_anio: agDias ? Number(agDias) : null,
    }),
    onSuccess: setAgResultado,
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  // Vacaciones
  const [vSalario, setVSalario] = useState('')
  const [vResultado, setVResultado] = useState<VacacionesResultado | null>(null)
  const vacacionesMut = useMutation({
    mutationFn: () => payrollApi.calcularVacaciones({ salario_base: Number(vSalario) }),
    onSuccess: setVResultado,
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  // Indemnización
  const [iSalario, setISalario] = useState('')
  const [iAnios, setIAnios] = useState('')
  const [iResultado, setIResultado] = useState<IndemnizacionResultado | null>(null)
  const indemnizacionMut = useMutation({
    mutationFn: () => payrollApi.calcularIndemnizacion({ salario_base: Number(iSalario), anios_servicio: Number(iAnios) }),
    onSuccess: setIResultado,
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Calculadora de prestaciones de ley</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Aguinaldo (Art. 198), vacaciones (Art. 177) e indemnización (Art. 58) del Código de Trabajo — cálculos
          independientes de la planilla mensual, no se guardan automáticamente.
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="aguinaldo">Aguinaldo</TabsTrigger>
            <TabsTrigger value="vacaciones">Vacaciones</TabsTrigger>
            <TabsTrigger value="indemnizacion">Indemnización</TabsTrigger>
          </TabsList>

          <TabsContent value="aguinaldo" className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Salario base mensual ($)</Label><Input type="number" step="0.01" value={agSalario} onChange={(e) => { setAgSalario(e.target.value); setAgResultado(null) }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Años de antigüedad</Label><Input type="number" step="0.1" value={agAnios} onChange={(e) => { setAgAnios(e.target.value); setAgResultado(null) }} /></div>
              <div className="space-y-1"><Label>Días trabajados (si &lt;1 año)</Label><Input type="number" value={agDias} onChange={(e) => { setAgDias(e.target.value); setAgResultado(null) }} placeholder="Opcional" /></div>
            </div>
            <Button type="button" variant="outline" size="sm" className="w-full" disabled={!agSalario || !agAnios || aguinaldoMut.isPending} onClick={() => aguinaldoMut.mutate()}>
              <Calculator className="h-3.5 w-3.5" />Calcular
            </Button>
            {agResultado && (
              <div className="rounded-lg border p-3 space-y-1.5 text-xs bg-muted/30">
                <div className="flex justify-between"><span className="text-muted-foreground">Días correspondientes</span><span>{agResultado.dias_correspondientes.toFixed(2)}{agResultado.proporcional ? ' (proporcional)' : ''}</span></div>
                <div className="flex justify-between font-semibold text-sm pt-1 border-t"><span>Aguinaldo</span><span>{money(agResultado.monto)}</span></div>
                {agResultado.advertencias.map((a, i) => <p key={i} className="text-amber-600 pt-1">⚠ {a}</p>)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="vacaciones" className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Salario base mensual ($)</Label><Input type="number" step="0.01" value={vSalario} onChange={(e) => { setVSalario(e.target.value); setVResultado(null) }} /></div>
            <Button type="button" variant="outline" size="sm" className="w-full" disabled={!vSalario || vacacionesMut.isPending} onClick={() => vacacionesMut.mutate()}>
              <Calculator className="h-3.5 w-3.5" />Calcular
            </Button>
            {vResultado && (
              <div className="rounded-lg border p-3 space-y-1.5 text-xs bg-muted/30">
                <div className="flex justify-between"><span className="text-muted-foreground">Salario de 15 días</span><span>{money(vResultado.salario_dias)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Recargo 30%</span><span>{money(vResultado.recargo_30)}</span></div>
                <div className="flex justify-between font-semibold text-sm pt-1 border-t"><span>Total</span><span>{money(vResultado.total)}</span></div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="indemnizacion" className="space-y-3 pt-2">
            <div className="space-y-1"><Label>Salario base mensual ($)</Label><Input type="number" step="0.01" value={iSalario} onChange={(e) => { setISalario(e.target.value); setIResultado(null) }} /></div>
            <div className="space-y-1"><Label>Años de servicio</Label><Input type="number" step="0.1" value={iAnios} onChange={(e) => { setIAnios(e.target.value); setIResultado(null) }} /></div>
            <Button type="button" variant="outline" size="sm" className="w-full" disabled={!iSalario || !iAnios || indemnizacionMut.isPending} onClick={() => indemnizacionMut.mutate()}>
              <Calculator className="h-3.5 w-3.5" />Calcular
            </Button>
            {iResultado && (
              <div className="rounded-lg border p-3 space-y-1.5 text-xs bg-muted/30">
                <div className="flex justify-between"><span className="text-muted-foreground">Salario usado{iResultado.tope_aplicado ? ' (topado)' : ''}</span><span>{money(iResultado.salario_base_usado)}</span></div>
                <div className="flex justify-between font-semibold text-sm pt-1 border-t"><span>Indemnización</span><span>{money(iResultado.monto)}</span></div>
                {iResultado.advertencias.map((a, i) => <p key={i} className="text-amber-600 pt-1">⚠ {a}</p>)}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
