import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Users, CalendarDays, Scale, Wallet, AlertTriangle, Clock, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi } from '@/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { GrossProfitItem } from '@/types'

const COLORS = ['#2563eb', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']
const GREEN = '#16a34a'
const RED = '#dc2626'

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
        const pct = item.revenue > 0 ? (item.gross_profit / item.revenue) * 100 : 0
        const isPos = item.gross_profit >= 0
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-muted-foreground max-w-[55%]">{item.name}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground">{formatCurrency(item.revenue)}</span>
                <span className={`font-semibold ${isPos ? 'text-green-700' : 'text-red-600'}`}>
                  {isPos ? '+' : ''}{formatCurrency(item.gross_profit)} ({pct.toFixed(0)}%)
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${isPos ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(Math.abs(pct), 100)}%` }}
              />
            </div>
          </div>
        )
      })}
      <p className="text-xs text-muted-foreground pt-1 italic">{label}</p>
    </div>
  )
}

const STATUS_DOT: Record<string, string> = {
  'Pendiente': 'bg-yellow-400',
  'En proceso': 'bg-blue-400',
  'Finalizada': 'bg-green-400',
}

export default function Dashboard() {
  const { data: kpis } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: dashboardApi.kpis })
  const { data: cashflow } = useQuery({ queryKey: ['dashboard-cashflow'], queryFn: () => dashboardApi.cashflow() })
  const { data: topClients } = useQuery({ queryKey: ['dashboard-top-clients'], queryFn: () => dashboardApi.topClients() })
  const { data: topServices } = useQuery({ queryKey: ['dashboard-top-services'], queryFn: () => dashboardApi.topServices() })
  const { data: topExpenses } = useQuery({ queryKey: ['dashboard-top-expenses'], queryFn: () => dashboardApi.topExpenses() })
  const { data: gpServices } = useQuery({ queryKey: ['dashboard-gp-services'], queryFn: () => dashboardApi.grossProfitServices() })
  const { data: gpClients } = useQuery({ queryKey: ['dashboard-gp-clients'], queryFn: () => dashboardApi.grossProfitClients() })
  const { data: upcoming = [] } = useQuery({ queryKey: ['dashboard-upcoming'], queryFn: () => dashboardApi.upcomingSessions() })
  const { data: alertsData } = useQuery({ queryKey: ['dashboard-alerts'], queryFn: dashboardApi.alerts })

  const monthlyChart = cashflow?.monthly_chart?.map((p) => ({
    month: p.month.slice(5), // Show MM only
    Ingresos: p.incomes,
    Gastos: p.expenses,
  })) ?? []

  const pieData = topExpenses?.slice(0, 6).map((e) => ({ name: e.name, value: e.amount })) ?? []

  const balance = kpis?.balance ?? 0

  const overdueTasks = alertsData?.overdue_tasks ?? []
  const staleCases = alertsData?.stale_cases ?? []
  const totalAlerts = overdueTasks.length + staleCases.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen del mes en curso</p>
      </div>

      {/* ── Alertas ── */}
      {totalAlerts > 0 && (
        <div className="rounded-xl p-4 space-y-3" style={{ background: 'hsl(38 90% 50% / 0.08)', border: '1px solid hsl(38 90% 50% / 0.25)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{totalAlerts} alerta{totalAlerts > 1 ? 's' : ''} activa{totalAlerts > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {overdueTasks.slice(0, 3).map((t) => (
              <Link key={t.id} to={`/cases?search=${encodeURIComponent(t.case_title)}`}
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                <Clock className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-[11px] text-muted-foreground">{t.case_title} · vencida {formatDate(t.due_date)}</p>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              </Link>
            ))}
            {staleCases.slice(0, 3).map((c) => (
              <Link key={c.id} to={`/cases?search=${encodeURIComponent(c.title)}`}
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-amber-500/10 transition-colors">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground">{c.client_name} · sin sesión{c.last_session ? ` desde ${formatDate(c.last_session)}` : ' registrada'}</p>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* KPIs mes actual */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Ingresos del mes" value={formatCurrency(kpis?.incomes ?? 0)} icon={TrendingUp} color="text-green-600" />
        <KpiCard title="Gastos del mes" value={formatCurrency(kpis?.expenses ?? 0)} icon={TrendingDown} color="text-red-500" />
        <KpiCard title="Balance del mes" value={formatCurrency(balance)} icon={Wallet} color={balance >= 0 ? 'text-green-600' : 'text-red-500'} />
        <KpiCard title="Sesiones del mes" value={String(kpis?.sessions_total ?? 0)} sub={`${kpis?.sessions_finalized ?? 0} finalizadas`} icon={CalendarDays} />
      </div>

      {/* Totales acumulados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Clientes atendidos" value={String(kpis?.clients_attended ?? 0)} icon={Users} />
        <KpiCard title="Ingresos acumulados" value={formatCurrency(cashflow?.totals.total_incomes ?? 0)} icon={TrendingUp} color="text-green-600" />
        <KpiCard title="Gastos acumulados" value={formatCurrency(cashflow?.totals.total_expenses ?? 0)} icon={TrendingDown} color="text-red-500" />
        <KpiCard title="Costos directos" value={formatCurrency(cashflow?.totals.total_costs ?? 0)} icon={Scale} color="text-orange-500" />
      </div>

      {/* Gráficas */}
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

      {/* Utilidad bruta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilidad Bruta por Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <GrossProfitBar items={gpServices ?? []} label="Ingresos − costos directos por expediente" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilidad Bruta por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <GrossProfitBar items={gpClients ?? []} label="Ingresos − costos directos por cliente" />
          </CardContent>
        </Card>
      </div>

      {/* Top listas + agenda próxima */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Agenda próxima 7 días */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Próximos 7 días
            </CardTitle>
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
    </div>
  )
}
