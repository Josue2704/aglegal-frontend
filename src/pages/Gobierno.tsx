import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { gobiernoApi } from '@/api/gobierno'
import { catalogoApi } from '@/api/catalogo'
import type { Solicitud, SolicitudEstado, TipoRegistroSolicitud, TipoSolicitud, Categoria, Subcategoria, Servicio, Familia } from '@/types'
import { TIPO_SOLICITUD_VALUES, TIPO_REGISTRO_VALUES, SOLICITUD_ESTADOS, UNIDADES_COBRO, RESPONSABLES_SUGERIDOS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'

type ApiErr = { response?: { data?: { detail?: string } } }
const errMsg = (e: ApiErr) => e.response?.data?.detail ?? 'Ocurrió un error'

type EntityRow = { id: number; code: string; nombre: string; context: string; raw: Categoria | Subcategoria | Servicio | Familia }

const ESTADO_COLOR: Record<SolicitudEstado, 'secondary' | 'info' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  'Solicitado': 'secondary',
  'En revisión': 'info',
  'Aprobado': 'success',
  'Rechazado': 'destructive',
  'Activo': 'success',
  'Inactivo': 'outline',
}

// Próximos estados alcanzables desde cada estado actual. Aprobar salta directo a Activo:
// el sistema aplica el efecto real en el Catálogo Maestro en el mismo paso (ver TransitionDialog).
const NEXT_STEPS: Record<SolicitudEstado, { estado: SolicitudEstado; label: string }[]> = {
  'Solicitado': [{ estado: 'En revisión', label: 'Enviar a revisión' }, { estado: 'Rechazado', label: 'Rechazar' }],
  'En revisión': [{ estado: 'Aprobado', label: 'Aprobar y activar' }, { estado: 'Rechazado', label: 'Rechazar' }, { estado: 'Solicitado', label: 'Devolver' }],
  'Rechazado': [{ estado: 'Solicitado', label: 'Reabrir' }],
  'Aprobado': [],
  'Activo': [{ estado: 'Inactivo', label: 'Inactivar' }],
  'Inactivo': [],
}

const EDITABLE_ESTADOS: SolicitudEstado[] = ['Solicitado', 'En revisión', 'Rechazado']

// ─── Selector de registro existente (para Cambio / Baja) ──────────────────────

function useEntityRows(tipoRegistro: TipoRegistroSolicitud): EntityRow[] {
  const { data: categorias = [] } = useQuery({ queryKey: ['catalogo-categorias', 'all'], queryFn: () => catalogoApi.listCategorias(), enabled: tipoRegistro === 'Categoria' })
  const { data: subcategorias = [] } = useQuery({ queryKey: ['catalogo-subcategorias', 'all'], queryFn: () => catalogoApi.listSubcategorias(), enabled: tipoRegistro === 'Subcategoria' })
  const { data: servicios = [] } = useQuery({ queryKey: ['catalogo-servicios', 'all'], queryFn: () => catalogoApi.listServicios(), enabled: tipoRegistro === 'Servicio' })
  const { data: familias = [] } = useQuery({ queryKey: ['catalogo-familias', 'all'], queryFn: catalogoApi.listFamilias, enabled: tipoRegistro === 'Familia' })

  return useMemo(() => {
    if (tipoRegistro === 'Categoria') return categorias.map((c) => ({ id: c.id, code: c.category_code, nombre: c.nombre, context: c.estado, raw: c }))
    if (tipoRegistro === 'Subcategoria') return subcategorias.map((s) => ({ id: s.id, code: `${s.category_code}-${s.subcategory_code}`, nombre: s.nombre, context: `${s.category_nombre} · ${s.estado}`, raw: s }))
    if (tipoRegistro === 'Servicio') return servicios.map((s) => ({ id: s.id, code: s.service_code, nombre: s.nombre, context: `${s.subcategory_nombre} · ${s.estado}`, raw: s }))
    return familias.map((f) => ({ id: f.id, code: f.family_code, nombre: f.nombre, context: f.category_nombre, raw: f }))
  }, [tipoRegistro, categorias, subcategorias, servicios, familias])
}

