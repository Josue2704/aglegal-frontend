import { useQuery } from '@tanstack/react-query'
import { TrendingUp, TrendingDown, Users, CalendarDays, Scale, Wallet } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { dashboardApi } from '@/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
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

export default function Dashboard() {
  const { data: kpis } = useQuery({ queryKey: ['dashboard-kpis'], queryFn: dashboardApi.kpis })
  const { data: cashflow } = useQuery({ queryKey: ['dashboard-cashflow'], queryFn: () => dashboardApi.cashflow() })
  const { data: topClients } = useQuery({ queryKey: ['dashboard-top-clients'], queryFn: () => dashboardApi.topClients() })
  const { data: topServices } = useQuery({ queryKey: ['dashboard-top-services'], queryFn: () => dashboardApi.topServices() })
  const { data: topExpenses } = useQuery({ queryKey: ['dashboard-top-expenses'], queryFn: () => dashboardApi.topExpenses() })
  const { data: gpServices } = useQuery({ queryKey: ['dashboard-gp-services'], queryFn: () => dashboardApi.grossProfitServices() })
  const { data: gpClients } = useQuery({ queryKey: ['dashboard-gp-clients'], queryFn: () => dashboardApi.grossProfitClients() })

  const monthlyChart = cashflow?.monthly_chart?.map((p) => ({
    month: p.month.slice(5), // Show MM only
    Ingresos: p.incomes,
    Gastos: p.expenses,
  })) ?? []

  const pieData = topExpenses?.slice(0, 6).map((e) => ({ name: e.name, value: e.amount })) ?? []

  const balance = kpis?.balance ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen del mes en curso</p>
      </div>

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

      {/* Top listas */}
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
    </div>
  )
}
