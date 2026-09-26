import { AsignadosPicker, EtiquetaPicker } from '@/components/tasks'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface OpeningTask {
  titulo: string
  due_date: string
  notes?: string
  responsible_username?: string
  es_critico: boolean
  incluida: boolean
  costo_estimado?: number
  etiqueta_ids?: number[]
  asignados?: string[]
}

export function OpeningTasks({ tasks, onChange, users, defaultResponsible = '', date }: {
  tasks: OpeningTask[]; onChange: (tasks: OpeningTask[]) => void
  users: { username: string; full_name: string }[]; defaultResponsible?: string; date: string
}) {
  const update = (i: number, patch: Partial<OpeningTask>) => onChange(tasks.map((t,j) => j === i ? {...t,...patch} : t))
  return <section className="space-y-3 rounded-lg border p-3">
    <p className="text-sm font-semibold">Plan de trabajo inicial</p>
    <p className="text-xs text-muted-foreground">Revisa fechas y responsables. Estas tareas están incluidas en el acuerdo, sin recargo adicional. El costo interno estimado no es un cobro al cliente. Los documentos y gastos realizados se registran después de abrir el expediente.</p>
    {tasks.map((t,i) => <div key={i} className="space-y-2 border-b pb-3">
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={t.incluida} onChange={e=>update(i,{incluida:e.target.checked})}/> Incluir tarea {i+1}</label>
      <Input aria-label={`Título de tarea ${i+1}`} value={t.titulo} onChange={e=>update(i,{titulo:e.target.value})}/>
      <div className="grid gap-2 sm:grid-cols-2">
        <div><Label className="text-xs">Fecha límite</Label><Input aria-label={`Fecha de tarea ${i+1}`} type="date" value={t.due_date} onChange={e=>update(i,{due_date:e.target.value})}/></div>
        <div><Label className="text-xs">Responsable</Label><select aria-label={`Responsable de tarea ${i+1}`} className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={t.responsible_username || ''} onChange={e=>update(i,{responsible_username:e.target.value})}>
          <option value="">Responsable del expediente</option>{users.map(u=><option key={u.username} value={u.username}>{u.full_name || u.username}</option>)}
        </select></div>
      </div>
      <div><Label className="text-xs">Descripción</Label><Textarea aria-label={`Descripción de tarea ${i+1}`} value={t.notes || ''} onChange={e=>update(i,{notes:e.target.value})}/></div>
      <div><Label className="text-xs">Costo interno estimado ($)</Label><Input aria-label={`Costo estimado de tarea ${i+1}`} type="number" min="0" step="0.01" value={t.costo_estimado ?? ''} onChange={e=>update(i,{costo_estimado:e.target.value ? Number(e.target.value) : undefined})}/></div>
      <AsignadosPicker responsable={t.responsible_username || defaultResponsible} seleccionados={t.asignados || []} onChange={asignados=>update(i,{asignados})}/>
      <EtiquetaPicker seleccionadas={t.etiqueta_ids || []} onChange={etiqueta_ids=>update(i,{etiqueta_ids})}/>
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={t.es_critico} onChange={e=>update(i,{es_critico:e.target.checked})}/> Plazo crítico</label>
    </div>)}
    <p className="text-xs text-muted-foreground">Estimación de tareas incluidas: {formatCurrency(tasks.filter(t=>t.incluida).reduce((sum,t)=>sum+(t.costo_estimado || 0),0))}</p>
    <Button type="button" variant="outline" onClick={()=>onChange([...tasks,{titulo:'',due_date:date,responsible_username:defaultResponsible,es_critico:false,incluida:true}])}>Agregar tarea inicial</Button>
  </section>
}
