import type { Categoria, CatalogoEstado, EtiquetaTarea, Familia, HistorialEntry, PlantillaTarea, PlantillaTareaIn, Servicio, ServicioChoice, ServicioEstado } from '@/types'
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

  // Plantillas de tareas por servicio — esto sí es CRUD directo (no pasa por Gobierno
  // del Catálogo, es un checklist operativo, no un cambio al catálogo de precios).
  listPlantillaTareas: (serviceId: number) =>
    api.get<PlantillaTarea[]>(`/catalogo/servicios/${serviceId}/plantilla-tareas`).then((r) => r.data),
  createPlantillaTarea: (serviceId: number, data: PlantillaTareaIn) =>
    api.post<PlantillaTarea>(`/catalogo/servicios/${serviceId}/plantilla-tareas`, data).then((r) => r.data),
  updatePlantillaTarea: (id: number, data: PlantillaTareaIn) =>
    api.put<PlantillaTarea>(`/catalogo/plantilla-tareas/${id}`, data).then((r) => r.data),
  deletePlantillaTarea: (id: number) => api.delete(`/catalogo/plantilla-tareas/${id}`),
  /** El orden de la plantilla es el orden en que se trabaja el caso. */
  reordenarPlantillaTareas: (serviceId: number, orden_ids: number[]) =>
    api.put<PlantillaTarea[]>(`/catalogo/servicios/${serviceId}/plantilla-tareas/orden`, { orden_ids }).then((r) => r.data),
  /** Copiar el plan de trabajo de un servicio parecido. */
  copiarPlantillaTareas: (serviceId: number, origen_service_id: number, reemplazar = false) =>
    api.post<PlantillaTarea[]>(`/catalogo/servicios/${serviceId}/plantilla-tareas/copiar`, { origen_service_id, reemplazar }).then((r) => r.data),

  // Etiquetas de tarea (las del tablero)
  listEtiquetas: () => api.get<EtiquetaTarea[]>('/catalogo/etiquetas-tarea').then((r) => r.data),
  createEtiqueta: (data: { nombre: string; color: string }) =>
    api.post<EtiquetaTarea>('/catalogo/etiquetas-tarea', data).then((r) => r.data),
  updateEtiqueta: (id: number, data: { nombre: string; color: string }) =>
    api.put<EtiquetaTarea>(`/catalogo/etiquetas-tarea/${id}`, data).then((r) => r.data),
  deleteEtiqueta: (id: number) => api.delete(`/catalogo/etiquetas-tarea/${id}`),
}
