import type { Income, IncomeIn } from '@/types'
import api from './client'

export const incomesApi = {
  list: (params?: { start_date?: string; end_date?: string }) =>
    api.get<Income[]>('/incomes', { params }).then((r) => r.data),
  create: (data: IncomeIn) => api.post<Income>('/incomes', data).then((r) => r.data),
  update: (id: number, data: IncomeIn) => api.put<Income>(`/incomes/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/incomes/${id}`),
}
