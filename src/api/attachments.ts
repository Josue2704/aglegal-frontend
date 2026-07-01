import type { Attachment, CaseAttachment } from '@/types'
import api from './client'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const attachmentsApi = {
  list: (entityType: string, entityId: number) =>
    api.get<Attachment[]>('/attachments', { params: { entity_type: entityType, entity_id: entityId } }).then((r) => r.data),

  listForCase: (caseId: number) =>
    api.get<CaseAttachment[]>(`/cases/${caseId}/all-attachments`).then((r) => r.data),

  upload: (entityType: string, entityId: number, file: File) => {
    const fd = new FormData()
    fd.append('entity_type', entityType)
    fd.append('entity_id', String(entityId))
    fd.append('file', file)
    return api.post<Attachment>('/attachments/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  downloadUrl: (attachmentId: number) =>
    `${BASE_URL}/attachments/download/${attachmentId}`,

  delete: (attachmentId: number) => api.delete(`/attachments/${attachmentId}`),
}
