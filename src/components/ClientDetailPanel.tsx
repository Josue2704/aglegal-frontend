import { useAuthStore } from '@/store/auth'
// Ficha del cliente en un solo lugar: sus expedientes, citas, documentos y cuenta, con las
// acciones que siguen (abrir expediente, agendar, cobrar). Antes había que recorrer cuatro
// pantallas distintas para armar la misma foto.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, CalendarDays, FileText, FolderPlus, Mail, MapPin, Paperclip, Pencil, Phone, Receipt, X,
} from 'lucide-react'
import type { Case, Client, Session, Attachment } from '@/types'
import { casesApi } from '@/api/cases'
import { sessionsApi } from '@/api/sessions'
import { clientsApi } from '@/api/clients'
import { attachmentsApi } from '@/api/attachments'
import { Button } from '@/components/ui/button'
import { EntityAvatar } from '@/components/EntityAvatar'
import { AttachmentsDialog } from '@/components/AttachmentsDialog'
import { SessionDialog } from '@/components/SessionDialog'
import { formatCurrency, formatDate } from '@/lib/utils'

type Tab = 'expedientes' | 'citas' | 'documentos' | 'cuenta'

const money = (cents: number) => formatCurrency((cents ?? 0) / 100)

export default function ClientDetailPanel({ client, onClose, onEdit }: {
  client: Client
  onClose: () => void
  onEdit?: (c: Client) => void
}) {
  const user=useAuthStore(s=>s.user)
  const can=(module:string)=>!!user&&(user.is_admin||user.permissions.includes(module+'.ver'))
  const allowed:Record<Tab,boolean>={expedientes:can('expedientes'),citas:can('agenda'),documentos:can('clientes'),cuenta:['clientes','expedientes','agenda','facturas','flujo_caja'].every(can)}
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>(allowed.expedientes ? 'expedientes' : allowed.citas ? 'citas' : 'documentos')
  const [agendar, setAgendar] = useState(false)
  const [docs, setDocs] = useState(false)

  const { data: casos = [] } = useQuery<Case[]>({
    queryKey: ['cases', { client_id: client.id }],
    queryFn: () => casesApi.list({ client_id: client.id }), enabled: allowed.expedientes,
  })
  const { data: citas = [] } = useQuery<Session[]>({
    queryKey: ['sessions', { client_id: client.id }],
    queryFn: () => sessionsApi.list({ client_id: client.id }),
    enabled: allowed.citas && tab === 'citas',
  })
  const { data: adjuntos = [] } = useQuery<Attachment[]>({
    queryKey: ['attachments', 'client', client.id],
    queryFn: () => attachmentsApi.list('client', client.id),
    enabled: allowed.documentos && tab === 'documentos',
  })
  const { data: cuenta } = useQuery({
    queryKey: ['client-statement', client.id],
    queryFn: () => clientsApi.statement(client.id),
    enabled: allowed.cuenta && tab === 'cuenta',
  })

  const abiertos = casos.filter((c) => c.status !== 'Cerrado')
  const saldoTotal = casos.reduce((s, c) => s + c.saldo_pendiente, 0)

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'expedientes', label: 'Expedientes', count: casos.length },
    { id: 'citas', label: 'Citas' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'cuenta', label: 'Cuenta' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'hsl(var(--c-overlay))', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div
        className="ml-auto h-full flex flex-col overflow-hidden"
        style={{
          width: 'min(640px, 90vw)',
          background: 'hsl(var(--c-panel-bg))',
          borderLeft: '1px solid hsl(var(--c-table-border-h))',
          boxShadow: '-20px 0 60px hsl(var(--c-panel-shadow))',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="px-6 pt-6 pb-4 shrink-0 space-y-3" style={{ borderBottom: '1px solid hsl(var(--c-header-border))' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <EntityAvatar entityType="client" entityId={client.id} name={client.name} size={44} />
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground leading-tight truncate">{client.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {client.client_type}{client.id_number ? ` · ${client.id_number}` : ''}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>}
            {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
            {client.address && <span className="flex items-center gap-1 truncate max-w-[260px]"><MapPin className="h-3 w-3 shrink-0" />{client.address}</span>}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: 'Expedientes abiertos', value: String(abiertos.length), cls: 'text-foreground' },
              { label: 'Saldo pendiente', value: formatCurrency(saldoTotal), cls: saldoTotal > 0 ? 'text-amber-500' : 'text-muted-foreground' },
              { label: 'Cliente desde', value: formatDate(client.created_at.slice(0, 10)), cls: 'text-muted-foreground' },
            ].map((x) => (
              <div key={x.label} className="rounded-lg px-3 py-2" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{x.label}</p>
                <p className={`font-mono font-semibold ${x.cls}`}>{x.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/cases?new=1&client_id=${client.id}`)}>
              <FolderPlus className="h-3 w-3" />Nuevo expediente
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAgendar(true)}>
              <CalendarDays className="h-3 w-3" />Agendar cita
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setDocs(true)}>
              <Paperclip className="h-3 w-3" />Subir documento
            </Button>
            {onEdit && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEdit(client)}>
                <Pencil className="h-3 w-3" />Editar
              </Button>
            )}
          </div>

          <div className="flex gap-0" style={{ borderBottom: '1px solid hsl(var(--c-inner-border))' }}>
            {tabs.filter(t=>allowed[t.id]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px"
                style={tab === t.id
                  ? { color: 'hsl(var(--primary))', borderBottomColor: 'hsl(var(--primary))' }
                  : { color: 'hsl(var(--c-tab-inactive))', borderBottomColor: 'transparent' }}
              >
                {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {allowed.expedientes && tab === 'expedientes' && (
            casos.length === 0
              ? <Vacio icon={Briefcase} texto="Este cliente aún no tiene expedientes" />
              : casos.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/cases?case_id=${c.id}`)}
                  className="w-full text-left rounded-lg px-3 py-2.5 hover:border-primary/40 transition-colors"
                  style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{c.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{c.status}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                    {c.internal_ref && <span className="font-mono">{c.internal_ref}</span>}
                    {c.service_nombre && <span className="truncate">{c.service_nombre}</span>}
                    {c.saldo_pendiente > 0 && <span className="ml-auto text-amber-500 font-mono">Saldo {formatCurrency(c.saldo_pendiente)}</span>}
                  </div>
                </button>
              ))
          )}

          {allowed.citas && tab === 'citas' && (
            citas.length === 0
              ? <Vacio icon={CalendarDays} texto="Sin citas registradas" />
              : citas.map((s) => (
                <div key={s.id} className="rounded-lg px-3 py-2.5" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{s.consult_type}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{s.status}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDate(s.session_date)}{s.start_time ? ` · ${s.start_time}${s.end_time ? `–${s.end_time}` : ''}` : ''}
                    {s.case_title && <span> · {s.case_title}</span>}
                  </p>
                </div>
              ))
          )}

          {allowed.documentos && tab === 'documentos' && (
            adjuntos.length === 0
              ? <Vacio icon={Paperclip} texto="Sin documentos del cliente" />
              : adjuntos.map((a) => (
                <button
                  key={a.id}
                  onClick={() => attachmentsApi.download(a.id, a.original_name)}
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:border-primary/40 transition-colors"
                  style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{a.original_name}</span>
                  <span className="text-[10px] text-muted-foreground">{formatDate(a.created_at.slice(0, 10))}</span>
                </button>
              ))
          )}

          {allowed.cuenta && tab === 'cuenta' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Facturado', value: cuenta?.financial?.total_invoiced_cents ?? 0 },
                  { label: 'Pagado', value: cuenta?.financial?.paid_invoices_cents ?? 0 },
                  { label: 'Pendiente de cobro', value: cuenta?.financial?.pending_invoices_cents ?? 0 },
                  { label: 'Recibido', value: cuenta?.financial?.total_received_cents ?? 0 },
                ].map((x) => (
                  <div key={x.label} className="rounded-lg px-3 py-2" style={{ background: 'hsl(var(--c-surface-1))', border: '1px solid hsl(var(--c-inner-border))' }}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{x.label}</p>
                    <p className="font-mono font-semibold">{money(x.value)}</p>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1"
                onClick={() => navigate(`/cashflow?cobro=1${abiertos[0] ? `&case_id=${abiertos[0].id}` : ''}`)}>
                <Receipt className="h-3 w-3" />Registrar cobro
              </Button>
            </div>
          )}
        </div>
      </div>

      {agendar && (
        <SessionDialog open onOpenChange={(o) => !o && setAgendar(false)} editing={null} initialClientId={client.id} />
      )}
      {docs && (
        <AttachmentsDialog entityType="client" entityId={client.id} label={client.name} onClose={() => setDocs(false)} />
      )}
    </div>
  )
}

function Vacio({ icon: Icon, texto }: { icon: React.ElementType; texto: string }) {
  return (
    <div className="py-10 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
      <p className="text-muted-foreground text-sm">{texto}</p>
    </div>
  )
}