function EntityPicker({ tipoRegistro, selected, onSelect }: {
  tipoRegistro: TipoRegistroSolicitud; selected: EntityRow | null; onSelect: (row: EntityRow) => void
}) {
  const [q, setQ] = useState('')
  const rows = useEntityRows(tipoRegistro)
  const term = q.trim().toLowerCase()
  const matches = term ? rows.filter((r) => r.code.toLowerCase().includes(term) || r.nombre.toLowerCase().includes(term)) : rows

  return (
    <div className="space-y-1">
      <Label>Registro existente <span className="text-destructive text-xs">*</span></Label>
      {selected ? (
        <div className="text-xs px-2.5 py-1.5 rounded bg-muted inline-flex items-center gap-1.5">
          <span className="font-mono">{selected.code}</span> — {selected.nombre}
          <button type="button" className="text-muted-foreground hover:text-foreground ml-1" onClick={() => onSelect({ ...selected, id: 0 })}>×</button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código o nombre..." className="pl-8" />
          </div>
          <div className="border rounded-md max-h-48 overflow-y-auto mt-1" style={{ borderColor: 'hsl(var(--border))' }}>
            {matches.map((r) => (
              <button type="button" key={r.id} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/50 flex flex-col"
                onClick={() => onSelect(r)}>
                <span><span className="font-mono text-muted-foreground">{r.code}</span> {r.nombre}</span>
                <span className="text-[10px] text-muted-foreground">{r.context}</span>
              </button>
            ))}
            {matches.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">Sin resultados</div>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Solicitud dialog ──────────────────────────────────────────────────────────

const EMPTY_FORM = {
  tipo_solicitud: 'Alta' as TipoSolicitud, tipo_registro: 'Servicio' as TipoRegistroSolicitud,
  entity_id: null as number | null,
  nombre_propuesto: '', categoria_padre: '', subcategoria_padre: '', codigo_propuesto: '',
  descripcion: '', motivo: '', etiquetas: '',
  unidad_cobro_propuesta: '', responsable_sugerido_propuesto: '',
  tarifa_referencia_propuesta: '', costo_referencia_propuesta: '', horas_estandar_propuesta: '', estado_propuesto: '',
}

function SolicitudDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Solicitud | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedEntity, setSelectedEntity] = useState<EntityRow | null>(null)

  const { data: categorias = [] } = useQuery({ queryKey: ['catalogo-categorias', 'Activo'], queryFn: () => catalogoApi.listCategorias('Activo') })
  const categoriaSeleccionada = categorias.find((c) => c.category_code === form.categoria_padre)
  const { data: subcategorias = [] } = useQuery({
    queryKey: ['catalogo-subcategorias', categoriaSeleccionada?.id],
    queryFn: () => catalogoApi.listSubcategorias({ category_id: categoriaSeleccionada!.id, estado: 'Activo' }),
    enabled: !!categoriaSeleccionada,
  })

  const isAlta = form.tipo_solicitud === 'Alta'
  const isBaja = form.tipo_solicitud === 'Baja'
  const isServicio = form.tipo_registro === 'Servicio'
  const isCatOrSub = form.tipo_registro === 'Categoria' || form.tipo_registro === 'Subcategoria'

  useEffect(() => {
    if (editing) {
      setForm({
        tipo_solicitud: editing.tipo_solicitud, tipo_registro: editing.tipo_registro,
        entity_id: editing.entity_id,
        nombre_propuesto: editing.nombre_propuesto, categoria_padre: editing.categoria_padre ?? '',
        subcategoria_padre: editing.subcategoria_padre ?? '', codigo_propuesto: editing.codigo_propuesto,
        descripcion: editing.descripcion ?? '', motivo: editing.motivo ?? '', etiquetas: editing.etiquetas ?? '',
        unidad_cobro_propuesta: editing.unidad_cobro_propuesta ?? '', responsable_sugerido_propuesto: editing.responsable_sugerido_propuesto ?? '',
        tarifa_referencia_propuesta: editing.tarifa_referencia_propuesta != null ? String(editing.tarifa_referencia_propuesta) : '',
        costo_referencia_propuesta: editing.costo_referencia_propuesta != null ? String(editing.costo_referencia_propuesta) : '',
        horas_estandar_propuesta: editing.horas_estandar_propuesta != null ? String(editing.horas_estandar_propuesta) : '',
        estado_propuesto: editing.estado_propuesto ?? '',
      })
      setSelectedEntity(
        editing.entity_id
          ? { id: editing.entity_id, code: editing.codigo_propuesto, nombre: editing.nombre_propuesto, context: '', raw: {} as Categoria }
          : null,
      )
    } else {
      setForm(EMPTY_FORM)
      setSelectedEntity(null)
    }
  }, [editing, open])

  function handleSelectEntity(row: EntityRow) {
    if (row.id === 0) { setSelectedEntity(null); setForm((p) => ({ ...p, entity_id: null })); return }
    setSelectedEntity(row)
    const patch: Partial<typeof form> = { entity_id: row.id }
    if (form.tipo_solicitud === 'Cambio') {
      patch.nombre_propuesto = row.nombre
      if (form.tipo_registro === 'Servicio') {
        const sv = row.raw as Servicio
        patch.etiquetas = sv.etiquetas
        patch.unidad_cobro_propuesta = sv.unidad_cobro
        patch.responsable_sugerido_propuesto = sv.responsable_sugerido
        patch.tarifa_referencia_propuesta = String(sv.tarifa_referencia)
        patch.costo_referencia_propuesta = String(sv.costo_referencia)
        patch.horas_estandar_propuesta = String(sv.horas_estandar)
        patch.estado_propuesto = sv.estado
      } else if (form.tipo_registro === 'Categoria') {
        patch.estado_propuesto = (row.raw as Categoria).estado
      } else if (form.tipo_registro === 'Subcategoria') {
        patch.estado_propuesto = (row.raw as Subcategoria).estado
      }
    } else {
      // Baja: el nombre no cambia, solo se usa para mostrar contexto en la lista.
      patch.nombre_propuesto = row.nombre
    }
    setForm((p) => ({ ...p, ...patch }))
  }

  const create = useMutation({
    mutationFn: () => gobiernoApi.create({
      tipo_solicitud: form.tipo_solicitud, tipo_registro: form.tipo_registro, nombre_propuesto: form.nombre_propuesto,
      categoria_padre: form.categoria_padre || null, subcategoria_padre: form.subcategoria_padre || null,
      codigo_propuesto: form.codigo_propuesto, descripcion: form.descripcion, motivo: form.motivo, etiquetas: form.etiquetas,
      entity_id: form.entity_id,
      unidad_cobro_propuesta: form.unidad_cobro_propuesta || null, responsable_sugerido_propuesto: form.responsable_sugerido_propuesto || null,
      tarifa_referencia_propuesta: form.tarifa_referencia_propuesta ? Number(form.tarifa_referencia_propuesta) : null,
      costo_referencia_propuesta: form.costo_referencia_propuesta ? Number(form.costo_referencia_propuesta) : null,
      horas_estandar_propuesta: form.horas_estandar_propuesta ? Number(form.horas_estandar_propuesta) : null,
      estado_propuesto: form.estado_propuesto || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitudes'] }); toast.success('Solicitud creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => gobiernoApi.update(editing!.id, {
      nombre_propuesto: form.nombre_propuesto, categoria_padre: form.categoria_padre || null, subcategoria_padre: form.subcategoria_padre || null,
      codigo_propuesto: form.codigo_propuesto, descripcion: form.descripcion, motivo: form.motivo, etiquetas: form.etiquetas,
      unidad_cobro_propuesta: form.unidad_cobro_propuesta || null, responsable_sugerido_propuesto: form.responsable_sugerido_propuesto || null,
      tarifa_referencia_propuesta: form.tarifa_referencia_propuesta ? Number(form.tarifa_referencia_propuesta) : null,
      costo_referencia_propuesta: form.costo_referencia_propuesta ? Number(form.costo_referencia_propuesta) : null,
      horas_estandar_propuesta: form.horas_estandar_propuesta ? Number(form.horas_estandar_propuesta) : null,
      estado_propuesto: form.estado_propuesto || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitudes'] }); toast.success('Solicitud actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAlta && !form.entity_id) return toast.error('Selecciona el registro existente')
    if (isAlta && !form.nombre_propuesto.trim()) return toast.error('El nombre propuesto es requerido')
    if (isAlta && !form.codigo_propuesto.trim()) return toast.error('El código propuesto es requerido')
    if (isAlta && (form.tipo_registro === 'Subcategoria' || form.tipo_registro === 'Servicio' || form.tipo_registro === 'Familia') && !form.categoria_padre.trim()) return toast.error('La categoría padre es requerida para este tipo de registro')
    if (isAlta && form.tipo_registro === 'Servicio' && !form.subcategoria_padre.trim()) return toast.error('La subcategoría padre es requerida para un servicio')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? `Editar — ${editing.solicitud_code}` : 'Nueva solicitud de catálogo'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo de solicitud</Label>
              <Select value={form.tipo_solicitud} onValueChange={(v) => { setForm({ ...EMPTY_FORM, tipo_solicitud: v as TipoSolicitud, tipo_registro: form.tipo_registro }); setSelectedEntity(null) }} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_SOLICITUD_VALUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de registro</Label>
              <Select value={form.tipo_registro} onValueChange={(v) => { setForm({ ...EMPTY_FORM, tipo_solicitud: form.tipo_solicitud, tipo_registro: v as TipoRegistroSolicitud }); setSelectedEntity(null) }} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_REGISTRO_VALUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {!isAlta && (
              <div className="col-span-2">
                <EntityPicker tipoRegistro={form.tipo_registro} selected={selectedEntity} onSelect={handleSelectEntity} />
                {isBaja && <p className="text-[11px] text-muted-foreground mt-1">Al aprobar, este registro pasa directo a Inactivo — nombre y demás campos no cambian.</p>}
              </div>
            )}

            {(isAlta || (!isBaja && selectedEntity)) && (
              <div className="space-y-1 col-span-2"><Label>Nombre propuesto <span className="text-destructive text-xs">*</span></Label><Input value={form.nombre_propuesto} onChange={(e) => setForm({ ...form, nombre_propuesto: e.target.value })} disabled={!isAlta && !selectedEntity} /></div>
            )}

            {isAlta && (form.tipo_registro === 'Subcategoria' || form.tipo_registro === 'Servicio' || form.tipo_registro === 'Familia') && (
              <div className="space-y-1">
                <Label>Categoría padre <span className="text-destructive text-xs">*</span></Label>
                <Select
                  value={form.categoria_padre}
                  onValueChange={(v) => setForm({ ...form, categoria_padre: v, subcategoria_padre: '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                  <SelectContent>{categorias.map((c) => <SelectItem key={c.id} value={c.category_code}>{c.category_code} — {c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {isAlta && form.tipo_registro === 'Servicio' && (
              <div className="space-y-1">
                <Label>Subcategoría padre <span className="text-destructive text-xs">*</span></Label>
                <Select
                  value={form.subcategoria_padre}
                  onValueChange={(v) => setForm({ ...form, subcategoria_padre: v })}
                  disabled={!categoriaSeleccionada}
                >
                  <SelectTrigger><SelectValue placeholder={categoriaSeleccionada ? 'Seleccionar subcategoría...' : 'Elige primero la categoría'} /></SelectTrigger>
                  <SelectContent>{subcategorias.map((s) => <SelectItem key={s.id} value={s.subcategory_code}>{s.subcategory_code} — {s.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {isAlta && (
              <div className="space-y-1">
                <Label>Código propuesto <span className="text-destructive text-xs">*</span></Label>
                <Input className="font-mono" value={form.codigo_propuesto} onChange={(e) => setForm({ ...form, codigo_propuesto: e.target.value })} placeholder={form.tipo_registro === 'Servicio' || form.tipo_registro === 'Familia' ? 'N/A — el sistema lo asigna' : undefined} />
                {(form.tipo_registro === 'Servicio' || form.tipo_registro === 'Familia') && (
                  <p className="text-[11px] text-muted-foreground">Para {form.tipo_registro === 'Servicio' ? 'servicios' : 'familias'} el código real lo asigna el sistema al aprobar — este campo es solo referencial.</p>
                )}
              </div>
            )}

            {!isBaja && selectedEntity && isServicio && (
              <>
                <div className="space-y-1 col-span-2"><Label>Etiquetas</Label><Input value={form.etiquetas} onChange={(e) => setForm({ ...form, etiquetas: e.target.value })} placeholder="separadas,por,coma" /></div>
                <div className="space-y-1">
                  <Label>Unidad de cobro</Label>
                  <Select value={form.unidad_cobro_propuesta} onValueChange={(v) => setForm({ ...form, unidad_cobro_propuesta: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIDADES_COBRO.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Responsable sugerido</Label>
                  <Select value={form.responsable_sugerido_propuesto} onValueChange={(v) => setForm({ ...form, responsable_sugerido_propuesto: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RESPONSABLES_SUGERIDOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Tarifa referencia ($)</Label><Input type="number" step="0.01" min="0" value={form.tarifa_referencia_propuesta} onChange={(e) => setForm({ ...form, tarifa_referencia_propuesta: e.target.value })} /></div>
                <div className="space-y-1"><Label>Costo referencia ($)</Label><Input type="number" step="0.01" min="0" value={form.costo_referencia_propuesta} onChange={(e) => setForm({ ...form, costo_referencia_propuesta: e.target.value })} /></div>
                <div className="space-y-1"><Label>Horas estándar</Label><Input type="number" step="0.5" min="0" value={form.horas_estandar_propuesta} onChange={(e) => setForm({ ...form, horas_estandar_propuesta: e.target.value })} /></div>
                <div className="space-y-1">
                  <Label>Estado</Label>
                  <Select value={form.estado_propuesto} onValueChange={(v) => setForm({ ...form, estado_propuesto: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="En diseño">En diseño</SelectItem>
                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {!isBaja && selectedEntity && isCatOrSub && (
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.estado_propuesto} onValueChange={(v) => setForm({ ...form, estado_propuesto: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isAlta && <div className="space-y-1 col-span-2"><Label>Etiquetas</Label><Input value={form.etiquetas} onChange={(e) => setForm({ ...form, etiquetas: e.target.value })} placeholder="separadas,por,coma" /></div>}
            <div className="space-y-1 col-span-2"><Label>Descripción / alcance</Label><Textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Motivo de la solicitud</Label><Textarea rows={2} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TransitionDialog({ open, onClose, solicitud, targetEstado }: { open: boolean; onClose: () => void; solicitud: Solicitud | null; targetEstado: SolicitudEstado | null }) {
  const qc = useQueryClient()
  const [resultado, setResultado] = useState('')
  const [aprobador, setAprobador] = useState('')
  const [observaciones, setObservaciones] = useState('')

  useEffect(() => { setResultado(''); setAprobador(''); setObservaciones('') }, [open])

  const mutate = useMutation({
    mutationFn: () => gobiernoApi.transicion(solicitud!.id, {
      estado: targetEstado!,
      resultado_revision_duplicidad: resultado || null,
      aprobador: aprobador || null,
      observaciones: observaciones || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitudes'] }); toast.success('Estado actualizado'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  if (!solicitud || !targetEstado) return null
  const needsAprobador = targetEstado === 'Aprobado'
  const needsResultado = targetEstado === 'En revisión' || targetEstado === 'Rechazado'

  const efectoLabel = solicitud.tipo_solicitud === 'Alta'
    ? `crea de una vez el registro real en Catálogo Maestro${solicitud.tipo_registro === 'Servicio' || solicitud.tipo_registro === 'Familia' ? ' con un código asignado automáticamente' : ` con el código ${solicitud.codigo_propuesto}`}`
    : solicitud.tipo_solicitud === 'Cambio'
      ? `aplica de una vez los cambios al registro existente (${solicitud.codigo_propuesto})`
      : `inactiva de una vez el registro existente (${solicitud.codigo_propuesto})`

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{needsAprobador ? 'Aprobar y activar' : targetEstado} — {solicitud.solicitud_code}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {needsResultado && (
            <div className="space-y-1">
              <Label>Resultado de revisión de duplicidad</Label>
              <Textarea rows={2} value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Ej: Sin duplicidad identificada" />
            </div>
          )}
          {needsAprobador && (
            <div className="space-y-1">
              <Label>Aprobador <span className="text-destructive text-xs">*</span></Label>
              <Input value={aprobador} onChange={(e) => setAprobador(e.target.value)} placeholder="Nombre del socio administrador" />
              <p className="text-[11px] text-muted-foreground">Al aprobar, el sistema {efectoLabel}, y la solicitud queda en estado Activo.</p>
            </div>
          )}
          <div className="space-y-1">
            <Label>Observaciones</Label>
            <Textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            disabled={mutate.isPending || (needsAprobador && !aprobador.trim())}
            onClick={() => mutate.mutate()}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Gobierno() {
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<'Todos' | SolicitudEstado>('Todos')
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Solicitud | null>(null)
  const [transition, setTransition] = useState<{ solicitud: Solicitud; estado: SolicitudEstado } | null>(null)

  const { data: solicitudes = [] } = useQuery({
    queryKey: ['solicitudes', estadoFilter, search],
    queryFn: () => gobiernoApi.list({ estado: estadoFilter === 'Todos' ? undefined : estadoFilter, q: search || undefined }),
  })

  function openNew() { setEditing(null); setDlg(true) }
  function openEdit(s: Solicitud) { setEditing(s); setDlg(true) }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Gobierno del Catálogo</h1>
        <p className="text-muted-foreground text-sm">Toda alta, cambio o baja del Catálogo Maestro pasa por aquí — el efecto real solo se aplica al aprobar</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código o nombre..." className="pl-8" />
        </div>
        <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v as 'Todos' | SolicitudEstado)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos los estados</SelectItem>
            {SOLICITUD_ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5" />Nueva solicitud</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Código</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Registro</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Nombre propuesto</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Código prop. / def.</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Estado</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Solicitante</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {s.solicitud_code}
                    <div className="text-[10px] text-muted-foreground">{formatDate(s.fecha_solicitud)} · {s.tipo_solicitud}</div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.tipo_registro}</td>
                  <td className="px-4 py-2.5 max-w-[220px]">
                    <p className="truncate">{s.nombre_propuesto}</p>
                    {s.estado === 'Activo' && s.observaciones && (
                      <p className="text-[10px] text-muted-foreground truncate" title={s.observaciones}>{s.observaciones.split('\n').pop()}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">
                    {s.codigo_definitivo ? (
                      <span className="text-green-600 font-semibold">{s.codigo_definitivo}</span>
                    ) : (
                      <span className="text-muted-foreground">{s.codigo_propuesto} <span className="italic">(propuesto)</span></span>
                    )}
                  </td>
                  <td className="px-4 py-2.5"><Badge variant={ESTADO_COLOR[s.estado]} className="text-[10px] whitespace-nowrap">{s.estado}</Badge></td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{s.solicitante}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {EDITABLE_ESTADOS.includes(s.estado) && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                      )}
                      {NEXT_STEPS[s.estado].map((step) => (
                        <Button
                          key={step.estado}
                          size="sm"
                          variant={step.estado === 'Rechazado' ? 'outline' : 'default'}
                          className="h-7 text-xs px-2"
                          onClick={() => setTransition({ solicitud: s, estado: step.estado })}
                        >
                          {step.label}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!solicitudes.length && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  <ShieldCheck className="h-6 w-6 mx-auto mb-2 opacity-30" />
                  Sin solicitudes registradas
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <SolicitudDialog open={dlg} onClose={() => setDlg(false)} editing={editing} />
      <TransitionDialog
        open={!!transition}
        onClose={() => setTransition(null)}
        solicitud={transition?.solicitud ?? null}
        targetEstado={transition?.estado ?? null}
      />
    </div>
  )
}
