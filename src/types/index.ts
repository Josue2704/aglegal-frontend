// ── Auth ──────────────────────────────────────────────────────────────────────
export interface UserInfo {
  id: number
  username: string
  full_name: string
  role: string
}
export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserInfo
}

// ── Clients ───────────────────────────────────────────────────────────────────
export interface Client {
  id: number
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string
  session_count: number
  case_count: number
}
export interface ClientIn {
  name: string
  phone?: string
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
  service_product_id: number | null
  product_name: string | null
  created_at: string
}
export interface CaseIn {
  client_id: number
  service_area: string
  title: string
  status: CaseStatus
  priority: CasePriority
  opened_at: string
  notes?: string
  service_product_id?: number | null
}
export interface CaseUpdate extends Omit<CaseIn, 'client_id'> {
  closed_at?: string | null
}

export interface CaseTask {
  id: number
  case_id: number
  title: string
  done: boolean
  due_date: string | null
  created_at: string
}
export interface CaseTaskIn {
  title: string
  due_date?: string | null
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export type SessionStatus = 'Pendiente' | 'En proceso' | 'Finalizada'
export interface Session {
  id: number
  client_id: number
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
  client_id: number
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
  category_id: number | null
  category_name: string | null
  case_id: number | null
  case_title: string | null
  product_name: string | null
  detail: string | null
  concept: string
  created_at: string
}
export interface IncomeIn {
  amount: number
  income_date: string
  client_id?: number | null
  category_id?: number | null
  case_id?: number | null
  detail?: string
}

// ── Expenses ──────────────────────────────────────────────────────────────────
export interface Expense {
  id: number
  category_id: number | null
  category_name: string | null
  detail: string | null
  concept: string
  amount: number
  expense_date: string
  notes: string | null
  created_at: string
}
export interface ExpenseIn {
  category_id?: number | null
  detail: string
  amount: number
  expense_date: string
  notes?: string
}

// ── Costs ─────────────────────────────────────────────────────────────────────
export interface Cost {
  id: number
  client_id: number | null
  client_name: string | null
  case_id: number | null
  case_title: string | null
  category_id: number | null
  category_name: string | null
  product_name: string | null
  detail: string | null
  concept: string
  amount: number
  cost_date: string
  notes: string | null
  created_at: string
}
export interface CostIn {
  client_id?: number | null
  case_id?: number | null
  category_id?: number | null
  detail: string
  amount: number
  cost_date: string
  notes?: string
}

// ── Categories ────────────────────────────────────────────────────────────────
export type CategoryKind = 'income' | 'expense' | 'cost' | 'service'
export interface Category {
  id: number
  kind: CategoryKind
  name: string
  created_at: string
}
export interface ServiceProduct {
  id: number
  category_id: number
  category_name: string | null
  name: string
  description: string | null
  base_price: number | null
  active: boolean
  created_at: string
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
  active: boolean
  created_at: string
}
export interface UserIn {
  username: string
  full_name?: string
  role?: string
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
  categories_total: number
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
  created_at: string
}
export interface CaseAttachment extends Attachment {
  session_date: string | null
  session_type: string | null
}

// ── Misc ──────────────────────────────────────────────────────────────────────
export interface Choice { id: number; name?: string; title?: string }
export interface ApiError { detail: string | { msg: string }[] }
