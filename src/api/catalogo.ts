import type { Categoria, CatalogoEstado, Familia, HistorialEntry, Servicio, ServicioChoice, ServicioEstado } from '@/types'
import api from './client'

export interface ServicioPayload {
  subcategory_id: number
  nombre: string
  etiquetas?: string
  unidad_cobro?: string
  responsable_sugerido?: string
  tarifa_referencia?: number | null
  costo_referencia?: number | null
  horas_estandar?: number
  estado?: ServicioEstado
}

export const catalogoApi = {
  // Categorías
  listCategorias: (estado?: CatalogoEstado) =>
    api.get<Categoria[]>('/catalogo/categorias', { params: { estado } }).then((r) => r.data),
  createCategoria: (data: { category_code: string; nombre: string }) =>
    api.post<Categoria>('/catalogo/categorias', data).then((r) => r.data),
  updateCategoria: (id: number, data: { nombre: string; estado: CatalogoEstado }) =>
    api.put<Categoria>(`/catalogo/categorias/${id}`, data).then((r) => r.data),

  // Subcategorías
  listSubcategorias: (params?: { category_id?: number; estado?: CatalogoEstado }) =>
    api.get<import('@/types').Subcategoria[]>('/catalogo/subcategorias', { params }).then((r) => r.data),
  createSubcategoria: (data: { category_id: number; subcategory_code: string; nombre: string }) =>
    api.post<import('@/types').Subcategoria>('/catalogo/subcategorias', data).then((r) => r.data),
  updateSubcategoria: (id: number, data: { nombre: string; estado: CatalogoEstado }) =>
    api.put<import('@/types').Subcategoria>(`/catalogo/subcategorias/${id}`, data).then((r) => r.data),

  // Familias
  listFamilias: () => api.get<Familia[]>('/catalogo/familias').then((r) => r.data),
  createFamilia: (data: { category_id: number; nombre: string }) =>
    api.post<Familia>('/catalogo/familias', data).then((r) => r.data),
  updateFamilia: (id: number, data: { nombre: string }) =>
    api.put<Familia>(`/catalogo/familias/${id}`, data).then((r) => r.data),

  // Servicios
  listServicios: (params?: { subcategory_id?: number; category_id?: number; estado?: ServicioEstado; q?: string }) =>
    api.get<Servicio[]>('/catalogo/servicios', { params }).then((r) => r.data),
  servicioChoices: (params?: { q?: string; estado?: ServicioEstado; limit?: number }) =>
    api.get<ServicioChoice[]>('/catalogo/servicios/choices', { params }).then((r) => r.data),
  createServicio: (data: ServicioPayload) => api.post<Servicio>('/catalogo/servicios', data).then((r) => r.data),
  updateServicio: (id: number, data: Omit<ServicioPayload, 'subcategory_id'>) =>
    api.put<Servicio>(`/catalogo/servicios/${id}`, data).then((r) => r.data),

  // Historial
  historial: (tipo_registro: 'Categoria' | 'Subcategoria' | 'Servicio', entity_id: number) =>
    api.get<HistorialEntry[]>('/catalogo/historial', { params: { tipo_registro, entity_id } }).then((r) => r.data),
}
