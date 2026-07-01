import type { PayrollEntry, PayrollIn } from '@/types'
import api from './client'

export const payrollApi = {
  list: () => api.get<PayrollEntry[]>('/payroll').then((r) => r.data),
  create: (data: PayrollIn) => api.post<PayrollEntry>('/payroll', data).then((r) => r.data),
  delete: (id: number) => api.delete(`/payroll/${id}`),
}
