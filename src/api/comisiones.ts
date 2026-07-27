import type { Comision, Originador, OriginadorIn, ResumenComision } from '@/types'
import api from './client'

export const comisionesApi = {
  listOriginadores: (caseId: number) => api.get<Originador[]>(`/comisiones/originadores/${caseId}`).then((r) => r.data),
  setOriginadores: (caseId: number, originadores: OriginadorIn[]) =>
    api.put<Originador[]>(`/comisiones/originadores/${caseId}`, { originadores }).then((r) => r.data),

  list: (params?: { personal_id?: number; mes?: string; case_id?: number }) =>
    api.get<Comision[]>('/comisiones', { params }).then((r) => r.data),
  resumen: (mes: string) => api.get<ResumenComision[]>('/comisiones/resumen', { params: { mes } }).then((r) => r.data),
  reconocer: (incomeId: number) => api.post<Comision[]>('/comisiones/reconocer', null, { params: { income_id: incomeId } }).then((r) => r.data),
  revertir: (commissionId: number) => api.post<Comision>(`/comisiones/${commissionId}/revertir`).then((r) => r.data),
}
