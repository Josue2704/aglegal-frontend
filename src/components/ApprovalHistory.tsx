import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/api/client'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

type Proposal = {reference_labels:Record<string,string>;id:number; entity:string; entity_id:number|null; action:string; status:string; reason:string; requester:string; reviewer:string|null; evidence:string|null; payload:Record<string,unknown>; before_value:Record<string,unknown>|null; after_value:Record<string,unknown>|null; created_at:string}
const labels:Record<string,string> = {account_code:'Código',tipo:'Tipo',grupo:'Grupo',subgrupo:'Subgrupo',nombre:'Nombre',naturaleza:'Naturaleza',category_id:'Categoría',family_id:'Familia',centro_costo:'Centro de costo',afecta_utilidad:'Afecta utilidad',regla_de_uso:'Regla de uso',estado:'Estado',mes:'Mes',volumen_meta:'Volumen meta',ticket_objetivo:'Ticket objetivo',margen_directo_objetivo_pct:'Margen objetivo',ticket_objetivo_cents:'Ticket objetivo',ingreso_proyectado_cents:'Ingreso proyectado'}
function Values({value,references}:{value:Record<string,unknown>|null;references:Record<string,string>}) {
 const display=(key:string,v:unknown)=>{
  if(v===null||v===undefined)return '—'
  if(typeof v==='boolean')return v?'Sí':'No'
  if(key.endsWith('_cents')||key==='ticket_objetivo')return new Intl.NumberFormat('es-SV',{style:'currency',currency:'USD'}).format(Number(v)/(key.endsWith('_cents')?100:1))
  if(key==='margen_directo_objetivo_pct')return (Number(v)*100).toFixed(1)+'%'
  return references[`${key}:${v}`]??String(v)
 }
 return <dl className="space-y-1 text-xs break-words">{Object.entries(value??{}).filter(([k])=>labels[k]).map(([k,v])=><div key={k}><dt className="inline font-semibold">{labels[k]}: </dt><dd className="inline">{display(k,v)}</dd></div>)}</dl>
}
export function ApprovalHistory() {
 const qc=useQueryClient(); const admin=useAuthStore(s=>s.user?.is_admin)
 const [selected,setSelected]=useState<Proposal|null>(null); const [evidence,setEvidence]=useState('')
 const {data=[],isError}=useQuery({queryKey:['financial-proposals'],queryFn:()=>api.get<Proposal[]>('/finanzas/propuestas').then(r=>r.data)})
 const decision=useMutation({mutationFn:(approve:boolean)=>api.post(`/finanzas/propuestas/${selected!.id}/decision`,{approve,evidence}),onSuccess:()=>{qc.invalidateQueries();setSelected(null);toast.success('Decisión registrada')},onError:(e:any)=>toast.error(e.response?.data?.detail??'No se pudo registrar la decisión')})
 return <section className="space-y-3"><h2 className="font-semibold">Autorizaciones e historial</h2><p className="text-sm text-muted-foreground">Las cuentas y metas conservan su valor vigente hasta que el socio administrador aprueba la propuesta.</p>
 {isError&&<p role="alert">No se pudieron cargar las propuestas.</p>}
 {data.length===0&&<p className="text-sm text-muted-foreground">Sin propuestas registradas.</p>}
 {data.map(r=><button key={r.id} onClick={()=>{setSelected(r);setEvidence('')}} className="w-full text-left border rounded-lg p-3 text-sm"><strong>#{r.id} · {r.entity==='cuenta'?'Cuenta':'Meta'} · {r.action} · {r.status}</strong><p>{r.reason}</p><p className="text-xs text-muted-foreground">Solicitó {r.requester} · {r.created_at.slice(0,10)}{r.reviewer?` · Revisó ${r.reviewer}`:''}</p></button>)}
 <Dialog open={!!selected} onOpenChange={v=>!v&&setSelected(null)}><DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>Propuesta #{selected?.id} · {selected?.status}</DialogTitle></DialogHeader>{selected&&<>
 <p>{selected.reason}</p><div className="grid gap-4 sm:grid-cols-2"><section><h3 className="font-semibold mb-2">Antes</h3><Values value={selected.before_value} references={selected.reference_labels??{}}/></section><section><h3 className="font-semibold mb-2">{selected.status==='Aprobada'?'Valor aprobado':'Propuesta'}</h3><Values value={selected.after_value??selected.payload} references={selected.reference_labels??{}}/>{selected.action==='eliminar'&&<p>Eliminar la meta vigente conservando esta versión.</p>}</section></div>
 {selected.evidence&&<p className="text-sm">Decisión: {selected.evidence}</p>}
 {admin&&selected.status==='Pendiente'&&<><Textarea aria-label="Evidencia de revisión" placeholder="Motivo y evidencia de la decisión" value={evidence} onChange={e=>setEvidence(e.target.value)}/><DialogFooter><Button variant="outline" disabled={!evidence.trim()||decision.isPending} onClick={()=>decision.mutate(false)}>Rechazar</Button><Button disabled={!evidence.trim()||decision.isPending} onClick={()=>decision.mutate(true)}>Aprobar y aplicar</Button></DialogFooter></>}
 </>}</DialogContent></Dialog></section>
}
