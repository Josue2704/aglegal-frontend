import type { Session, SessionIn } from '@/types'
import api from './client'

export const sessionsApi = {
  list: (params?: { client_id?: number; start_date?: string; end_date?: string; status?: string }) =>
    api.get<Session[]>('/sessions', { params }).then((r) => r.data),
  create: (data: SessionIn) => api.post<Session>('/sessions', data).then((r) => r.data),
  update: (id: number, data: SessionIn) => api.put<Session>(`/sessions/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/sessions/${id}`),
}
