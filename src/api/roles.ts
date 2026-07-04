import api from './client'
import type { Permission, Role, RoleDetail } from '@/types'

export const rolesApi = {
  list: (): Promise<Role[]> => api.get('/roles').then(r => r.data),
  get: (id: number): Promise<RoleDetail> => api.get(`/roles/${id}`).then(r => r.data),
  permissions: (): Promise<Permission[]> => api.get('/roles/permissions').then(r => r.data),
  create: (body: { name: string; description?: string; permission_ids: number[] }): Promise<RoleDetail> =>
    api.post('/roles', body).then(r => r.data),
  update: (id: number, body: { name: string; description?: string; permission_ids: number[] }): Promise<RoleDetail> =>
    api.put(`/roles/${id}`, body).then(r => r.data),
  delete: (id: number): Promise<void> => api.delete(`/roles/${id}`),
}
