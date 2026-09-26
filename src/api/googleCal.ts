import api from './client'

export const googleCalApi = {
  status: () => api.get<{ connected: boolean; error: string; pending: number }>('/google-cal/status').then((r) => r.data),
  authorize: () => api.get<{ url: string }>('/google-cal/authorize').then((r) => r.data),
  importEvents: () => api.post<{ imported: number; updated: number; cancelled: number; skipped: number; warnings: string[] }>('/google-cal/import').then((r) => r.data),
  verify: () => api.post<{ connected: boolean; error: string; pending: number }>('/google-cal/verify').then(r => r.data),
  retry: () => api.post<{ completed: number; failed: number }>('/google-cal/retry').then(r => r.data),
  disconnect: () => api.delete('/google-cal/disconnect'),
}
