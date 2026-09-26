import { Link } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { FinancialExplorer } from '@/components/FinancialExplorer'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart2, Clock, Download, Layers, Target, TrendingUp } from 'lucide-react'
import { finanzasApi } from '@/api/finanzas'
import { exportCsv, today } from '@/lib/utils'
import type { Semaforo, TicketAgrupacion } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (n: number | null) => (n === null ? '—' : `${(n * 100).toFixed(1)}%`)
const currentMonth = () => new Date().toISOString().slice(0, 7)
const monthsAgo = (n: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return d.toISOString().slice(0, 7)
}

function SemaforoBadge({ valor }: { valor: Semaforo | null }) {
  if (!valor) return <span className="text-muted-foreground">—</span>
  const variante = valor === 'verde' ? 'success' : valor === 'amarillo' ? 'warning' : 'destructive'
  const etiqueta = valor === 'verde' ? 'Verde' : valor === 'amarillo' ? 'Amarillo' : 'Rojo'
  return <Badge variant={variante}>{etiqueta}</Badge>
}

/** Cifra en rojo cuando es negativa: una brecha o una utilidad bajo cero no deben pasar inadvertidas. */
function Cifra({ valor }: { valor: number }) {
  return <span className={valor < 0 ? 'text-destructive font-medium' : ''}>{money(valor)}</span>
}

function RangoMeses({ desde, hasta, onDesde, onHasta }: {
  desde: string; hasta: string; onDesde: (v: string) => void; onHasta: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="desde" className="text-xs">Desde</Label>
        <Input id="desde" type="month" value={desde} onChange={(e) => onDesde(e.target.value)} className="w-40" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="hasta" className="text-xs">Hasta</Label>
        <Input id="hasta" type="month" value={hasta} onChange={(e) => onHasta(e.target.value)} className="w-40" />
      </div>
    </div>
  )
}

function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-8 text-center">{children}</p>
}

// ─── Meta vs. real, mes a mes (hoja 17 del Archivo Maestro) ─────────────────────

