// ── Auth ──────────────────────────────────────────────────────────────────────
export interface UserInfo {
  id: number
  username: string
  full_name: string
  role: string
  role_id: number | null
  is_admin: boolean
  permissions: string[]
}
export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

// ── Roles & Permissions ───────────────────────────────────────────────────────
export interface Permission {
  id: number
  module: string
  action: string
  label: string
}

export interface Role {
  id: number
  name: string
  description: string | null
  is_system: boolean
  permission_count: number
  created_at: string
}

export interface RoleDetail extends Role {
  permissions: Permission[]
}

// ── Clients ───────────────────────────────────────────────────────────────────
export type ClientType = 'Física' | 'Jurídica'

export interface Client {
  id: number
  name: string
  client_type: ClientType
  id_number: string | null
  phone: string | null
  phone2: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  session_count: number
  case_count: number
}
export interface ClientIn {
  name: string
  client_type?: ClientType
  id_number?: string
  phone?: string
  phone2?: string
  email?: string
  address?: string
  notes?: string
}
export interface HistoryItem {
  date: string | null
  type: string
  detail: string | null
  status: string | null
}

// ── Cases ─────────────────────────────────────────────────────────────────────
export type CaseStatus = 'Abierto' | 'En trámite' | 'En pausa' | 'Cerrado'
export type CasePriority = 'Baja' | 'Media' | 'Alta'
export type CaseEstadoCobro = 'En ejecución' | 'Finalizado pendiente de facturar' | 'Facturado pendiente de cobro' | 'Cobrado' | 'Suspendido'

export interface Case {
  id: number
  client_id: number
  client_name: string | null
  service_area: string
  title: string
  status: CaseStatus
  priority: CasePriority
  opened_at: string
  closed_at: string | null
  notes: string | null
  internal_ref: string | null
  official_ref: string | null
  opposing_party: string | null
  court_entity: string | null
  responsible_username: string | null
  created_at: string
  service_id: number | null
  service_code: string | null
  service_nombre: string | null
  subcategory_id: number | null
  subcategory_code: string | null
  subcategory_nombre: string | null
  category_id: number | null
  category_code: string | null
  category_nombre: string | null
  family_id: number | null
  family_code: string | null
  family_nombre: string | null
  honorarios_contratados: number
  costos_directos_estimados: number
  saldo_pendiente: number
  mes_cobro_esperado: string | null
  estado_cobro: CaseEstadoCobro
  fecha_cierre_estimada: string | null
  fecha_cierre_real: string | null
  dias_duracion: number | null
  proxima_accion: string | null
  opportunity_id: number | null
}
export interface CaseIn {
  client_id: number
  service_area: string
  title: string
  status: CaseStatus
  priority: CasePriority
  opened_at: string
  notes?: string
  internal_ref?: string
  official_ref?: string
  opposing_party?: string
  court_entity?: string
  responsible_username?: string
  service_id?: number | null
  honorarios_contratados?: number | null
  costos_directos_estimados?: number | null
  mes_cobro_esperado?: string | null
  estado_cobro?: CaseEstadoCobro
  fecha_cierre_estimada?: string | null
  proxima_accion?: string
}
export interface CaseUpdate extends Omit<CaseIn, 'client_id'> {
  closed_at?: string | null
  fecha_cierre_real?: string | null
}
export interface TiempoAtencion {
  service_code: string | null
  service_nombre: string | null
  category_code: string | null
  category_nombre: string | null
  total_casos: number
  casos_cerrados: number
  dias_promedio: number | null
}

export interface CaseTask {
  id: number
  case_id: number
  title: string
  done: boolean
  due_date: string | null
  notes: string | null
  completed_notes: string | null
  responsible_username: string | null
  created_at: string
}

