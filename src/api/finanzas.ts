import type { AgingCartera, CarteraPonderada, CentrosCosto, ComparativoGastos, CumplimientoFamilia, Cuenta, DiasCobro, Forecast, ForecastIn, ForecastUpdate, GastoFijo, IngresoPorOrigen, Persona, ProyeccionCierreMes, PuntoEquilibrio, ResumenMensual, Supuestos, TicketAgrupacion, TicketPromedio, UtilidadOperativaReal } from '@/types'
import api from './client'

export interface FinancialProposal { id: number; entity: 'cuenta' | 'forecast'; entity_id: number | null; status: 'Pendiente' | 'Aprobada' | 'Rechazada' }

export interface CuentaPayload {
  motivo?: string
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
  account_id?: number | null
  estado?: string
}

export interface GastoFijoPayload {
  concepto: string
  tipo?: string
  monto_mensual?: number | null
  mes_inicio: string
  mes_fin?: string | null
  account_id?: number | null
  estado?: string
}

export const finanzasApi = {
  personalChoices: () => api.get<{id:number; persona:string}[]>('/finanzas/personal/choices').then(r => r.data),
  // Plan de cuentas
  listCuentas: (params?: { tipo?: string; estado?: string }) =>
    api.get<Cuenta[]>('/finanzas/cuentas', { params }).then((r) => r.data),
  createCuenta: (data: CuentaPayload) => api.post<FinancialProposal>('/finanzas/cuentas', data).then((r) => r.data),
  updateCuenta: (id: number, data: Omit<CuentaPayload, 'account_code' | 'tipo'>) =>
    api.put<FinancialProposal>(`/finanzas/cuentas/${id}`, data).then((r) => r.data),

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
  createForecast: (data: ForecastIn & {motivo:string}) => api.post<FinancialProposal>('/finanzas/forecast', data).then((r) => r.data),
  updateForecast: (id: number, data: ForecastUpdate & {motivo:string}) => api.put<FinancialProposal>(`/finanzas/forecast/${id}`, data).then((r) => r.data),
  deleteForecast: (id: number, motivo: string) => api.delete(`/finanzas/forecast/${id}`, {params:{motivo}}),

  // Cartera ponderada y proyección de cierre de mes
  carteraPonderada: (mes?: string) => api.get<CarteraPonderada>('/finanzas/cartera-ponderada', { params: { mes } }).then((r) => r.data),
  proyeccionCierreMes: (mes: string) => api.get<ProyeccionCierreMes>('/finanzas/proyeccion-cierre-mes', { params: { mes } }).then((r) => r.data),

  // Cumplimiento por familia (Fase 9)
  cumplimientoFamilia: (mes: string) =>
    api.get<CumplimientoFamilia[]>('/finanzas/cumplimiento-familia', { params: { mes } }).then((r) => r.data),

  // Utilidad operativa real del despacho (Fase 9) — exacta solo a nivel de despacho, no por familia
  utilidadOperativaReal: (mes: string) =>
    api.get<UtilidadOperativaReal>('/finanzas/utilidad-operativa-real', { params: { mes } }).then((r) => r.data),

  // Presupuestado contra pagado, concepto por concepto
  comparativoGastosFijos: (mes: string) =>
    api.get<ComparativoGastos>('/finanzas/gastos-fijos-comparativo', { params: { mes } }).then((r) => r.data),

  // En qué centro de costo se fue el dinero del período (gastos + costos directos)
  centrosCosto: (desde: string, hasta: string) =>
    api.get<CentrosCosto>('/finanzas/centros-costo', { params: { desde, hasta } }).then((r) => r.data),

  // Resumen mensual consolidado — hoja 17 del Archivo Maestro
  resumenMensual: (desde: string, hasta: string) =>
    api.get<ResumenMensual>('/finanzas/resumen-mensual', { params: { desde, hasta } }).then((r) => r.data),

  // KPI-009 · ticket promedio por expediente cobrado
  ticketPromedio: (desde: string, hasta: string, agrupar_por: TicketAgrupacion = 'servicio') =>
    api.get<TicketPromedio>('/finanzas/ticket-promedio', { params: { desde, hasta, agrupar_por } }).then((r) => r.data),

  // KPI-015 · ingresos y utilidad directa por origen del negocio
  ingresosPorOrigen: (desde: string, hasta: string, agrupar_por = 'originador') =>
    api.get<IngresoPorOrigen[]>('/finanzas/ingresos-por-origen', { params: { desde, hasta, agrupar_por } }).then((r) => r.data),

  // KPI-016 · días promedio entre la facturación (o el cierre) y el cobro
  diasCobro: (desde: string, hasta: string) =>
    api.get<DiasCobro>('/finanzas/dias-cobro', { params: { desde, hasta } }).then((r) => r.data),

  // Antigüedad del saldo por cobrar
  agingCartera: (fecha_corte?: string) =>
    api.get<AgingCartera>('/finanzas/aging-cartera', { params: { fecha_corte } }).then((r) => r.data),
}
