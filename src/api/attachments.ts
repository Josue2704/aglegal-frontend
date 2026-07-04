import type { Attachment, CaseAttachment } from '@/types'
import api from './client'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const attachmentsApi = {
  list: (entityType: string, entityId: number) =>
    api.get<Attachment[]>('/attachments', { params: { entity_type: entityType, entity_id: entityId } }).then((r) => r.data),

  listForCase: (caseId: number) =>
    api.get<CaseAttachment[]>(`/cases/${caseId}/all-attachments`).then((r) => r.data),

  upload: (entityType: string, entityId: number, file: File, docRole?: 'guide' | 'evidence') => {
    const fd = new FormData()
    fd.append('entity_type', entityType)
    fd.append('entity_id', String(entityId))
    fd.append('file', file)
    if (docRole) fd.append('doc_role', docRole)
    return api.post<Attachment>('/attachments/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  downloadUrl: (attachmentId: number) =>
    `${BASE_URL}/attachments/download/${attachmentId}`,

  download: async (attachmentId: number, filename: string) => {
    const res = await api.get(`/attachments/download/${attachmentId}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },

  delete: (attachmentId: number) => api.delete(`/attachments/${attachmentId}`),
}
