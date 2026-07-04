import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Shield, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { rolesApi } from '@/api/roles'
import type { Permission, Role, RoleDetail } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', clientes: 'Clientes', expedientes: 'Expedientes',
  tareas: 'Tareas', agenda: 'Agenda', flujo_caja: 'Flujo de Caja',
  facturas: 'Facturas', nominas: 'Nóminas', categorias: 'Categorías y Servicios',
  usuarios: 'Usuarios', roles: 'Roles y Permisos', configuracion: 'Configuración',
}
const ACTION_LABELS: Record<string, string> = {
  ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar',
}
const ACTION_ORDER = ['ver', 'crear', 'editar', 'eliminar']

function groupPermissions(perms: Permission[]) {
  const map: Record<string, Record<string, Permission>> = {}
  for (const p of perms) {
    if (!map[p.module]) map[p.module] = {}
    map[p.module][p.action] = p
  }
  return map
}

function PermissionMatrix({
  allPerms, selected, onChange,
}: { allPerms: Permission[]; selected: Set<number>; onChange: (ids: Set<number>) => void }) {
  const grouped = groupPermissions(allPerms)
  const modules = Object.keys(MODULE_LABELS).filter(m => grouped[m])

  function toggleCell(id: number) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange(next)
  }

  function toggleRow(module: string) {
    const ids = Object.values(grouped[module]).map(p => p.id)
    const allOn = ids.every(id => selected.has(id))
    const next = new Set(selected)
    ids.forEach(id => allOn ? next.delete(id) : next.add(id))
    onChange(next)
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-48">Módulo</th>
            {ACTION_ORDER.map(a => (
              <th key={a} className="text-center px-3 py-2.5 font-medium text-muted-foreground w-20">
                {ACTION_LABELS[a] ?? a}
              </th>
            ))}
            <th className="w-12 px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {modules.map((mod, i) => {
            const cells = grouped[mod]
            const rowIds = Object.values(cells).map(p => p.id)
            const allChecked = rowIds.length > 0 && rowIds.every(id => selected.has(id))
            const someChecked = rowIds.some(id => selected.has(id))
            return (
              <tr key={mod} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                <td className="px-4 py-2.5 font-medium">{MODULE_LABELS[mod] ?? mod}</td>
                {ACTION_ORDER.map(action => {
                  const perm = cells[action]
                  return (
                    <td key={action} className="px-3 py-2.5 text-center">
                      {perm ? (
                        <Checkbox
                          checked={selected.has(perm.id)}
                          onCheckedChange={() => toggleCell(perm.id)}
                          className="mx-auto"
                        />
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  )
                })}
                <td className="px-2 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => toggleRow(mod)}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    title={allChecked ? 'Desmarcar todo' : 'Marcar todo'}
                  >
                    {allChecked ? '✓' : someChecked ? '◑' : '○'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RoleDialog({
  open, onClose, editing, allPerms,
}: { open: boolean; onClose: () => void; editing: RoleDetail | null; allPerms: Permission[] }) {
  const qc = useQueryClient()
  const [name, setName] = useState(editing?.name ?? '')
  const [desc, setDesc] = useState(editing?.description ?? '')
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(editing?.permissions.map(p => p.id) ?? [])
  )

  const create = useMutation({
    mutationFn: () => rolesApi.create({ name, description: desc || undefined, permission_ids: [...selected] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Rol creado'); onClose() },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: () => rolesApi.update(editing!.id, { name, description: desc || undefined, permission_ids: [...selected] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Rol actualizado'); onClose() },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  const isSystem = editing?.is_system ?? false

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return toast.error('Nombre requerido')
    editing ? update.mutate() : create.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {editing ? `Editar rol — ${editing.name}` : 'Nuevo rol'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} disabled={isSystem} />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Input value={desc} onChange={e => setDesc(e.target.value)} disabled={isSystem} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Permisos</Label>
              <span className="text-xs text-muted-foreground">{selected.size} de {allPerms.length} seleccionados</span>
            </div>
            <PermissionMatrix allPerms={allPerms} selected={selected} onChange={setSelected} />
          </div>

          {isSystem && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              Rol del sistema — el nombre no se puede modificar, solo los permisos.
            </p>
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

export default function Roles() {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState(false)
  const [editing, setEditing] = useState<RoleDetail | null>(null)

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list })
  const { data: allPerms = [] } = useQuery({ queryKey: ['permissions'], queryFn: rolesApi.permissions })

  const remove = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Rol eliminado') },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  async function openEdit(role: Role) {
    const detail = await rolesApi.get(role.id)
    setEditing(detail)
    setDlg(true)
  }

  function openNew() { setEditing(null); setDlg(true) }
  function closeDlg() { setDlg(false); setEditing(null) }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles y Permisos</h1>
          <p className="text-muted-foreground text-sm">Define qué puede hacer cada tipo de usuario en el sistema</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" />Nuevo rol</Button>
      </div>

      <div className="grid gap-3">
        {roles.map(role => (
          <Card key={role.id} className="card-glow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {role.is_system
                      ? <ShieldCheck className="h-5 w-5 text-primary" />
                      : <Shield className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{role.name}</span>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-[10px]">Sistema</Badge>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold text-primary">{role.permission_count}</p>
                    <p className="text-xs text-muted-foreground">permisos</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(role)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!role.is_system && (
                    <Button
                      size="icon" variant="ghost" className="text-destructive"
                      onClick={() => { if (confirm(`¿Eliminar rol "${role.name}"?`)) remove.mutate(role.id) }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {dlg && (
        <RoleDialog
          open={dlg}
          onClose={closeDlg}
          editing={editing}
          allPerms={allPerms}
        />
      )}
    </div>
  )
}
