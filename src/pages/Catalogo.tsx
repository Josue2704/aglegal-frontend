import { useMemo, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, ChevronDown, ChevronRight, Search, History,
  Info, Folders, FolderTree, Briefcase, Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { catalogoApi } from '@/api/catalogo'
import type { Categoria, Subcategoria, Servicio, Familia, CatalogoEstado, ServicioEstado } from '@/types'
import { UNIDADES_COBRO, RESPONSABLES_SUGERIDOS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ApiErr = { response?: { data?: { detail?: string } } }
const errMsg = (e: ApiErr) => e.response?.data?.detail ?? 'Ocurrió un error'

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
      style={{ background: 'hsl(210 80% 55% / 0.08)', border: '1px solid hsl(210 80% 55% / 0.2)', color: 'hsl(210 80% 70%)' }}
    >
      <Info className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'Activo') return <Badge variant="success">Activo</Badge>
  if (estado === 'En diseño') return <Badge variant="warning">En diseño</Badge>
  return <Badge variant="secondary">Inactivo</Badge>
}

function money(cents_or_amount: number) {
  return `$${cents_or_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Historial dialog ──────────────────────────────────────────────────────────

function HistorialDialog({ open, onClose, tipo, entityId, label }: {
  open: boolean; onClose: () => void; tipo: 'Categoria' | 'Subcategoria' | 'Servicio'; entityId: number | null; label: string
}) {
  const { data: entries = [] } = useQuery({
    queryKey: ['historial-catalogo', tipo, entityId],
    queryFn: () => catalogoApi.historial(tipo, entityId as number),
    enabled: open && entityId != null,
  })
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Historial — {label}</DialogTitle></DialogHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin cambios registrados todavía.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {entries.map((h) => (
              <div key={h.id} className="rounded-lg border p-3 text-sm" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{h.fecha_cambio}</span>
                  <span>{h.usuario_id ? `usuario #${h.usuario_id}` : 'sistema'}</span>
                </div>
                <div className="font-medium">{String(h.version_anterior.nombre ?? '')}</div>
                {'estado' in h.version_anterior && (
                  <div className="text-xs text-muted-foreground mt-0.5">estado anterior: {String(h.version_anterior.estado)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Categoría dialog ──────────────────────────────────────────────────────────

function CategoriaDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Categoria | null }) {
  const qc = useQueryClient()
  const [code, setCode] = useState('')
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState<CatalogoEstado>('Activo')

  useEffect(() => {
    if (!open) return
    setCode(editing?.category_code ?? '')
    setNombre(editing?.nombre ?? '')
    setEstado(editing?.estado ?? 'Activo')
  }, [open, editing])

  const create = useMutation({
    mutationFn: () => catalogoApi.createCategoria({ category_code: code, nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-categorias'] }); toast.success('Categoría creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => catalogoApi.updateCategoria(editing!.id, { nombre, estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-categorias'] }); toast.success('Categoría actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return toast.error('Nombre requerido')
    if (!editing && !/^[A-Za-z]{2,4}$/.test(code.trim())) return toast.error('El código debe ser de 2 a 4 letras (ej. PEN, NOT)')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Código {!editing && <span className="text-destructive text-xs">*</span>}</Label>
            {editing ? (
              <Input value={code} disabled className="font-mono opacity-60" />
            ) : (
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ej: PEN" maxLength={4} className="font-mono" autoFocus />
            )}
            <p className="text-[11px] text-muted-foreground">El código es permanente — una vez creado no se puede editar ni reutilizar.</p>
          </div>
          <div className="space-y-1">
            <Label>Nombre <span className="text-destructive text-xs">*</span></Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Derecho Penal" autoFocus={!!editing} />
          </div>
          {editing && (
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as CatalogoEstado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Subcategoría dialog ───────────────────────────────────────────────────────

function SubcategoriaDialog({ open, onClose, editing, defaultCategoryId, categorias }: {
  open: boolean; onClose: () => void; editing: Subcategoria | null; defaultCategoryId?: number; categorias: Categoria[]
}) {
  const qc = useQueryClient()
  const [categoryId, setCategoryId] = useState('')
  const [code, setCode] = useState('')
  const [nombre, setNombre] = useState('')
  const [estado, setEstado] = useState<CatalogoEstado>('Activo')

  useEffect(() => {
    if (!open) return
    setCategoryId(editing ? String(editing.category_id) : defaultCategoryId ? String(defaultCategoryId) : '')
    setCode(editing?.subcategory_code ?? '')
    setNombre(editing?.nombre ?? '')
    setEstado(editing?.estado ?? 'Activo')
  }, [open, editing, defaultCategoryId])

  const create = useMutation({
    mutationFn: () => catalogoApi.createSubcategoria({ category_id: Number(categoryId), subcategory_code: code, nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-subcategorias'] }); toast.success('Subcategoría creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => catalogoApi.updateSubcategoria(editing!.id, { nombre, estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-subcategorias'] }); toast.success('Subcategoría actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId) return toast.error('Selecciona una categoría')
    if (!nombre.trim()) return toast.error('Nombre requerido')
    if (!editing && !/^[A-Za-z]{2,4}$/.test(code.trim())) return toast.error('El código debe ser de 2 a 4 letras (ej. DEF)')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Editar subcategoría' : 'Nueva subcategoría'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Categoría <span className="text-destructive text-xs">*</span></Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.category_code} — {c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Código {!editing && <span className="text-destructive text-xs">*</span>}</Label>
            {editing ? (
              <Input value={code} disabled className="font-mono opacity-60" />
            ) : (
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ej: DEF" maxLength={4} className="font-mono" />
            )}
            <p className="text-[11px] text-muted-foreground">Permanente dentro de esta categoría — nunca se edita ni se reutiliza.</p>
          </div>
          <div className="space-y-1">
            <Label>Nombre <span className="text-destructive text-xs">*</span></Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Defensa técnica penal" autoFocus />
          </div>
          {editing && (
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as CatalogoEstado)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Servicio dialog ───────────────────────────────────────────────────────────

function ServicioDialog({ open, onClose, editing, defaultSubcategoryId, subcategorias }: {
  open: boolean; onClose: () => void; editing: Servicio | null; defaultSubcategoryId?: number; subcategorias: Subcategoria[]
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    subcategory_id: '', nombre: '', etiquetas: '', unidad_cobro: 'Por definir', responsable_sugerido: 'Por definir',
    tarifa_referencia: '', costo_referencia: '', horas_estandar: '', estado: 'Activo' as ServicioEstado,
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        subcategory_id: String(editing.subcategory_id),
        nombre: editing.nombre,
        etiquetas: editing.etiquetas,
        unidad_cobro: editing.unidad_cobro,
        responsable_sugerido: editing.responsable_sugerido,
        tarifa_referencia: editing.tarifa_referencia ? String(editing.tarifa_referencia) : '',
        costo_referencia: editing.costo_referencia ? String(editing.costo_referencia) : '',
        horas_estandar: editing.horas_estandar ? String(editing.horas_estandar) : '',
        estado: editing.estado,
      })
    } else {
      setForm({
        subcategory_id: defaultSubcategoryId ? String(defaultSubcategoryId) : '',
        nombre: '', etiquetas: '', unidad_cobro: 'Por definir', responsable_sugerido: 'Por definir',
        tarifa_referencia: '', costo_referencia: '', horas_estandar: '', estado: 'Activo',
      })
    }
  }, [open, editing, defaultSubcategoryId])

  const create = useMutation({
    mutationFn: () => catalogoApi.createServicio({
      subcategory_id: Number(form.subcategory_id), nombre: form.nombre, etiquetas: form.etiquetas,
      unidad_cobro: form.unidad_cobro, responsable_sugerido: form.responsable_sugerido,
      tarifa_referencia: form.tarifa_referencia ? Number(form.tarifa_referencia) : null,
      costo_referencia: form.costo_referencia ? Number(form.costo_referencia) : null,
      horas_estandar: form.horas_estandar ? Number(form.horas_estandar) : 0,
      estado: form.estado,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-servicios'] }); toast.success('Servicio creado'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => catalogoApi.updateServicio(editing!.id, {
      nombre: form.nombre, etiquetas: form.etiquetas, unidad_cobro: form.unidad_cobro, responsable_sugerido: form.responsable_sugerido,
      tarifa_referencia: form.tarifa_referencia ? Number(form.tarifa_referencia) : null,
      costo_referencia: form.costo_referencia ? Number(form.costo_referencia) : null,
      horas_estandar: form.horas_estandar ? Number(form.horas_estandar) : 0,
      estado: form.estado,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-servicios'] }); toast.success('Servicio actualizado'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subcategory_id) return toast.error('Selecciona una subcategoría')
    if (!form.nombre.trim()) return toast.error('Nombre requerido')
    editing ? update.mutate() : create.mutate()
  }

  const margen = (Number(form.tarifa_referencia) || 0) - (Number(form.costo_referencia) || 0)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? `Editar servicio — ${editing.service_code}` : 'Nuevo servicio'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!editing && (
            <div className="space-y-1">
              <Label>Subcategoría <span className="text-destructive text-xs">*</span></Label>
              <Select value={form.subcategory_id} onValueChange={(v) => setForm({ ...form, subcategory_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {subcategorias.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.category_code}-{s.subcategory_code} — {s.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">El código del servicio se genera automáticamente (AGL-CAT-SUB-000) y nunca cambia.</p>
            </div>
          )}
          <div className="space-y-1">
            <Label>Nombre del servicio <span className="text-destructive text-xs">*</span></Label>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Escritura de compraventa de inmueble" autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Etiquetas</Label>
            <Input value={form.etiquetas} onChange={(e) => setForm({ ...form, etiquetas: e.target.value })} placeholder="separadas,por,coma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Unidad de cobro</Label>
              <Select value={form.unidad_cobro} onValueChange={(v) => setForm({ ...form, unidad_cobro: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIDADES_COBRO.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Responsable sugerido</Label>
              <Select value={form.responsable_sugerido} onValueChange={(v) => setForm({ ...form, responsable_sugerido: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RESPONSABLES_SUGERIDOS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Tarifa referencia ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.tarifa_referencia} onChange={(e) => setForm({ ...form, tarifa_referencia: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Costo referencia ($)</Label>
              <Input type="number" step="0.01" min="0" value={form.costo_referencia} onChange={(e) => setForm({ ...form, costo_referencia: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Horas estándar</Label>
              <Input type="number" step="0.5" min="0" value={form.horas_estandar} onChange={(e) => setForm({ ...form, horas_estandar: e.target.value })} placeholder="0" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Margen de referencia (calculado): <span className="font-mono font-medium text-foreground">{money(margen)}</span></p>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as ServicioEstado })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="En diseño">En diseño (no disponible aún en expedientes)</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
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

// ─── Familias tab ──────────────────────────────────────────────────────────────

function FamiliaDialog({ open, onClose, editing, categorias }: {
  open: boolean; onClose: () => void; editing: Familia | null; categorias: Categoria[]
}) {
  const qc = useQueryClient()
  const [categoryId, setCategoryId] = useState('')
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    if (!open) return
    setCategoryId(editing ? String(editing.category_id) : '')
    setNombre(editing?.nombre ?? '')
  }, [open, editing])

  const create = useMutation({
    mutationFn: () => catalogoApi.createFamilia({ category_id: Number(categoryId), nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-familias'] }); toast.success('Familia creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => catalogoApi.updateFamilia(editing!.id, { nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalogo-familias'] }); toast.success('Familia actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing && !categoryId) return toast.error('Selecciona una categoría')
    if (!nombre.trim()) return toast.error('Nombre requerido')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? 'Editar familia' : 'Nueva familia'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Categoría <span className="text-destructive text-xs">*</span></Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {categorias.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.category_code} — {c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">Cada categoría tiene como máximo una familia. El código (FAM-01…) se asigna solo.</p>
          </div>
          <div className="space-y-1">
            <Label>Nombre <span className="text-destructive text-xs">*</span></Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Notariales rápidos" autoFocus />
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

function FamiliasTab() {
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Familia | null>(null)
  const { data: familias = [] } = useQuery({ queryKey: ['catalogo-familias'], queryFn: catalogoApi.listFamilias })
  const { data: categorias = [] } = useQuery({ queryKey: ['catalogo-categorias'], queryFn: () => catalogoApi.listCategorias() })

  return (
    <div className="space-y-4">
      <InfoBanner>
        Las <strong>familias</strong> agrupan las categorías para presupuesto, plan de cuentas y cumplimiento mensual.
        No son lo mismo que las subcategorías.
      </InfoBanner>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setDlg(true) }}><Plus className="h-4 w-4" />Nueva familia</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoría</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {familias.map((f) => (
                <tr key={f.id} className="hover:bg-muted/30 transition-colors" style={{ borderBottom: '1px solid hsl(var(--border)/0.5)' }}>
                  <td className="px-4 py-2.5 font-mono text-xs">{f.family_code}</td>
                  <td className="px-4 py-2.5 font-medium">{f.nombre}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.category_code} — {f.category_nombre}</td>
                  <td className="px-4 py-2.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(f); setDlg(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <FamiliaDialog open={dlg} onClose={() => setDlg(false)} editing={editing} categorias={categorias} />
    </div>
  )
}

// ─── Main catalog tree tab ─────────────────────────────────────────────────────

function CatalogoTab() {
  const [search, setSearch] = useState('')
  const [expandedCat, setExpandedCat] = useState<Record<number, boolean>>({})
  const [expandedSub, setExpandedSub] = useState<Record<number, boolean>>({})

  const [catDlg, setCatDlg] = useState(false)
  const [editingCat, setEditingCat] = useState<Categoria | null>(null)
  const [subDlg, setSubDlg] = useState(false)
  const [editingSub, setEditingSub] = useState<Subcategoria | null>(null)
  const [defaultCatForSub, setDefaultCatForSub] = useState<number | undefined>()
  const [svcDlg, setSvcDlg] = useState(false)
  const [editingSvc, setEditingSvc] = useState<Servicio | null>(null)
  const [defaultSubForSvc, setDefaultSubForSvc] = useState<number | undefined>()
  const [historial, setHistorial] = useState<{ tipo: 'Categoria' | 'Subcategoria' | 'Servicio'; id: number; label: string } | null>(null)

  const { data: categorias = [] } = useQuery({ queryKey: ['catalogo-categorias'], queryFn: () => catalogoApi.listCategorias() })
  const { data: subcategorias = [] } = useQuery({ queryKey: ['catalogo-subcategorias'], queryFn: () => catalogoApi.listSubcategorias() })
  const { data: servicios = [] } = useQuery({ queryKey: ['catalogo-servicios'], queryFn: () => catalogoApi.listServicios() })

  const term = search.trim().toLowerCase()
  const filtering = term.length > 0
  const hit = (...vals: string[]) => vals.some((v) => v.toLowerCase().includes(term))

  const subsByCat = useMemo(() => {
    const m = new Map<number, Subcategoria[]>()
    for (const s of subcategorias) {
      if (!m.has(s.category_id)) m.set(s.category_id, [])
      m.get(s.category_id)!.push(s)
    }
    return m
  }, [subcategorias])

  const svcsBySub = useMemo(() => {
    const m = new Map<number, Servicio[]>()
    for (const s of servicios) {
      if (!m.has(s.subcategory_id)) m.set(s.subcategory_id, [])
      m.get(s.subcategory_id)!.push(s)
    }
    return m
  }, [servicios])

  function visibleSubs(cat: Categoria): Subcategoria[] {
    const subs = subsByCat.get(cat.id) ?? []
    if (!filtering || hit(cat.category_code, cat.nombre)) return subs
    return subs.filter((sc) => hit(sc.subcategory_code, sc.nombre) || (svcsBySub.get(sc.id) ?? []).some((sv) => hit(sv.service_code, sv.nombre)))
  }
  function visibleSvcs(cat: Categoria, sc: Subcategoria): Servicio[] {
    const svcs = svcsBySub.get(sc.id) ?? []
    if (!filtering || hit(cat.category_code, cat.nombre) || hit(sc.subcategory_code, sc.nombre)) return svcs
    return svcs.filter((sv) => hit(sv.service_code, sv.nombre))
  }
  const visibleCats = categorias.filter((c) => visibleSubs(c).length > 0 || !filtering)

  function isCatOpen(id: number) { return filtering ? true : (expandedCat[id] ?? false) }
  function isSubOpen(id: number) { return filtering ? true : (expandedSub[id] ?? false) }

  return (
    <div className="space-y-4">
      <InfoBanner>
        <strong>Categorías → subcategorías → servicios</strong>, con código permanente y generado por el sistema.
        Los códigos nunca se editan; inactivar no borra histórico.
      </InfoBanner>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código o nombre..." className="pl-8" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => { setEditingCat(null); setCatDlg(true) }}>
            <Folders className="h-4 w-4" />Nueva categoría
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {visibleCats.map((cat) => {
          const subs = visibleSubs(cat)
          const open = isCatOpen(cat.id)
          return (
            <Card key={cat.id} className="overflow-hidden">
              <div className="w-full flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: open ? '1px solid hsl(var(--border))' : 'none' }}>
                <button type="button" onClick={() => setExpandedCat((p) => ({ ...p, [cat.id]: !p[cat.id] }))} className="shrink-0">
                  {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
                <FolderTree className="h-4 w-4 shrink-0" style={{ color: 'hsl(43 80% 55%)' }} />
                <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--muted))' }}>{cat.category_code}</span>
                <span className="font-semibold flex-1">{cat.nombre}</span>
                <EstadoBadge estado={cat.estado} />
                <Badge variant="secondary" className="text-xs">{subs.length} subcat.</Badge>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => { setDefaultCatForSub(cat.id); setEditingSub(null); setSubDlg(true) }}>
                    <Plus className="h-3 w-3" />Subcategoría
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingCat(cat); setCatDlg(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHistorial({ tipo: 'Categoria', id: cat.id, label: `${cat.category_code} — ${cat.nombre}` })}><History className="h-3.5 w-3.5" /></Button>
                </div>
              </div>

              {open && (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border)/0.5)' }}>
                  {subs.length === 0 && (
                    <div className="px-4 py-4 text-center text-sm text-muted-foreground/60">Sin subcategorías todavía</div>
                  )}
                  {subs.map((sc) => {
                    const svcs = visibleSvcs(cat, sc)
                    const scOpen = isSubOpen(sc.id)
                    return (
                      <div key={sc.id}>
                        <div className="flex items-center gap-2.5 pl-9 pr-4 py-2.5 bg-muted/10">
                          <button type="button" onClick={() => setExpandedSub((p) => ({ ...p, [sc.id]: !p[sc.id] }))} className="shrink-0">
                            {scOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                          <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'hsl(var(--muted))' }}>{cat.category_code}-{sc.subcategory_code}</span>
                          <span className="font-medium text-sm flex-1">{sc.nombre}</span>
                          <EstadoBadge estado={sc.estado} />
                          <Badge variant="secondary" className="text-xs">{svcs.length} servicio{svcs.length !== 1 ? 's' : ''}</Badge>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => { setDefaultSubForSvc(sc.id); setEditingSvc(null); setSvcDlg(true) }}>
                              <Plus className="h-3 w-3" />Servicio
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingSub(sc); setSubDlg(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHistorial({ tipo: 'Subcategoria', id: sc.id, label: `${cat.category_code}-${sc.subcategory_code} — ${sc.nombre}` })}><History className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        {scOpen && (
                          svcs.length === 0 ? (
                            <div className="pl-16 pr-4 py-3 text-xs text-muted-foreground/60">Sin servicios todavía</div>
                          ) : (
                            <table className="w-full text-sm">
                              <thead>
                                <tr style={{ borderBottom: '1px solid hsl(var(--border)/0.5)' }}>
                                  <th className="text-left pl-16 pr-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Código</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Servicio</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Unidad de cobro</th>
                                  <th className="text-right px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Tarifa / Margen</th>
                                  <th className="text-left px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                                  <th className="w-16" />
                                </tr>
                              </thead>
                              <tbody>
                                {svcs.map((sv) => (
                                  <tr key={sv.id} className="hover:bg-muted/20" style={{ borderBottom: '1px solid hsl(var(--border)/0.3)' }}>
                                    <td className="pl-16 pr-3 py-2 font-mono text-[11px] text-muted-foreground">{sv.service_code}</td>
                                    <td className="px-3 py-2 font-medium">{sv.nombre}</td>
                                    <td className="px-3 py-2 hidden md:table-cell text-xs text-muted-foreground">{sv.unidad_cobro}</td>
                                    <td className="px-3 py-2 hidden lg:table-cell text-right font-mono text-xs">
                                      {money(sv.tarifa_referencia)} <span className="text-muted-foreground">/ {money(sv.margen_referencia)}</span>
                                    </td>
                                    <td className="px-3 py-2"><EstadoBadge estado={sv.estado} /></td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1 justify-end">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingSvc(sv); setSvcDlg(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHistorial({ tipo: 'Servicio', id: sv.id, label: `${sv.service_code} — ${sv.nombre}` })}><History className="h-3.5 w-3.5" /></Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
        {visibleCats.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 rounded-xl text-center" style={{ border: '2px dashed hsl(var(--border))' }}>
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sin resultados para "{search}"</p>
          </div>
        )}
      </div>

      <CategoriaDialog open={catDlg} onClose={() => setCatDlg(false)} editing={editingCat} />
      <SubcategoriaDialog open={subDlg} onClose={() => setSubDlg(false)} editing={editingSub} defaultCategoryId={defaultCatForSub} categorias={categorias} />
      <ServicioDialog open={svcDlg} onClose={() => setSvcDlg(false)} editing={editingSvc} defaultSubcategoryId={defaultSubForSvc} subcategorias={subcategorias} />
      <HistorialDialog open={!!historial} onClose={() => setHistorial(null)} tipo={historial?.tipo ?? 'Categoria'} entityId={historial?.id ?? null} label={historial?.label ?? ''} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Catalogo() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Catálogo Maestro</h1>
        <p className="text-muted-foreground text-sm">Categorías, subcategorías, servicios y familias comerciales — con códigos permanentes e historial de cambios</p>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="catalogo" className="gap-1.5"><Briefcase className="h-3.5 w-3.5" />Catálogo</TabsTrigger>
          <TabsTrigger value="familias" className="gap-1.5"><Layers className="h-3.5 w-3.5" />Familias</TabsTrigger>
        </TabsList>
        <TabsContent value="catalogo" className="mt-4"><CatalogoTab /></TabsContent>
        <TabsContent value="familias" className="mt-4"><FamiliasTab /></TabsContent>
      </Tabs>
    </div>
  )
}
