import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Info, Wallet, Users, Receipt, Gauge, Search, Target } from 'lucide-react'
import { toast } from 'sonner'
import { finanzasApi } from '@/api/finanzas'
import { catalogoApi } from '@/api/catalogo'
import type { Cuenta, Persona, GastoFijo, Categoria, Familia, CatalogoEstado, Forecast } from '@/types'
import { NATURALEZAS_CUENTA, CENTROS_COSTO, GASTOS_FIJOS_TIPOS } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type ApiErr = { response?: { data?: { detail?: string } } }
const errMsg = (e: ApiErr) => e.response?.data?.detail ?? 'Ocurrió un error'
const money = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const pct = (n: number) => `${(n * 100).toFixed(1)}%`
const currentMonth = () => new Date().toISOString().slice(0, 7)

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
      style={{ background: 'hsl(210 80% 55% / 0.08)', border: '1px solid hsl(210 80% 55% / 0.2)', color: 'hsl(210 80% 70%)' }}>
      <Info className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}
function EstadoBadge({ estado }: { estado: string }) {
  return estado === 'Activo' ? <Badge variant="success">Activo</Badge> : <Badge variant="secondary">Inactivo</Badge>
}
function Vigencia({ inicio, fin }: { inicio: string; fin: string | null }) {
  return <span className="font-mono text-xs text-muted-foreground">{inicio} → {fin ?? 'indefinido'}</span>
}

// ─── Plan de cuentas ────────────────────────────────────────────────────────────

