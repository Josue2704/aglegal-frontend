import type { User, UserIn } from '@/types'
import api from './client'

export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),
  create: (data: UserIn) => api.post<User>('/users', data).then((r) => r.data),
  update: (id: number, data: Partial<UserIn>) => api.put<User>(`/users/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/users/${id}`),
  changePassword: (id: number, password: string) => api.post(`/users/${id}/password`, { password }),
}
