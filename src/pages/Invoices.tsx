import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Printer, Pencil, Trash2, FileText, ChevronDown, ChevronUp,
  Check, X, Receipt, DollarSign, Clock, CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { invoicesApi } from '@/api/invoices'
import { incomesApi } from '@/api/incomes'
import type { Category, Invoice, InvoiceItemIn, InvoiceStatus, UnbilledItems } from '@/types'
import { useSettingsStore } from '@/store/settings'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Utils ─────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  Borrador:  { label: 'Borrador',  color: 'bg-muted/60 text-muted-foreground' },
  Enviada:   { label: 'Enviada',   color: 'bg-blue-500/15 text-blue-500' },
  Pagada:    { label: 'Pagada',    color: 'bg-emerald-500/15 text-emerald-500' },
  Cancelada: { label: 'Cancelada', color: 'bg-red-500/15 text-red-500' },
}
const STATUSES = ['Borrador', 'Enviada', 'Pagada', 'Cancelada']

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-muted/60 text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

// ─── Print helper ──────────────────────────────────────────────────────────────

function printInvoice(inv: Invoice, currency: string) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n)

  const rows = inv.items
    .map(
      (it) =>
        `<tr>
          <td>${it.description}</td>
          <td class="num">${it.quantity % 1 === 0 ? it.quantity : it.quantity.toFixed(2)}</td>
          <td class="num">${fmt(it.unit_price)}</td>
          <td class="num">${fmt(it.subtotal)}</td>
        </tr>`,
    )
    .join('')

  const firmLine = [inv.firm_name, inv.firm_tax_id, inv.firm_phone, inv.firm_email, inv.firm_address]
    .filter(Boolean)
    .join(' · ')

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>Factura ${inv.invoice_number}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;color:#222;padding:32px;font-size:13px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
    .firm-name{font-size:20px;font-weight:700;color:#1a1a3e;margin-bottom:4px}
    .firm-sub{color:#666;font-size:12px}
    .inv-title{text-align:right}
    .inv-number{font-size:22px;font-weight:700;color:#1a1a3e}
    .inv-status{display:inline-block;margin-top:6px;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;background:#e8f5e9;color:#2e7d32}
    .divider{border:none;border-top:2px solid #1a1a3e;margin:16px 0}
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
    .info-block .lbl{font-size:11px;text-transform:uppercase;color:#888;letter-spacing:.5px;margin-bottom:4px}
    .info-block .val{font-size:13px;font-weight:500}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#f0f0f0;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#555;border-bottom:2px solid #ddd}
    td{padding:10px 12px;border-bottom:1px solid #eee;vertical-align:top}
    .num{text-align:right}
    .total-row td{border-top:2px solid #333;border-bottom:none;font-weight:700;font-size:15px;padding-top:14px}
    .notes{margin-top:16px;padding:12px;background:#f9f9f9;border-radius:6px;font-size:12px;color:#555;border:1px solid #e5e5e5}
    .footer{margin-top:32px;text-align:center;font-size:11px;color:#aaa}
    @media print{button{display:none}body{padding:16px}}
  </style>
</head><body>
  <div class="header">
    <div>
      <div class="firm-name">${inv.firm_name || 'Despacho Jurídico'}</div>
      <div class="firm-sub">${firmLine || ''}</div>
    </div>
    <div class="inv-title">
      <div class="inv-number">Factura ${inv.invoice_number}</div>
      <div class="inv-status">${inv.status}</div>
    </div>
  </div>
  <hr class="divider"/>
  <div class="info-grid">
    <div class="info-block">
      <div class="lbl">Facturado a</div>
      <div class="val">${inv.client_name || ''}</div>
      ${inv.case_title ? `<div style="color:#666;font-size:12px;margin-top:2px">Expediente: ${inv.case_title}</div>` : ''}
    </div>
    <div class="info-block" style="text-align:right">
      <div class="lbl">Fecha de emisión</div>
      <div class="val">${formatDate(inv.invoice_date)}</div>
      ${inv.due_date ? `<div class="lbl" style="margin-top:10px">Fecha de vencimiento</div><div class="val">${formatDate(inv.due_date)}</div>` : ''}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="num" style="width:80px">Cant.</th>
        <th class="num" style="width:120px">Precio unitario</th>
        <th class="num" style="width:120px">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4" style="text-align:center;color:#aaa">Sin líneas</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3">Total</td>
        <td class="num">${fmt(inv.total)}</td>
      </tr>
    </tfoot>
  </table>
  ${inv.notes ? `<div class="notes"><strong>Notas:</strong> ${inv.notes}</div>` : ''}
  <div class="footer">Documento generado por AGLegal</div>
  <br>
  <button onclick="window.print()" style="padding:8px 16px;background:#1a1a3e;color:#fff;border:none;border-radius:4px;cursor:pointer">Imprimir / Guardar PDF</button>
</body></html>`

  const w = window.open('', '_blank', 'width=900,height=700')
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}

// ─── Register Income Dialog ────────────────────────────────────────────────────

function RegisterIncomeDialog({
  invoice,
  onClose,
}: {
  invoice: Invoice
  onClose: () => void
}) {
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  const [amount, setAmount] = useState(String(invoice.total))
  const [incomeDate, setIncomeDate] = useState(today)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [detail, setDetail] = useState(`Factura ${invoice.invoice_number}`)

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories', 'income'],
    queryFn: () =>
      import('@/api/client').then((m) =>
        m.default.get('/categories', { params: { kind: 'income' } }).then((r) => r.data),
      ),
  })

  const save = useMutation({
    mutationFn: () =>
      incomesApi.create({
        amount: parseFloat(amount) || invoice.total,
        income_date: incomeDate,
        client_id: invoice.client_id,
        case_id: invoice.case_id,
        category_id: categoryId,
        detail,
        invoice_id: invoice.id,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['incomes'] })
      toast.success('Ingreso registrado')
      onClose()
    },
    onError: () => toast.error('Error al registrar el ingreso'),
  })

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Registrar Ingreso
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Factura <span className="font-mono font-medium">{invoice.invoice_number}</span> — {invoice.client_name}
        </p>

        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Monto *</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              className="h-8 text-sm"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fecha de cobro *</Label>
            <Input
              type="date"
              className="h-8 text-sm"
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoría</Label>
            <Select
              value={categoryId ? String(categoryId) : 'none'}
              onValueChange={(v) => setCategoryId(v === 'none' ? null : parseInt(v))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Detalle / concepto</Label>
            <Input
              className="h-8 text-sm"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="ghost" onClick={onClose}>Omitir</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            <Check className="h-4 w-4" />
            {save.isPending ? 'Guardando...' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Line items editor ────────────────────────────────────────────────────────

interface LineItem extends InvoiceItemIn {
  _key: string
}

function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[]
  onChange: (items: LineItem[]) => void
}) {
  function update(key: string, field: keyof InvoiceItemIn, value: string | number) {
    onChange(items.map((it) => (it._key === key ? { ...it, [field]: value } : it)))
  }
  function remove(key: string) {
    onChange(items.filter((it) => it._key !== key))
  }
  function add() {
    onChange([...items, { _key: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0 }])
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Sin líneas — agrega una abajo</p>
      )}
      {items.map((it) => (
        <div key={it._key} className="flex gap-2 items-center">
          <Input
            className="flex-1 text-sm h-8"
            placeholder="Descripción"
            value={it.description}
            onChange={(e) => update(it._key, 'description', e.target.value)}
          />
          <Input
            type="number"
            className="w-16 text-sm h-8"
            placeholder="Cant."
            min={0.01}
            step={0.01}
            value={it.quantity}
            onChange={(e) => update(it._key, 'quantity', parseFloat(e.target.value) || 1)}
          />
          <Input
            type="number"
            className="w-28 text-sm h-8"
            placeholder="Precio"
            min={0}
            step={0.01}
            value={it.unit_price}
            onChange={(e) => update(it._key, 'unit_price', parseFloat(e.target.value) || 0)}
          />
          <span className="w-24 text-right text-sm font-medium shrink-0">
            {formatCurrency(it.quantity * it.unit_price)}
          </span>
          <button
            onClick={() => remove(it._key)}
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="mt-1">
        <Plus className="h-3.5 w-3.5" />
        Línea adicional
      </Button>
    </div>
  )
}

// ─── Unbilled items picker ────────────────────────────────────────────────────

function UnbilledPicker({
  clientId,
  onSelect,
}: {
  clientId: number
  onSelect: (items: LineItem[]) => void
}) {
  const [open, setOpen] = useState<'sessions' | 'tasks' | 'costs' | null>('sessions')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [prices, setPrices] = useState<Record<string, number>>({})

  const { data, isLoading } = useQuery<UnbilledItems>({
    queryKey: ['unbilled', clientId],
    queryFn: () => invoicesApi.unbilled(clientId),
  })

  const sessions = data?.sessions ?? []
  const tasks = data?.tasks ?? []
  const costs = data?.costs ?? []

  function key(type: string, id: number) {
    return `${type}:${id}`
  }
  function toggle(k: string) {
    setSel((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  function addSelected() {
    const lines: LineItem[] = []
    sel.forEach((k) => {
      const [type, idStr] = k.split(':')
      const id = parseInt(idStr)
      const price = prices[k] ?? 0
      if (type === 'session') {
        const s = sessions.find((x) => x.id === id)
        if (s)
          lines.push({
            _key: crypto.randomUUID(),
            description: `Sesión ${s.session_date} — ${s.consult_type}`,
            quantity: 1,
            unit_price: price,
            entity_type: 'session',
            entity_id: s.id,
          })
      } else if (type === 'task') {
        const t = tasks.find((x) => x.id === id)
        if (t)
          lines.push({
            _key: crypto.randomUUID(),
            description: `Tarea: ${t.title}${t.case_title ? ` (${t.case_title})` : ''}`,
            quantity: 1,
            unit_price: price,
            entity_type: 'case_task',
            entity_id: t.id,
          })
      } else if (type === 'cost') {
        const c = costs.find((x) => x.id === id)
        if (c)
          lines.push({
            _key: crypto.randomUUID(),
            description: `${c.concept}${c.detail ? ` — ${c.detail}` : ''}`,
            quantity: 1,
            unit_price: price || c.amount,
            entity_type: 'cost',
            entity_id: c.id,
          })
      }
    })
    if (lines.length === 0) return
    onSelect(lines)
    setSel(new Set())
  }

  if (isLoading) return <p className="text-xs text-muted-foreground py-2">Cargando partidas...</p>
  if (!data || (sessions.length + tasks.length + costs.length === 0))
    return (
      <p className="text-xs text-muted-foreground py-2">
        Sin sesiones, tareas o costos no facturados para este cliente
      </p>
    )

  const Section = ({
    id,
    title,
    count,
    children,
  }: {
    id: 'sessions' | 'tasks' | 'costs'
    title: string
    count: number
    children: React.ReactNode
  }) => (
    <div className="rounded-lg border" style={{ borderColor: 'hsl(var(--c-inner-border))' }}>
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium"
        onClick={() => setOpen(open === id ? null : id)}
      >
        <span>
          {title} <span className="text-muted-foreground font-normal">({count})</span>
        </span>
        {open === id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open === id && <div className="px-3 pb-3 space-y-1">{children}</div>}
    </div>
  )

  const PriceInput = ({ k }: { k: string }) => (
    <Input
      type="number"
      min={0}
      step={0.01}
      placeholder="Precio"
      className="w-24 h-7 text-xs"
      value={prices[k] ?? ''}
      onChange={(e) => setPrices((prev) => ({ ...prev, [k]: parseFloat(e.target.value) || 0 }))}
      onClick={(e) => e.stopPropagation()}
    />
  )

  return (
    <div className="space-y-2">
      {sessions.length > 0 && (
        <Section id="sessions" title="Sesiones" count={sessions.length}>
          {sessions.map((s) => {
            const k = key('session', s.id)
            return (
              <label key={s.id} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-muted/30 rounded px-1">
                <input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-xs">
                  <span className="font-medium">{s.session_date}</span>{' '}
                  <span className="text-muted-foreground">— {s.consult_type}</span>
                </span>
                {sel.has(k) && <PriceInput k={k} />}
              </label>
            )
          })}
        </Section>
      )}
      {tasks.length > 0 && (
        <Section id="tasks" title="Tareas completadas" count={tasks.length}>
          {tasks.map((t) => {
            const k = key('task', t.id)
            return (
              <label key={t.id} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-muted/30 rounded px-1">
                <input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-xs">
                  <span className="font-medium">{t.title}</span>
                  {t.case_title && <span className="text-muted-foreground"> — {t.case_title}</span>}
                </span>
                {sel.has(k) && <PriceInput k={k} />}
              </label>
            )
          })}
        </Section>
      )}
      {costs.length > 0 && (
        <Section id="costs" title="Costos del cliente" count={costs.length}>
          {costs.map((c) => {
            const k = key('cost', c.id)
            return (
              <label key={c.id} className="flex items-center gap-3 py-1.5 cursor-pointer hover:bg-muted/30 rounded px-1">
                <input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-xs">
                  <span className="font-medium">{c.concept}</span>
                  {c.detail && <span className="text-muted-foreground"> — {c.detail}</span>}
                  <span className="text-muted-foreground"> ({formatCurrency(c.amount)})</span>
                </span>
                {sel.has(k) && <PriceInput k={k} />}
              </label>
            )
          })}
        </Section>
      )}
      {sel.size > 0 && (
        <Button size="sm" onClick={addSelected}>
          <Check className="h-3.5 w-3.5" />
          Agregar {sel.size} partida{sel.size !== 1 ? 's' : ''} seleccionada{sel.size !== 1 ? 's' : ''}
        </Button>
      )}
    </div>
  )
}

// ─── Invoice Builder Dialog ────────────────────────────────────────────────────

interface BuilderProps {
  editing: Invoice | null
  onClose: () => void
}

function InvoiceBuilder({ editing, onClose }: BuilderProps) {
  const qc = useQueryClient()
  const { firm } = useSettingsStore()
  const today = new Date().toISOString().split('T')[0]

  const [clientId, setClientId] = useState<number | null>(editing?.client_id ?? null)
  const [caseId, setCaseId] = useState<number | null>(editing?.case_id ?? null)
  const [invNumber, setInvNumber] = useState(editing?.invoice_number ?? '')
  const [invDate, setInvDate] = useState(editing?.invoice_date ?? today)
  const [dueDate, setDueDate] = useState(editing?.due_date ?? '')
  const [status, setStatus] = useState<InvoiceStatus>(editing?.status ?? 'Borrador')
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [firmName, setFirmName] = useState(editing?.firm_name ?? firm.name)
  const [firmPhone, setFirmPhone] = useState(editing?.firm_phone ?? firm.phone)
  const [firmEmail, setFirmEmail] = useState(editing?.firm_email ?? firm.email)
  const [firmAddress, setFirmAddress] = useState(editing?.firm_address ?? firm.address)
  const [firmTaxId, setFirmTaxId] = useState(editing?.firm_tax_id ?? firm.tax_id)
  const [lineItems, setLineItems] = useState<LineItem[]>(
    editing?.items.map((it) => ({
      _key: crypto.randomUUID(),
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      entity_type: it.entity_type,
      entity_id: it.entity_id,
    })) ?? [],
  )
  const [showUnbilled, setShowUnbilled] = useState(!editing)

  const { data: clients = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['client-choices'],
    queryFn: () => import('@/api/client').then((m) => m.default.get('/clients/choices').then((r) => r.data)),
  })

  const { data: cases = [] } = useQuery<{ id: number; title: string }[]>({
    queryKey: ['case-choices', clientId],
    queryFn: () =>
      import('@/api/client').then((m) =>
        m.default
          .get('/cases/choices', { params: clientId ? { client_id: clientId } : undefined })
          .then((r) => r.data),
      ),
    enabled: !!clientId,
  })

  const { data: nextNumber } = useQuery<string>({
    queryKey: ['next-invoice-number'],
    queryFn: invoicesApi.nextNumber,
    enabled: !editing,
  })
  useEffect(() => {
    if (!editing && nextNumber && !invNumber) setInvNumber(nextNumber)
  }, [nextNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: async (asStatus: string) => {
      const items: InvoiceItemIn[] = lineItems.map(({ _key, ...rest }) => rest)
      const payload = {
        client_id: clientId!,
        case_id: caseId || null,
        invoice_number: invNumber,
        invoice_date: invDate,
        due_date: dueDate || null,
        notes: notes || null,
        firm_name: firmName || null,
        firm_phone: firmPhone || null,
        firm_email: firmEmail || null,
        firm_address: firmAddress || null,
        firm_tax_id: firmTaxId || null,
        items,
      }
      if (editing) {
        return invoicesApi.update(editing.id, { ...payload, status: asStatus })
      }
      const created = await invoicesApi.create(payload)
      if (asStatus !== 'Borrador') {
        return invoicesApi.updateStatus(created.id, asStatus)
      }
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(editing ? 'Factura actualizada' : 'Factura creada')
      onClose()
    },
    onError: () => toast.error('Error al guardar la factura'),
  })

  const total = lineItems.reduce((s, it) => s + it.quantity * it.unit_price, 0)
  const canSave = !!clientId && !!invNumber && !!invDate

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {editing ? `Editar Factura ${editing.invoice_number}` : 'Nueva Factura'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Datos del despacho */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Datos del Despacho
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input className="h-8 text-sm" value={firmName} onChange={(e) => setFirmName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">RFC / Cédula jurídica</Label>
                <Input className="h-8 text-sm" value={firmTaxId} onChange={(e) => setFirmTaxId(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Teléfono</Label>
                <Input className="h-8 text-sm" value={firmPhone} onChange={(e) => setFirmPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input className="h-8 text-sm" value={firmEmail} onChange={(e) => setFirmEmail(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Dirección</Label>
                <Input className="h-8 text-sm" value={firmAddress} onChange={(e) => setFirmAddress(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Datos de la factura */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Datos de la Factura
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cliente *</Label>
                <Select
                  value={clientId ? String(clientId) : ''}
                  onValueChange={(v) => { setClientId(parseInt(v)); setCaseId(null) }}
                  disabled={!!editing}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expediente</Label>
                <Select
                  value={caseId ? String(caseId) : 'none'}
                  onValueChange={(v) => setCaseId(v === 'none' ? null : parseInt(v))}
                  disabled={!clientId}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Número de factura *</Label>
                <Input className="h-8 text-sm font-mono" value={invNumber} onChange={(e) => setInvNumber(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha de emisión *</Label>
                <Input type="date" className="h-8 text-sm" value={invDate} onChange={(e) => setInvDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fecha de vencimiento</Label>
                <Input type="date" className="h-8 text-sm" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </section>

          {/* Unbilled items picker */}
          {clientId && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Partidas no facturadas
                </p>
                <button
                  className="text-xs text-primary underline"
                  onClick={() => setShowUnbilled((v) => !v)}
                >
                  {showUnbilled ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {showUnbilled && (
                <UnbilledPicker
                  clientId={clientId}
                  onSelect={(items) => setLineItems((prev) => [...prev, ...items])}
                />
              )}
            </section>
          )}

          {/* Line items */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Líneas de Factura
            </p>
            <div className="text-xs text-muted-foreground flex gap-2 mb-2 font-medium">
              <span className="flex-1 pl-6">Descripción</span>
              <span className="w-16 text-right">Cant.</span>
              <span className="w-28 text-right">Precio unit.</span>
              <span className="w-24 text-right">Subtotal</span>
              <span className="w-7" />
            </div>
            <LineItemsEditor items={lineItems} onChange={setLineItems} />
            <div className="flex justify-end mt-3 pt-3" style={{ borderTop: '1px solid hsl(var(--border))' }}>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{formatCurrency(total)}</p>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas</Label>
            <Textarea
              className="mt-2 text-sm"
              rows={2}
              placeholder="Condiciones de pago, observaciones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>
        </div>

        <DialogFooter className="flex-row justify-between items-center mt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!canSave || save.isPending}
              onClick={() => save.mutate('Borrador')}
            >
              Guardar borrador
            </Button>
            <Button
              disabled={!canSave || save.isPending}
              onClick={() => save.mutate(status)}
            >
              <Check className="h-4 w-4" />
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const FILTER_LABELS: Record<string, string> = {
  all: 'Todas', Borrador: 'Borrador', Enviada: 'Enviada', Pagada: 'Pagada', Cancelada: 'Cancelada',
}

export default function Invoices() {
  const qc = useQueryClient()
  const { currency } = useSettingsStore()
  const [filter, setFilter] = useState('all')
  const [building, setBuilding] = useState(false)
  const [editing, setEditing] = useState<Invoice | null>(null)
  const [registerFor, setRegisterFor] = useState<Invoice | null>(null)

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list(),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string; invoice: Invoice }) =>
      invoicesApi.updateStatus(id, status),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success(status === 'Pagada' ? 'Factura pagada — ingreso registrado automáticamente en Flujo de Caja' : 'Estado actualizado')
    },
  })

  const del = useMutation({
    mutationFn: (id: number) => invoicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Factura eliminada')
    },
  })

  const visible = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === 'Pagada').length,
    pending: invoices.filter((i) => i.status === 'Borrador' || i.status === 'Enviada').length,
    amount: invoices.filter((i) => i.status === 'Pagada').reduce((s, i) => s + i.total, 0),
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-sm text-muted-foreground">Genera y gestiona facturas por cliente</p>
        </div>
        <Button onClick={() => setBuilding(true)}>
          <Plus className="h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total facturas', value: stats.total, icon: FileText, color: 'text-muted-foreground' },
          { label: 'Pagadas', value: stats.paid, icon: CheckCircle, color: 'text-emerald-500' },
          { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'Ingresos cobrados', value: formatCurrency(stats.amount), icon: DollarSign, color: 'text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-xl p-4"
            style={{ border: '1px solid hsl(var(--c-card-border))', background: 'hsl(var(--c-card-bg))' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 flex-wrap">
        {Object.entries(FILTER_LABELS).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={
              filter === k
                ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }
                : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
            }
          >
            {l}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--c-card-border))' }}>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando facturas...</div>
        ) : visible.length === 0 ? (
          <div className="py-12 text-center">
            <Receipt className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Sin facturas</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Crea la primera con el botón superior</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--c-inner-border))', background: 'hsl(var(--muted)/0.4)' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Vencimiento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((inv) => (
                <tr
                  key={inv.id}
                  style={{ borderBottom: '1px solid hsl(var(--c-inner-border))' }}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.invoice_number}</td>
                  <td className="px-4 py-3 font-medium">
                    {inv.client_name}
                    {inv.case_title && (
                      <span className="block text-xs text-muted-foreground font-normal">{inv.case_title}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.invoice_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={inv.status} />
                      <Select
                        value={inv.status}
                        onValueChange={(v) => updateStatus.mutate({ id: inv.id, status: v, invoice: inv })}
                      >
                        <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity">
                          <span />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.total)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === 'Pagada' && inv.has_income && (
                        <span className="h-7 w-7 flex items-center justify-center text-emerald-500" title="Ingreso registrado en Flujo de Caja">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                      <button
                        onClick={() => printInvoice(inv, currency)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/50 transition-colors text-muted-foreground"
                        title="Imprimir"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setEditing(inv)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted/50 transition-colors text-muted-foreground"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar factura ${inv.invoice_number}?`)) del.mutate(inv.id)
                        }}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Builder dialog */}
      {(building || editing) && (
        <InvoiceBuilder
          editing={editing}
          onClose={() => { setBuilding(false); setEditing(null) }}
        />
      )}

      {/* Register income dialog */}
      {registerFor && (
        <RegisterIncomeDialog
          invoice={registerFor}
          onClose={() => setRegisterFor(null)}
        />
      )}
    </div>
  )
}
