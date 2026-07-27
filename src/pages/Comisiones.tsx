import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Users2 } from 'lucide-react'
import { toast } from 'sonner'
import { comisionesApi } from '@/api/comisiones'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const currentMonth = () => new Date().toISOString().slice(0, 7)

export default function Comisiones() {
  const [mes, setMes] = useState(currentMonth())
  const qc = useQueryClient()

  const { data: resumen = [] } = useQuery({ queryKey: ['comisiones-resumen', mes], queryFn: () => comisionesApi.resumen(mes) })
  const { data: detalle = [] } = useQuery({ queryKey: ['comisiones-lista', mes], queryFn: () => comisionesApi.list({ mes }) })

  const revertir = useMutation({
    mutationFn: (id: number) => comisionesApi.revertir(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comisiones-resumen'] })
      qc.invalidateQueries({ queryKey: ['comisiones-lista'] })
      toast.success('Comisión revertida — el ajuste se reconoce en el mes en curso')
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  const totalMes = resumen.reduce((s, r) => s + r.total_comision, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Comisiones</h1>
        <p className="text-muted-foreground text-sm">Compensación variable por originador — tramos mensuales acumulados por persona</p>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Mes</Label>
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" />
      </div>

      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Users2 className="h-4 w-4" />Total comisiones del mes</div>
          <div className="text-xl font-semibold font-mono">{money(totalMes)}</div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-sm font-semibold mb-2">Resumen por persona — {mes}</h3>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Persona</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Movimientos</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Ajustes</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Utilidad directa base</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Comisión total</th>
                </tr>
              </thead>
              <tbody>
                {resumen.map((r) => (
                  <tr key={r.personal_id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2.5"><span className="font-mono text-xs text-muted-foreground mr-1.5">{r.person_code}</span>{r.persona_nombre}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{r.movimientos}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{r.ajustes || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{money(r.total_utilidad_directa)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-green-600">{money(r.total_comision)}</td>
                  </tr>
                ))}
                {!resumen.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Sin comisiones reconocidas este mes</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Detalle de movimientos — {mes}</h3>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Persona</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Expediente</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Fecha cobro</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Tipo</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">%</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Base</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Comisión</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((c) => {
                  const isAjuste = c.ajusta_a_commission_id != null
                  return (
                    <tr key={c.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2.5">{c.persona_nombre}</td>
                      <td className="px-4 py-2.5 max-w-[180px] truncate">{c.case_title}</td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.income_date}</td>
                      <td className="px-4 py-2.5">
                        {isAjuste ? <Badge variant="outline" className="text-[10px]">Ajuste</Badge> : <Badge variant="secondary" className="text-[10px]">{c.tipo_origen}</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{c.porcentaje_participacion.toFixed(1)}%</td>
                      <td className="px-4 py-2.5 text-right font-mono">{money(c.base_utilidad_directa)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${c.comision < 0 ? 'text-destructive' : 'text-green-600'}`}>{money(c.comision)}</td>
                      <td className="px-4 py-2.5">
                        {!isAjuste && (
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7" title="Revertir comisión"
                            onClick={() => { if (confirm('¿Revertir esta comisión? Se registrará un ajuste negativo en el mes en curso.')) revertir.mutate(c.id) }}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {!detalle.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Sin movimientos este mes</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
