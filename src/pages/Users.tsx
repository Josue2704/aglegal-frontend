import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { usersApi } from '@/api/users'
import type { User, UserIn } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatDate } from '@/lib/utils'

const ROLES = ['admin', 'lawyer', 'assistant', 'viewer']
const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', lawyer: 'Abogado', assistant: 'Asistente', viewer: 'Visor' }
const ROLE_COLOR: Record<string, 'destructive' | 'info' | 'secondary' | 'outline'> = { admin: 'destructive', lawyer: 'info', assistant: 'secondary', viewer: 'outline' }

type UserForm = { username: string; full_name: string; role: string; password: string }
const EMPTY_FORM: UserForm = { username: '', full_name: '', role: 'lawyer', password: '' }

export default function Users() {
  const qc = useQueryClient()
  const [dlg, setDlg] = useState<'form' | 'password' | null>(null)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY_FORM)
  const [pwdForm, setPwdForm] = useState({ password: '', confirm: '' })

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  const create = useMutation({
    mutationFn: (d: UserIn) => usersApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario creado'); setDlg(null) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const update = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserIn> }) => usersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario actualizado'); setDlg(null) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })
  const remove = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Usuario eliminado') },
  })
  const changePassword = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) => usersApi.changePassword(id, password),
    onSuccess: () => { toast.success('Contraseña actualizada'); setDlg(null) },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'Error'),
  })

  function openNew() { setEditing(null); setForm(EMPTY_FORM); setDlg('form') }
  function openEdit(u: User) { setEditing(u); setForm({ username: u.username, full_name: u.full_name ?? '', role: u.role, password: '' }); setDlg('form') }
  function openPassword(u: User) { setEditing(u); setPwdForm({ password: '', confirm: '' }); setDlg('password') }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.username.trim()) return toast.error('Usuario requerido')
    if (!editing && !form.password) return toast.error('Contraseña requerida para nuevos usuarios')
    const payload: UserIn = { username: form.username, full_name: form.full_name, role: form.role, password: form.password || undefined }
    editing ? update.mutate({ id: editing.id, data: payload }) : create.mutate(payload)
  }

  function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwdForm.password) return toast.error('Ingrese la nueva contraseña')
    if (pwdForm.password !== pwdForm.confirm) return toast.error('Las contraseñas no coinciden')
    if (!editing) return
    changePassword.mutate({ id: editing.id, password: pwdForm.password })
  }

  const f = (k: keyof UserForm) => (v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground text-sm">{users.length} usuario{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" />Nuevo usuario</Button>
      </div>

      {isLoading ? <p className="text-muted-foreground text-sm">Cargando...</p> : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>{['Usuario', 'Nombre', 'Rol', 'Registro', 'Acciones'].map((h) => <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>)}</tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{u.username}</td>
                    <td className="px-4 py-3">{u.full_name || '—'}</td>
                    <td className="px-4 py-3"><Badge variant={ROLE_COLOR[u.role] ?? 'outline'}>{ROLE_LABEL[u.role] ?? u.role}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{u.created_at ? formatDate(u.created_at.slice(0, 10)) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openPassword(u)} title="Cambiar contraseña"><KeyRound className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm('¿Eliminar usuario?')) remove.mutate(u.id) }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!users.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Sin usuarios</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* User Form Dialog */}
      <Dialog open={dlg === 'form'} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Usuario *</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" /></div>
              <div className="space-y-1 col-span-2"><Label>Nombre completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Rol</Label><Select value={form.role} onValueChange={f('role')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent></Select></div>
              {!editing && <div className="space-y-1"><Label>Contraseña *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></div>}
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(null)}>Cancelar</Button><Button type="submit" disabled={create.isPending || update.isPending}>Guardar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={dlg === 'password'} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cambiar contraseña — {editing?.username}</DialogTitle></DialogHeader>
          <form onSubmit={handlePassword} className="space-y-3">
            <div className="space-y-1"><Label>Nueva contraseña *</Label><Input type="password" value={pwdForm.password} onChange={(e) => setPwdForm({ ...pwdForm, password: e.target.value })} autoComplete="new-password" /></div>
            <div className="space-y-1"><Label>Confirmar contraseña *</Label><Input type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDlg(null)}>Cancelar</Button><Button type="submit" disabled={changePassword.isPending}>Cambiar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
