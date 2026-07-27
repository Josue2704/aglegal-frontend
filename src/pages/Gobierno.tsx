import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { gobiernoApi } from '@/api/gobierno'
import type { Solicitud, SolicitudEstado, TipoRegistroSolicitud, TipoSolicitud } from '@/types'
import { TIPO_SOLICITUD_VALUES, TIPO_REGISTRO_VALUES, SOLICITUD_ESTADOS } from '@/types'
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

const ESTADO_COLOR: Record<SolicitudEstado, 'secondary' | 'info' | 'success' | 'destructive' | 'warning' | 'outline'> = {
  'Solicitado': 'secondary',
  'En revisión': 'info',
  'Aprobado': 'success',
  'Rechazado': 'destructive',
  'Activo': 'success',
  'Inactivo': 'outline',
}

// Próximos estados alcanzables desde cada estado actual, y si requieren aprobador
const NEXT_STEPS: Record<SolicitudEstado, { estado: SolicitudEstado; label: string }[]> = {
  'Solicitado': [{ estado: 'En revisión', label: 'Enviar a revisión' }, { estado: 'Rechazado', label: 'Rechazar' }],
  'En revisión': [{ estado: 'Aprobado', label: 'Aprobar' }, { estado: 'Rechazado', label: 'Rechazar' }, { estado: 'Solicitado', label: 'Devolver' }],
  'Rechazado': [{ estado: 'Solicitado', label: 'Reabrir' }],
  'Aprobado': [{ estado: 'Activo', label: 'Activar' }],
  'Activo': [{ estado: 'Inactivo', label: 'Inactivar' }],
  'Inactivo': [],
}

const EDITABLE_ESTADOS: SolicitudEstado[] = ['Solicitado', 'En revisión', 'Rechazado']

function SolicitudDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Solicitud | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    tipo_solicitud: 'Alta' as TipoSolicitud, tipo_registro: 'Servicio' as TipoRegistroSolicitud,
    nombre_propuesto: '', categoria_padre: '', subcategoria_padre: '', codigo_propuesto: '',
    descripcion: '', motivo: '', etiquetas: '',
  })

  useEffect(() => {
    if (editing) {
      setForm({
        tipo_solicitud: editing.tipo_solicitud, tipo_registro: editing.tipo_registro,
        nombre_propuesto: editing.nombre_propuesto, categoria_padre: editing.categoria_padre ?? '',
        subcategoria_padre: editing.subcategoria_padre ?? '', codigo_propuesto: editing.codigo_propuesto,
        descripcion: editing.descripcion ?? '', motivo: editing.motivo ?? '', etiquetas: editing.etiquetas ?? '',
      })
    } else {
      setForm({ tipo_solicitud: 'Alta', tipo_registro: 'Servicio', nombre_propuesto: '', categoria_padre: '', subcategoria_padre: '', codigo_propuesto: '', descripcion: '', motivo: '', etiquetas: '' })
    }
  }, [editing, open])

  const create = useMutation({
    mutationFn: () => gobiernoApi.create({
      tipo_solicitud: form.tipo_solicitud, tipo_registro: form.tipo_registro, nombre_propuesto: form.nombre_propuesto,
      categoria_padre: form.categoria_padre || null, subcategoria_padre: form.subcategoria_padre || null,
      codigo_propuesto: form.codigo_propuesto, descripcion: form.descripcion, motivo: form.motivo, etiquetas: form.etiquetas,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitudes'] }); toast.success('Solicitud creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => gobiernoApi.update(editing!.id, {
      nombre_propuesto: form.nombre_propuesto, categoria_padre: form.categoria_padre || null, subcategoria_padre: form.subcategoria_padre || null,
      codigo_propuesto: form.codigo_propuesto, descripcion: form.descripcion, motivo: form.motivo, etiquetas: form.etiquetas,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['solicitudes'] }); toast.success('Solicitud actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre_propuesto.trim()) return toast.error('El nombre propuesto es requerido')
    if (!form.codigo_propuesto.trim()) return toast.error('El código propuesto es requerido')
    if ((form.tipo_registro === 'Subcategoria' || form.tipo_registro === 'Servicio') && !form.categoria_padre.trim()) return toast.error('La categoría padre es requerida para este tipo de registro')
    if (form.tipo_registro === 'Servicio' && !form.subcategoria_padre.trim()) return toast.error('La subcategoría padre es requerida para un servicio')
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
              <Select value={form.tipo_solicitud} onValueChange={(v) => setForm({ ...form, tipo_solicitud: v as TipoSolicitud })} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_SOLICITUD_VALUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de registro</Label>
              <Select value={form.tipo_registro} onValueChange={(v) => setForm({ ...form, tipo_registro: v as TipoRegistroSolicitud })} disabled={!!editing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPO_REGISTRO_VALUES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2"><Label>Nombre propuesto <span className="text-destructive text-xs">*</span></Label><Input value={form.nombre_propuesto} onChange={(e) => setForm({ ...form, nombre_propuesto: e.target.value })} /></div>
            {(form.tipo_registro === 'Subcategoria' || form.tipo_registro === 'Servicio') && (
              <div className="space-y-1"><Label>Categoría padre <span className="text-destructive text-xs">*</span></Label><Input value={form.categoria_padre} onChange={(e) => setForm({ ...form, categoria_padre: e.target.value })} placeholder="Código, ej. RAI" /></div>
            )}
            {form.tipo_registro === 'Servicio' && (
              <div className="space-y-1"><Label>Subcategoría padre <span className="text-destructive text-xs">*</span></Label><Input value={form.subcategoria_padre} onChange={(e) => setForm({ ...form, subcategoria_padre: e.target.value })} placeholder="Código de subcategoría" /></div>
            )}
            <div className="space-y-1"><Label>Código propuesto <span className="text-destructive text-xs">*</span></Label><Input className="font-mono" value={form.codigo_propuesto} onChange={(e) => setForm({ ...form, codigo_propuesto: e.target.value })} /></div>
            <div className="space-y-1 col-span-2"><Label>Etiquetas</Label><Input value={form.etiquetas} onChange={(e) => setForm({ ...form, etiquetas: e.target.value })} placeholder="separadas,por,coma" /></div>
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

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{targetEstado} — {solicitud.solicitud_code}</DialogTitle></DialogHeader>
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
              <p className="text-[11px] text-muted-foreground">Al aprobar, el código propuesto ({solicitud.codigo_propuesto}) queda como código definitivo y permanente.</p>
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
        <p className="text-muted-foreground text-sm">Solicitudes de alta y cambio — el código definitivo solo se asigna al aprobar</p>
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
                  <td className="px-4 py-2.5 max-w-[220px] truncate">{s.nombre_propuesto}</td>
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
