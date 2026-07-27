import type { CarteraPonderada, Cuenta, Forecast, ForecastIn, ForecastUpdate, GastoFijo, Persona, ProyeccionCierreMes, PuntoEquilibrio, Supuestos } from '@/types'
import api from './client'

export interface CuentaPayload {
  account_code?: string
  tipo?: string
  grupo: string
  subgrupo?: string
  nombre: string
  naturaleza: string
  category_id?: number | null
  family_id?: number | null
  centro_costo: string
  afecta_utilidad?: boolean
  regla_de_uso?: string
  estado?: string
}

export interface PersonaPayload {
  persona: string
  cargo?: string
  monto_mensual?: number | null
  mes_inicio: string
  mes_fin?: string | null
  estado?: string
}

export interface GastoFijoPayload {
  concepto: string
  tipo?: string
  monto_mensual?: number | null
  mes_inicio: string
  mes_fin?: string | null
  estado?: string
}

export const finanzasApi = {
  // Plan de cuentas
  listCuentas: (params?: { tipo?: string; estado?: string }) =>
    api.get<Cuenta[]>('/finanzas/cuentas', { params }).then((r) => r.data),
  createCuenta: (data: CuentaPayload) => api.post<Cuenta>('/finanzas/cuentas', data).then((r) => r.data),
  updateCuenta: (id: number, data: Omit<CuentaPayload, 'account_code' | 'tipo'>) =>
    api.put<Cuenta>(`/finanzas/cuentas/${id}`, data).then((r) => r.data),

  // Personal
  listPersonal: (estado?: string) => api.get<Persona[]>('/finanzas/personal', { params: { estado } }).then((r) => r.data),
  createPersona: (data: PersonaPayload) => api.post<Persona>('/finanzas/personal', data).then((r) => r.data),
  updatePersona: (id: number, data: PersonaPayload) => api.put<Persona>(`/finanzas/personal/${id}`, data).then((r) => r.data),

  // Gastos fijos
  listGastosFijos: (params?: { estado?: string; tipo?: string }) =>
    api.get<GastoFijo[]>('/finanzas/gastos-fijos', { params }).then((r) => r.data),
  createGastoFijo: (data: GastoFijoPayload) => api.post<GastoFijo>('/finanzas/gastos-fijos', data).then((r) => r.data),
  updateGastoFijo: (id: number, data: GastoFijoPayload) => api.put<GastoFijo>(`/finanzas/gastos-fijos/${id}`, data).then((r) => r.data),

  // Supuestos financieros
  listSupuestos: () => api.get<Supuestos[]>('/finanzas/supuestos').then((r) => r.data),
  createSupuestos: (data: { periodo: string; costo_variable_pct: number; margen_operativo_meta_pct: number; margen_seguridad_pct: number }) =>
    api.post<Supuestos>('/finanzas/supuestos', data).then((r) => r.data),
  updateSupuestos: (id: number, data: { costo_variable_pct: number; margen_operativo_meta_pct: number; margen_seguridad_pct: number }) =>
    api.put<Supuestos>(`/finanzas/supuestos/${id}`, data).then((r) => r.data),

  // Punto de equilibrio
  puntoEquilibrio: (mes: string) => api.get<PuntoEquilibrio>('/finanzas/punto-equilibrio', { params: { mes } }).then((r) => r.data),

  // Presupuesto por familia (forecast)
  listForecast: (params?: { mes?: string; family_id?: number }) =>
    api.get<Forecast[]>('/finanzas/forecast', { params }).then((r) => r.data),
  createForecast: (data: ForecastIn) => api.post<Forecast>('/finanzas/forecast', data).then((r) => r.data),
  updateForecast: (id: number, data: ForecastUpdate) => api.put<Forecast>(`/finanzas/forecast/${id}`, data).then((r) => r.data),
  deleteForecast: (id: number) => api.delete(`/finanzas/forecast/${id}`),

  // Cartera ponderada y proyección de cierre de mes
  carteraPonderada: (mes?: string) => api.get<CarteraPonderada>('/finanzas/cartera-ponderada', { params: { mes } }).then((r) => r.data),
  proyeccionCierreMes: (mes: string) => api.get<ProyeccionCierreMes>('/finanzas/proyeccion-cierre-mes', { params: { mes } }).then((r) => r.data),

  // Cumplimiento por familia (Fase 9)
  cumplimientoFamilia: (mes: string) =>
    api.get<{
      family_id: number; family_code: string; family_nombre: string
      meta_casos: number; casos_reales: number; cumplimiento_casos_pct: number | null
      meta_ingresos: number; ingresos_reales: number; cumplimiento_ingresos_pct: number | null
    }[]>('/finanzas/cumplimiento-familia', { params: { mes } }).then((r) => r.data),
}
