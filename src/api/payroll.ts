import type {
  PayrollEntry, PayrollIn, PayrollUpdate, PayrollAuditEntry, PayrollPreviewIn, PayrollPreview,
  PayrollConfig, PayrollConfigIn, AguinaldoIn, AguinaldoResultado, VacacionesIn, VacacionesResultado,
  IndemnizacionIn, IndemnizacionResultado,
} from '@/types'
import api from './client'

export const payrollApi = {
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
