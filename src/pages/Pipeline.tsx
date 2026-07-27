import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Megaphone, Search, ArrowRight, Trophy, XCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { pipelineApi } from '@/api/pipeline'
import { catalogoApi } from '@/api/catalogo'
import { clientsApi } from '@/api/clients'
import type { Oportunidad, OportunidadEstado } from '@/types'
import { CANALES_CAPTACION, ORIGENES_NEGOCIO } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

type ApiErr = { response?: { data?: { detail?: string } } }
const errMsg = (e: ApiErr) => e.response?.data?.detail ?? 'Ocurrió un error'

const COLUMNS: { estado: OportunidadEstado; label: string; accent: string }[] = [
  { estado: 'Prospecto', label: 'Prospecto', accent: 'hsl(210 80% 55%)' },
  { estado: 'Cotizado', label: 'Cotizado', accent: 'hsl(43 80% 55%)' },
  { estado: 'Ganado', label: 'Ganado', accent: 'hsl(142 70% 45%)' },
  { estado: 'Perdido', label: 'Perdido', accent: 'hsl(0 70% 55%)' },
]

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm"
      style={{ background: 'hsl(210 80% 55% / 0.08)', border: '1px solid hsl(210 80% 55% / 0.2)', color: 'hsl(210 80% 70%)' }}>
      <Megaphone className="h-4 w-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
}

// ─── Create/edit oportunidad dialog ─────────────────────────────────────────────

