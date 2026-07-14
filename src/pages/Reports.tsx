import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { Printer, TrendingUp, TrendingDown, Scale, CalendarDays, Users, Briefcase, ChevronDown } from 'lucide-react'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── helpers ──────────────────────────────────────────────────────────────────
function cents(n: number | null | undefined) {
  return ((n ?? 0) / 100).toLocaleString('es-SV', { style: 'currency', currency: 'USD' })
}

function fmtDate(d: string) {
  try { return format(new Date(d + 'T12:00:00'), "d MMM yyyy", { locale: es }) }
  catch { return d }
}

// Preset ranges
function presets() {
  const now = new Date()
  return [
    { label: 'Este mes', start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') },
    { label: 'Mes anterior', start: format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd'), end: format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd') },
    { label: 'Últimos 3 meses', start: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') },
    { label: 'Este año', start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` },
  ]
}

// ─── API fetchers ─────────────────────────────────────────────────────────────
function useReportData(start: string, end: string) {
  const params = { start_date: start, end_date: end }

  const { data: incomes = [] } = useQuery({
    queryKey: ['report-incomes', start, end],
    queryFn: () => api.get('/incomes', { params }).then(r => r.data as any[]),
    enabled: !!start && !!end,
  })
  const { data: expenses = [] } = useQuery({
    queryKey: ['report-expenses', start, end],
    queryFn: () => api.get('/expenses', { params }).then(r => r.data as any[]),
    enabled: !!start && !!end,
  })
  const { data: sessions = [] } = useQuery({
    queryKey: ['report-sessions', start, end],
    queryFn: () => api.get('/sessions', { params: { start_date: start, end_date: end } }).then(r => r.data as any[]),
    enabled: !!start && !!end,
  })

  return { incomes, expenses, sessions }
}

// ─── Summary card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: any; color: string
}) {
  return (
    <div className="rounded-xl p-4 print:break-inside-avoid" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Reports() {
  const ps = presets()
  const [preset, setPreset] = useState('0')
  const [start, setStart] = useState(ps[0].start)
  const [end, setEnd] = useState(ps[0].end)
  const printRef = useRef<HTMLDivElement>(null)

  function applyPreset(idx: string) {
    setPreset(idx)
    if (idx !== 'custom') {
      const p = ps[Number(idx)]
      setStart(p.start)
      setEnd(p.end)
    }
  }

  const { incomes, expenses, sessions } = useReportData(start, end)

  // Aggregates
  const totalIncome = incomes.reduce((s: number, i: any) => s + (i.amount_cents ?? 0), 0)
  const totalExpense = expenses.reduce((s: number, e: any) => s + (e.amount_cents ?? 0), 0)
  const balance = totalIncome - totalExpense

  // Income by category
  const incomeByCategory: Record<string, number> = {}
  incomes.forEach((i: any) => {
    const k = i.category_name ?? 'Sin categoría'
    incomeByCategory[k] = (incomeByCategory[k] ?? 0) + (i.amount_cents ?? 0)
  })
  const incomeCategories = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1])

  // Expenses by category
  const expByCategory: Record<string, number> = {}
  expenses.forEach((e: any) => {
    const k = e.category_name ?? 'Sin categoría'
    expByCategory[k] = (expByCategory[k] ?? 0) + (e.amount_cents ?? 0)
  })
  const expCategories = Object.entries(expByCategory).sort((a, b) => b[1] - a[1])

  // Sessions by status
  const sessionsByStatus: Record<string, number> = {}
  sessions.forEach((s: any) => {
    sessionsByStatus[s.status] = (sessionsByStatus[s.status] ?? 0) + 1
  })

  // Sessions by type
  const sessionsByType: Record<string, number> = {}
  sessions.forEach((s: any) => {
    const k = s.consult_type ?? 'Sin tipo'
    sessionsByType[k] = (sessionsByType[k] ?? 0) + 1
  })
  const topTypes = Object.entries(sessionsByType).sort((a, b) => b[1] - a[1]).slice(0, 8)

  const periodLabel = preset !== 'custom'
    ? ps[Number(preset)]?.label
    : `${fmtDate(start)} — ${fmtDate(end)}`

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 no-print">
          <div>
            <h1 className="text-2xl font-bold">Reportes</h1>
            <p className="text-muted-foreground text-sm">Resumen financiero y operativo del bufete</p>
          </div>
          <Button onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />Imprimir / Guardar PDF
          </Button>
        </div>

        {/* Period picker */}
        <div className="flex gap-3 flex-wrap items-end no-print">
          <div className="space-y-1">
            <Label>Período</Label>
            <Select value={preset} onValueChange={applyPreset}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ps.map((p, i) => <SelectItem key={i} value={String(i)}>{p.label}</SelectItem>)}
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {preset === 'custom' && (
            <>
              <div className="space-y-1">
                <Label>Desde</Label>
                <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-36" />
              </div>
              <div className="space-y-1">
                <Label>Hasta</Label>
                <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-36" />
              </div>
            </>
          )}
        </div>

        {/* Printable area */}
        <div id="print-area" ref={printRef} className="space-y-6">

          {/* Print header (only visible when printing) */}
          <div className="hidden print:block mb-6 pb-4 border-b">
            <h1 className="text-2xl font-bold">Reporte — AGLegal</h1>
            <p className="text-sm text-gray-500">{periodLabel} · Generado el {format(new Date(), "d 'de' MMMM yyyy", { locale: es })}</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Ingresos" value={cents(totalIncome)} sub={`${incomes.length} registros`} icon={TrendingUp} color="#22c55e" />
            <SummaryCard label="Egresos" value={cents(totalExpense)} sub={`${expenses.length} registros`} icon={TrendingDown} color="#ef4444" />
            <SummaryCard
              label="Balance"
              value={cents(balance)}
              sub={balance >= 0 ? 'superávit' : 'déficit'}
              icon={Scale}
              color={balance >= 0 ? '#22c55e' : '#ef4444'}
            />
            <SummaryCard label="Sesiones" value={String(sessions.length)} sub={`${sessionsByStatus['Finalizada'] ?? 0} finalizadas`} icon={CalendarDays} color="#3b82f6" />
          </div>

          {/* Financial detail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Incomes by category */}
            <Card>
              <CardContent className="pt-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />Ingresos por categoría
                </h2>
                {incomeCategories.length === 0
                  ? <p className="text-muted-foreground text-sm">Sin ingresos en el período</p>
                  : (
                    <div className="space-y-2.5">
                      {incomeCategories.map(([cat, total]) => {
                        const pct = totalIncome > 0 ? (total / totalIncome) * 100 : 0
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="truncate font-medium">{cat}</span>
                              <span className="tabular-nums text-muted-foreground ml-2 shrink-0">{cents(total)}</span>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: 'hsl(var(--muted))' }}>
                              <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              </CardContent>
            </Card>

            {/* Expenses by category */}
            <Card>
              <CardContent className="pt-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />Egresos por categoría
                </h2>
                {expCategories.length === 0
                  ? <p className="text-muted-foreground text-sm">Sin egresos en el período</p>
                  : (
                    <div className="space-y-2.5">
                      {expCategories.map(([cat, total]) => {
                        const pct = totalExpense > 0 ? (total / totalExpense) * 100 : 0
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="truncate font-medium">{cat}</span>
                              <span className="tabular-nums text-muted-foreground ml-2 shrink-0">{cents(total)}</span>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: 'hsl(var(--muted))' }}>
                              <div className="h-1.5 rounded-full bg-red-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              </CardContent>
            </Card>
          </div>

          {/* Sessions breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* By status */}
            <Card>
              <CardContent className="pt-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-500" />Sesiones por estado
                </h2>
                {sessions.length === 0
                  ? <p className="text-muted-foreground text-sm">Sin sesiones en el período</p>
                  : (
                    <div className="space-y-3">
                      {[
                        { label: 'Pendiente', color: '#f59e0b' },
                        { label: 'En proceso', color: '#3b82f6' },
                        { label: 'Finalizada', color: '#22c55e' },
                      ].map(({ label, color }) => {
                        const count = sessionsByStatus[label] ?? 0
                        const pct = sessions.length > 0 ? (count / sessions.length) * 100 : 0
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{label}</span>
                              <span className="tabular-nums text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                            </div>
                            <div className="h-1.5 rounded-full" style={{ background: 'hsl(var(--muted))' }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                }
              </CardContent>
            </Card>

            {/* By type */}
            <Card>
              <CardContent className="pt-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-violet-500" />Tipos de consulta más frecuentes
                </h2>
                {topTypes.length === 0
                  ? <p className="text-muted-foreground text-sm">Sin sesiones en el período</p>
                  : (
                    <div className="space-y-2">
                      {topTypes.map(([type, count], i) => (
                        <div key={type} className="flex items-center gap-3 text-sm">
                          <span className="text-muted-foreground w-4 shrink-0 tabular-nums">{i + 1}</span>
                          <span className="flex-1 truncate">{type}</span>
                          <Badge variant="outline" className="tabular-nums shrink-0">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  )
                }
              </CardContent>
            </Card>
          </div>

          {/* Income list */}
          {incomes.length > 0 && (
            <Card className="print-break">
              <CardContent className="pt-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />Detalle de ingresos
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Descripción</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Categoría</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomes.map((i: any) => (
                        <tr key={i.id} className="border-b" style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
                          <td className="py-2 pr-4 tabular-nums text-muted-foreground whitespace-nowrap">{fmtDate(i.income_date)}</td>
                          <td className="py-2 pr-4">{i.description || '—'}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{i.category_name || '—'}</td>
                          <td className="py-2 text-right tabular-nums font-medium text-green-600">{cents(i.amount_cents)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} className="py-2 pr-4 font-bold text-right">Total</td>
                        <td className="py-2 text-right tabular-nums font-bold text-green-600">{cents(totalIncome)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expense list */}
          {expenses.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />Detalle de egresos
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Descripción</th>
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Categoría</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((e: any) => (
                        <tr key={e.id} className="border-b" style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
                          <td className="py-2 pr-4 tabular-nums text-muted-foreground whitespace-nowrap">{fmtDate(e.expense_date)}</td>
                          <td className="py-2 pr-4">{e.description || '—'}</td>
                          <td className="py-2 pr-4 text-muted-foreground">{e.category_name || '—'}</td>
                          <td className="py-2 text-right tabular-nums font-medium text-red-600">{cents(e.amount_cents)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} className="py-2 pr-4 font-bold text-right">Total</td>
                        <td className="py-2 text-right tabular-nums font-bold text-red-600">{cents(totalExpense)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Print footer */}
          <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-gray-400">
            AGLegal — Reporte generado el {format(new Date(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
          </div>
        </div>
      </div>
    </>
  )
}
