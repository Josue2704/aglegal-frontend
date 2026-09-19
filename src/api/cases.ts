import type { Case, CaseIn, CaseUpdate, CaseTask, CaseTaskIn, GlobalCaseTask, Choice, Session, TiempoAtencion, CaseTimeEntry, CaseTimeEntryIn, ConflictoInteres, CaseHonorariosLogEntry } from '@/types'
import api from './client'

export const casesApi = {
  list: (params?: { search?: string; status?: string; estado_cobro?: string; client_id?: number; category_id?: number; subcategory_id?: number; service_id?: number; archived?: boolean }) =>
    api.get<Case[]>('/cases', { params }).then((r) => r.data),
  get: (id: number) => api.get<Case>(`/cases/${id}`).then((r) => r.data),
  tiemposAtencion: (params?: { category_id?: number; subcategory_id?: number; service_id?: number }) =>
    api.get<TiempoAtencion[]>('/cases/tiempos-atencion', { params }).then((r) => r.data),
  choices: (client_id?: number) =>
    api.get<Choice[]>('/cases/choices', { params: client_id ? { client_id } : undefined }).then((r) => r.data),
  create: (data: CaseIn) => api.post<Case>('/cases', data).then((r) => r.data),
  update: (id: number, data: CaseUpdate) => api.put<Case>(`/cases/${id}`, data).then((r) => r.data),
  archive: (id: number) => api.delete(`/cases/${id}`),
  restore: (id: number) => api.post<Case>(`/cases/${id}/restore`).then((r) => r.data),
  purge: (id: number) => api.delete(`/cases/${id}/purge`),
  conflictoInteres: (nombre: string) => api.get<ConflictoInteres>('/cases/conflicto-interes', { params: { nombre } }).then((r) => r.data),
  honorariosLog: (caseId: number) => api.get<CaseHonorariosLogEntry[]>(`/cases/${caseId}/honorarios-log`).then((r) => r.data),
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
  setTaskCritico: (taskId: number, es_critico: boolean) =>
    api.patch<CaseTask>(`/cases/tasks/${taskId}/critico`, { es_critico }).then((r) => r.data),
  setTaskResponsible: (taskId: number, responsible_username: string | null) =>
    api.patch<CaseTask>(`/cases/tasks/${taskId}/responsible`, { responsible_username }).then((r) => r.data),
  deleteTask: (taskId: number) => api.delete(`/cases/tasks/${taskId}`),
  // Sessions
  listSessions: (caseId: number) => api.get<Session[]>(`/cases/${caseId}/sessions`).then((r) => r.data),
  // Registro de horas
  listTimeEntries: (caseId: number) => api.get<CaseTimeEntry[]>(`/cases/${caseId}/time-entries`).then((r) => r.data),
  createTimeEntry: (caseId: number, data: CaseTimeEntryIn) =>
    api.post<CaseTimeEntry>(`/cases/${caseId}/time-entries`, data).then((r) => r.data),
  deleteTimeEntry: (entryId: number) => api.delete(`/cases/time-entries/${entryId}`),
}
