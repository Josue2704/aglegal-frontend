import type { Case, CaseIn, CaseUpdate, CaseTask, CaseTaskIn, GlobalCaseTask, Choice, Session } from '@/types'
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
  listAllTasks: (params?: { done?: boolean; search?: string; case_id?: number }) =>
    api.get<GlobalCaseTask[]>('/cases/tasks', { params }).then((r) => r.data),
  listTasks: (caseId: number) => api.get<CaseTask[]>(`/cases/${caseId}/tasks`).then((r) => r.data),
  createTask: (caseId: number, data: CaseTaskIn) =>
    api.post<CaseTask>(`/cases/${caseId}/tasks`, data).then((r) => r.data),
  setTaskDone: (taskId: number, done: boolean, completed_notes?: string | null) =>
    api.patch<CaseTask>(`/cases/tasks/${taskId}/done`, { done, completed_notes }).then((r) => r.data),
  updateTaskNotes: (taskId: number, notes: string | null, completed_notes: string | null) =>
    api.patch<CaseTask>(`/cases/tasks/${taskId}/notes`, { notes, completed_notes }).then((r) => r.data),
  deleteTask: (taskId: number) => api.delete(`/cases/tasks/${taskId}`),
  // Sessions
  listSessions: (caseId: number) => api.get<Session[]>(`/cases/${caseId}/sessions`).then((r) => r.data),
}
