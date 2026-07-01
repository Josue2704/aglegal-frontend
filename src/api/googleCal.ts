import api from './client'

export const googleCalApi = {
  status: () => api.get<{ connected: boolean }>('/google-cal/status').then((r) => r.data),
  authorize: () => api.get<{ url: string }>('/google-cal/authorize').then((r) => r.data),
  importEvents: () => api.post<{ imported: number; updated: number }>('/google-cal/import').then((r) => r.data),
  disconnect: () => api.delete('/google-cal/disconnect'),
}
