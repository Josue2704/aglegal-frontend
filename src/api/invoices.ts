import type { Invoice, InvoiceIn, UnbilledItems } from '@/types'
import api from './client'

export const invoicesApi = {
  list: (clientId?: number) =>
    api
      .get<Invoice[]>('/invoices', { params: clientId ? { client_id: clientId } : undefined })
      .then((r) => r.data),

  get: (id: number) => api.get<Invoice>(`/invoices/${id}`).then((r) => r.data),

  unbilled: (clientId: number) =>
    api.get<UnbilledItems>(`/invoices/unbilled/${clientId}`).then((r) => r.data),

  nextNumber: () =>
    api.get<{ invoice_number: string }>('/invoices/next-number').then((r) => r.data.invoice_number),

  create: (data: InvoiceIn) => api.post<Invoice>('/invoices', data).then((r) => r.data),

  update: (
    id: number,
    data: Omit<InvoiceIn, 'client_id'> & { status?: string },
  ) => api.put<Invoice>(`/invoices/${id}`, data).then((r) => r.data),

  updateStatus: (id: number, status: string) =>
    api.patch<Invoice>(`/invoices/${id}/status`, { status }).then((r) => r.data),

  delete: (id: number) => api.delete(`/invoices/${id}`),
}
