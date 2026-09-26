import type { Invoice, InvoiceIn, UnbilledItems, InvoiceCredit, InvoicePaymentIn } from '@/types'
import api from './client'

export const invoicesApi = {
  list: (clientId?: number) =>
    api
      .get<Invoice[]>('/invoices', { params: clientId ? { client_id: clientId } : undefined })
      .then((r) => r.data),

  get: (id: number) => api.get<Invoice>(`/invoices/${id}`).then((r) => r.data),

  unbilled: (clientId: number, caseId?: number | null) =>
    api.get<UnbilledItems>(`/invoices/unbilled/${clientId}`, { params: caseId ? { case_id: caseId } : undefined }).then((r) => r.data),

  nextNumber: () =>
    api.get<{ invoice_number: string }>('/invoices/next-number').then((r) => r.data.invoice_number),

  create: (data: InvoiceIn) => api.post<Invoice>('/invoices', data).then((r) => r.data),

  update: (
    id: number,
    data: Omit<InvoiceIn, 'client_id'> & { status?: string },
  ) => api.put<Invoice>(`/invoices/${id}`, data).then((r) => r.data),

  updateStatus: (id: number, status: string) =>
    api.patch<Invoice>(`/invoices/${id}/status`, { status }).then((r) => r.data),

  credits: (id: number) => api.get<InvoiceCredit[]>(`/invoices/${id}/credits`).then((r) => r.data),
  pay: (id: number, data: InvoicePaymentIn) => api.post<Invoice>(`/invoices/${id}/payments`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
}
