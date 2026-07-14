import type { Client, ClientIn, HistoryItem, Choice } from '@/types'
import api from './client'

export const clientsApi = {
  list: (search?: string) =>
    api.get<Client[]>('/clients', { params: search ? { search } : undefined }).then((r) => r.data),
  choices: () => api.get<Choice[]>('/clients/choices').then((r) => r.data),
  get: (id: number) => api.get<Client>(`/clients/${id}`).then((r) => r.data),
  create: (data: ClientIn) => api.post<Client>('/clients', data).then((r) => r.data),
  update: (id: number, data: ClientIn) => api.put<Client>(`/clients/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/clients/${id}`),
  history: (id: number) => api.get<HistoryItem[]>(`/clients/${id}/history`).then((r) => r.data),
  statement: (id: number) => api.get(`/clients/${id}/statement`).then((r) => r.data),
}
