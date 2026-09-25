import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { catalogoApi } from '@/api/catalogo'
import { usersApi } from '@/api/users'
import type { PlantillaTarea, PlantillaTareaIn, ServicioChoice } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { EtiquetaChip } from '@/components/TaskBoard'
import { formatCurrency } from '@/lib/utils'

type Borrador = {
  titulo: string
  dias_plazo_relativo: string
  es_critico_default: boolean
  costo_estimado: string
  descripcion: string
  responsable_sugerido: string
  etiqueta_ids: number[]
}

const VACIO: Borrador = {
  titulo: '', dias_plazo_relativo: '', es_critico_default: false, costo_estimado: '',
  descripcion: '', responsable_sugerido: '', etiqueta_ids: [],
}

const aPayload = (b: Borrador, orden: number): PlantillaTareaIn => ({
  titulo: b.titulo.trim(),
  orden,
  dias_plazo_relativo: b.dias_plazo_relativo ? Number(b.dias_plazo_relativo) : null,
  es_critico_default: b.es_critico_default,
  costo_estimado: b.costo_estimado ? Number(b.costo_estimado) : 0,
  descripcion: b.descripcion.trim(),
  responsable_sugerido: b.responsable_sugerido,
  etiqueta_ids: b.etiqueta_ids,
})

/** El plan de trabajo de un tipo de caso. Al abrir un expediente con este servicio, estas
 *  tareas nacen con él —ya ajustables— para no teclear los mismos doce pasos cada vez. */