export interface GlobalCaseTask extends CaseTask {
  case_title: string
  case_status: string
  client_name: string | null
  client_id: number
}
export interface CaseTaskIn {
  title: string
  due_date?: string | null
  notes?: string | null
  responsible_username?: string
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export type SessionStatus = 'Pendiente' | 'En proceso' | 'Finalizada'
export interface Session {
  id: number
  client_id: number | null
  client_name: string | null
  case_id: number | null
  session_date: string
  start_time: string | null
  end_time: string | null
  consult_type: string
  notes: string | null
  status: SessionStatus
  created_at: string
}
export interface SessionIn {
  client_id?: number | null
  case_id?: number | null
  session_date: string
  start_time?: string | null
  end_time?: string | null
  consult_type: string
  notes?: string
  status: SessionStatus
}

// ── Incomes ───────────────────────────────────────────────────────────────────
export interface Income {
  id: number
  amount: number
  income_date: string
  client_id: number | null
  client_name: string | null
  case_id: number | null
  case_title: string | null
  detail: string | null
  concept: string
  invoice_id: number | null
  invoice_number: string | null
  created_at: string
  account_id: number | null
  account_code: string | null
  account_nombre: string | null
  service_id: number | null
  service_code: string | null
  service_nombre: string | null
  monto_iva: number
  monto_reembolsable: number
  monto_neto_operativo: number
}
export interface IncomeIn {
  amount: number
  income_date: string
  client_id?: number | null
  case_id?: number | null
  detail?: string
  invoice_id?: number | null
  account_id?: number | null
  service_id?: number | null
  monto_iva?: number | null
  monto_reembolsable?: number | null
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export interface Expense {
  id: number
  detail: string | null
  concept: string
  amount: number
  expense_date: string
  notes: string | null
  created_at: string
  account_id: number | null
  account_code: string | null
  account_nombre: string | null
  monto_iva: number
  monto_reembolsable: number
  monto_neto_operativo: number
}
export interface ExpenseIn {
  detail: string
  amount: number
  expense_date: string
  notes?: string
  account_id?: number | null
  monto_iva?: number | null
  monto_reembolsable?: number | null
}

// ── Costs ─────────────────────────────────────────────────────────────────────
export interface Cost {
  id: number
  client_id: number | null
  client_name: string | null
  case_id: number | null
  case_title: string | null
  detail: string | null
  concept: string
  amount: number
  cost_date: string
  notes: string | null
  created_at: string
  account_id: number | null
  account_code: string | null
  account_nombre: string | null
  service_id: number | null
  service_code: string | null
  service_nombre: string | null
  monto_iva: number
  monto_reembolsable: number
  monto_neto_operativo: number
}
export interface CostIn {
  client_id?: number | null
  case_id?: number | null
  detail: string
  amount: number
  cost_date: string
  notes?: string
  account_id?: number | null
  service_id?: number | null
  monto_iva?: number | null
  monto_reembolsable?: number | null
}

// ── Catálogo maestro (categorías / subcategorías / servicios / familias) ──────
export type CatalogoEstado = 'Activo' | 'Inactivo'
export type ServicioEstado = 'Activo' | 'Inactivo' | 'En diseño'
export const UNIDADES_COBRO = ['Precio fijo', 'Por hora', 'Por etapa', 'Mensual', 'Porcentaje', 'Por definir'] as const
export const RESPONSABLES_SUGERIDOS = ['Socio / Notario', 'Abogada asociada', 'Manager', 'Asistente legal', 'Equipo mixto', 'Por definir'] as const

export interface Categoria {
  id: number
  category_code: string
  nombre: string
  estado: CatalogoEstado
  created_at: string
  updated_at: string
}
export interface Subcategoria {
  id: number
  subcategory_code: string
  category_id: number
  category_code: string
  category_nombre: string
  nombre: string
  estado: CatalogoEstado
  created_at: string
  updated_at: string
}
export interface Familia {
  id: number
  family_code: string
  nombre: string
  category_id: number
  category_code: string
  category_nombre: string
  created_at: string
  updated_at: string
}
export interface Servicio {
  id: number
  service_code: string
  subcategory_id: number
  subcategory_code: string
  subcategory_nombre: string
  category_id: number
  category_code: string
  category_nombre: string
  nombre: string
  etiquetas: string
  unidad_cobro: string
  responsable_sugerido: string
  tarifa_referencia: number
  costo_referencia: number
  margen_referencia: number
  horas_estandar: number
  estado: ServicioEstado
  created_at: string
  updated_at: string
}
export interface ServicioChoice {
  id: number
  service_code: string
  nombre: string
  category_id: number
  category_code: string
  subcategory_id: number
  subcategory_code: string
}
export interface HistorialEntry {
  id: number
  tipo_registro: 'Categoria' | 'Subcategoria' | 'Servicio'
  entity_id: number
  version_anterior: Record<string, unknown>
  usuario_id: number | null
  fecha_cambio: string
}

// ── Plan de cuentas / personal / gastos fijos / supuestos financieros ─────────
export const PLAN_CUENTAS_TIPOS = ['Ingreso', 'Egreso'] as const
export const NATURALEZAS_CUENTA = ['Operativo', 'Fijo', 'Variable', 'Directo', 'Inversión', 'Otros', 'Fijo/Variable'] as const
export const CENTROS_COSTO = ['Operación jurídica', 'Administración', 'Comercial', 'Tecnología', 'Comercial y administración'] as const
export const GASTOS_FIJOS_TIPOS = ['Fijo', 'Estimado', 'Meta'] as const

export interface Cuenta {
  id: number
  account_code: string
  tipo: 'Ingreso' | 'Egreso'
  grupo: string
  subgrupo: string | null
  nombre: string
  naturaleza: string
  category_id: number | null
  category_code: string | null
  category_nombre: string | null
  family_id: number | null
  family_code: string | null
  family_nombre: string | null
  centro_costo: string
  afecta_utilidad: boolean
  estado: CatalogoEstado
  regla_de_uso: string | null
  created_at: string
  updated_at: string
}
export interface Persona {
  id: number
  person_code: string
  persona: string
  cargo: string | null
  monto_mensual: number
  mes_inicio: string
  mes_fin: string | null
  estado: CatalogoEstado
  created_at: string
  updated_at: string
}
export interface GastoFijo {
  id: number
  expense_code: string
  concepto: string
  tipo: string
  monto_mensual: number
  mes_inicio: string
  mes_fin: string | null
  estado: CatalogoEstado
  created_at: string
  updated_at: string
}
export interface Supuestos {
  id: number
  periodo: string
  costo_variable_pct: number
  margen_operativo_meta_pct: number
  margen_seguridad_pct: number
  created_at: string
  updated_at: string
}
export interface PuntoEquilibrio {
  mes: string
  gastos_fijos: number
  costo_variable_pct: number
  margen_operativo_meta_pct: number
  margen_seguridad_pct: number
  punto_equilibrio: number
  meta_segura: number
  ventas_margen_meta: number | null
}

// ── Presupuesto por familia (forecast) y proyección de cierre de mes ─────────
export interface Forecast {
  id: number
  family_id: number
  family_code: string
  family_nombre: string
  mes: string
  volumen_meta: number
  ticket_objetivo: number
  ingreso_proyectado: number
  margen_directo_objetivo_pct: number
  created_at: string
  updated_at: string
}
export interface ForecastIn {
  family_id: number
  mes: string
  volumen_meta: number | null
  ticket_objetivo: number | null
  margen_directo_objetivo_pct: number
}
export interface ForecastUpdate {
  volumen_meta: number | null
  ticket_objetivo: number | null
  margen_directo_objetivo_pct: number
}
export interface CarteraCaso {
  id: number
  title: string
  estado_cobro: string
  mes_cobro_esperado: string | null
  saldo_pendiente: number
  probabilidad_cobro: number
  saldo_ponderado: number
}
export interface CarteraPonderada {
  mes: string | null
  total_pendiente: number
  total_ponderado: number
  casos: CarteraCaso[]
}
export interface ProyeccionCierreMes {
  mes: string
  cobrado_mes: number
  cartera_ponderada_mes: number
  proyeccion_cierre: number
  meta_ingresos: number
  cumplimiento_proyectado_pct: number | null
}

// ── Comisión multi-originador (Fase 8) ────────────────────────────────────────
export const TIPO_ORIGEN_VALUES = ['Cliente nuevo', 'Venta cruzada'] as const
export type TipoOrigen = typeof TIPO_ORIGEN_VALUES[number]

export interface Originador {
  id: number
  case_id: number
  personal_id: number
  person_code: string
  persona_nombre: string
  porcentaje_participacion: number
  tipo_origen: TipoOrigen
  created_at: string
}
export interface OriginadorIn {
  personal_id: number
  porcentaje_participacion: number
  tipo_origen: TipoOrigen
}
export interface Comision {
  id: number
  income_id: number
  income_date: string
  case_id: number
  case_title: string
  personal_id: number
  person_code: string
  persona_nombre: string
  tipo_origen: TipoOrigen
  porcentaje_participacion: number
  base_utilidad_directa: number
  comision: number
  mes_reconocimiento: string
  ajusta_a_commission_id: number | null
  created_at: string
}
export interface ResumenComision {
  personal_id: number
  person_code: string
  persona_nombre: string
  total_comision: number
  total_utilidad_directa: number
  movimientos: number
  ajustes: number
}

// ── Gobierno del catálogo — solicitudes de alta/cambio (Fase 10) ─────────────
export const TIPO_SOLICITUD_VALUES = ['Alta', 'Cambio', 'Baja'] as const
export type TipoSolicitud = typeof TIPO_SOLICITUD_VALUES[number]
export const TIPO_REGISTRO_VALUES = ['Categoria', 'Subcategoria', 'Servicio', 'Familia'] as const
export type TipoRegistroSolicitud = typeof TIPO_REGISTRO_VALUES[number]
export const SOLICITUD_ESTADOS = ['Solicitado', 'En revisión', 'Aprobado', 'Rechazado', 'Activo', 'Inactivo'] as const
export type SolicitudEstado = typeof SOLICITUD_ESTADOS[number]

export interface Solicitud {
  id: number
  solicitud_code: string
  fecha_solicitud: string
  tipo_solicitud: TipoSolicitud
  tipo_registro: TipoRegistroSolicitud
  nombre_propuesto: string
  categoria_padre: string | null
  subcategoria_padre: string | null
  codigo_propuesto: string
  codigo_definitivo: string | null
  descripcion: string | null
  motivo: string | null
  etiquetas: string | null
  solicitante: string
  resultado_revision_duplicidad: string | null
  aprobador: string | null
  fecha_aprobacion: string | null
  estado: SolicitudEstado
  observaciones: string | null
  created_at: string
  updated_at: string
  entity_id: number | null
  unidad_cobro_propuesta: string | null
  responsable_sugerido_propuesto: string | null
  tarifa_referencia_propuesta: number | null
  costo_referencia_propuesta: number | null
  horas_estandar_propuesta: number | null
  estado_propuesto: string | null
}
export interface SolicitudIn {
  tipo_solicitud: TipoSolicitud
  tipo_registro: TipoRegistroSolicitud
  nombre_propuesto: string
  categoria_padre?: string | null
  subcategoria_padre?: string | null
  codigo_propuesto?: string
  descripcion?: string
  motivo?: string
  etiquetas?: string
  entity_id?: number | null
  unidad_cobro_propuesta?: string | null
  responsable_sugerido_propuesto?: string | null
  tarifa_referencia_propuesta?: number | null
  costo_referencia_propuesta?: number | null
  horas_estandar_propuesta?: number | null
  estado_propuesto?: string | null
}
export interface SolicitudUpdate {
  nombre_propuesto: string
  categoria_padre?: string | null
  subcategoria_padre?: string | null
  codigo_propuesto?: string
  descripcion?: string
  motivo?: string
  etiquetas?: string
  unidad_cobro_propuesta?: string | null
  responsable_sugerido_propuesto?: string | null
  tarifa_referencia_propuesta?: number | null
  costo_referencia_propuesta?: number | null
  horas_estandar_propuesta?: number | null
  estado_propuesto?: string | null
}
export interface SolicitudTransicion {
  estado: SolicitudEstado
  resultado_revision_duplicidad?: string | null
  aprobador?: string | null
  observaciones?: string | null
}

// ── Pipeline comercial (oportunidades) ─────────────────────────────────────────
export const CANALES_CAPTACION = ['Instagram', 'Google', 'LinkedIn', 'Referido', 'Otro'] as const
export const ORIGENES_NEGOCIO = ['Andrea', 'Alfredo', 'Guadalupe', 'Referido', 'Orgánico', 'Otro'] as const
export type OportunidadEstado = 'Prospecto' | 'Cotizado' | 'Ganado' | 'Perdido'

export interface Oportunidad {
  id: number
  client_id: number | null
  client_name: string | null
  prospecto_nombre: string | null
  prospecto_contacto: string | null
  service_id: number | null
  service_code: string | null
  service_nombre: string | null
  canal_captacion: string
  origen_negocio: string
  estado: OportunidadEstado
  motivo_perdida: string | null
  case_id: number | null
  case_internal_ref: string | null
  fecha_prospecto: string
  fecha_cotizado: string | null
  fecha_cierre: string | null
  created_at: string
  updated_at: string
}
export interface ConversionComercial {
  prospectos: number
  cotizados: number
  ganados: number
  perdidos: number
  conversion_pct: number | null
}

// ── Payroll ───────────────────────────────────────────────────────────────────
export interface PayrollEntry {
  id: number
  employee_name: string
  role: string | null
  period: string
  amount: number
  payment_date: string
  notes: string | null
  expense_id: number | null
  created_at: string
}
export type Payroll = PayrollEntry
export interface PayrollIn {
  employee_name: string
  role?: string
  period: string
  amount: number
  payment_date: string
  notes?: string
}

// ── Users ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  username: string
  full_name: string | null
  role: string
  role_id: number | null
  active: boolean
  created_at: string
}
export interface UserIn {
  username: string
  full_name?: string
  role?: string
  role_id?: number | null
  password?: string
  active?: boolean
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface MonthlyMetrics {
  clients_attended: number
  sessions_total: number
  sessions_finalized: number
  incomes: number
  expenses: number
  balance: number
}
export interface CashflowTotals {
  total_incomes: number
  total_expenses: number
  total_costs: number
  balance: number
}
export interface MonthlyPoint { month: string; incomes: number; expenses: number }
export interface TopItem { name: string; amount: number }
export interface GrossProfitItem { name: string; revenue: number; cost: number; gross_profit: number }
export interface ClientCashflowItem {
  client_id: number | null
  client_name: string
  income: number
  cost: number
  balance: number
  margin_pct: number
}
export interface CostTotals { total: number }
export interface CashflowResponse {
  totals: CashflowTotals
  monthly_chart: MonthlyPoint[]
}

// ── Attachments ───────────────────────────────────────────────────────────────
export interface Attachment {
  id: number
  entity_type: string
  entity_id: number
  original_name: string
  stored_path: string
  doc_role: string | null
  created_at: string
}
export interface CaseAttachment extends Attachment {
  session_date: string | null
  session_type: string | null
  task_title: string | null
}

// ── Invoices / Facturas ───────────────────────────────────────────────────────
export type InvoiceStatus = 'Borrador' | 'Enviada' | 'Pagada' | 'Cancelada'

export interface InvoiceItem {
  id: number
  invoice_id: number
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  entity_type: string | null
  entity_id: number | null
  created_at: string
}

export interface Invoice {
  id: number
  invoice_number: string
  client_id: number
  client_name: string | null
  case_id: number | null
  case_title: string | null
  invoice_date: string
  due_date: string | null
  status: InvoiceStatus
  notes: string | null
  firm_name: string | null
  firm_phone: string | null
  firm_email: string | null
  firm_address: string | null
  firm_tax_id: string | null
  total: number
  has_income: boolean
  items: InvoiceItem[]
  created_at: string
}

export interface InvoiceItemIn {
  description: string
  quantity: number
  unit_price: number
  entity_type?: string | null
  entity_id?: number | null
}

export interface InvoiceIn {
  client_id: number
  case_id?: number | null
  invoice_number: string
  invoice_date: string
  due_date?: string | null
  notes?: string | null
  firm_name?: string | null
  firm_phone?: string | null
  firm_email?: string | null
  firm_address?: string | null
  firm_tax_id?: string | null
  items: InvoiceItemIn[]
}

export interface UnbilledSession {
  id: number
  session_date: string
  consult_type: string
  notes: string | null
}

export interface UnbilledTask {
  id: number
  title: string
  due_date: string | null
  case_title: string | null
  case_id: number | null
}

export interface UnbilledCost {
  id: number
  concept: string
  detail: string | null
  amount: number
  cost_date: string
}

export interface UnbilledItems {
  sessions: UnbilledSession[]
  tasks: UnbilledTask[]
  costs: UnbilledCost[]
}

// ── Misc ──────────────────────────────────────────────────────────────────────
export interface Choice { id: number; name?: string; title?: string }
export interface ApiError { detail: string | { msg: string }[] }