function ResumenTab() {
  const [desde, setDesde] = useState(monthsAgo(5))
  const [hasta, setHasta] = useState(currentMonth())
  const { data, isLoading, error } = useQuery({
    queryKey: ['resumen-mensual', desde, hasta],
    queryFn: () => finanzasApi.resumenMensual(desde, hasta),
    enabled: Boolean(desde && hasta),
  })

  const exportar = () => {
    if (!data) return
    exportCsv(
      `resumen_mensual_${today()}.csv`,
      ['Mes', 'Meta ingresos', 'Ingresos reales', 'Cumplimiento ingresos %', 'Meta utilidad directa',
       'Utilidad directa real', 'Gastos fijos presupuestados', 'Gastos reales pagados', 'Brecha de gastos',
       'Comisiones', 'Utilidad operativa (presupuesto)', 'Utilidad operativa (caja real)',
       'Utilidad operativa mínima', 'Margen operativo real %', 'Brecha utilidad mínima', 'Semáforo'],
      [...data.meses, data.totales].map((r) => [
        r.mes, r.meta_ingresos, r.ingresos_reales, r.cumplimiento_ingresos_pct, r.meta_utilidad_directa,
        r.utilidad_directa_real, r.gastos_fijos, r.gastos_reales, r.brecha_gastos, r.comisiones,
        r.utilidad_operativa_real, r.utilidad_operativa_caja,
        r.utilidad_operativa_minima, r.margen_operativo_real_pct, r.brecha_utilidad_minima, r.semaforo_general,
      ]),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <RangoMeses desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />
        <Button variant="outline" onClick={exportar} disabled={!data} className="gap-2">
          <Download className="h-4 w-4" />Exportar CSV
        </Button>
      </div>

      {isLoading && <Vacio>Cargando…</Vacio>}
      {error && <Vacio>{(error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'No se pudo cargar el resumen'}</Vacio>}

      {data && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Mes</th>
                  <th className="text-right p-3">Meta</th>
                  <th className="text-right p-3">Cobrado</th>
                  <th className="text-right p-3">Cumpl.</th>
                  <th className="text-right p-3">Ut. directa</th>
                  <th className="text-right p-3" title="Lo presupuestado en Gastos Fijos">Gasto plan</th>
                  <th className="text-right p-3" title="Lo que realmente se pagó y quedó registrado en Flujo de caja">Gasto real</th>
                  <th className="text-right p-3">Comisiones</th>
                  <th className="text-right p-3" title="Con el gasto presupuestado (hoja 17 del Archivo Maestro)">Ut. operativa</th>
                  <th className="text-right p-3" title="Con el gasto realmente pagado">Ut. de caja</th>
                  <th className="text-right p-3">Ut. mínima</th>
                  <th className="text-right p-3">Brecha</th>
                  <th className="text-center p-3">Semáforo</th>
                </tr>
              </thead>
              <tbody>
                {data.meses.map((m) => (
                  <tr key={m.mes} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-mono">{m.mes}</td>
                    <td className="p-3 text-right">{money(m.meta_ingresos)}</td>
                    <td className="p-3 text-right">{money(m.ingresos_reales)}</td>
                    <td className="p-3 text-right">{pct(m.cumplimiento_ingresos_pct)}</td>
                    <td className="p-3 text-right"><Cifra valor={m.utilidad_directa_real} /></td>
                    <td className="p-3 text-right text-muted-foreground">{money(m.gastos_fijos)}</td>
                    <td className="p-3 text-right">
                      {money(m.gastos_reales)}
                      {m.brecha_gastos !== 0 && (
                        <span className={`ml-1.5 text-[11px] ${m.brecha_gastos > 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {m.brecha_gastos > 0 ? '+' : ''}{money(m.brecha_gastos)}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">{money(m.comisiones)}</td>
                    <td className="p-3 text-right text-muted-foreground"><Cifra valor={m.utilidad_operativa_real} /></td>
                    <td className="p-3 text-right font-medium"><Cifra valor={m.utilidad_operativa_caja} /></td>
                    <td className="p-3 text-right text-muted-foreground">{money(m.utilidad_operativa_minima)}</td>
                    <td className="p-3 text-right"><Cifra valor={m.brecha_utilidad_minima} /></td>
                    <td className="p-3 text-center"><SemaforoBadge valor={m.semaforo_general} /></td>
                  </tr>
                ))}
                <tr className="bg-muted/60 font-semibold">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right">{money(data.totales.meta_ingresos)}</td>
                  <td className="p-3 text-right">{money(data.totales.ingresos_reales)}</td>
                  <td className="p-3 text-right">{pct(data.totales.cumplimiento_ingresos_pct)}</td>
                  <td className="p-3 text-right"><Cifra valor={data.totales.utilidad_directa_real} /></td>
                  <td className="p-3 text-right text-muted-foreground">{money(data.totales.gastos_fijos)}</td>
                  <td className="p-3 text-right">{money(data.totales.gastos_reales)}</td>
                  <td className="p-3 text-right">{money(data.totales.comisiones)}</td>
                  <td className="p-3 text-right text-muted-foreground"><Cifra valor={data.totales.utilidad_operativa_real} /></td>
                  <td className="p-3 text-right"><Cifra valor={data.totales.utilidad_operativa_caja} /></td>
                  <td className="p-3 text-right text-muted-foreground">{money(data.totales.utilidad_operativa_minima)}</td>
                  <td className="p-3 text-right"><Cifra valor={data.totales.brecha_utilidad_minima} /></td>
                  <td className="p-3 text-center"><SemaforoBadge valor={data.totales.semaforo_general} /></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <p className="text-xs text-muted-foreground">
        La utilidad mínima es la meta de ingresos por el margen operativo meta configurado en Finanzas → Punto de Equilibrio.
        Un mes está en verde solo si llega a la meta de ingresos <em>y</em> deja esa utilidad.
      </p>
      <p className="text-xs text-muted-foreground">
        <strong>Ut. operativa</strong> descuenta el gasto <em>presupuestado</em> y las comisiones devengadas, como la hoja 17 del Archivo Maestro.
        {' '}<strong>Ut. de caja</strong> descuenta lo que realmente se pagó y quedó registrado en Flujo de caja —incluida la planilla—, sin restar las comisiones devengadas para no contarlas dos veces cuando se paguen.
      </p>
    </div>
  )
}

// ─── Antigüedad del saldo por cobrar ───────────────────────────────────────────

function AgingTab() {
  const [corte, setCorte] = useState(new Date().toISOString().slice(0, 10))
  const { data, isLoading } = useQuery({
    queryKey: ['aging-cartera', corte],
    queryFn: () => finanzasApi.agingCartera(corte),
  })

  const exportar = () => {
    if (!data) return
    exportCsv(
      `aging_cartera_${today()}.csv`,
      ['Expediente', 'Cliente', 'Estado de cobro', 'Mes esperado', 'Saldo pendiente', 'Días de atraso', 'Tramo'],
      data.casos.map((c) => [c.title, c.client_name, c.estado_cobro, c.mes_cobro_esperado, c.saldo_pendiente, c.dias_atraso, c.tramo]),
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="corte" className="text-xs">Fecha de corte</Label>
          <Input id="corte" type="date" value={corte} onChange={(e) => setCorte(e.target.value)} className="w-44" />
        </div>
        <Button variant="outline" onClick={exportar} disabled={!data?.casos.length} className="gap-2">
          <Download className="h-4 w-4" />Exportar CSV
        </Button>
      </div>

      {isLoading && <Vacio>Cargando…</Vacio>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.tramos.map((t) => (
              <Card key={t.tramo}>
                <CardContent className="p-4">
                  <p className="text-xs uppercase text-muted-foreground">{t.tramo}</p>
                  <p className="text-xl font-bold mt-1">{money(t.saldo)}</p>
                  <p className="text-xs text-muted-foreground">{t.casos} expediente{t.casos === 1 ? '' : 's'}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Expediente</th>
                    <th className="text-left p-3">Cliente</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">Mes esperado</th>
                    <th className="text-right p-3">Saldo</th>
                    <th className="text-right p-3">Atraso</th>
                    <th className="text-left p-3">Tramo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.casos.map((c) => (
                    <tr key={c.case_id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3">{c.title}</td>
                      <td className="p-3 text-muted-foreground">{c.client_name ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{c.estado_cobro}</td>
                      <td className="p-3 font-mono text-xs">{c.mes_cobro_esperado ?? '—'}</td>
                      <td className="p-3 text-right font-medium">{money(c.saldo_pendiente)}</td>
                      <td className="p-3 text-right">{c.dias_atraso} d</td>
                      <td className="p-3">
                        <Badge variant={c.tramo === 'Por vencer' ? 'secondary' : c.tramo === 'Más de 90' ? 'destructive' : 'warning'}>
                          {c.tramo}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {!data.casos.length && (
                    <tr><td colSpan={7}><Vacio>No hay saldos por cobrar a esta fecha.</Vacio></td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            El saldo se envejece desde el último día del mes de cobro esperado del expediente. Si no tiene mes esperado,
            desde su fecha de apertura.
          </p>
        </>
      )}
    </div>
  )
}

// ─── Indicadores: ticket promedio, días de cobro y origen del negocio ──────────

function IndicadoresTab() {
  const canCases=usePermission('expedientes','ver')
  const [desde, setDesde] = useState(monthsAgo(5))
  const [hasta, setHasta] = useState(currentMonth())
  const [agrupacion, setAgrupacion] = useState<TicketAgrupacion>('servicio')

  const ticket = useQuery({
    queryKey: ['ticket-promedio', desde, hasta, agrupacion],
    queryFn: () => finanzasApi.ticketPromedio(desde, hasta, agrupacion),
    enabled: Boolean(desde && hasta),
  })
  const dias = useQuery({
    queryKey: ['dias-cobro', desde, hasta],
    queryFn: () => finanzasApi.diasCobro(desde, hasta),
    enabled: Boolean(desde && hasta),
  })
  const [origenAgrupacion,setOrigenAgrupacion]=useState('originador')
  const [origenFiltro,setOrigenFiltro]=useState(''),[tipoFiltro,setTipoFiltro]=useState('')
  const origen = useQuery({
    queryKey: ['ingresos-por-origen', desde, hasta, origenAgrupacion],
    queryFn: () => finanzasApi.ingresosPorOrigen(desde, hasta, origenAgrupacion),
    enabled: Boolean(desde && hasta),
  })

  const exportarTicket = () => {
    if (!ticket.data) return
    exportCsv(
      `ticket_promedio_${agrupacion}_${today()}.csv`,
      ['Código', 'Nombre', 'Ingresos', 'Expedientes cobrados', 'Ticket promedio'],
      ticket.data.detalle.map((r) => [r.codigo, r.nombre, r.ingresos, r.casos_cobrados, r.ticket_promedio]),
    )
  }
  const origenFiltrado=origen.data?.filter(r=>(!origenFiltro||r.origen===origenFiltro)&&(!tipoFiltro||r.tipo_origen===tipoFiltro))
  const exportarOrigen = () => {
    if (!origen.data) return
    exportCsv(
      `ingresos_por_origen_${today()}.csv`,
      ['Origen', 'Tipo de origen', 'Expedientes', 'Ingresos', 'Costos directos', 'Utilidad directa', 'Margen %'],
      (origenFiltrado??[]).map((r) => [r.origen, r.tipo_origen, r.casos, r.ingresos, r.costos_directos, r.utilidad_directa, r.margen_pct]),
    )
  }

  return (
    <div className="space-y-5">
      <RangoMeses desde={desde} hasta={hasta} onDesde={setDesde} onHasta={setHasta} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />Ticket promedio</p>
            <p className="text-2xl font-bold mt-1">{ticket.data?.ticket_promedio != null ? money(ticket.data.ticket_promedio) : '—'}</p>
            <p className="text-xs text-muted-foreground">{ticket.data?.casos_cobrados ?? 0} expedientes cobrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Días de cobro</p>
            <p className="text-2xl font-bold mt-1">{dias.data?.promedio_dias != null ? `${dias.data.promedio_dias} d` : '—'}</p>
            <p className="text-xs text-muted-foreground">
              {dias.data?.cobros_medidos ?? 0} aplicaciones medidas (o cobros sin factura con cierre)
              {dias.data?.sin_referencia ? ` · ${dias.data.sin_referencia} sin referencia` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Cobrado en el rango</p>
            <p className="text-2xl font-bold mt-1">{money(ticket.data?.ingresos ?? 0)}</p>
            <p className="text-xs text-muted-foreground">neto operativo, sin IVA ni fondos de terceros</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-sm">Ticket promedio por {agrupacion}</h3>
          <div className="flex items-center gap-2">
            <Select value={agrupacion} onValueChange={(v) => setAgrupacion(v as TicketAgrupacion)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="servicio">Por servicio</SelectItem>
                <SelectItem value="categoria">Por categoría</SelectItem>
                <SelectItem value="familia">Por familia</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportarTicket} disabled={!ticket.data?.detalle.length} className="gap-2">
              <Download className="h-4 w-4" />CSV
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-right p-3">Ingresos</th>
                  <th className="text-right p-3">Expedientes</th>
                  <th className="text-right p-3">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {ticket.data?.detalle.map((r) => (
                  <tr key={r.codigo} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-mono text-xs">{r.codigo}</td>
                    <td className="p-3">{r.nombre}</td>
                    <td className="p-3 text-right">{money(r.ingresos)}</td>
                    <td className="p-3 text-right">{r.casos_cobrados}</td>
                    <td className="p-3 text-right font-medium">{r.ticket_promedio != null ? money(r.ticket_promedio) : '—'}</td>
                  </tr>
                ))}
                {!ticket.data?.detalle.length && (
                  <tr><td colSpan={5}><Vacio>Todavía no hay cobros en este rango.</Vacio></td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-semibold text-sm">Ingresos y utilidad por origen del negocio</h3><div className="flex gap-2 flex-wrap my-2"><select aria-label="Filtrar origen comercial" className="bg-background border rounded p-2" value={origenFiltro} onChange={e=>setOrigenFiltro(e.target.value)}><option value="">Todos los orígenes</option>{[...new Set(origen.data?.map(r=>r.origen)??[])].map(v=><option key={v}>{v}</option>)}</select><select aria-label="Filtrar tipo de origen" className="bg-background border rounded p-2" value={tipoFiltro} onChange={e=>setTipoFiltro(e.target.value)}><option value="">Todos los tipos</option>{[...new Set(origen.data?.map(r=>r.tipo_origen)??[])].map(v=><option key={v}>{v}</option>)}</select></div><select aria-label="Agrupar origen" className="bg-background border rounded-md p-2 mt-2" value={origenAgrupacion} onChange={e=>setOrigenAgrupacion(e.target.value)}><option value="originador">Por originador</option><option value="canal">Por canal de captación</option></select></div>
          <Button variant="outline" size="sm" onClick={exportarOrigen} disabled={!origenFiltrado?.length} className="gap-2">
            <Download className="h-4 w-4" />CSV
          </Button>
        </div>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Origen</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-right p-3">Expedientes</th>
                  <th className="text-right p-3">Ingresos</th>
                  <th className="text-right p-3">Costos</th>
                  <th className="text-right p-3">Utilidad</th>
                  <th className="text-right p-3">Margen</th>
                </tr>
              </thead>
              <tbody>
                {origenFiltrado?.map((r) => (
                  <tr key={`${r.origen}-${r.tipo_origen}`} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3"><details><summary>{r.origen}</summary><div className="space-y-1 pt-2 text-xs">{r.expedientes.map((c,i)=><p key={i}>{c.id&&canCases?<Link className="underline" to={`/cases?case_id=${c.id}`}>{c.title}</Link>:c.title}</p>)}</div></details></td>
                    <td className="p-3 text-muted-foreground">{r.tipo_origen}</td>
                    <td className="p-3 text-right">{r.casos}</td>
                    <td className="p-3 text-right">{money(r.ingresos)}</td>
                    <td className="p-3 text-right">{money(r.costos_directos)}</td>
                    <td className="p-3 text-right"><Cifra valor={r.utilidad_directa} /></td>
                    <td className="p-3 text-right">{pct(r.margen_pct)}</td>
                  </tr>
                ))}
                {!origenFiltrado?.length && (
                  <tr><td colSpan={7}><Vacio>Sin cobros con originador registrado en este rango.</Vacio></td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {Boolean(dias.data?.detalle.length) && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Servicios que más tardan en cobrarse</h3>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Código</th>
                    <th className="text-left p-3">Servicio</th>
                    <th className="text-right p-3">Días promedio</th>
                    <th className="text-right p-3">Cobros medidos</th>
                  </tr>
                </thead>
                <tbody>
                  {dias.data?.detalle.map((r) => (
                    <tr key={r.codigo} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="p-3 font-mono text-xs">{r.codigo}</td>
                      <td className="p-3">{r.nombre}</td>
                      <td className="p-3 text-right font-medium">{r.promedio_dias} d</td>
                      <td className="p-3 text-right">{r.cobros_medidos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default function ResumenMensual() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Resumen Mensual</h1>
        <p className="text-muted-foreground text-sm">
          Meta contra realidad mes a mes, antigüedad de la cartera e indicadores de cobro
        </p>
      </div>
      <Tabs defaultValue="resumen">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="resumen" className="gap-1.5"><BarChart2 className="h-3.5 w-3.5" />Meta vs. Real</TabsTrigger>
          <TabsTrigger value="aging" className="gap-1.5"><Layers className="h-3.5 w-3.5" />Cartera por antigüedad</TabsTrigger>
          <TabsTrigger value="explorador">Explorador y detalle</TabsTrigger>
          <TabsTrigger value="indicadores" className="gap-1.5"><Target className="h-3.5 w-3.5" />Indicadores</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="mt-4"><ResumenTab /></TabsContent>
        <TabsContent value="aging" className="mt-4"><AgingTab /></TabsContent>
        <TabsContent value="explorador" className="mt-4"><FinancialExplorer/></TabsContent>
        <TabsContent value="indicadores" className="mt-4"><IndicadoresTab /></TabsContent>
      </Tabs>
    </div>
  )
}
