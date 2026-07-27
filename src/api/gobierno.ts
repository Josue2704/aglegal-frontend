import type { Solicitud, SolicitudIn, SolicitudTransicion, SolicitudUpdate } from '@/types'
import api from './client'

export const gobiernoApi = {
  list: (params?: { estado?: string; tipo_registro?: string; q?: string }) =>
    api.get<Solicitud[]>('/solicitudes-catalogo', { params }).then((r) => r.data),
  create: (data: SolicitudIn) => api.post<Solicitud>('/solicitudes-catalogo', data).then((r) => r.data),
  update: (id: number, data: SolicitudUpdate) => api.put<Solicitud>(`/solicitudes-catalogo/${id}`, data).then((r) => r.data),
  transicion: (id: number, data: SolicitudTransicion) => api.post<Solicitud>(`/solicitudes-catalogo/${id}/transicion`, data).then((r) => r.data),
}
