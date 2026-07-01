import type { Expense, ExpenseIn } from '@/types'
import api from './client'

export const expensesApi = {
  list: (params?: { start_date?: string; end_date?: string }) =>
    api.get<Expense[]>('/expenses', { params }).then((r) => r.data),
  create: (data: ExpenseIn) => api.post<Expense>('/expenses', data).then((r) => r.data),
  update: (id: number, data: ExpenseIn) => api.put<Expense>(`/expenses/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
}
