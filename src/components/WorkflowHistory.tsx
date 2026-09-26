import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/api/client'

type Event = { id:number; event:string; actor:string; created_at:string; details:Record<string,unknown> }
export function WorkflowHistory({ path }: { path:string }) {
  const [open,setOpen]=useState(false)
  const {data=[],isLoading,isError}=useQuery({queryKey:['workflow-history',path],queryFn:()=>api.get<Event[]>(path).then(r=>r.data),enabled:open})
  const labels:Record<string,string>={alcance:'Alcance acordado',condiciones_cobro:'Condiciones de cobro',revision:'Revisión',resultado:'Resultado',resultado_anterior:'Resultado anterior',fecha_anterior:'Cierre anterior',seguimiento:'Seguimiento comercial',fecha_seguimiento:'Fecha de seguimiento',responsable:'Responsable',notas:'Notas',motivo:'Motivo',motivo_tipo:'Clasificación',contraparte:'Contraparte',honorarios_pactados_cents:'Honorarios pactados',proxima_accion:'Próxima acción',fecha_proxima_accion:'Fecha de próxima acción'}
  return <details className="rounded-md border p-3 text-xs" onClick={e=>e.stopPropagation()} onToggle={e=>setOpen(e.currentTarget.open)}>
    <summary className="cursor-pointer font-medium">Historial y acuerdo de apertura</summary>
    {isLoading && <p className="mt-2">Cargando…</p>}{isError && <p>No se pudo cargar el historial.</p>}
    {!isLoading && !isError && !data.length && <p className="mt-2 text-muted-foreground">Sin eventos registrados. Los registros anteriores conservan sus datos actuales.</p>}
    {data.map(e=><article className="mt-3 space-y-1 border-t pt-2 break-words" key={e.id}>
      <p className="font-semibold">{e.event}</p><p className="text-muted-foreground">{e.created_at.replace('T',' ').slice(0,19)}{e.actor ? ` · ${e.actor}` : ''}</p>
      {Object.entries(e.details).filter(([k,v])=>labels[k] && v!==null && v!=='' && typeof v!=='object').map(([k,v])=><p key={k}><strong>{labels[k]}: </strong>{k==='honorarios_pactados_cents' ? `$${(Number(v)/100).toFixed(2)}` : String(v)}</p>)}
    </article>)}
  </details>
}
