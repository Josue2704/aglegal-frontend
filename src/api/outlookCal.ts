import api from './client'

export const outlookCalApi = {
  status: () => api.get<{ connected: boolean }>('/outlook-cal/status').then((r) => r.data),
  authorize: () => api.get<{ url: string }>('/outlook-cal/authorize').then((r) => r.data),
  disconnect: () => api.delete('/outlook-cal/disconnect'),
}
