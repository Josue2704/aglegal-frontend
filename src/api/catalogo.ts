import type { Categoria, CatalogoEstado, Familia, HistorialEntry, Servicio, ServicioChoice, ServicioEstado } from '@/types'
import api from './client'

// Solo lectura: toda alta, cambio o baja del catálogo se hace mediante una solicitud
// en Gobierno del Catálogo (ver api/gobierno.ts) — no hay create/update aquí.
export const catalogoApi = {
  // Categorías
  listCategorias: (estado?: CatalogoEstado) =>
    api.get<Categoria[]>('/catalogo/categorias', { params: { estado } }).then((r) => r.data),

  // Subcategorías
  listSubcategorias: (params?: { category_id?: number; estado?: CatalogoEstado }) =>
    api.get<import('@/types').Subcategoria[]>('/catalogo/subcategorias', { params }).then((r) => r.data),

  // Familias
  listFamilias: () => api.get<Familia[]>('/catalogo/familias').then((r) => r.data),

  // Servicios
  listServicios: (params?: { subcategory_id?: number; category_id?: number; estado?: ServicioEstado; q?: string }) =>
    api.get<Servicio[]>('/catalogo/servicios', { params }).then((r) => r.data),
  servicioChoices: (params?: { q?: string; estado?: ServicioEstado; limit?: number }) =>
    api.get<ServicioChoice[]>('/catalogo/servicios/choices', { params }).then((r) => r.data),

  // Historial
  historial: (tipo_registro: 'Categoria' | 'Subcategoria' | 'Servicio', entity_id: number) =>
    api.get<HistorialEntry[]>('/catalogo/historial', { params: { tipo_registro, entity_id } }).then((r) => r.data),
}
