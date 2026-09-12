import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { catalogoApi } from '@/api/catalogo'
import type { PlantillaTarea } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export function PlantillaTareasDialog({ open, onClose, serviceId, serviceLabel }: {
  open: boolean; onClose: () => void; serviceId: number | null; serviceLabel: string
}) {
  const qc = useQueryClient()
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoPlazo, setNuevoPlazo] = useState('')
  const [nuevoCritico, setNuevoCritico] = useState(false)

  const { data: tareas = [] } = useQuery({
    queryKey: ['plantilla-tareas', serviceId],
    queryFn: () => catalogoApi.listPlantillaTareas(serviceId!),
    enabled: open && !!serviceId,
  })

  const create = useMutation({
    mutationFn: () => catalogoApi.createPlantillaTarea(serviceId!, {
      titulo: nuevoTitulo.trim(), orden: tareas.length,
      dias_plazo_relativo: nuevoPlazo ? Number(nuevoPlazo) : null, es_critico_default: nuevoCritico,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plantilla-tareas', serviceId] })
      setNuevoTitulo(''); setNuevoPlazo(''); setNuevoCritico(false)
    },
    onError: () => toast.error('Error al agregar la tarea'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => catalogoApi.deletePlantillaTarea(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantilla-tareas', serviceId] }),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Plantilla de tareas — {serviceLabel}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Al crear un expediente con este servicio, estas tareas se sugieren como checklist inicial (editable) —
          quedan incluidas en los honorarios pactados sin recargo aparte.
        </p>

        <div className="space-y-1.5">
          {tareas.map((t: PlantillaTarea) => (
            <div key={t.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm" style={{ background: 'hsl(var(--muted))' }}>
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className="flex-1 truncate">{t.titulo}</span>
              {t.dias_plazo_relativo != null && <span className="text-[11px] text-muted-foreground shrink-0">+{t.dias_plazo_relativo}d</span>}
              {t.es_critico_default && <span className="text-[9px] font-bold uppercase text-destructive shrink-0">Crítico</span>}
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0" onClick={() => remove.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
          {!tareas.length && <p className="text-xs text-muted-foreground py-2">Sin tareas en la plantilla todavía.</p>}
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2 items-end pt-2 border-t">
          <div className="space-y-1">
            <Label className="text-[10px]">Nueva tarea</Label>
            <Input value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} placeholder="Ej. Recibir documentos del cliente" />
          </div>
          <div className="space-y-1 w-24">
            <Label className="text-[10px]">Plazo (días)</Label>
            <Input type="number" value={nuevoPlazo} onChange={(e) => setNuevoPlazo(e.target.value)} placeholder="Opcional" />
          </div>
          <label className="flex items-center gap-1.5 text-xs col-span-2 cursor-pointer">
            <input type="checkbox" checked={nuevoCritico} onChange={(e) => setNuevoCritico(e.target.checked)} className="h-3.5 w-3.5" />
            Crítica por defecto
          </label>
          <Button type="button" size="sm" className="col-span-2" disabled={!nuevoTitulo.trim() || create.isPending} onClick={() => create.mutate()}>
            <Plus className="h-3.5 w-3.5" />Agregar a la plantilla
          </Button>
        </div>

        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
