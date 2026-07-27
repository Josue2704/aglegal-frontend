import type { MonthlyMetrics, CashflowResponse, TopItem, GrossProfitItem, ClientCashflowItem } from '@/types'
import api from './client'

export const dashboardApi = {
  kpis: () => api.get<MonthlyMetrics>('/dashboard/kpis').then((r) => r.data),
  cashflow: (params?: { start_date?: string; end_date?: string }) =>
    api.get<CashflowResponse>('/dashboard/cashflow', { params }).then((r) => r.data),
  topClients: (params?: { start_date?: string; end_date?: string; limit?: number }) =>
    api.get<TopItem[]>('/dashboard/top-clients', { params }).then((r) => r.data),
  topServices: (params?: { start_date?: string; end_date?: string; limit?: number }) =>
    api.get<TopItem[]>('/dashboard/top-services', { params }).then((r) => r.data),
  topExpenses: (params?: { start_date?: string; end_date?: string; limit?: number }) =>
    api.get<TopItem[]>('/dashboard/top-expenses', { params }).then((r) => r.data),
  grossProfitServices: (params?: { start_date?: string; end_date?: string; limit?: number }) =>
    api.get<GrossProfitItem[]>('/dashboard/gross-profit/services', { params }).then((r) => r.data),
  grossProfitClients: (params?: { start_date?: string; end_date?: string; limit?: number }) =>
    api.get<GrossProfitItem[]>('/dashboard/gross-profit/clients', { params }).then((r) => r.data),
  upcomingSessions: (days = 7) =>
    api.get<{ id: number; session_date: string; consult_type: string; status: string; client_name: string | null; start_time: string | null }[]>(
      '/dashboard/upcoming-sessions', { params: { days } }
    ).then((r) => r.data),
  alerts: (params?: { stale_days?: number }) =>
    api.get<{
      overdue_tasks: { id: number; title: string; due_date: string; case_id: number; case_title: string; client_name: string | null }[]
      stale_cases: { id: number; title: string; status: string; client_name: string | null; last_session: string | null }[]
      overdue_billing: { id: number; title: string; client_name: string | null; mes_cobro_esperado: string; estado_cobro: string; saldo_pendiente_cents: number }[]
      budget_deviation: { mes: string; cobrado_mes_cents: number; cartera_ponderada_mes_cents: number; proyeccion_cierre_cents: number; meta_ingresos_cents: number; cumplimiento_proyectado_pct: number | null }[]
    }>('/dashboard/alerts', { params }).then((r) => r.data),
  rentabilidadAbogado: (params?: { start_date?: string; end_date?: string }) =>
    api.get<{ responsable: string; ingresos: number; costos: number; utilidad_directa: number; margen_pct: number | null }[]>(
      '/dashboard/rentabilidad-abogado', { params }
    ).then((r) => r.data),
  cashflowByClient: (params?: { start_date?: string; end_date?: string }) =>
    api.get<ClientCashflowItem[]>('/dashboard/cashflow-by-client', { params }).then((r) => r.data),
  search: (q: string) =>
    api.get<{
      clients: { id: number; name: string; phone: string | null; email: string | null }[]
      cases: { id: number; title: string; status: string; client_name: string | null }[]
      sessions: { id: number; session_date: string; consult_type: string; status: string; client_name: string | null }[]
    }>('/dashboard/search', { params: { q } }).then((r) => r.data),
}
