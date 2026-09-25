import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { catalogoApi } from '@/api/catalogo'
import { ETIQUETA_COLORES, type EtiquetaColor, type EtiquetaTarea } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { COLOR_ETIQUETA, EtiquetaChip } from '@/components/TaskBoard'

function ColorPicker({ valor, onChange }: { valor: EtiquetaColor; onChange: (c: EtiquetaColor) => void }) {
  return (
    <div className="flex gap-1">
      {ETIQUETA_COLORES.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} title={c}
          className="h-6 w-6 rounded flex items-center justify-center"
          style={{ background: COLOR_ETIQUETA[c].bg, border: `1px solid ${COLOR_ETIQUETA[c].border}` }}>
          {valor === c && <Check className="h-3 w-3" style={{ color: COLOR_ETIQUETA[c].text }} />}
        </button>
      ))}
    </div>
  )
}

/** Las etiquetas son del despacho, no de cada tarea: se definen una vez y sirven para
 *  marcar y filtrar en el tablero (Urgente, Espera cliente, Espera tribunal...). */
export function EtiquetasDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [color, setColor] = useState<EtiquetaColor>('slate')
  const [editando, setEditando] = useState<EtiquetaTarea | null>(null)

  const { data: etiquetas = [] } = useQuery({
    queryKey: ['etiquetas-tarea'], queryFn: catalogoApi.listEtiquetas, enabled: open,
  })

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ['etiquetas-tarea'] })
    qc.invalidateQueries({ queryKey: ['all-tasks'] })
    qc.invalidateQueries({ queryKey: ['case-tasks'] })
  }
  const onError = (e: unknown) =>
    toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? 'No se pudo guardar')

  const crear = useMutation({
    mutationFn: () => catalogoApi.createEtiqueta({ nombre: nombre.trim(), color }),
    onSuccess: () => { refrescar(); setNombre(''); setColor('slate') }, onError,
  })
  const actualizar = useMutation({
    mutationFn: () => catalogoApi.updateEtiqueta(editando!.id, { nombre: editando!.nombre.trim(), color: editando!.color }),
    onSuccess: () => { refrescar(); setEditando(null) }, onError,
  })
  const borrar = useMutation({
    mutationFn: (id: number) => catalogoApi.deleteEtiqueta(id),
    onSuccess: refrescar, onError,
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Etiquetas del tablero</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Sirven para marcar por qué una tarea está donde está. Se comparten en todo el despacho
          y se pueden usar para filtrar el tablero.
        </p>

        <div className="space-y-1.5 max-h-[45vh] overflow-y-auto">
          {etiquetas.map((e) => (
            <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
              style={{ background: 'hsl(var(--muted))' }}>
              {editando?.id === e.id ? (
                <>
                  <Input className="h-7 text-sm flex-1" value={editando.nombre}
                    onChange={(ev) => setEditando({ ...editando, nombre: ev.target.value })} autoFocus />
                  <ColorPicker valor={editando.color} onChange={(c) => setEditando({ ...editando, color: c })} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => actualizar.mutate()}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <EtiquetaChip etiqueta={e} />
                  <span className="flex-1 text-[11px] text-muted-foreground">
                    {e.usos ? `${e.usos} tarea${e.usos === 1 ? '' : 's'}` : 'sin usar'}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditando(e)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => {
                      const aviso = e.usos
                        ? `"${e.nombre}" está en ${e.usos} tarea(s). Se quitará de todas, sin borrarlas. ¿Continuar?`
                        : `¿Eliminar la etiqueta "${e.nombre}"?`
                      if (confirm(aviso)) borrar.mutate(e.id)
                    }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
          {etiquetas.length === 0 && (
            <p className="text-xs text-muted-foreground py-4 text-center">Todavía no hay etiquetas.</p>
          )}
        </div>

        <div className="flex items-end gap-2 pt-2" style={{ borderTop: '1px solid hsl(var(--c-inner-border))' }}>
          <div className="flex-1 space-y-1">
            <Input className="h-8 text-sm" placeholder="Nueva etiqueta..." value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && nombre.trim()) crear.mutate() }} />
            <ColorPicker valor={color} onChange={setColor} />
          </div>
          <Button size="sm" disabled={!nombre.trim() || crear.isPending} onClick={() => crear.mutate()}>
            <Plus className="h-3.5 w-3.5" />Agregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
