import type { ConversionComercial, Oportunidad } from '@/types'
import api from './client'

export interface OportunidadPayload {
  client_id?: number | null
  prospecto_nombre?: string
  prospecto_contacto?: string
  service_id?: number | null
  canal_captacion: string
  origen_negocio: string
  honorarios_estimados?: number | null
  responsable_username?: string
  proxima_accion?: string
  fecha_proxima_accion?: string | null
}

export interface TransicionPayload {
  estado: string
  motivo_perdida?: string | null
  motivo_perdida_tipo?: string | null
  crear_cliente?: boolean
  cliente_documento?: string
  cliente_telefono?: string
  cliente_email?: string
  responsable_expediente?: string
}

export interface ContactosParecidos {
  clientes: { id: number; name: string; phone: string | null; email: string | null; id_number: string | null }[]
  oportunidades: { id: number; estado: string; nombre: string | null; responsable_username: string | null }[]
  contrapartes: { id: number; title: string; opposing_party: string | null; client_name: string | null }[]
}

export const pipelineApi = {
  list: (params?: { estado?: string; q?: string }) => api.get<Oportunidad[]>('/oportunidades', { params }).then((r) => r.data),
  conversion: () => api.get<ConversionComercial>('/oportunidades/conversion').then((r) => r.data),
  create: (data: OportunidadPayload) => api.post<Oportunidad>('/oportunidades', data).then((r) => r.data),
  update: (id: number, data: OportunidadPayload) => api.put<Oportunidad>(`/oportunidades/${id}`, data).then((r) => r.data),
  transicion: (id: number, data: TransicionPayload) =>
    api.post<{ oportunidad: Oportunidad; case_id: number | null; case_internal_ref: string | null }>(`/oportunidades/${id}/transicion`, data).then((r) => r.data),
  motivosPerdida: () => api.get<string[]>('/oportunidades/motivos-perdida').then((r) => r.data),
  // Duplicados y conflicto de interés, consultados mientras se escribe el nombre.
  contactosParecidos: (nombre: string, contacto?: string) =>
    api.get<ContactosParecidos>('/oportunidades/contactos-parecidos', { params: { nombre, contacto: contacto || undefined } }).then((r) => r.data),
}
