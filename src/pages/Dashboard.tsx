import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp, TrendingDown, Users, CalendarDays, Scale, Wallet, AlertTriangle, Clock, ChevronRight,
  Target, Briefcase, Percent, Gauge, CircleDollarSign,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi } from '@/api/dashboard'
import { pipelineApi } from '@/api/pipeline'
import { casesApi } from '@/api/cases'
import { finanzasApi } from '@/api/finanzas'
import { comisionesApi } from '@/api/comisiones'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { GrossProfitItem } from '@/types'

const COLORS = ['#2563eb', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']
const GREEN = '#16a34a'
const RED = '#dc2626'
const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (n: number) => `${(n * 100).toFixed(0)}%`
const currentMonth = () => new Date().toISOString().slice(0, 7)

function groupCount<T>(items: T[], key: (item: T) => string): { label: string; count: number }[] {
  const map = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

function KpiCard({ title, value, sub, icon: Icon, color = 'text-primary' }: {
  title: string; value: string; sub?: string; icon: React.ElementType; color?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-3 rounded-xl bg-primary/10 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function GrossProfitBar({ items, label }: { items: GrossProfitItem[]; label: string }) {
  if (!items.length) return <p className="text-muted-foreground text-sm py-4">Sin datos — vincula ingresos y costos a expedientes para ver la utilidad.</p>
  return (
    <div className="space-y-2">
      {items.slice(0, 6).map((item, i) => {
        const p = item.revenue > 0 ? (item.gross_profit / item.revenue) * 100 : 0
        const isPos = item.gross_profit >= 0
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-muted-foreground max-w-[55%]">{item.name}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground">{formatCurrency(item.revenue)}</span>
                <span className={`font-semibold ${isPos ? 'text-green-700' : 'text-red-600'}`}>
                  {isPos ? '+' : ''}{formatCurrency(item.gross_profit)} ({p.toFixed(0)}%)
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${isPos ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs(p), 100)}%` }}
              />
            </div>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground pt-1 italic">{label}</p>
    </div>
  )
}

function RentabilidadAbogadoBar({ items }: { items: { responsable: string; ingresos: number; costos: number; utilidad_directa: number; margen_pct: number | null }[] }) {
  if (!items.length) return <p className="text-muted-foreground text-sm py-4">Sin ingresos vinculados a expedientes con abogado responsable asignado.</p>
  const maxUtilidad = Math.max(...items.map((i) => Math.abs(i.utilidad_directa)), 1)
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item) => {
        const isPos = item.utilidad_directa >= 0
        const widthPct = (Math.abs(item.utilidad_directa) / maxUtilidad) * 100
        return (
          <div key={item.responsable} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-muted-foreground max-w-[45%]">{item.responsable}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground">{money(item.ingresos)}</span>
                <span className={`font-semibold ${isPos ? 'text-green-700' : 'text-red-600'}`}>
                  {isPos ? '+' : ''}{money(item.utilidad_directa)}{item.margen_pct != null ? ` (${pct(item.margen_pct)})` : ''}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${isPos ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${widthPct}%` }} />
            </div>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground pt-1 italic">Utilidad directa (neto cobrado − costo directo) por abogado responsable del expediente</p>
    </div>
  )
}

const STATUS_DOT: Record<string, string> = {
  'Pendiente': 'bg-yellow-400',
  'En proceso': 'bg-blue-400',
  'Finalizada': 'bg-green-400',
}

export default function Dashboard() {
  const [mes, setMes] = useState(currentMonth())

  // ── Financiero / general ──
  const { data: kpis } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: dashboardApi.kpis })
  const { data: cashflow } = useQuery({ queryKey: ['dashboard-cashflow'], queryFn: () => dashboardApi.cashflow() })
  const { data: topClients } = useQuery({ queryKey: ['dashboard-top-clients'], queryFn: () => dashboardApi.topClients() })
  const { data: topServices } = useQuery({ queryKey: ['dashboard-top-services'], queryFn: () => dashboardApi.topServices() })
  const { data: topExpenses } = useQuery({ queryKey: ['dashboard-top-expenses'], queryFn: () => dashboardApi.topExpenses() })
  const { data: gpServices } = useQuery({ queryKey: ['dashboard-gp-services'], queryFn: () => dashboardApi.grossProfitServices() })
  const { data: gpClients } = useQuery({ queryKey: ['dashboard-gp-clients'], queryFn: () => dashboardApi.grossProfitClients() })
  const { data: rentabilidad = [] } = useQuery({ queryKey: ['dashboard-rentabilidad'], queryFn: () => dashboardApi.rentabilidadAbogado() })
  const { data: upcoming = [] } = useQuery({ queryKey: ['dashboard-upcoming'], queryFn: () => dashboardApi.upcomingSessions() })
  const { data: alertsData } = useQuery({ queryKey: ['dashboard-alerts'], queryFn: () => dashboardApi.alerts({ stale_days: 15 }) })

  const { data: puntoEquilibrio, isError: peError } = useQuery({ queryKey: ['dashboard-pe', mes], queryFn: () => finanzasApi.puntoEquilibrio(mes), retry: false })
  const { data: proyeccion } = useQuery({ queryKey: ['dashboard-proyeccion', mes], queryFn: () => finanzasApi.proyeccionCierreMes(mes) })
  const { data: cartera } = useQuery({ queryKey: ['dashboard-cartera', mes], queryFn: () => finanzasApi.carteraPonderada(mes) })
  const { data: comisionesResumen = [] } = useQuery({ queryKey: ['dashboard-comisiones', mes], queryFn: () => comisionesApi.resumen(mes) })

  // ── Comercial ──
  const { data: conversion } = useQuery({ queryKey: ['dashboard-conversion'], queryFn: pipelineApi.conversion })
  const { data: oportunidades = [] } = useQuery({ queryKey: ['dashboard-oportunidades'], queryFn: () => pipelineApi.list() })

  // ── Operativo ──
  const { data: allCases = [] } = useQuery({ queryKey: ['dashboard-cases'], queryFn: () => casesApi.list() })
  const { data: tiempos = [] } = useQuery({ queryKey: ['dashboard-tiempos'], queryFn: () => casesApi.tiemposAtencion() })
  const { data: cumplimiento = [] } = useQuery({ queryKey: ['dashboard-cumplimiento', mes], queryFn: () => finanzasApi.cumplimientoFamilia(mes) })

  const monthlyChart = cashflow?.monthly_chart?.map((p) => ({
    month: p.month.slice(5),
    Ingresos: p.incomes,
    Gastos: p.expenses,
  })) ?? []
  const pieData = topExpenses?.slice(0, 6).map((e) => ({ name: e.name, value: e.amount })) ?? []
  const balance = kpis?.balance ?? 0

  const overdueTasks = alertsData?.overdue_tasks ?? []
  const staleCases = alertsData?.stale_cases ?? []
  const overdueBilling = alertsData?.overdue_billing ?? []
  const budgetDeviation = alertsData?.budget_deviation ?? []
  const totalAlerts = overdueTasks.length + staleCases.length + overdueBilling.length + budgetDeviation.length

  const origenBreakdown = groupCount(oportunidades, (o) => o.origen_negocio)
  const canalBreakdown = groupCount(oportunidades, (o) => o.canal_captacion)
  const statusBreakdown = groupCount(allCases, (c) => c.status)
  const totalComisionesMes = comisionesResumen.reduce((s, r) => s + r.total_comision, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen comercial, operativo y financiero</p>
      </div>

      {/* ── Alertas ── */}
      {totalAlerts > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(38 90% 50% / 0.08)', border: '1px solid hsl(38 90% 50% / 0.25)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{totalAlerts} alerta{totalAlerts > 1 ? 's' : ''} activa{totalAlerts > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {overdueTasks.slice(0, 2).map((t) => (
              <Link key={`task-${t.id}`} to={`/cases?search=${encodeURIComponent(t.case_title)}`}
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                <Clock className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">{t.case_title} · vencida {formatDate(t.due_date)}</p>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              </Link>
            ))}
            {staleCases.slice(0, 2).map((c) => (
              <Link key={`stale-${c.id}`} to={`/cases?search=${encodeURIComponent(c.title)}`}
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{c.client_name} · sin sesión{c.last_session ? ` desde ${formatDate(c.last_session)}` : ' registrada'}</p>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              </Link>
            ))}
            {overdueBilling.slice(0, 2).map((c) => (
              <Link key={`bill-${c.id}`} to={`/cases?search=${encodeURIComponent(c.title)}`}
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                <CircleDollarSign className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{money(c.saldo_pendiente_cents / 100)} pendiente desde {c.mes_cobro_esperado}</p>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              </Link>
            ))}
            {budgetDeviation.slice(0, 1).map((d) => (
              <Link key={`dev-${d.mes}`} to="/finanzas"
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                <TrendingDown className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">Desviación de presupuesto — {d.mes}</p>
                  <p className="text-[11px] text-muted-foreground">Cumplimiento proyectado {pct(d.cumplimiento_proyectado_pct ?? 0)}</p>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="comercial">
        <TabsList>
          <TabsTrigger value="comercial" className="gap-1.5"><Target className="h-3.5 w-3.5" />Comercial</TabsTrigger>
          <TabsTrigger value="operativo" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" />Operativo</TabsTrigger>
          <TabsTrigger value="financiero" className="gap-1.5"><Wallet className="h-3.5 w-3.5" />Financiero</TabsTrigger>
        </TabsList>

        {/* ══════════════════════ COMERCIAL ══════════════════════ */}
        <TabsContent value="comercial" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard title="Prospectos" value={String(conversion?.prospectos ?? 0)} icon={Users} />
            <KpiCard title="Cotizados" value={String(conversion?.cotizados ?? 0)} icon={Target} />
            <KpiCard title="Ganados" value={String(conversion?.ganados ?? 0)} icon={TrendingUp} color="text-green-600" />
            <KpiCard title="Perdidos" value={String(conversion?.perdidos ?? 0)} icon={TrendingDown} color="text-red-500" />
            <KpiCard title="Conversión" value={conversion?.conversion_pct != null ? pct(conversion.conversion_pct) : '—'} sub="Ganados / Cotizados" icon={Percent} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Origen del negocio</CardTitle></CardHeader>
              <CardContent>
                {!origenBreakdown.length && <p className="text-muted-foreground text-sm py-4">Sin oportunidades registradas todavía.</p>}
                <div className="space-y-2">
                  {origenBreakdown.map((o) => (
                    <div key={o.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{o.label}</span>
                      <span className="font-semibold">{o.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Canal de captación</CardTitle></CardHeader>
              <CardContent>
                {!canalBreakdown.length && <p className="text-muted-foreground text-sm py-4">Sin oportunidades registradas todavía.</p>}
                <div className="space-y-2">
                  {canalBreakdown.map((c) => (
                    <div key={c.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className="font-semibold">{c.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════ OPERATIVO ══════════════════════ */}
        <TabsContent value="operativo" className="mt-4 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statusBreakdown.map((s) => (
              <KpiCard key={s.label} title={s.label} value={String(s.count)} icon={Briefcase} />
            ))}
            {!statusBreakdown.length && <p className="text-muted-foreground text-sm">Sin expedientes registrados.</p>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Servicios más frecuentes · días de atención</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Servicio</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Casos</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Días prom.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...tiempos].sort((a, b) => b.total_casos - a.total_casos).slice(0, 8).map((t, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 truncate max-w-[220px]">{t.service_nombre ?? '(Sin servicio)'}</td>
                        <td className="px-4 py-2 text-right font-mono">{t.total_casos}</td>
                        <td className="px-4 py-2 text-right font-mono text-muted-foreground">{t.dias_promedio != null ? t.dias_promedio.toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                    {!tiempos.length && <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">Sin datos</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />Próximos 7 días</CardTitle>
                <Link to="/sessions" className="text-xs text-primary hover:underline">Ver agenda →</Link>
              </CardHeader>
              <CardContent className="pt-0">
                {upcoming.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">Sin sesiones próximas</p>
                    <Link to="/sessions" className="text-xs text-primary hover:underline mt-1 block">Agendar sesión →</Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcoming.slice(0, 7).map((s) => (
                      <div key={s.id} className="flex items-start gap-2.5 py-1.5" style={{ borderBottom: '1px solid hsl(var(--c-inner-border))' }}>
                        <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${STATUS_DOT[s.status] ?? 'bg-muted-foreground'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{s.client_name ?? 'Sin cliente'}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(s.session_date)} · {s.consult_type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-sm">Cumplimiento de volumen por familia — mes</Label>
              <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" />
            </div>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Familia</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Meta casos</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Casos reales</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Cumpl. casos</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Meta ingresos</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Ingresos reales</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Cumpl. ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cumplimiento.map((c) => (
                      <tr key={c.family_id} className="border-t">
                        <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground mr-1.5">{c.family_code}</span>{c.family_nombre}</td>
                        <td className="px-4 py-2 text-right font-mono">{c.meta_casos}</td>
                        <td className="px-4 py-2 text-right font-mono">{c.casos_reales}</td>
                        <td className={`px-4 py-2 text-right font-mono ${(c.cumplimiento_casos_pct ?? 0) >= 0.85 ? 'text-green-600' : 'text-amber-600'}`}>
                          {c.cumplimiento_casos_pct != null ? pct(c.cumplimiento_casos_pct) : '—'}
                        </td>
                        <td className="px-4 py-2 text-right font-mono">{money(c.meta_ingresos)}</td>
                        <td className="px-4 py-2 text-right font-mono">{money(c.ingresos_reales)}</td>
                        <td className={`px-4 py-2 text-right font-mono font-semibold ${(c.cumplimiento_ingresos_pct ?? 0) >= 0.85 ? 'text-green-600' : 'text-red-600'}`}>
                          {c.cumplimiento_ingresos_pct != null ? pct(c.cumplimiento_ingresos_pct) : '—'}
                        </td>
                      </tr>
                    ))}
                    {!cumplimiento.length && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Sin metas de presupuesto para este mes</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════ FINANCIERO ══════════════════════ */}
        <TabsContent value="financiero" className="mt-4 space-y-6">
          {/* KPIs mes actual */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Ingresos del mes" value={formatCurrency(kpis?.incomes ?? 0)} icon={TrendingUp} color="text-green-600" />
            <KpiCard title="Gastos del mes" value={formatCurrency(kpis?.expenses ?? 0)} icon={TrendingDown} color="text-red-500" />
            <KpiCard title="Balance del mes" value={formatCurrency(balance)} icon={Wallet} color={balance >= 0 ? 'text-green-600' : 'text-red-500'} />
            <KpiCard title="Sesiones del mes" value={String(kpis?.sessions_total ?? 0)} sub={`${kpis?.sessions_finalized ?? 0} finalizadas`} icon={CalendarDays} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Clientes atendidos" value={String(kpis?.clients_attended ?? 0)} icon={Users} />
            <KpiCard title="Ingresos acumulados" value={formatCurrency(cashflow?.totals.total_incomes ?? 0)} icon={TrendingUp} color="text-green-600" />
            <KpiCard title="Gastos acumulados" value={formatCurrency(cashflow?.totals.total_expenses ?? 0)} icon={TrendingDown} color="text-red-500" />
            <KpiCard title="Costos directos" value={formatCurrency(cashflow?.totals.total_costs ?? 0)} icon={Scale} color="text-orange-500" />
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm">Mes de análisis</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Punto de equilibrio"
              value={puntoEquilibrio && !peError ? money(puntoEquilibrio.punto_equilibrio) : '—'}
              sub={puntoEquilibrio && !peError ? `Gastos fijos: ${money(puntoEquilibrio.gastos_fijos)}` : 'Sin supuestos configurados'}
              icon={Gauge}
            />
            <KpiCard
              title="Proyección de cierre"
              value={proyeccion ? money(proyeccion.proyeccion_cierre) : '—'}
              sub={proyeccion ? `Meta: ${money(proyeccion.meta_ingresos)}` : undefined}
              icon={Target}
              color={proyeccion && (proyeccion.cumplimiento_proyectado_pct ?? 0) >= 0.85 ? 'text-green-600' : 'text-amber-600'}
            />
            <KpiCard
              title="Cartera ponderada"
              value={cartera ? money(cartera.total_ponderado) : '—'}
              sub={cartera ? `Pendiente total: ${money(cartera.total_pendiente)}` : undefined}
              icon={Scale}
              color="text-orange-500"
            />
            <KpiCard title="Comisiones del mes" value={money(totalComisionesMes)} sub={`${comisionesResumen.length} persona${comisionesResumen.length === 1 ? '' : 's'}`} icon={CircleDollarSign} color="text-green-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Flujo de Caja Mensual</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="Ingresos" fill={GREEN} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Gastos" fill={RED} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Gastos por Categoría</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Utilidad Bruta por Servicio</CardTitle></CardHeader>
              <CardContent><GrossProfitBar items={gpServices ?? []} label="Ingresos − costos directos por expediente" /></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Utilidad Bruta por Cliente</CardTitle></CardHeader>
              <CardContent><GrossProfitBar items={gpClients ?? []} label="Ingresos − costos directos por cliente" /></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Rentabilidad por Abogado</CardTitle></CardHeader>
            <CardContent><RentabilidadAbogadoBar items={rentabilidad} /></CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Top Clientes por Ingresos</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(topClients ?? []).slice(0, 6).map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">{i + 1}. {c.name}</span>
                      <span className="font-semibold ml-2 shrink-0">{formatCurrency(c.amount)}</span>
                    </div>
                  ))}
                  {!topClients?.length && <p className="text-muted-foreground text-sm">Sin datos</p>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Top Servicios por Ingresos</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(topServices ?? []).slice(0, 6).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate text-muted-foreground">{i + 1}. {s.name}</span>
                      <span className="font-semibold ml-2 shrink-0">{formatCurrency(s.amount)}</span>
                    </div>
                  ))}
                  {!topServices?.length && <p className="text-muted-foreground text-sm">Sin datos</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
