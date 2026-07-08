import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { categoriesApi } from '@/api/categories'
import type { Category, ServiceProduct } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type CatKind = 'income' | 'expense' | 'cost'

function CategoryTab({ kind, label }: { kind: CatKind; label: string }) {
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
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />Nueva categoría</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{['Nombre', ''].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('¿Eliminar categoría?')) remove.mutate(c.id) }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!cats.length && <tr><td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">Sin categorías para {label.toLowerCase()}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar categoría' : `Nueva categoría — ${label}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const SERVICE_AREAS = ['Servicios Notariales', 'Bienes Raíces e Inversiones', 'Derecho Corporativo y Empresarial', 'Derecho de Familia', 'Representación en Juicios', 'Derecho Administrativo', 'Migratorio', 'Otro']

function ProductsTab() {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<ServiceProduct | null>(null)
  const [form, setForm] = useState({ category_id: '', name: '', description: '', base_price: '', service_area: '' })

  const { data: serviceCategories = [] } = useQuery({ queryKey: ['categories', 'service'], queryFn: () => categoriesApi.list('service') })
  const { data: products = [] } = useQuery({ queryKey: ['service-products'], queryFn: () => categoriesApi.listProducts() })

  const create = useMutation({
    mutationFn: () => categoriesApi.createProduct({ category_id: Number(form.category_id), name: form.name, description: form.description, base_price: form.base_price ? Number(form.base_price) : null, service_area: form.service_area || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-products'] }); qc.invalidateQueries({ queryKey: ['product-choices'] }); toast.success('Servicio creado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: (id: number) => categoriesApi.updateProduct(id, { category_id: Number(form.category_id), name: form.name, description: form.description, base_price: form.base_price ? Number(form.base_price) : null, service_area: form.service_area || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-products'] }); qc.invalidateQueries({ queryKey: ['product-choices'] }); toast.success('Actualizado'); setDlg(false) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: categoriesApi.deleteProduct,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-products'] }); toast.success('Eliminado') },
  })
  const createServiceCat = useMutation({
    mutationFn: (name: string) => categoriesApi.create({ kind: 'service', name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories', 'service'] }); toast.success('Categoría de servicio creada') },
  })

  function openNew() { setEditing(null); setForm({ category_id: serviceCategories[0] ? String(serviceCategories[0].id) : '', name: '', description: '', base_price: '', service_area: '' }); setDlg(true) }
  function openEdit(p: ServiceProduct) {
    setEditing(p)
    setForm({ category_id: String(p.category_id), name: p.name, description: p.description ?? '', base_price: p.base_price != null ? String(p.base_price) : '', service_area: (p as ServiceProduct & { service_area?: string }).service_area ?? '' })
    setDlg(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.category_id) return toast.error('Nombre y categoría son requeridos')
    editing ? update.mutate(editing.id) : create.mutate()
  }

  const [newCatName, setNewCatName] = useState('')
  const [catDlg, setCatDlg] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={() => setCatDlg(true)}>+ Categoría de servicio</Button>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />Nuevo servicio</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{['Nombre', 'Área de servicio', 'Categoría', 'Precio base', 'Descripción', ''].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{(p as ServiceProduct & { service_area?: string }).service_area ?? <span className="italic text-muted-foreground/50">Sin área</span>}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.category_name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.base_price != null ? `₡${p.base_price.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">{p.description || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('¿Eliminar?')) remove.mutate(p.id) }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin servicios/productos</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Product form dialog */}
      <Dialog open={dlg} onOpenChange={setDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio/producto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label>Área de servicio</Label>
              <Select value={form.service_area} onValueChange={(v) => setForm({ ...form, service_area: v })}>
                <SelectTrigger><SelectValue placeholder="Sin área específica" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin área específica</SelectItem>
                  {SERVICE_AREAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoría *</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
                <SelectContent>{serviceCategories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1"><Label>Precio base</Label><Input type="number" step="0.01" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: e.target.value })} /></div>
            <div className="space-y-1"><Label>Descripción</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Service category dialog */}
      <Dialog open={catDlg} onOpenChange={setCatDlg}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva categoría de servicio</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); if (!newCatName.trim()) return; createServiceCat.mutate(newCatName); setNewCatName(''); setCatDlg(false) }} className="space-y-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setCatDlg(false)}>Cancelar</Button><Button type="submit">Crear</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function Categories() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Categorías y Servicios</h1>
        <p className="text-muted-foreground text-sm">Gestión de categorías y catálogo de servicios</p>
      </div>

      <Tabs defaultValue="income">
        <TabsList>
          <TabsTrigger value="income">Ingresos</TabsTrigger>
          <TabsTrigger value="expense">Gastos</TabsTrigger>
          <TabsTrigger value="cost">Costos directos</TabsTrigger>
          <TabsTrigger value="products">Servicios/Productos</TabsTrigger>
        </TabsList>
        <TabsContent value="income"><CategoryTab kind="income" label="Ingresos" /></TabsContent>
        <TabsContent value="expense"><CategoryTab kind="expense" label="Gastos" /></TabsContent>
        <TabsContent value="cost"><CategoryTab kind="cost" label="Costos directos" /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
      </Tabs>
    </div>
  )
}
