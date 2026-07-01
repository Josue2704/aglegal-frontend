import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, Pencil, History, CalendarDays, Briefcase } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { clientsApi } from '@/api/clients'
import type { Client, ClientIn } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'

const EMPTY: ClientIn = { name: '', phone: '', email: '', address: '', notes: '' }

export default function Clients() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dlg, setDlg] = useState<'form' | 'history' | null>(null)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientIn>(EMPTY)
  const [historyId, setHistoryId] = useState<number | null>(null)

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientsApi.list(search || undefined),
  })

  const { data: history = [] } = useQuery({
    queryKey: ['client-history', historyId],
    queryFn: () => clientsApi.history(historyId!),
    enabled: !!historyId,
  })

  const create = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente creado'); setDlg(null) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error al crear cliente'),
  })

  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClientIn }) => clientsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente actualizado'); setDlg(null) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error al actualizar'),
  })

  const remove = useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Cliente eliminado') },
    onError: () => toast.error('No se pudo eliminar el cliente'),
  })

  function openNew() { setEditing(null); setForm(EMPTY); setDlg('form') }
  function openEdit(c: Client) { setEditing(c); setForm({ name: c.name, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', notes: c.notes ?? '' }); setDlg('form') }
  function openHistory(c: Client) { setHistoryId(c.id); setDlg('history') }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('El nombre es requerido')
    editing ? update.mutate({ id: editing.id, data: form }) : create.mutate(form)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground text-sm">{clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" />Nuevo cliente</Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, teléfono..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-muted-foreground text-sm">Cargando...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--c-table-border-h))' }}>
                    {['Cliente', 'Teléfono', 'Email', 'Actividad', 'Registro', 'Acciones'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="tr-hover transition-all" style={{ borderBottom: '1px solid hsl(var(--c-table-border-r))' }}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{c.name}</p>
                        {c.address && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[160px]">{c.address}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Link
                            to={`/sessions?client_id=${c.id}&client_name=${encodeURIComponent(c.name)}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all"
                            style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)' }}
                            title="Ver sesiones"
                          >
                            <CalendarDays className="h-2.5 w-2.5" />{c.session_count}
                          </Link>
                          <Link
                            to={`/cases?client_id=${c.id}&client_name=${encodeURIComponent(c.name)}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all"
                            style={{ color: 'hsl(var(--accent))', background: 'hsl(var(--accent) / 0.1)', border: '1px solid hsl(var(--accent) / 0.2)' }}
                            title="Ver casos"
                          >
                            <Briefcase className="h-2.5 w-2.5" />{c.case_count}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at.slice(0, 10))}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openHistory(c)}><History className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('¿Eliminar cliente?')) remove.mutate(c.id) }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!clients.length && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No hay clientes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Dialog */}
      <Dialog open={dlg === 'form'} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1"><Label>Notas</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDlg(null)}>Cancelar</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={dlg === 'history'} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Historial del cliente</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {history.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge variant={item.type === 'Ingreso' ? 'success' : item.type === 'Caso' ? 'info' : 'secondary'}>
                  {item.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.detail}</p>
                  <p className="text-xs text-muted-foreground">{item.date ? formatDate(item.date) : '—'}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.status}</span>
              </div>
            ))}
            {!history.length && <p className="text-muted-foreground text-sm text-center py-4">Sin historial</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
