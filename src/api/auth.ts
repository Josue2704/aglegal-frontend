import type { AuthResponse, UserInfo } from '@/types'
import api from './client'

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data),
  me: () => api.get<UserInfo>('/auth/me').then((r) => r.data),
  logout: () => api.post('/auth/logout').catch(() => null),
}
