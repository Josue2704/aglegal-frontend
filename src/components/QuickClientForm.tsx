// Alta rápida de cliente dentro de otro formulario (expediente, cita) — evita tener que
// salir a la pantalla Clientes, guardar, y volver a empezar el expediente desde cero.
// Solo lo esencial; el resto de la ficha se completa luego desde Clientes.
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, User } from 'lucide-react'
import { toast } from 'sonner'
import type { Client, ClientType } from '@/types'
import { clientsApi } from '@/api/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function QuickClientForm({ onCreated, onCancel }: { onCreated: (c: Client) => void; onCancel: () => void }) {
  const qc = useQueryClient()
  const [tipo, setTipo] = useState<ClientType>('Física')
  const [name, setName] = useState('')
  const [doc, setDoc] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const create = useMutation({
    mutationFn: () => clientsApi.create({ name: name.trim(), client_type: tipo, id_number: doc, phone, email }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['client-choices'] })
      toast.success(`Cliente "${c.name}" registrado`)
      onCreated(c)
    },
    onError: (e: { response?: { data?: { detail?: string } } }) => toast.error(e.response?.data?.detail ?? 'No se pudo registrar el cliente'),
  })

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(var(--muted))' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold">Nuevo cliente</p>
        <div className="flex gap-1">
          {(['Física', 'Jurídica'] as ClientType[]).map((t) => (
            <button key={t} type="button" onClick={() => setTipo(t)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${tipo === t ? 'bg-primary text-primary-foreground border-transparent' : 'text-muted-foreground'}`}>
              {t === 'Jurídica' ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}{t}
            </button>
          ))}
        </div>
      </div>
      <Input className="h-8 text-sm" autoFocus placeholder={tipo === 'Jurídica' ? 'Razón social *' : 'Nombre completo *'}
        value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-3 gap-2">
        <Input className="h-8 text-sm font-mono" placeholder={tipo === 'Jurídica' ? 'NIT' : 'DUI / pasaporte'} value={doc} onChange={(e) => setDoc(e.target.value)} />
        <Input className="h-8 text-sm" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input className="h-8 text-sm" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>Cancelar</Button>
        <Button type="button" size="sm" className="h-7 text-xs" disabled={!name.trim() || create.isPending}
          onClick={() => create.mutate()}>
          {create.isPending ? 'Guardando...' : 'Registrar y usar'}
        </Button>
      </div>
    </div>
  )
}
