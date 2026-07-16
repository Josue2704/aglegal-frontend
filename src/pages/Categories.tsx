import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Pencil, ChevronDown, ChevronRight,
  Info, Tag, Folders, Receipt, Wallet, Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'
import { categoriesApi } from '@/api/categories'
import type { Category, ServiceProduct } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type CatKind = 'income' | 'expense' | 'cost'

const SERVICE_AREAS = [
  'Servicios Notariales',
  'Bienes Raíces e Inversiones',
  'Derecho Corporativo y Empresarial',
  'Derecho de Familia',
  'Representación en Juicios',
  'Derecho Administrativo',
  'Migratorio',
  'Otro',
]

// ─── Info banner ──────────────────────────────────────────────────────────────

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

// ─── Simple category tab (income / expense / cost) ───────────────────────────

function CategoryTab({ kind, label, info }: { kind: CatKind; label: string; info: string }) {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')

  const { data: cats = [] } = useQuery({ queryKey: ['categories', kind], queryFn: () => categoriesApi.list(kind) })

  const create = useMutation({
    mutationFn: () => categoriesApi.create({ kind, name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', kind] }); toast.success('Categoría creada'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: (id: number) => categoriesApi.update(id, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', kind] }); toast.success('Actualizado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', kind] }); toast.success('Eliminado') },
  })

  function openNew() { setEditing(null); setName(''); setDlg(true) }
  function openEdit(c: Category) { setEditing(c); setName(c.name); setDlg(true) }
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Nombre requerido')
    editing ? update.mutate(editing.id) : create.mutate()
  }

  return (
    <div className="space-y-4">
      <InfoBanner>{info}</InfoBanner>

      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />Nueva categoría</Button>
      </div>

      {cats.length === 0 ? (
        <div
          className="flex flex-col items-center gap-3 py-12 rounded-xl text-center"
          style={{ border: '2px dashed hsl(var(--border))' }}
        >
          <Tag className="h-8 w-8 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">Sin categorías de {label.toLowerCase()}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Crea una para poder clasificar tus registros</p>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}><Plus className="h-4 w-4" />Crear primera categoría</Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors" style={{ borderBottom: '1px solid hsl(var(--border)/0.5)' }}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('¿Eliminar categoría?')) remove.mutate(c.id) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar categoría' : `Nueva categoría de ${label.toLowerCase()}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre <span className="text-destructive text-xs">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Ej: ${label === 'Ingresos' ? 'Honorarios, Consultoría...' : label === 'Gastos' ? 'Alquiler, Servicios...' : 'Viáticos, Notaría...'}`} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Service product form dialog ──────────────────────────────────────────────

function ProductFormDialog({
  open,
  onClose,
  editing,
  defaultCategoryId,
  serviceCategories,
  onSave,
  isPending,
}: {
  open: boolean
  onClose: () => void
  editing: ServiceProduct | null
  defaultCategoryId?: number
  serviceCategories: Category[]
  onSave: (data: { category_id: number; name: string; description: string; base_price: number | null; service_area: string | null }) => void
  isPending: boolean
}) {
  const [form, setForm] = useState({
    category_id: defaultCategoryId ? String(defaultCategoryId) : '',
    name: '',
    description: '',
    base_price: '',
    service_area: '',
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        category_id: String(editing.category_id),
        name: editing.name,
        description: editing.description ?? '',
        base_price: editing.base_price != null ? String(editing.base_price) : '',
        service_area: (editing as ServiceProduct & { service_area?: string }).service_area ?? '',
      })
    } else {
      setForm({
        category_id: defaultCategoryId ? String(defaultCategoryId) : (serviceCategories[0] ? String(serviceCategories[0].id) : ''),
        name: '',
        description: '',
        base_price: '',
        service_area: '',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    if (!form.category_id) return toast.error('Selecciona una categoría')
    onSave({
      category_id: Number(form.category_id),
      name: form.name.trim(),
      description: form.description,
      base_price: form.base_price ? Number(form.base_price) : null,
      service_area: form.service_area || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio / producto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div className="space-y-1">
            <Label>Categoría <span className="text-destructive text-xs">*</span></Label>
            <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría..." />
              </SelectTrigger>
              <SelectContent>
                {serviceCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <Label>Nombre del servicio <span className="text-destructive text-xs">*</span></Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Autenticación de firma, Escritura pública..."
              autoFocus
            />
          </div>

          {/* Service area */}
          <div className="space-y-1">
            <Label>Área de derecho</Label>
            <p className="text-[11px] text-muted-foreground -mt-0.5">Determina en qué expedientes aparece este servicio</p>
            <Select value={form.service_area} onValueChange={(v) => setForm({ ...form, service_area: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Sin área específica (aparece en todas)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin área específica (aparece en todas)</SelectItem>
                {SERVICE_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Base price */}
          <div className="space-y-1">
            <Label>Precio base (₡)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 — opcional"
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Descripción / notas internas</Label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              placeholder="Detalles, requisitos, observaciones..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Products tab — hierarchical view ─────────────────────────────────────────

function ProductsTab() {
  const qc = useQueryClient()
  const [productDlg, setProductDlg] = useState(false)
  const [catDlg, setCatDlg] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ServiceProduct | null>(null)
  const [defaultCatId, setDefaultCatId] = useState<number | undefined>()
  const [newCatName, setNewCatName] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const { data: serviceCategories = [] } = useQuery<Category[]>({
    queryKey: ['categories', 'service'],
    queryFn: () => categoriesApi.list('service'),
  })

  useEffect(() => {
    if (serviceCategories.length) {
      setExpanded((prev) => {
        const next = { ...prev }
        serviceCategories.forEach((c) => { if (!(c.id in next)) next[c.id] = true })
        return next
      })
    }
  }, [serviceCategories])

  const { data: products = [] } = useQuery({
    queryKey: ['service-products'],
    queryFn: () => categoriesApi.listProducts(),
  })

  const create = useMutation({
    mutationFn: categoriesApi.createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-products'] })
      qc.invalidateQueries({ queryKey: ['product-choices'] })
      toast.success('Servicio creado')
      setProductDlg(false)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof categoriesApi.updateProduct>[1] }) =>
      categoriesApi.updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-products'] })
      qc.invalidateQueries({ queryKey: ['product-choices'] })
      toast.success('Actualizado')
      setProductDlg(false)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  const remove = useMutation({
    mutationFn: categoriesApi.deleteProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['service-products'] })
      toast.success('Eliminado')
    },
  })

  const createCat = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ kind: 'service', name }),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['categories', 'service'] })
      toast.success('Categoría creada')
      setCatDlg(false)
      setNewCatName('')
      // Auto-expand and prompt to add a product
      setExpanded((p) => ({ ...p, [cat.id]: true }))
    },
  })

  const deleteCat = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', 'service'] })
      toast.success('Categoría eliminada')
    },
    onError: () => toast.error('No se pudo eliminar — puede tener servicios asociados'),
  })

  function openNewProduct(catId?: number) {
    setEditingProduct(null)
    setDefaultCatId(catId)
    setProductDlg(true)
  }

  function openEditProduct(p: ServiceProduct) {
    setEditingProduct(p)
    setDefaultCatId(undefined)
    setProductDlg(true)
  }

  function handleSaveProduct(data: { category_id: number; name: string; description: string; base_price: number | null; service_area: string | null }) {
    if (editingProduct) {
      update.mutate({ id: editingProduct.id, data })
    } else {
      create.mutate(data)
    }
  }

  function toggleCat(id: number) {
    setExpanded((p) => ({ ...p, [id]: !p[id] }))
  }

  const productsByCategory = (catId: number) => products.filter((p) => p.category_id === catId)
  const uncategorized = products.filter((p) => !serviceCategories.find((c) => c.id === p.category_id))

  return (
    <div className="space-y-4">
      <InfoBanner>
        Aquí defines el catálogo de <strong>servicios y productos</strong> que ofrece el bufete.
        Estos aparecen en el selector <strong>"Producto/Servicio"</strong> al crear Expedientes y Facturas.
        Estructura: crea primero una <strong>categoría</strong> (ej: "Notarial") y luego agrega los servicios dentro de ella.
      </InfoBanner>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => setCatDlg(true)}>
          <Folders className="h-4 w-4" />Nueva categoría
        </Button>
        <Button size="sm" onClick={() => openNewProduct()}>
          <Plus className="h-4 w-4" />Nuevo servicio
        </Button>
      </div>

      {/* Empty state */}
      {serviceCategories.length === 0 && (
        <div
          className="flex flex-col items-center gap-4 py-16 rounded-xl text-center"
          style={{ border: '2px dashed hsl(var(--border))' }}
        >
          <Folders className="h-12 w-12 text-muted-foreground/20" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Empieza creando una categoría</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Por ejemplo: <em>"Notarial"</em>, <em>"Litigios"</em>, <em>"Corporativo"</em>.
              Luego agrega los servicios específicos dentro de cada una.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCatDlg(true)}>
              <Folders className="h-4 w-4" />Crear categoría
            </Button>
          </div>
        </div>
      )}

      {/* Hierarchical categories */}
      <div className="space-y-3">
        {serviceCategories.map((cat) => {
          const catProducts = productsByCategory(cat.id)
          const isOpen = expanded[cat.id] ?? true

          return (
            <Card key={cat.id} className="overflow-hidden">
              {/* Category header */}
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                style={{ borderBottom: isOpen ? '1px solid hsl(var(--border))' : 'none' }}
                onClick={() => toggleCat(cat.id)}
              >
                {isOpen
                  ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                }
                <Folders className="h-4 w-4 shrink-0" style={{ color: 'hsl(43 80% 55%)' }} />
                <span className="font-semibold text-foreground flex-1">{cat.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {catProducts.length} servicio{catProducts.length !== 1 ? 's' : ''}
                </Badge>
                <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs gap-1"
                    onClick={() => openNewProduct(cat.id)}
                  >
                    <Plus className="h-3 w-3" />Agregar servicio
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      if (catProducts.length > 0) {
                        toast.error(`Elimina primero los ${catProducts.length} servicio(s) de esta categoría`)
                        return
                      }
                      if (confirm(`¿Eliminar categoría "${cat.name}"?`)) deleteCat.mutate(cat.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </button>

              {/* Products inside category */}
              {isOpen && (
                <div>
                  {catProducts.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-muted-foreground/60">Sin servicios en esta categoría</p>
                      <button
                        type="button"
                        className="mt-2 text-xs underline underline-offset-2 transition-colors"
                        style={{ color: 'hsl(43 80% 55%)' }}
                        onClick={() => openNewProduct(cat.id)}
                      >
                        + Agregar el primer servicio
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border)/0.5)' }}>
                          <th className="text-left px-6 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Servicio</th>
                          <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Área de derecho</th>
                          <th className="text-left px-4 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Precio base</th>
                          <th className="w-20" />
                        </tr>
                      </thead>
                      <tbody>
                        {catProducts.map((p) => (
                          <tr
                            key={p.id}
                            className="hover:bg-muted/20 transition-colors"
                            style={{ borderBottom: '1px solid hsl(var(--border)/0.3)' }}
                          >
                            <td className="px-6 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'hsl(43 80% 55%)' }} />
                                <span className="font-medium">{p.name}</span>
                              </div>
                              {p.description && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5 pl-3.5 truncate max-w-xs">{p.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              {(p as ServiceProduct & { service_area?: string }).service_area
                                ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(210 80% 55% / 0.1)', color: 'hsl(210 80% 65%)' }}>
                                    {(p as ServiceProduct & { service_area?: string }).service_area}
                                  </span>
                                : <span className="text-xs text-muted-foreground/50 italic">Todas las áreas</span>
                              }
                            </td>
                            <td className="px-4 py-2.5 hidden md:table-cell">
                              {p.base_price != null
                                ? <span className="font-mono text-sm">₡{p.base_price.toLocaleString()}</span>
                                : <span className="text-muted-foreground/50 text-xs">—</span>
                              }
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditProduct(p)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive"
                                  onClick={() => { if (confirm(`¿Eliminar "${p.name}"?`)) remove.mutate(p.id) }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </Card>
          )
        })}

        {/* Uncategorized products (edge case) */}
        {uncategorized.length > 0 && (
          <Card className="overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <span className="font-semibold text-muted-foreground text-sm">Sin categoría</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {uncategorized.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20" style={{ borderBottom: '1px solid hsl(var(--border)/0.3)' }}>
                    <td className="px-4 py-2.5 font-medium">{p.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditProduct(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                          onClick={() => { if (confirm(`¿Eliminar "${p.name}"?`)) remove.mutate(p.id) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* Product form dialog */}
      <ProductFormDialog
        open={productDlg}
        onClose={() => setProductDlg(false)}
        editing={editingProduct}
        defaultCategoryId={defaultCatId}
        serviceCategories={serviceCategories}
        onSave={handleSaveProduct}
        isPending={create.isPending || update.isPending}
      />

      {/* New category dialog */}
      <Dialog open={catDlg} onOpenChange={setCatDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva categoría de servicios</DialogTitle></DialogHeader>
          <div className="text-sm text-muted-foreground mb-1">
            Agrupa tus servicios por tipo de práctica. Ej: <em>"Notarial"</em>, <em>"Litigios"</em>, <em>"Corporativo"</em>.
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!newCatName.trim()) return
              createCat.mutate(newCatName)
            }}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label>Nombre <span className="text-destructive text-xs">*</span></Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ej: Notarial, Litigios, Corporativo..."
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatDlg(false)}>Cancelar</Button>
              <Button type="submit" disabled={createCat.isPending}>Crear categoría</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Categories() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Categorías y Servicios</h1>
        <p className="text-muted-foreground text-sm">Organiza tus categorías contables y el catálogo de servicios del bufete</p>
      </div>

      <Tabs defaultValue="products">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="products" className="gap-1.5">
            <Briefcase className="h-3.5 w-3.5" />Servicios y Productos
          </TabsTrigger>
          <TabsTrigger value="income" className="gap-1.5">
            <Receipt className="h-3.5 w-3.5" />Ingresos
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />Gastos
          </TabsTrigger>
          <TabsTrigger value="cost" className="gap-1.5">
            <Tag className="h-3.5 w-3.5" />Costos directos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4"><ProductsTab /></TabsContent>
        <TabsContent value="income" className="mt-4">
          <CategoryTab
            kind="income"
            label="Ingresos"
            info="Estas categorías clasifican los ingresos en el Flujo de Caja (ej: Honorarios, Consultoría, Retenciones). No aparecen en Expedientes ni Facturas."
          />
        </TabsContent>
        <TabsContent value="expense" className="mt-4">
          <CategoryTab
            kind="expense"
            label="Gastos"
            info="Estas categorías clasifican los gastos en el Flujo de Caja (ej: Alquiler, Servicios públicos, Papelería). No aparecen en Expedientes ni Facturas."
          />
        </TabsContent>
        <TabsContent value="cost" className="mt-4">
          <CategoryTab
            kind="cost"
            label="Costos directos"
            info="Estas categorías clasifican los costos directos asociados a expedientes (ej: Viáticos, Honorarios de peritos). Se usan en la sección de Costos de cada expediente."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