function CuentaDialog({ open, onClose, editing, categorias, familias }: {
  open: boolean; onClose: () => void; editing: Cuenta | null; categorias: Categoria[]; familias: Familia[]
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    account_code: '', tipo: 'Ingreso', grupo: '', subgrupo: '', nombre: '', naturaleza: 'Operativo',
    category_id: '', family_id: '', centro_costo: 'Administración', afecta_utilidad: true, regla_de_uso: '', estado: 'Activo' as CatalogoEstado,
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        account_code: editing.account_code, tipo: editing.tipo, grupo: editing.grupo, subgrupo: editing.subgrupo ?? '',
        nombre: editing.nombre, naturaleza: editing.naturaleza,
        category_id: editing.category_id ? String(editing.category_id) : '',
        family_id: editing.family_id ? String(editing.family_id) : '',
        centro_costo: editing.centro_costo, afecta_utilidad: editing.afecta_utilidad, regla_de_uso: editing.regla_de_uso ?? '', estado: editing.estado,
      })
    } else {
      setForm({ account_code: '', tipo: 'Ingreso', grupo: '', subgrupo: '', nombre: '', naturaleza: 'Operativo', category_id: '', family_id: '', centro_costo: 'Administración', afecta_utilidad: true, regla_de_uso: '', estado: 'Activo' })
    }
  }, [open, editing])

  const create = useMutation({
    mutationFn: () => finanzasApi.createCuenta({
      account_code: form.account_code, tipo: form.tipo, grupo: form.grupo, subgrupo: form.subgrupo, nombre: form.nombre,
      naturaleza: form.naturaleza, category_id: form.category_id ? Number(form.category_id) : null,
      family_id: form.family_id ? Number(form.family_id) : null, centro_costo: form.centro_costo,
      afecta_utilidad: form.afecta_utilidad, regla_de_uso: form.regla_de_uso,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-cuentas'] }); toast.success('Cuenta creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => finanzasApi.updateCuenta(editing!.id, {
      grupo: form.grupo, subgrupo: form.subgrupo, nombre: form.nombre, naturaleza: form.naturaleza,
      category_id: form.category_id ? Number(form.category_id) : null, family_id: form.family_id ? Number(form.family_id) : null,
      centro_costo: form.centro_costo, afecta_utilidad: form.afecta_utilidad, regla_de_uso: form.regla_de_uso, estado: form.estado,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-cuentas'] }); toast.success('Cuenta actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing && !/^(ING|EGR)-[A-Za-z]{2,4}-\d{3}$/.test(form.account_code.trim())) return toast.error('Código inválido — use ING-XXX-000 o EGR-XXX-000')
    if (!form.grupo.trim() || !form.nombre.trim()) return toast.error('Grupo y nombre requeridos')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? `Editar cuenta — ${editing.account_code}` : 'Nueva cuenta'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {!editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Código <span className="text-destructive text-xs">*</span></Label>
                <Input value={form.account_code} onChange={(e) => setForm({ ...form, account_code: e.target.value.toUpperCase() })} placeholder="ING-XXX-000" className="font-mono" autoFocus />
              </div>
              <div className="space-y-1">
                <Label>Tipo <span className="text-destructive text-xs">*</span></Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Ingreso">Ingreso</SelectItem><SelectItem value="Egreso">Egreso</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Grupo <span className="text-destructive text-xs">*</span></Label><Input value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} placeholder="Ej: Personal" /></div>
            <div className="space-y-1"><Label>Subgrupo</Label><Input value={form.subgrupo} onChange={(e) => setForm({ ...form, subgrupo: e.target.value })} placeholder="Ej: Salarios" /></div>
          </div>
          <div className="space-y-1"><Label>Nombre / concepto <span className="text-destructive text-xs">*</span></Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Salario Guadalupe Sánchez" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Naturaleza</Label>
              <Select value={form.naturaleza} onValueChange={(v) => setForm({ ...form, naturaleza: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{NATURALEZAS_CUENTA.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Centro de costo</Label>
              <Select value={form.centro_costo} onValueChange={(v) => setForm({ ...form, centro_costo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CENTROS_COSTO.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoría relacionada</Label>
              <Select value={form.category_id || '_none'} onValueChange={(v) => setForm({ ...form, category_id: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Ninguna</SelectItem>
                  {categorias.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.category_code} — {c.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Familia relacionada</Label>
              <Select value={form.family_id || '_none'} onValueChange={(v) => setForm({ ...form, family_id: v === '_none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Ninguna" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Ninguna</SelectItem>
                  {familias.map((f) => <SelectItem key={f.id} value={String(f.id)}>{f.family_code} — {f.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="afecta" checked={form.afecta_utilidad} onCheckedChange={(c) => setForm({ ...form, afecta_utilidad: !!c })} />
            <Label htmlFor="afecta" className="cursor-pointer font-normal">Afecta utilidad operativa</Label>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2 pl-6">Desmarca solo para inversión de capital (ej. equipo), que no es gasto operativo corriente.</p>
          <div className="space-y-1">
            <Label>Regla de uso</Label>
            <Textarea rows={2} className="resize-none text-sm" value={form.regla_de_uso} onChange={(e) => setForm({ ...form, regla_de_uso: e.target.value })} placeholder="Instrucción para cuándo usar esta cuenta" />
          </div>
          {editing && (
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as CatalogoEstado })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent>
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

function PlanCuentasTab() {
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState<'Todos' | 'Ingreso' | 'Egreso'>('Todos')
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Cuenta | null>(null)

  const { data: cuentas = [] } = useQuery({ queryKey: ['finanzas-cuentas'], queryFn: () => finanzasApi.listCuentas() })
  const { data: categorias = [] } = useQuery({ queryKey: ['catalogo-categorias'], queryFn: () => catalogoApi.listCategorias() })
  const { data: familias = [] } = useQuery({ queryKey: ['catalogo-familias'], queryFn: catalogoApi.listFamilias })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return cuentas.filter((c) => {
      if (tipoFilter !== 'Todos' && c.tipo !== tipoFilter) return false
      if (!term) return true
      return c.account_code.toLowerCase().includes(term) || c.nombre.toLowerCase().includes(term) || c.grupo.toLowerCase().includes(term)
    })
  }, [cuentas, search, tipoFilter])

  return (
    <div className="space-y-4">
      <InfoBanner>
        Aquí se crean <strong>todas</strong> las categorías de ingresos y gastos — no solo las de servicios legales.
        Para un gasto genérico (papelería, marketing, alquiler, salarios) deja "Categoría relacionada" y "Familia relacionada" en <strong>Ninguna</strong>;
        esos dos campos son solo para cuentas que sí corresponden a un servicio del Catálogo Maestro.
        Las de naturaleza <strong>Inversión</strong> no afectan la utilidad operativa.
      </InfoBanner>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 items-center flex-1">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, nombre o grupo..." className="pl-8" />
          </div>
          <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as typeof tipoFilter)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="Ingreso">Ingreso</SelectItem><SelectItem value="Egreso">Egreso</SelectItem></SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setDlg(true) }}><Plus className="h-4 w-4" />Nueva cuenta</Button>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cuenta</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Naturaleza</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Centro de costo</th>
                <th className="text-center px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Afecta util.</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20" style={{ borderBottom: '1px solid hsl(var(--border)/0.3)' }}>
                  <td className="px-4 py-2 font-mono text-[11px]">{c.account_code}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{c.nombre}</div>
                    <div className="text-xs text-muted-foreground">{c.grupo}{c.subgrupo ? ` · ${c.subgrupo}` : ''}</div>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-xs text-muted-foreground">{c.naturaleza}</td>
                  <td className="px-3 py-2 hidden lg:table-cell text-xs text-muted-foreground">{c.centro_costo}</td>
                  <td className="px-3 py-2 text-center">{c.afecta_utilidad ? <Badge variant="success">Sí</Badge> : <Badge variant="secondary">No</Badge>}</td>
                  <td className="px-3 py-2"><EstadoBadge estado={c.estado} /></td>
                  <td className="px-3 py-2"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(c); setDlg(true) }}><Pencil className="h-3.5 w-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <CuentaDialog open={dlg} onClose={() => setDlg(false)} editing={editing} categorias={categorias} familias={familias} />
    </div>
  )
}

// ─── Personal ───────────────────────────────────────────────────────────────────

function PersonaDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Persona | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ persona: '', cargo: '', monto_mensual: '', mes_inicio: currentMonth(), mes_fin: '', estado: 'Activo' as CatalogoEstado })

  useEffect(() => {
    if (!open) return
    if (editing) setForm({ persona: editing.persona, cargo: editing.cargo ?? '', monto_mensual: String(editing.monto_mensual), mes_inicio: editing.mes_inicio, mes_fin: editing.mes_fin ?? '', estado: editing.estado })
    else setForm({ persona: '', cargo: '', monto_mensual: '', mes_inicio: currentMonth(), mes_fin: '', estado: 'Activo' })
  }, [open, editing])

  const create = useMutation({
    mutationFn: () => finanzasApi.createPersona({ persona: form.persona, cargo: form.cargo, monto_mensual: form.monto_mensual ? Number(form.monto_mensual) : null, mes_inicio: form.mes_inicio, mes_fin: form.mes_fin || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-personal'] }); toast.success('Registrado'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => finanzasApi.updatePersona(editing!.id, { persona: form.persona, cargo: form.cargo, monto_mensual: form.monto_mensual ? Number(form.monto_mensual) : null, mes_inicio: form.mes_inicio, mes_fin: form.mes_fin || null, estado: form.estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-personal'] }); toast.success('Actualizado'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.persona.trim()) return toast.error('Nombre requerido')
    if (!form.mes_inicio) return toast.error('Mes de inicio requerido')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? `Editar — ${editing.person_code}` : 'Nuevo registro de personal'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1"><Label>Persona <span className="text-destructive text-xs">*</span></Label><Input value={form.persona} onChange={(e) => setForm({ ...form, persona: e.target.value })} autoFocus /></div>
          <div className="space-y-1"><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ej: Abogada asociada" /></div>
          <div className="space-y-1"><Label>Monto mensual ($)</Label><Input type="number" step="0.01" min="0" value={form.monto_mensual} onChange={(e) => setForm({ ...form, monto_mensual: e.target.value })} placeholder="0.00" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Mes inicio <span className="text-destructive text-xs">*</span></Label><Input type="month" value={form.mes_inicio} onChange={(e) => setForm({ ...form, mes_inicio: e.target.value })} /></div>
            <div className="space-y-1"><Label>Mes fin</Label><Input type="month" value={form.mes_fin} onChange={(e) => setForm({ ...form, mes_fin: e.target.value })} /></div>
          </div>
          {editing && (
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as CatalogoEstado })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent>
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

function PersonalTab() {
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const { data: personal = [] } = useQuery({ queryKey: ['finanzas-personal'], queryFn: () => finanzasApi.listPersonal() })

  return (
    <div className="space-y-4">
      <InfoBanner>Catálogo de costo de nómina — alimenta gastos fijos. No asigna quién atiende un expediente.</InfoBanner>
      <div className="flex justify-end"><Button size="sm" onClick={() => { setEditing(null); setDlg(true) }}><Plus className="h-4 w-4" />Nuevo registro</Button></div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Código</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Persona</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cargo</th>
              <th className="text-right px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Monto mensual</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Vigencia</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
              <th className="w-12" />
            </tr></thead>
            <tbody>
              {personal.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20" style={{ borderBottom: '1px solid hsl(var(--border)/0.3)' }}>
                  <td className="px-4 py-2 font-mono text-[11px]">{p.person_code}</td>
                  <td className="px-3 py-2 font-medium">{p.persona}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.cargo}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(p.monto_mensual)}</td>
                  <td className="px-3 py-2"><Vigencia inicio={p.mes_inicio} fin={p.mes_fin} /></td>
                  <td className="px-3 py-2"><EstadoBadge estado={p.estado} /></td>
                  <td className="px-3 py-2"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(p); setDlg(true) }}><Pencil className="h-3.5 w-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <PersonaDialog open={dlg} onClose={() => setDlg(false)} editing={editing} />
    </div>
  )
}

// ─── Gastos fijos ───────────────────────────────────────────────────────────────

function GastoFijoDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: GastoFijo | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ concepto: '', tipo: 'Fijo', monto_mensual: '', mes_inicio: currentMonth(), mes_fin: '', estado: 'Activo' as CatalogoEstado })

  useEffect(() => {
    if (!open) return
    if (editing) setForm({ concepto: editing.concepto, tipo: editing.tipo, monto_mensual: String(editing.monto_mensual), mes_inicio: editing.mes_inicio, mes_fin: editing.mes_fin ?? '', estado: editing.estado })
    else setForm({ concepto: '', tipo: 'Fijo', monto_mensual: '', mes_inicio: currentMonth(), mes_fin: '', estado: 'Activo' })
  }, [open, editing])

  const create = useMutation({
    mutationFn: () => finanzasApi.createGastoFijo({ concepto: form.concepto, tipo: form.tipo, monto_mensual: form.monto_mensual ? Number(form.monto_mensual) : null, mes_inicio: form.mes_inicio, mes_fin: form.mes_fin || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-gastos-fijos'] }); toast.success('Gasto fijo creado'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => finanzasApi.updateGastoFijo(editing!.id, { concepto: form.concepto, tipo: form.tipo, monto_mensual: form.monto_mensual ? Number(form.monto_mensual) : null, mes_inicio: form.mes_inicio, mes_fin: form.mes_fin || null, estado: form.estado }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-gastos-fijos'] }); toast.success('Actualizado'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.concepto.trim()) return toast.error('Concepto requerido')
    if (!form.mes_inicio) return toast.error('Mes de inicio requerido')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? `Editar — ${editing.expense_code}` : 'Nuevo gasto fijo'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1"><Label>Concepto <span className="text-destructive text-xs">*</span></Label><Input value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GASTOS_FIJOS_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Monto mensual ($)</Label><Input type="number" step="0.01" min="0" value={form.monto_mensual} onChange={(e) => setForm({ ...form, monto_mensual: e.target.value })} placeholder="0.00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Mes inicio <span className="text-destructive text-xs">*</span></Label><Input type="month" value={form.mes_inicio} onChange={(e) => setForm({ ...form, mes_inicio: e.target.value })} /></div>
            <div className="space-y-1"><Label>Mes fin</Label><Input type="month" value={form.mes_fin} onChange={(e) => setForm({ ...form, mes_fin: e.target.value })} /></div>
          </div>
          {editing && (
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as CatalogoEstado })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Activo">Activo</SelectItem><SelectItem value="Inactivo">Inactivo</SelectItem></SelectContent>
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

function GastosFijosTab() {
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<GastoFijo | null>(null)
  const { data: gastos = [] } = useQuery({ queryKey: ['finanzas-gastos-fijos'], queryFn: () => finanzasApi.listGastosFijos() })

  return (
    <div className="space-y-4">
      <InfoBanner>Catálogo de costos fijos con vigencia — no una sola cifra manual. Alimenta el cálculo del punto de equilibrio.</InfoBanner>
      <div className="flex justify-end"><Button size="sm" onClick={() => { setEditing(null); setDlg(true) }}><Plus className="h-4 w-4" />Nuevo gasto fijo</Button></div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead><tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <th className="text-left px-4 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Código</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Concepto</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="text-right px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Monto mensual</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Vigencia</th>
              <th className="text-left px-3 py-2.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Estado</th>
              <th className="w-12" />
            </tr></thead>
            <tbody>
              {gastos.map((g) => (
                <tr key={g.id} className="hover:bg-muted/20" style={{ borderBottom: '1px solid hsl(var(--border)/0.3)' }}>
                  <td className="px-4 py-2 font-mono text-[11px]">{g.expense_code}</td>
                  <td className="px-3 py-2 font-medium">{g.concepto}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.tipo}</td>
                  <td className="px-3 py-2 text-right font-mono">{money(g.monto_mensual)}</td>
                  <td className="px-3 py-2"><Vigencia inicio={g.mes_inicio} fin={g.mes_fin} /></td>
                  <td className="px-3 py-2"><EstadoBadge estado={g.estado} /></td>
                  <td className="px-3 py-2"><Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(g); setDlg(true) }}><Pencil className="h-3.5 w-3.5" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <GastoFijoDialog open={dlg} onClose={() => setDlg(false)} editing={editing} />
    </div>
  )
}

// ─── Punto de equilibrio ─────────────────────────────────────────────────────────

function SupuestosDialog({ open, onClose, existing }: { open: boolean; onClose: () => void; existing: import('@/types').Supuestos | null }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ periodo: '2026', costo_variable_pct: '10', margen_operativo_meta_pct: '20', margen_seguridad_pct: '15' })

  useEffect(() => {
    if (!open) return
    if (existing) setForm({ periodo: existing.periodo, costo_variable_pct: String(existing.costo_variable_pct * 100), margen_operativo_meta_pct: String(existing.margen_operativo_meta_pct * 100), margen_seguridad_pct: String(existing.margen_seguridad_pct * 100) })
    else setForm({ periodo: '2026', costo_variable_pct: '10', margen_operativo_meta_pct: '20', margen_seguridad_pct: '15' })
  }, [open, existing])

  const save = useMutation({
    mutationFn: () => {
      const payload = { costo_variable_pct: Number(form.costo_variable_pct) / 100, margen_operativo_meta_pct: Number(form.margen_operativo_meta_pct) / 100, margen_seguridad_pct: Number(form.margen_seguridad_pct) / 100 }
      return existing ? finanzasApi.updateSupuestos(existing.id, payload) : finanzasApi.createSupuestos({ periodo: form.periodo, ...payload })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-supuestos'] }); qc.invalidateQueries({ queryKey: ['finanzas-punto-equilibrio'] }); toast.success('Supuestos guardados'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{existing ? 'Editar supuestos financieros' : 'Nuevos supuestos financieros'}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate() }} className="space-y-3">
          {!existing && <div className="space-y-1"><Label>Periodo <span className="text-destructive text-xs">*</span></Label><Input value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} placeholder="Ej: 2026" /></div>}
          <div className="space-y-1"><Label>Costo variable (%)</Label><Input type="number" step="0.1" min="0" max="99" value={form.costo_variable_pct} onChange={(e) => setForm({ ...form, costo_variable_pct: e.target.value })} /></div>
          <div className="space-y-1"><Label>Margen operativo meta (%)</Label><Input type="number" step="0.1" min="0" max="99" value={form.margen_operativo_meta_pct} onChange={(e) => setForm({ ...form, margen_operativo_meta_pct: e.target.value })} /></div>
          <div className="space-y-1"><Label>Margen de seguridad (%)</Label><Input type="number" step="0.1" min="0" value={form.margen_seguridad_pct} onChange={(e) => setForm({ ...form, margen_seguridad_pct: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ForecastDialog({ open, onClose, editing, familias, mes }: {
  open: boolean; onClose: () => void; editing: Forecast | null; familias: Familia[]; mes: string
}) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ family_id: '', mes, volumen_meta: '', ticket_objetivo: '', margen_directo_objetivo_pct: '' })

  useEffect(() => {
    if (editing) {
      setForm({
        family_id: String(editing.family_id), mes: editing.mes,
        volumen_meta: String(editing.volumen_meta), ticket_objetivo: String(editing.ticket_objetivo),
        margen_directo_objetivo_pct: String(Math.round(editing.margen_directo_objetivo_pct * 1000) / 10),
      })
    } else {
      setForm({ family_id: '', mes, volumen_meta: '', ticket_objetivo: '', margen_directo_objetivo_pct: '' })
    }
  }, [editing, open, mes])

  const create = useMutation({
    mutationFn: () => finanzasApi.createForecast({
      family_id: Number(form.family_id), mes: form.mes,
      volumen_meta: form.volumen_meta ? Number(form.volumen_meta) : null,
      ticket_objetivo: form.ticket_objetivo ? Number(form.ticket_objetivo) : null,
      margen_directo_objetivo_pct: Number(form.margen_directo_objetivo_pct) / 100,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-forecast'] }); toast.success('Meta creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => finanzasApi.updateForecast(editing!.id, {
      volumen_meta: form.volumen_meta ? Number(form.volumen_meta) : null,
      ticket_objetivo: form.ticket_objetivo ? Number(form.ticket_objetivo) : null,
      margen_directo_objetivo_pct: Number(form.margen_directo_objetivo_pct) / 100,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-forecast'] }); toast.success('Meta actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.family_id) return toast.error('Selecciona una familia')
    if (!form.mes) return toast.error('Selecciona un mes')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? `Editar meta — ${editing.family_code} ${editing.mes}` : 'Nueva meta de presupuesto'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Familia <span className="text-destructive text-xs">*</span></Label>
              <Select value={form.family_id} onValueChange={(v) => setForm({ ...form, family_id: v })} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder="Seleccionar familia..." /></SelectTrigger>
                <SelectContent>{familias.map((f) => <SelectItem key={f.id} value={String(f.id)}>{f.family_code} — {f.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Mes <span className="text-destructive text-xs">*</span></Label><Input type="month" value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })} disabled={!!editing} /></div>
            <div className="space-y-1"><Label>Volumen meta (casos)</Label><Input type="number" min="0" value={form.volumen_meta} onChange={(e) => setForm({ ...form, volumen_meta: e.target.value })} /></div>
            <div className="space-y-1"><Label>Ticket objetivo ($)</Label><Input type="number" step="0.01" min="0" value={form.ticket_objetivo} onChange={(e) => setForm({ ...form, ticket_objetivo: e.target.value })} /></div>
            <div className="space-y-1"><Label>Margen directo objetivo (%)</Label><Input type="number" step="0.1" min="0" max="99" value={form.margen_directo_objetivo_pct} onChange={(e) => setForm({ ...form, margen_directo_objetivo_pct: e.target.value })} /></div>
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

function PresupuestoTab() {
  const [mes, setMes] = useState(currentMonth())
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Forecast | null>(null)
  const qc = useQueryClient()

  const { data: familias = [] } = useQuery({ queryKey: ['catalogo-familias'], queryFn: catalogoApi.listFamilias })
  const { data: forecast = [] } = useQuery({ queryKey: ['finanzas-forecast', mes], queryFn: () => finanzasApi.listForecast({ mes }) })
  const { data: proyeccion } = useQuery({ queryKey: ['finanzas-proyeccion', mes], queryFn: () => finanzasApi.proyeccionCierreMes(mes) })
  const { data: cartera } = useQuery({ queryKey: ['finanzas-cartera', mes], queryFn: () => finanzasApi.carteraPonderada(mes) })

  const remove = useMutation({
    mutationFn: (id: number) => finanzasApi.deleteForecast(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finanzas-forecast'] }); toast.success('Meta eliminada') },
  })

  function openNew() { setEditing(null); setDlg(true) }
  function openEdit(f: Forecast) { setEditing(f); setDlg(true) }

  const cumplimiento = proyeccion?.cumplimiento_proyectado_pct ?? null

  return (
    <div className="space-y-4">
      <InfoBanner>Proyección de cierre de mes = ingresos ya cobrados en el mes + cartera pendiente ponderada por probabilidad de cobro según el estado de cada expediente. La meta sale de las metas de presupuesto por familia definidas abajo.</InfoBanner>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Mes</Label>
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" />
      </div>

      {proyeccion && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cobrado en el mes</div><div className="text-xl font-semibold font-mono mt-1 text-green-600">{money(proyeccion.cobrado_mes)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cartera ponderada</div><div className="text-xl font-semibold font-mono mt-1" style={{ color: 'hsl(43 80% 50%)' }}>{money(proyeccion.cartera_ponderada_mes)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Proyección de cierre</div><div className="text-xl font-semibold font-mono mt-1">{money(proyeccion.proyeccion_cierre)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Meta de presupuesto</div><div className="text-xl font-semibold font-mono mt-1">{money(proyeccion.meta_ingresos)}</div></CardContent></Card>
        </div>
      )}

      {cumplimiento != null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Cumplimiento proyectado vs. meta</span>
              <span className="text-sm font-semibold font-mono">{pct(cumplimiento)}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(cumplimiento * 100, 100)}%`,
                  background: cumplimiento >= 0.85 ? 'hsl(142 70% 45%)' : cumplimiento >= 0.6 ? 'hsl(43 90% 50%)' : 'hsl(0 70% 55%)',
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Metas por familia — {mes}</h3>
        <Button size="sm" onClick={openNew}><Plus className="h-3.5 w-3.5" />Nueva meta</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Familia</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Volumen meta</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Ticket objetivo</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Ingreso proyectado</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Margen directo</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((f) => (
                <tr key={f.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2.5"><span className="font-mono text-xs text-muted-foreground mr-1.5">{f.family_code}</span>{f.family_nombre}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{f.volumen_meta}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{money(f.ticket_objetivo)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold">{money(f.ingreso_proyectado)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{pct(f.margen_directo_objetivo_pct)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => { if (confirm('¿Eliminar esta meta?')) remove.mutate(f.id) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!forecast.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Sin metas definidas para este mes</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {cartera && cartera.casos.length > 0 && (
        <>
          <h3 className="text-sm font-semibold">Cartera pendiente ponderada — mes de cobro esperado {mes}</h3>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Expediente</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Estado de cobro</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Saldo pendiente</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Probabilidad</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Saldo ponderado</th>
                  </tr>
                </thead>
                <tbody>
                  {cartera.casos.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2.5">{c.title}</td>
                      <td className="px-4 py-2.5"><Badge variant="secondary" className="text-[10px]">{c.estado_cobro}</Badge></td>
                      <td className="px-4 py-2.5 text-right font-mono">{money(c.saldo_pendiente)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{pct(c.probabilidad_cobro)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">{money(c.saldo_ponderado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <ForecastDialog open={dlg} onClose={() => setDlg(false)} editing={editing} familias={familias} mes={mes} />
    </div>
  )
}

function PuntoEquilibrioTab() {
  const [mes, setMes] = useState(currentMonth())
  const [dlg, setDlg] = useState(false)
  const { data: supuestosList = [] } = useQuery({ queryKey: ['finanzas-supuestos'], queryFn: finanzasApi.listSupuestos })
  const supuestos = supuestosList[0] ?? null
  const { data: calc, isError } = useQuery({
    queryKey: ['finanzas-punto-equilibrio', mes],
    queryFn: () => finanzasApi.puntoEquilibrio(mes),
    enabled: !!supuestos,
    retry: false,
  })

  return (
    <div className="space-y-4">
      <InfoBanner>Punto de equilibrio = gastos fijos del mes ÷ (1 − % costo variable). Se recalcula solo si cambian los supuestos o los gastos fijos.</InfoBanner>

      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap gap-6">
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Costo variable</div><div className="font-mono font-semibold">{supuestos ? pct(supuestos.costo_variable_pct) : '—'}</div></div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Margen operativo meta</div><div className="font-mono font-semibold">{supuestos ? pct(supuestos.margen_operativo_meta_pct) : '—'}</div></div>
            <div><div className="text-xs text-muted-foreground uppercase tracking-wider">Margen de seguridad</div><div className="font-mono font-semibold">{supuestos ? pct(supuestos.margen_seguridad_pct) : '—'}</div></div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDlg(true)}><Pencil className="h-3.5 w-3.5" />{supuestos ? 'Editar supuestos' : 'Definir supuestos'}</Button>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Mes a calcular</Label>
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" />
      </div>

      {!supuestos ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Define los supuestos financieros para calcular el punto de equilibrio.</div>
      ) : isError ? (
        <div className="text-sm text-destructive py-4">No se pudo calcular el punto de equilibrio para este mes.</div>
      ) : calc ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Gastos fijos del mes</div><div className="text-xl font-semibold font-mono mt-1">{money(calc.gastos_fijos)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Punto de equilibrio</div><div className="text-xl font-semibold font-mono mt-1">{money(calc.punto_equilibrio)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Meta con margen de seguridad</div><div className="text-xl font-semibold font-mono mt-1">{money(calc.meta_segura)}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Ventas para margen meta</div><div className="text-xl font-semibold font-mono mt-1">{calc.ventas_margen_meta != null ? money(calc.ventas_margen_meta) : '—'}</div></CardContent></Card>
        </div>
      ) : null}

      <SupuestosDialog open={dlg} onClose={() => setDlg(false)} existing={supuestos} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Finanzas() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <p className="text-muted-foreground text-sm">Plan de cuentas, personal, gastos fijos, punto de equilibrio y presupuesto</p>
      </div>
      <Tabs defaultValue="cuentas">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="cuentas" className="gap-1.5"><Wallet className="h-3.5 w-3.5" />Plan de Cuentas (Categorías)</TabsTrigger>
          <TabsTrigger value="personal" className="gap-1.5"><Users className="h-3.5 w-3.5" />Personal</TabsTrigger>
          <TabsTrigger value="gastos" className="gap-1.5"><Receipt className="h-3.5 w-3.5" />Gastos Fijos</TabsTrigger>
          <TabsTrigger value="equilibrio" className="gap-1.5"><Gauge className="h-3.5 w-3.5" />Punto de Equilibrio</TabsTrigger>
          <TabsTrigger value="presupuesto" className="gap-1.5"><Target className="h-3.5 w-3.5" />Presupuesto</TabsTrigger>
        </TabsList>
        <TabsContent value="cuentas" className="mt-4"><PlanCuentasTab /></TabsContent>
        <TabsContent value="personal" className="mt-4"><PersonalTab /></TabsContent>
        <TabsContent value="gastos" className="mt-4"><GastosFijosTab /></TabsContent>
        <TabsContent value="equilibrio" className="mt-4"><PuntoEquilibrioTab /></TabsContent>
        <TabsContent value="presupuesto" className="mt-4"><PresupuestoTab /></TabsContent>
      </Tabs>
    </div>
  )
}
