import type { Case, CaseIn, CaseUpdate, CaseTask, CaseTaskIn, Choice, Session } from '@/types'
import api from './client'

export const casesApi = {
  list: (params?: { search?: string; status?: string; client_id?: number }) =>
    api.get<Case[]>('/cases', { params }).then((r) => r.data),
  choices: (client_id?: number) =>
    api.get<Choice[]>('/cases/choices', { params: client_id ? { client_id } : undefined }).then((r) => r.data),
  create: (data: CaseIn) => api.post<Case>('/cases', data).then((r) => r.data),
  update: (id: number, data: CaseUpdate) => api.put<Case>(`/cases/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/cases/${id}`),
  // Tasks
  listTasks: (caseId: number) => api.get<CaseTask[]>(`/cases/${caseId}/tasks`).then((r) => r.data),
  createTask: (caseId: number, data: CaseTaskIn) =>
    api.post<CaseTask>(`/cases/${caseId}/tasks`, data).then((r) => r.data),
  setTaskDone: (taskId: number, done: boolean) =>
    api.patch<CaseTask>(`/cases/tasks/${taskId}/done`, { done }).then((r) => r.data),
  deleteTask: (taskId: number) => api.delete(`/cases/tasks/${taskId}`),
  // Sessions
  listSessions: (caseId: number) => api.get<Session[]>(`/cases/${caseId}/sessions`).then((r) => r.data),
}
