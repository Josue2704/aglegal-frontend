import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { payrollApi } from '@/api/payroll'
import type { PayrollConfigTramoRenta } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { today } from '@/lib/utils'

type TramoForm = { sobre_exceso_de: string; hasta: string; cuota_fija: string; porcentaje_exceso: string }

export function PayrollConfigDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: vigente } = useQuery({ queryKey: ['payroll-config-vigente'], queryFn: payrollApi.configVigente, enabled: open, retry: false })
  const { data: historial = [] } = useQuery({ queryKey: ['payroll-config-historial'], queryFn: payrollApi.configHistorial, enabled: open })

  const [form, setForm] = useState({
    vigente_desde: today(), isss_tasa_empleado: '0.03', isss_tasa_patronal: '0.075', isss_tope_cotizable: '1000',
    afp_tasa_empleado: '0.0725', afp_tasa_patronal: '0.0875', afp_tope_cotizable: '',
    tope_salario_indemnizacion: '',
    recargo_hora_extra_pct: '1', recargo_nocturnidad_pct: '0.25', horas_jornada_mensual: '240', notas: '',
  })
  const [tramos, setTramos] = useState<TramoForm[]>([])

  useEffect(() => {
    if (!open || !vigente) return
    setForm({
      vigente_desde: today(),
      isss_tasa_empleado: String(vigente.isss_tasa_empleado), isss_tasa_patronal: String(vigente.isss_tasa_patronal),
      isss_tope_cotizable: vigente.isss_tope_cotizable != null ? String(vigente.isss_tope_cotizable) : '',
      afp_tasa_empleado: String(vigente.afp_tasa_empleado), afp_tasa_patronal: String(vigente.afp_tasa_patronal),
      afp_tope_cotizable: vigente.afp_tope_cotizable != null ? String(vigente.afp_tope_cotizable) : '',
      tope_salario_indemnizacion: vigente.tope_salario_indemnizacion != null ? String(vigente.tope_salario_indemnizacion) : '',
      recargo_hora_extra_pct: String(vigente.recargo_hora_extra_pct), recargo_nocturnidad_pct: String(vigente.recargo_nocturnidad_pct),
      horas_jornada_mensual: String(vigente.horas_jornada_mensual), notas: '',
    })
    setTramos(vigente.tramos_renta.map((t) => ({
      sobre_exceso_de: String(t.sobre_exceso_de), hasta: t.hasta != null ? String(t.hasta) : '',
      cuota_fija: String(t.cuota_fija), porcentaje_exceso: String(t.porcentaje_exceso),
    })))
  }, [open, vigente])

  const create = useMutation({
    mutationFn: () => payrollApi.createConfig({
      vigente_desde: form.vigente_desde,
      isss_tasa_empleado: Number(form.isss_tasa_empleado), isss_tasa_patronal: Number(form.isss_tasa_patronal),
      isss_tope_cotizable: form.isss_tope_cotizable ? Number(form.isss_tope_cotizable) : null,
      afp_tasa_empleado: Number(form.afp_tasa_empleado), afp_tasa_patronal: Number(form.afp_tasa_patronal),
      afp_tope_cotizable: form.afp_tope_cotizable ? Number(form.afp_tope_cotizable) : null,
      tope_salario_indemnizacion: form.tope_salario_indemnizacion ? Number(form.tope_salario_indemnizacion) : null,
      recargo_hora_extra_pct: Number(form.recargo_hora_extra_pct), recargo_nocturnidad_pct: Number(form.recargo_nocturnidad_pct),
      horas_jornada_mensual: Number(form.horas_jornada_mensual), notas: form.notas,
      tramos_renta: tramos.map((t): PayrollConfigTramoRenta => ({
        sobre_exceso_de: Number(t.sobre_exceso_de || 0), hasta: t.hasta ? Number(t.hasta) : null,
        cuota_fija: Number(t.cuota_fija || 0), porcentaje_exceso: Number(t.porcentaje_exceso || 0),
      })),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-config-vigente'] })
      qc.invalidateQueries({ queryKey: ['payroll-config-historial'] })
      toast.success('Nueva configuración guardada')
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  function addTramo() {
    setTramos((prev) => [...prev, { sobre_exceso_de: '', hasta: '', cuota_fija: '0', porcentaje_exceso: '' }])
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Configuración de nómina (ISSS / AFP / Renta)</DialogTitle></DialogHeader>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          Estas tasas cambian por ley. Verifica los porcentajes, topes de cotización y la tabla de retención de renta
          vigentes con tu contador o el Ministerio de Hacienda antes de depender de este cálculo para pagos reales.
          Cada configuración queda en un historial versionado — nunca se sobrescribe, así que las planillas ya
          calculadas conservan la tasa que estaba vigente cuando se generaron.
        </div>

        {historial.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Vigente desde <span className="font-medium">{vigente?.vigente_desde}</span> · {historial.length} versión{historial.length === 1 ? '' : 'es'} en el historial
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Nueva versión (crea una fila nueva, no edita la actual)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Vigente desde</Label><Input type="date" value={form.vigente_desde} onChange={(e) => setForm({ ...form, vigente_desde: e.target.value })} /></div>
            <div className="space-y-1"><Label>Horas de jornada mensual</Label><Input type="number" value={form.horas_jornada_mensual} onChange={(e) => setForm({ ...form, horas_jornada_mensual: e.target.value })} /></div>

            <div className="space-y-1"><Label>ISSS — tasa empleado</Label><Input type="number" step="0.0001" value={form.isss_tasa_empleado} onChange={(e) => setForm({ ...form, isss_tasa_empleado: e.target.value })} /></div>
            <div className="space-y-1"><Label>ISSS — tasa patronal</Label><Input type="number" step="0.0001" value={form.isss_tasa_patronal} onChange={(e) => setForm({ ...form, isss_tasa_patronal: e.target.value })} /></div>
            <div className="space-y-1 col-span-2">
              <Label>ISSS — tope de cotización ($, vacío = sin tope)</Label>
              <Input type="number" step="0.01" value={form.isss_tope_cotizable} onChange={(e) => setForm({ ...form, isss_tope_cotizable: e.target.value })} placeholder="1000.00" />
            </div>

            <div className="space-y-1"><Label>AFP — tasa empleado</Label><Input type="number" step="0.0001" value={form.afp_tasa_empleado} onChange={(e) => setForm({ ...form, afp_tasa_empleado: e.target.value })} /></div>
            <div className="space-y-1"><Label>AFP — tasa patronal</Label><Input type="number" step="0.0001" value={form.afp_tasa_patronal} onChange={(e) => setForm({ ...form, afp_tasa_patronal: e.target.value })} /></div>
            <div className="space-y-1 col-span-2">
              <Label>AFP — tope de cotización ($, vacío = sin tope)</Label>
              <Input type="number" step="0.01" value={form.afp_tope_cotizable} onChange={(e) => setForm({ ...form, afp_tope_cotizable: e.target.value })} placeholder="Sin tope (ley vigente)" />
              <p className="text-[11px] text-muted-foreground">AFP no tiene tope de cotización desde la Ley Integral del Sistema de Pensiones — déjalo vacío salvo que la ley vuelva a cambiar.</p>
            </div>

            <div className="space-y-1 col-span-2">
              <Label>Tope de salario para indemnización ($, vacío = sin tope)</Label>
              <Input type="number" step="0.01" value={form.tope_salario_indemnizacion} onChange={(e) => setForm({ ...form, tope_salario_indemnizacion: e.target.value })} placeholder="Ej. 4x salario mínimo diario × 30" />
              <p className="text-[11px] text-muted-foreground">Salario base máximo a considerar en el cálculo de indemnización por despido (Art. 58 CT) — ligado al salario mínimo vigente, verifícalo con tu contador.</p>
            </div>

            <div className="space-y-1"><Label>Recargo hora extra diurna (1 = 100%)</Label><Input type="number" step="0.01" value={form.recargo_hora_extra_pct} onChange={(e) => setForm({ ...form, recargo_hora_extra_pct: e.target.value })} /></div>
            <div className="space-y-1"><Label>Recargo nocturnidad (ej. 0.25 = 25%)</Label><Input type="number" step="0.01" value={form.recargo_nocturnidad_pct} onChange={(e) => setForm({ ...form, recargo_nocturnidad_pct: e.target.value })} /></div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>Tabla de retención de renta (ISR)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addTramo}><Plus className="h-3.5 w-3.5" />Tramo</Button>
            </div>
            {!tramos.length && <p className="text-xs text-muted-foreground">Sin tramos — mientras esté vacía, el motor no retendrá renta y avisará en cada cálculo.</p>}
            {tramos.map((t, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end rounded-lg border p-2 sm:border-0 sm:p-0">
                <div className="space-y-1"><Label className="text-[10px]">Sobre exceso de ($)</Label><Input type="number" step="0.01" value={t.sobre_exceso_de} onChange={(e) => setTramos((p) => p.map((x, j) => j === i ? { ...x, sobre_exceso_de: e.target.value } : x))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Hasta ($, vacío = sin techo)</Label><Input type="number" step="0.01" value={t.hasta} onChange={(e) => setTramos((p) => p.map((x, j) => j === i ? { ...x, hasta: e.target.value } : x))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Cuota fija ($)</Label><Input type="number" step="0.01" value={t.cuota_fija} onChange={(e) => setTramos((p) => p.map((x, j) => j === i ? { ...x, cuota_fija: e.target.value } : x))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Tasa (0.10 = 10%)</Label><Input type="number" step="0.01" value={t.porcentaje_exceso} onChange={(e) => setTramos((p) => p.map((x, j) => j === i ? { ...x, porcentaje_exceso: e.target.value } : x))} /></div>
                <Button aria-label={`Eliminar tramo ${i + 1}`} type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => setTramos((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>

          <div className="space-y-1"><Label>Notas</Label><Input value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Ej. Ajuste por reforma de ley de 2027" /></div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>
          <Button type="button" disabled={create.isPending} onClick={() => create.mutate()}>Guardar nueva versión</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
