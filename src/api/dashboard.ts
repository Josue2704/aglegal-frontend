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
  cashflowByClient: (params?: { start_date?: string; end_date?: string }) =>
    api.get<ClientCashflowItem[]>('/dashboard/cashflow-by-client', { params }).then((r) => r.data),
}
