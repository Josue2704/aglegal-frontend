import type { Cost, CostIn } from '@/types'
import api from './client'

export const costsApi = {
  list: (params?: { start_date?: string; end_date?: string }) =>
    api.get<Cost[]>('/costs', { params }).then((r) => r.data),
  create: (data: CostIn) => api.post<Cost>('/costs', data).then((r) => r.data),
  update: (id: number, data: CostIn) => api.put<Cost>(`/costs/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/costs/${id}`),
}
