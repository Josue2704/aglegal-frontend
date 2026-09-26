import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import api from '@/api/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
type Review={id:number;nombre_propuesto:string;responsible:string;due_date:string;status:string;evidence:string|null}
export function CatalogFollowup(){
 const qc=useQueryClient(),admin=useAuthStore(s=>s.user?.is_admin)
 const [review,setReview]=useState<Review|null>(null),[evidence,setEvidence]=useState('')
 const {data=[]}=useQuery({queryKey:['catalog-followup'],queryFn:()=>api.get<Review[]>('/solicitudes-catalogo/seguimiento').then(r=>r.data)})
 const {data:notifications=[]}=useQuery({queryKey:['catalog-notifications'],queryFn:()=>api.get<{id:number;message:string;read_at:string|null}[]>('/solicitudes-catalogo/notificaciones').then(r=>r.data)})
 const finish=useMutation({mutationFn:()=>api.post(`/solicitudes-catalogo/seguimiento/${review!.id}/completar`,{evidence}),onSuccess:()=>{qc.invalidateQueries();setReview(null)},onError:(e:any)=>toast.error(e.response?.data?.detail??'No se pudo completar')})
 return <section className="space-y-3 border rounded-lg p-4"><h2 className="font-semibold">Comunicación y revisión de uso a los 30 días</h2>
 {notifications.filter(n=>!n.read_at).map(n=><div key={n.id} className="flex flex-wrap gap-2 items-center text-sm"><p>{n.message}</p><Button variant="outline" size="sm" onClick={async()=>{await api.post(`/solicitudes-catalogo/notificaciones/${n.id}/leida`);qc.invalidateQueries({queryKey:['catalog-notifications']})}}>Marcar leída</Button></div>)}
 {data.length===0&&<p className="text-sm text-muted-foreground">Las próximas activaciones generarán aquí su notificación y revisión.</p>}
 {data.map(r=><div key={r.id} className="border-t pt-2 text-sm"><strong>{r.nombre_propuesto}</strong><p>{r.status} · Responsable: {r.responsible} · Revisar el {r.due_date}</p>{r.evidence&&<p>{r.evidence}</p>}{admin&&r.status==='Pendiente'&&<Button size="sm" variant="outline" onClick={()=>{setReview(r);setEvidence('')}}>Registrar revisión</Button>}</div>)}
 <Dialog open={!!review} onOpenChange={v=>!v&&setReview(null)}><DialogContent><DialogHeader><DialogTitle>Revisión de uso: {review?.nombre_propuesto}</DialogTitle></DialogHeader><p className="text-sm">Documenta uso real, duplicidades detectadas y decisión. Disponible desde {review?.due_date}.</p><Textarea aria-label="Evidencia de uso" value={evidence} onChange={e=>setEvidence(e.target.value)}/><Button disabled={!evidence.trim()||finish.isPending} onClick={()=>finish.mutate()}>Completar revisión</Button></DialogContent></Dialog>
 </section>
}
