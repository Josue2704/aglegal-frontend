import type {
  PayrollEntry, PayrollIn, PayrollUpdate, PayrollAuditEntry, PayrollPreviewIn, PayrollPreview,
  PayrollConfig, PayrollConfigIn, AguinaldoIn, AguinaldoResultado, VacacionesIn, VacacionesResultado,
  IndemnizacionIn, IndemnizacionResultado,
} from '@/types'
import api from './client'

export interface PayrollPerson {
  id: number; persona: string; cargo: string | null; monto_mensual: number;
  account_id: number | null; estado: string; mes_inicio: string; mes_fin: string | null;
}
export interface PayrollObligation {
  id: number; payroll_id: number; personal_id: number | null; kind: string; amount: number; employee_name: string;
  period: string; expense_id: number | null; payment_date: string | null; reference: string | null;
}

export const payrollApi = {
  accounts: () => api.get<{id: number; account_code: string; nombre: string}[]>('/payroll/cuentas').then(r => r.data),
  personal: () => api.get<PayrollPerson[]>('/payroll/personal').then(r => r.data),
  obligations: () => api.get<PayrollObligation[]>('/payroll/obligaciones').then(r => r.data),
  payObligation: (id: number, data: {payment_date: string; reference: string}) => api.post(`/payroll/obligaciones/${id}/pagar`, data),
  reverseObligation: (id: number, reason: string) => api.post(`/payroll/obligaciones/${id}/anular`, {reason}),
  list: () => api.get<PayrollEntry[]>('/payroll').then((r) => r.data),
  create: (data: PayrollIn) => api.post<PayrollEntry>('/payroll', data).then((r) => r.data),
  update: (id: number, data: PayrollUpdate) => api.put<PayrollEntry>(`/payroll/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/payroll/${id}`),
  auditLog: (id: number) => api.get<PayrollAuditEntry[]>(`/payroll/${id}/audit-log`).then((r) => r.data),
  preview: (data: PayrollPreviewIn) => api.post<PayrollPreview>('/payroll/preview', data).then((r) => r.data),
  configVigente: () => api.get<PayrollConfig>('/payroll/config/vigente').then((r) => r.data),
  configHistorial: () => api.get<PayrollConfig[]>('/payroll/config/historial').then((r) => r.data),
  createConfig: (data: PayrollConfigIn) => api.post<PayrollConfig>('/payroll/config', data).then((r) => r.data),
  calcularAguinaldo: (data: AguinaldoIn) => api.post<AguinaldoResultado>('/payroll/prestaciones/aguinaldo', data).then((r) => r.data),
  calcularVacaciones: (data: VacacionesIn) => api.post<VacacionesResultado>('/payroll/prestaciones/vacaciones', data).then((r) => r.data),
  calcularIndemnizacion: (data: IndemnizacionIn) => api.post<IndemnizacionResultado>('/payroll/prestaciones/indemnizacion', data).then((r) => r.data),
}
