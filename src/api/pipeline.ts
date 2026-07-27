import type { ConversionComercial, Oportunidad } from '@/types'
import api from './client'

export interface OportunidadPayload {
  client_id?: number | null
  prospecto_nombre?: string
  prospecto_contacto?: string
  service_id?: number | null
  canal_captacion: string
  origen_negocio: string
}

export const pipelineApi = {
  list: (params?: { estado?: string; q?: string }) => api.get<Oportunidad[]>('/oportunidades', { params }).then((r) => r.data),
  conversion: () => api.get<ConversionComercial>('/oportunidades/conversion').then((r) => r.data),
  create: (data: OportunidadPayload) => api.post<Oportunidad>('/oportunidades', data).then((r) => r.data),
  update: (id: number, data: OportunidadPayload) => api.put<Oportunidad>(`/oportunidades/${id}`, data).then((r) => r.data),
  transicion: (id: number, estado: string, motivo_perdida?: string) =>
    api.post<{ oportunidad: Oportunidad; case_id: number | null; case_internal_ref: string | null }>(`/oportunidades/${id}/transicion`, { estado, motivo_perdida }).then((r) => r.data),
}