export function PlantillaTareasDialog({ open, onClose, serviceId, serviceLabel }: {
  open: boolean; onClose: () => void; serviceId: number | null; serviceLabel: string
}) {
  const qc = useQueryClient()
  const [nueva, setNueva] = useState<Borrador>(VACIO)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [edicion, setEdicion] = useState<Borrador>(VACIO)
  const [arrastrada, setArrastrada] = useState<number | null>(null)
  const [copiarDe, setCopiarDe] = useState('')

  const { data: tareas = [] } = useQuery({
    queryKey: ['plantilla-tareas', serviceId],
    queryFn: () => catalogoApi.listPlantillaTareas(serviceId!),
    enabled: open && !!serviceId,
  })
  const { data: etiquetas = [] } = useQuery({
    queryKey: ['etiquetas-tarea'], queryFn: catalogoApi.listEtiquetas, enabled: open,
  })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: usersApi.list, enabled: open })
  const { data: servicios = [] } = useQuery({
    queryKey: ['servicio-choices', 'plantilla'],
    queryFn: () => catalogoApi.servicioChoices({ estado: 'Activo', limit: 400 }),
    enabled: open,
  })

  useEffect(() => { if (!open) { setEditandoId(null); setNueva(VACIO); setCopiarDe('') } }, [open])

  const refrescar = () => qc.invalidateQueries({ queryKey: ['plantilla-tareas', serviceId] })
  const onError = (e: unknown) =>
    toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'No se pudo guardar')

  const crear = useMutation({
    mutationFn: () => catalogoApi.createPlantillaTarea(serviceId!, aPayload(nueva, tareas.length)),
    onSuccess: () => { refrescar(); setNueva(VACIO) }, onError,
  })
  const actualizar = useMutation({
    mutationFn: ({ id, orden }: { id: number; orden: number }) =>
      catalogoApi.updatePlantillaTarea(id, aPayload(edicion, orden)),
    onSuccess: () => { refrescar(); setEditandoId(null) }, onError,
  })
  const borrar = useMutation({
    mutationFn: (id: number) => catalogoApi.deletePlantillaTarea(id),
    onSuccess: refrescar, onError,
  })
  const reordenar = useMutation({
    mutationFn: (orden_ids: number[]) => catalogoApi.reordenarPlantillaTareas(serviceId!, orden_ids),
    onSuccess: refrescar, onError,
  })
  const copiar = useMutation({
    mutationFn: (origen: number) => catalogoApi.copiarPlantillaTareas(serviceId!, origen),
    onSuccess: (r) => { refrescar(); setCopiarDe(''); toast.success(`Plantilla copiada (${r.length} tareas)`) },
    onError,
  })

  function empezarEdicion(t: PlantillaTarea) {
    setEditandoId(t.id)
    setEdicion({
      titulo: t.titulo,
      dias_plazo_relativo: t.dias_plazo_relativo != null ? String(t.dias_plazo_relativo) : '',
      es_critico_default: t.es_critico_default,
      costo_estimado: t.costo_estimado ? String(t.costo_estimado) : '',
      descripcion: t.descripcion ?? '',
      responsable_sugerido: t.responsable_sugerido ?? '',
      etiqueta_ids: t.etiquetas.map((e) => e.id),
    })
  }

  function soltarSobre(destinoId: number) {
    if (arrastrada === null || arrastrada === destinoId) return
    const ids = tareas.map((t) => t.id)
    const desde = ids.indexOf(arrastrada)
    const hasta = ids.indexOf(destinoId)
    if (desde < 0 || hasta < 0) return
    ids.splice(hasta, 0, ...ids.splice(desde, 1))
    setArrastrada(null)
    reordenar.mutate(ids)
  }

  const Campos = ({ valor, onChange }: { valor: Borrador; onChange: (b: Borrador) => void }) => (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_5rem_6rem] gap-2">
        <div className="space-y-1">
          <Label className="text-[10px]">Tarea</Label>
          <Input className="h-8 text-sm" value={valor.titulo} onChange={(e) => onChange({ ...valor, titulo: e.target.value })}
            placeholder="Ej. Solicitar partida de matrimonio" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Plazo (días)</Label>
          <Input type="number" className="h-8 text-sm" value={valor.dias_plazo_relativo}
            onChange={(e) => onChange({ ...valor, dias_plazo_relativo: e.target.value })} placeholder="—" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Costo est. ($)</Label>
          <Input type="number" step="0.01" min="0" className="h-8 text-sm" value={valor.costo_estimado}
            onChange={(e) => onChange({ ...valor, costo_estimado: e.target.value })} placeholder="0.00" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">Descripción (qué implica, dónde se hace)</Label>
        <Textarea rows={2} className="text-sm" value={valor.descripcion}
          onChange={(e) => onChange({ ...valor, descripcion: e.target.value })}
          placeholder="Se pide en la alcaldía donde se celebró el matrimonio." />
      </div>
      <div className="grid grid-cols-2 gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-[10px]">Responsable sugerido</Label>
          <Select value={valor.responsable_sugerido || '__ninguno__'}
            onValueChange={(v) => onChange({ ...valor, responsable_sugerido: v === '__ninguno__' ? '' : v })}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sin sugerir" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__ninguno__">Sin sugerir</SelectItem>
              {users.filter((u) => u.active).map((u) => (
                <SelectItem key={u.username} value={u.username}>{u.full_name || u.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer h-8">
          <input type="checkbox" className="h-3.5 w-3.5" checked={valor.es_critico_default}
            onChange={(e) => onChange({ ...valor, es_critico_default: e.target.checked })} />
          Plazo legal crítico
        </label>
      </div>
      {etiquetas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {etiquetas.map((e) => {
            const activa = valor.etiqueta_ids.includes(e.id)
            return (
              <EtiquetaChip key={e.id} etiqueta={e} activa={activa}
                onClick={() => onChange({
                  ...valor,
                  etiqueta_ids: activa ? valor.etiqueta_ids.filter((x) => x !== e.id) : [...valor.etiqueta_ids, e.id],
                })} />
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Plan de trabajo — {serviceLabel}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Al abrir un expediente con este servicio, estas tareas nacen con él (se pueden quitar o ajustar
          antes de crearlo) y quedan incluidas en los honorarios pactados, sin recargo aparte.
          Cambiar el plan no toca los expedientes ya abiertos.
        </p>

        {/* Copiar de un servicio parecido */}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px]">Copiar el plan de otro servicio</Label>
            <Select value={copiarDe} onValueChange={setCopiarDe}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Elegir servicio..." /></SelectTrigger>
              <SelectContent>
                {servicios.filter((sv: ServicioChoice) => sv.id !== serviceId).map((sv: ServicioChoice) => (
                  <SelectItem key={sv.id} value={String(sv.id)}>{sv.service_code} — {sv.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="outline" disabled={!copiarDe || copiar.isPending}
            onClick={() => copiar.mutate(Number(copiarDe))}>
            <Copy className="h-3.5 w-3.5" />Copiar
          </Button>
        </div>

        <div className="space-y-1.5">
          {tareas.map((t, i) => (
            <div key={t.id}
              draggable={editandoId === null}
              onDragStart={() => setArrastrada(t.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => soltarSobre(t.id)}
              className="rounded-lg px-2.5 py-2 text-sm"
              style={{ background: 'hsl(var(--muted))', opacity: arrastrada === t.id ? 0.5 : 1 }}>

              {editandoId === t.id ? (
                <div className="space-y-2">
                  <Campos valor={edicion} onChange={setEdicion} />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditandoId(null)}>
                      <X className="h-3 w-3" />Cancelar
                    </Button>
                    <Button size="sm" className="h-7 text-xs" disabled={!edicion.titulo.trim()}
                      onClick={() => actualizar.mutate({ id: t.id, orden: i })}>
                      <Check className="h-3 w-3" />Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-0.5 cursor-grab" />
                  <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5 w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="truncate">{t.titulo}</span>
                      {t.dias_plazo_relativo != null && (
                        <span className="text-[11px] text-muted-foreground">+{t.dias_plazo_relativo}d</span>
                      )}
                      {t.es_critico_default && (
                        <span className="text-[9px] font-bold uppercase text-destructive">Crítico</span>
                      )}
                      {t.costo_estimado > 0 && (
                        <span className="text-[11px] text-muted-foreground">est. {formatCurrency(t.costo_estimado)}</span>
                      )}
                      {t.etiquetas.map((e) => <EtiquetaChip key={e.id} etiqueta={e} />)}
                    </div>
                    {t.descripcion && <p className="text-[11px] text-muted-foreground line-clamp-2">{t.descripcion}</p>}
                    {t.responsable_sugerido && (
                      <p className="text-[11px] text-muted-foreground">Sugerido: {t.responsable_sugerido}</p>
                    )}
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => empezarEdicion(t)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive shrink-0"
                    onClick={() => { if (confirm(`¿Quitar "${t.titulo}" del plan?`)) borrar.mutate(t.id) }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
          {!tareas.length && (
            <p className="text-xs text-muted-foreground py-2">
              Sin plan de trabajo todavía. Agregá los pasos abajo, o copiá el de un servicio parecido.
            </p>
          )}
        </div>

        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid hsl(var(--c-inner-border))' }}>
          <Label className="text-xs font-semibold">Agregar un paso</Label>
          <Campos valor={nueva} onChange={setNueva} />
          <Button type="button" size="sm" className="w-full" disabled={!nueva.titulo.trim() || crear.isPending}
            onClick={() => crear.mutate()}>
            <Plus className="h-3.5 w-3.5" />Agregar al plan
          </Button>
        </div>

        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
