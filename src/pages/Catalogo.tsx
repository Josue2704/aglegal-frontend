import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown, ChevronRight, Search, History,
  Info, ShieldCheck, FolderTree, Briefcase, Layers,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { catalogoApi } from '@/api/catalogo'
import type { Categoria, Subcategoria, Servicio } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

function GobiernoBanner() {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
      style={{ background: 'hsl(43 70% 55% / 0.08)', border: '1px solid hsl(43 70% 55% / 0.25)' }}
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'hsl(43 70% 55%)' }} />
        <span className="text-sm">
          El Catálogo Maestro es de solo lectura. Toda alta, cambio o baja de categorías, subcategorías, servicios o familias
          se hace mediante una solicitud en <strong>Gobierno del Catálogo</strong>.
        </span>
      </div>
      <Button size="sm" asChild><Link to="/gobierno-catalogo">Ir a solicitudes</Link></Button>
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

// ─── Familias tab ──────────────────────────────────────────────────────────────

function FamiliasTab() {
  const { data: familias = [] } = useQuery({ queryKey: ['catalogo-familias'], queryFn: catalogoApi.listFamilias })

  return (
    <div className="space-y-4">
      <InfoBanner>
        Las <strong>familias</strong> agrupan las categorías para presupuesto, plan de cuentas y cumplimiento mensual.
        No son lo mismo que las subcategorías.
      </InfoBanner>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoría</th>
              </tr>
            </thead>
            <tbody>
              {familias.map((f) => (
                <tr key={f.id} className="hover:bg-muted/30 transition-colors" style={{ borderBottom: '1px solid hsl(var(--border)/0.5)' }}>
                  <td className="px-4 py-2.5 font-mono text-xs">{f.family_code}</td>
                  <td className="px-4 py-2.5 font-medium">{f.nombre}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{f.category_code} — {f.category_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Main catalog tree tab ─────────────────────────────────────────────────────

function CatalogoTab() {
  const [search, setSearch] = useState('')
  const [expandedCat, setExpandedCat] = useState<Record<number, boolean>>({})
  const [expandedSub, setExpandedSub] = useState<Record<number, boolean>>({})
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

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código o nombre..." className="pl-8" />
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
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHistorial({ tipo: 'Categoria', id: cat.id, label: `${cat.category_code} — ${cat.nombre}` })}><History className="h-3.5 w-3.5" /></Button>
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
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHistorial({ tipo: 'Subcategoria', id: sc.id, label: `${cat.category_code}-${sc.subcategory_code} — ${sc.nombre}` })}><History className="h-3.5 w-3.5" /></Button>
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
                                  <th className="w-10" />
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
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setHistorial({ tipo: 'Servicio', id: sv.id, label: `${sv.service_code} — ${sv.nombre}` })}><History className="h-3.5 w-3.5" /></Button>
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

      <GobiernoBanner />

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