function OportunidadDialog({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Oportunidad | null }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState<'cliente' | 'prospecto'>('prospecto')
  const [form, setForm] = useState({ client_id: '', prospecto_nombre: '', prospecto_contacto: '', service_id: '', canal_captacion: 'Referido', origen_negocio: 'Andrea' })
  const [serviceSearch, setServiceSearch] = useState('')

  const { data: clientes = [] } = useQuery({ queryKey: ['clientes-choices'], queryFn: clientsApi.choices })
  const { data: servicios = [] } = useQuery({ queryKey: ['servicio-choices', serviceSearch], queryFn: () => catalogoApi.servicioChoices({ q: serviceSearch || undefined, limit: 15 }) })

  useEffect(() => {
    if (!open) return
    if (editing) {
      setMode(editing.client_id ? 'cliente' : 'prospecto')
      setForm({
        client_id: editing.client_id ? String(editing.client_id) : '', prospecto_nombre: editing.prospecto_nombre ?? '',
        prospecto_contacto: editing.prospecto_contacto ?? '', service_id: editing.service_id ? String(editing.service_id) : '',
        canal_captacion: editing.canal_captacion, origen_negocio: editing.origen_negocio,
      })
    } else {
      setMode('prospecto')
      setForm({ client_id: '', prospecto_nombre: '', prospecto_contacto: '', service_id: '', canal_captacion: 'Referido', origen_negocio: 'Andrea' })
    }
  }, [open, editing])

  const create = useMutation({
    mutationFn: () => pipelineApi.create({
      client_id: mode === 'cliente' && form.client_id ? Number(form.client_id) : null,
      prospecto_nombre: mode === 'prospecto' ? form.prospecto_nombre : '',
      prospecto_contacto: mode === 'prospecto' ? form.prospecto_contacto : '',
      service_id: form.service_id ? Number(form.service_id) : null,
      canal_captacion: form.canal_captacion, origen_negocio: form.origen_negocio,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oportunidades'] }); toast.success('Oportunidad creada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const update = useMutation({
    mutationFn: () => pipelineApi.update(editing!.id, {
      client_id: mode === 'cliente' && form.client_id ? Number(form.client_id) : null,
      prospecto_nombre: mode === 'prospecto' ? form.prospecto_nombre : '',
      prospecto_contacto: mode === 'prospecto' ? form.prospecto_contacto : '',
      service_id: form.service_id ? Number(form.service_id) : null,
      canal_captacion: form.canal_captacion, origen_negocio: form.origen_negocio,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oportunidades'] }); toast.success('Actualizada'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'cliente' && !form.client_id) return toast.error('Selecciona un cliente')
    if (mode === 'prospecto' && !form.prospecto_nombre.trim()) return toast.error('Ingresa el nombre del prospecto')
    editing ? update.mutate() : create.mutate()
  }

  const selectedService = servicios.find((s) => String(s.id) === form.service_id)

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? 'Editar oportunidad' : 'Nueva oportunidad'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-1 rounded-lg p-1" style={{ background: 'hsl(var(--muted))' }}>
            <button type="button" onClick={() => setMode('prospecto')} className="flex-1 text-sm py-1.5 rounded-md transition-colors"
              style={mode === 'prospecto' ? { background: 'hsl(var(--background))', fontWeight: 600 } : {}}>Prospecto nuevo</button>
            <button type="button" onClick={() => setMode('cliente')} className="flex-1 text-sm py-1.5 rounded-md transition-colors"
              style={mode === 'cliente' ? { background: 'hsl(var(--background))', fontWeight: 600 } : {}}>Cliente existente</button>
          </div>

          {mode === 'prospecto' ? (
            <>
              <div className="space-y-1"><Label>Nombre del prospecto <span className="text-destructive text-xs">*</span></Label><Input value={form.prospecto_nombre} onChange={(e) => setForm({ ...form, prospecto_nombre: e.target.value })} autoFocus /></div>
              <div className="space-y-1"><Label>Contacto</Label><Input value={form.prospecto_contacto} onChange={(e) => setForm({ ...form, prospecto_contacto: e.target.value })} placeholder="Teléfono o email" /></div>
              <p className="text-[11px] text-muted-foreground">Para marcar esta oportunidad como Ganada, primero deberás registrarlo como cliente.</p>
            </>
          ) : (
            <div className="space-y-1">
              <Label>Cliente <span className="text-destructive text-xs">*</span></Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
                <SelectContent>{clientes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label>Servicio de interés</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={serviceSearch} onChange={(e) => setServiceSearch(e.target.value)} placeholder="Buscar por código o nombre..." className="pl-8" />
            </div>
            {selectedService && (
              <div className="text-xs px-2 py-1 rounded bg-muted inline-flex items-center gap-1 mt-1">
                <span className="font-mono">{selectedService.service_code}</span> — {selectedService.nombre}
                <button type="button" className="text-muted-foreground hover:text-foreground ml-1" onClick={() => setForm({ ...form, service_id: '' })}>×</button>
              </div>
            )}
            {serviceSearch && !selectedService && (
              <div className="border rounded-md max-h-36 overflow-y-auto mt-1" style={{ borderColor: 'hsl(var(--border))' }}>
                {servicios.slice(0, 8).map((s) => (
                  <button type="button" key={s.id} className="w-full text-left px-2.5 py-1.5 text-xs hover:bg-muted/50 flex gap-2"
                    onClick={() => { setForm({ ...form, service_id: String(s.id) }); setServiceSearch('') }}>
                    <span className="font-mono text-muted-foreground">{s.service_code}</span><span>{s.nombre}</span>
                  </button>
                ))}
                {servicios.length === 0 && <div className="px-2.5 py-2 text-xs text-muted-foreground">Sin resultados</div>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Canal de captación</Label>
              <Select value={form.canal_captacion} onValueChange={(v) => setForm({ ...form, canal_captacion: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CANALES_CAPTACION.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Por dónde llegó — no paga comisión.</p>
            </div>
            <div className="space-y-1">
              <Label>Origen del negocio</Label>
              <Select value={form.origen_negocio} onValueChange={(v) => setForm({ ...form, origen_negocio: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ORIGENES_NEGOCIO.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Quién lo generó — base de comisión.</p>
            </div>
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

// ─── Perder dialog ──────────────────────────────────────────────────────────────

function PerderDialog({ open, onClose, oportunidad }: { open: boolean; onClose: () => void; oportunidad: Oportunidad | null }) {
  const qc = useQueryClient()
  const [motivo, setMotivo] = useState('')
  useEffect(() => { if (open) setMotivo('') }, [open])

  const mutate = useMutation({
    mutationFn: () => pipelineApi.transicion(oportunidad!.id, 'Perdido', motivo),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oportunidades'] }); qc.invalidateQueries({ queryKey: ['oportunidades-conversion'] }); toast.success('Marcada como perdida'); onClose() },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Marcar como perdida</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (!motivo.trim()) return toast.error('El motivo es obligatorio'); mutate.mutate() }} className="space-y-3">
          <div className="space-y-1">
            <Label>Motivo de pérdida <span className="text-destructive text-xs">*</span></Label>
            <Textarea rows={3} className="resize-none" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: presupuesto insuficiente, eligió otro despacho..." autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="destructive" disabled={mutate.isPending}>Marcar perdida</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card + board ────────────────────────────────────────────────────────────────

function OportunidadCard({ op, onEdit, onCotizar, onGanar, onPerder }: {
  op: Oportunidad; onEdit: () => void; onCotizar: () => void; onGanar: () => void; onPerder: () => void
}) {
  const nombre = op.client_name ?? op.prospecto_nombre ?? 'Sin nombre'
  const canGanar = !!op.client_id && !!op.service_id
  return (
    <Card className="cursor-pointer" onClick={onEdit}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-sm">{nombre}</span>
          {!op.client_id && <Badge variant="info" className="text-[10px] shrink-0">prospecto</Badge>}
        </div>
        {op.service_nombre ? (
          <div className="text-xs text-muted-foreground"><span className="font-mono">{op.service_code}</span> · {op.service_nombre}</div>
        ) : (
          <div className="text-xs text-muted-foreground/60 italic">Sin servicio definido</div>
        )}
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px]">{op.canal_captacion}</Badge>
          <Badge variant="secondary" className="text-[10px]">{op.origen_negocio}</Badge>
        </div>
        {op.estado === 'Perdido' && op.motivo_perdida && (
          <div className="text-xs text-destructive/80 border-t pt-1.5 mt-1.5" style={{ borderColor: 'hsl(var(--border))' }}>{op.motivo_perdida}</div>
        )}
        {op.estado === 'Ganado' && op.case_internal_ref && (
          <div className="text-xs flex items-center gap-1 border-t pt-1.5 mt-1.5" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(142 70% 45%)' }}>
            <FileText className="h-3 w-3" /><span className="font-mono">{op.case_internal_ref}</span>
          </div>
        )}
        {(op.estado === 'Prospecto' || op.estado === 'Cotizado') && (
          <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
            {op.estado === 'Prospecto' && (
              <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" onClick={onCotizar}><ArrowRight className="h-3 w-3" />Cotizar</Button>
            )}
            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1" disabled={!canGanar} title={!canGanar ? 'Requiere cliente registrado y servicio' : ''} onClick={onGanar}>
              <Trophy className="h-3 w-3" />Ganado
            </Button>
            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] gap-1 text-destructive" onClick={onPerder}><XCircle className="h-3 w-3" />Perdido</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Pipeline() {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<Oportunidad | null>(null)
  const [perdiendo, setPerdiendo] = useState<Oportunidad | null>(null)

  const { data: oportunidades = [] } = useQuery({ queryKey: ['oportunidades'], queryFn: () => pipelineApi.list() })
  const { data: conversion } = useQuery({ queryKey: ['oportunidades-conversion'], queryFn: pipelineApi.conversion })

  const cotizar = useMutation({
    mutationFn: (id: number) => pipelineApi.transicion(id, 'Cotizado'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['oportunidades'] }); toast.success('Marcada como cotizada') },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })
  const ganar = useMutation({
    mutationFn: (id: number) => pipelineApi.transicion(id, 'Ganado'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['oportunidades'] })
      qc.invalidateQueries({ queryKey: ['oportunidades-conversion'] })
      toast.success(res.case_internal_ref ? `¡Ganado! Expediente ${res.case_internal_ref} creado` : 'Marcada como ganada')
    },
    onError: (e: ApiErr) => toast.error(errMsg(e)),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Comercial</h1>
          <p className="text-muted-foreground text-sm">Seguimiento comercial antes del expediente — prospecto → cotizado → ganado o perdido</p>
        </div>
        <Button onClick={() => { setEditing(null); setDlg(true) }}><Plus className="h-4 w-4" />Nueva oportunidad</Button>
      </div>

      <InfoBanner>Al marcar <strong>Ganado</strong>, el sistema crea el expediente automáticamente heredando cliente, servicio y origen — sin recapturar datos.</InfoBanner>

      {conversion && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Prospectos</div><div className="text-lg font-semibold">{conversion.prospectos}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Cotizados</div><div className="text-lg font-semibold">{conversion.cotizados}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Ganados</div><div className="text-lg font-semibold" style={{ color: 'hsl(142 70% 45%)' }}>{conversion.ganados}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Perdidos</div><div className="text-lg font-semibold text-destructive">{conversion.perdidos}</div></CardContent></Card>
          <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Conversión</div><div className="text-lg font-semibold">{conversion.conversion_pct != null ? `${(conversion.conversion_pct * 100).toFixed(0)}%` : '—'}</div></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const items = oportunidades.filter((o) => o.estado === col.estado)
          return (
            <div key={col.estado} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                <span className="font-semibold text-sm">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] ml-auto">{items.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[80px]">
                {items.map((op) => (
                  <OportunidadCard
                    key={op.id}
                    op={op}
                    onEdit={() => { setEditing(op); setDlg(true) }}
                    onCotizar={() => cotizar.mutate(op.id)}
                    onGanar={() => ganar.mutate(op.id)}
                    onPerder={() => setPerdiendo(op)}
                  />
                ))}
                {items.length === 0 && <div className="text-xs text-muted-foreground/50 text-center py-6 border-2 border-dashed rounded-lg" style={{ borderColor: 'hsl(var(--border))' }}>Vacío</div>}
              </div>
            </div>
          )
        })}
      </div>

      <OportunidadDialog open={dlg} onClose={() => setDlg(false)} editing={editing} />
      <PerderDialog open={!!perdiendo} onClose={() => setPerdiendo(null)} oportunidad={perdiendo} />
    </div>
  )
}
