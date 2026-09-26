import type { Comision, Originador, OriginadorIn, ResumenComision } from '@/types'
import api from './client'

export interface CommissionSettlement {
  id: number; personal_id: number; persona_nombre: string; amount_cents: number;
  payment_date: string; reference: string; actor: string; expense_id: number | null; commission_ids: number[];
}
export const comisionesApi = {
  revisar: (id: number, evidencia: string, elegible: boolean) => api.post<Comision>(`/comisiones/${id}/revision`,{evidencia,elegible}).then(r=>r.data),
  liquidaciones: () => api.get<CommissionSettlement[]>('/comisiones/liquidaciones').then(r=>r.data),
  liquidar: (data: {commission_ids:number[]; payment_date:string; reference:string; account_id:number | null; request_key:string}) => api.post('/comisiones/liquidaciones',data).then(r=>r.data),
  listOriginadores: (caseId: number) => api.get<Originador[]>(`/comisiones/originadores/${caseId}`).then((r) => r.data),
  setOriginadores: (caseId: number, originadores: OriginadorIn[]) =>
    api.put<Originador[]>(`/comisiones/originadores/${caseId}`, { originadores }).then((r) => r.data),

  list: (params?: { personal_id?: number; mes?: string; case_id?: number }) =>
    api.get<Comision[]>('/comisiones', { params }).then((r) => r.data),
  resumen: (mes: string) => api.get<ResumenComision[]>('/comisiones/resumen', { params: { mes } }).then((r) => r.data),
  reconocer: (incomeId: number) => api.post<Comision[]>('/comisiones/reconocer', null, { params: { income_id: incomeId } }).then((r) => r.data),
  revertir: (commissionId: number) => api.post<Comision>(`/comisiones/${commissionId}/revertir`).then((r) => r.data),
}
