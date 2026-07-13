import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { CalendarCheck, Unlink, ExternalLink, Coins, RotateCcw, Sun, Moon, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { googleCalApi } from '@/api/googleCal'
import { outlookCalApi } from '@/api/outlookCal'
import { useSettingsStore } from '@/store/settings'
import type { FirmInfo } from '@/store/settings'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Currencies ───────────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'CRC', label: 'Colón costarricense',    symbol: '₡',   example: 125000 },
  { code: 'USD', label: 'Dólar estadounidense',   symbol: '$',   example: 250    },
  { code: 'EUR', label: 'Euro',                    symbol: '€',   example: 230    },
  { code: 'COP', label: 'Peso colombiano',         symbol: '$',   example: 980000 },
  { code: 'MXN', label: 'Peso mexicano',           symbol: '$',   example: 4500   },
  { code: 'PEN', label: 'Sol peruano',             symbol: 'S/',  example: 950    },
  { code: 'CLP', label: 'Peso chileno',            symbol: '$',   example: 220000 },
  { code: 'ARS', label: 'Peso argentino',          symbol: '$',   example: 250000 },
  { code: 'BRL', label: 'Real brasileño',          symbol: 'R$',  example: 1250   },
  { code: 'GTQ', label: 'Quetzal guatemalteco',    symbol: 'Q',   example: 1950   },
  { code: 'HNL', label: 'Lempira hondureño',       symbol: 'L',   example: 6150   },
  { code: 'NIO', label: 'Córdoba nicaragüense',    symbol: 'C$',  example: 9100   },
  { code: 'DOP', label: 'Peso dominicano',         symbol: 'RD$', example: 14500  },
]

// ─── Currency Panel ───────────────────────────────────────────────────────────
function CurrencyPanel() {
  const { currency, save } = useSettingsStore()
  const [selected, setSelected] = useState(currency)

  const hasChanges = selected !== currency
  const previewCurrency = CURRENCIES.find((c) => c.code === selected)

  function handleSave() {
    save({ currency: selected })
    toast.success('Divisa guardada — recargando...')
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Divisa del sistema</CardTitle>
            <CardDescription>
              Afecta cómo se muestran los montos en todo el sistema
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Divisa</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="font-mono text-muted-foreground mr-2 text-xs">{c.code}</span>
                    {c.label} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {previewCurrency && (
            <div className="space-y-1.5">
              <Label>Vista previa</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm font-semibold">
                {(() => {
                  // Show preview using the selected (not yet saved) currency
                  const locale = {
                    CRC: 'es-CR', USD: 'en-US', EUR: 'es-ES', COP: 'es-CO', MXN: 'es-MX',
                    PEN: 'es-PE', CLP: 'es-CL', ARS: 'es-AR', BRL: 'pt-BR',
                    GTQ: 'es-GT', HNL: 'es-HN', NIO: 'es-NI', DOP: 'es-DO',
                  }[selected] ?? 'es-CR'
                  return new Intl.NumberFormat(locale, {
                    style: 'currency', currency: selected, minimumFractionDigits: 2,
                  }).format(previewCurrency.example)
                })()}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
            Guardar divisa
          </Button>
          {hasChanges && (
            <Button size="sm" variant="ghost" onClick={() => setSelected(currency)}>
              <RotateCcw className="h-3.5 w-3.5" />
              Descartar
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-1">
            Actualmente: <strong>{currency}</strong> — {CURRENCIES.find((c) => c.code === currency)?.label}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Google Calendar Panel ────────────────────────────────────────────────────
function GoogleCalendarPanel() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: gcalStatus, isLoading } = useQuery({
    queryKey: ['gcal-status'],
    queryFn: googleCalApi.status,
  })

  const connect = useMutation({
    mutationFn: async () => {
      const { url } = await googleCalApi.authorize()
      window.location.href = url
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? 'No se pudo obtener la URL de autorización'),
  })

  const disconnect = useMutation({
    mutationFn: googleCalApi.disconnect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gcal-status'] })
      toast.success('Google Calendar desconectado')
    },
  })

  useEffect(() => {
    const gcal = searchParams.get('gcal')
    if (gcal === 'connected') {
      toast.success('Google Calendar conectado correctamente')
      qc.invalidateQueries({ queryKey: ['gcal-status'] })
      setSearchParams({})
    } else if (gcal === 'error') {
      const msg = searchParams.get('msg') ?? 'Error desconocido'
      toast.error(`Error conectando Google Calendar: ${msg}`)
      setSearchParams({})
    }
  }, [searchParams, qc, setSearchParams])

  const connected = gcalStatus?.connected ?? false

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Google Calendar</CardTitle>
            <CardDescription>
              Sincroniza automáticamente las sesiones de la agenda
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Verificando conexión...</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Badge variant={connected ? 'success' : 'outline'}>
                {connected ? '✓ Conectado' : 'Desconectado'}
              </Badge>
              {connected && (
                <span className="text-xs text-muted-foreground">
                  Las sesiones se sincronizan automáticamente
                </span>
              )}
            </div>

            {connected ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                >
                  <Unlink className="h-4 w-4" />
                  Desconectar
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('https://calendar.google.com', '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                  Abrir Google Calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button size="sm" onClick={() => connect.mutate()} disabled={connect.isPending}>
                  <CalendarCheck className="h-4 w-4" />
                  Conectar Google Calendar
                </Button>
                <div className="text-xs text-muted-foreground space-y-1 border rounded-lg p-3 bg-muted/30">
                  <p className="font-medium">¿Cómo funciona?</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Haz clic en "Conectar" y autoriza el acceso con tu cuenta Google</li>
                    <li>Cada sesión creada o editada se sincronizará automáticamente</li>
                    <li>Las sesiones aparecen como eventos de día completo en tu calendario</li>
                  </ol>
                  <p className="mt-2 text-muted-foreground/70">
                    Requiere configurar <code className="text-xs bg-muted px-1 rounded">GOOGLE_CLIENT_ID</code> en el servidor.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Outlook Calendar Panel ───────────────────────────────────────────────────
function OutlookCalendarPanel() {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: status, isLoading } = useQuery({
    queryKey: ['outlook-status'],
    queryFn: outlookCalApi.status,
  })

  const connect = useMutation({
    mutationFn: async () => {
      const { url } = await outlookCalApi.authorize()
      window.location.href = url
    },
    onError: (e: { response?: { data?: { detail?: string } } }) =>
      toast.error(e.response?.data?.detail ?? 'No se pudo obtener la URL de autorización'),
  })

  const disconnect = useMutation({
    mutationFn: outlookCalApi.disconnect,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['outlook-status'] })
      toast.success('Outlook Calendar desconectado')
    },
  })

  useEffect(() => {
    const param = searchParams.get('outlook')
    if (param === 'connected') {
      toast.success('Outlook Calendar conectado correctamente')
      qc.invalidateQueries({ queryKey: ['outlook-status'] })
      setSearchParams({})
    } else if (param === 'error') {
      const msg = searchParams.get('msg') ?? 'Error desconocido'
      toast.error(`Error conectando Outlook Calendar: ${msg}`)
      setSearchParams({})
    }
  }, [searchParams, qc, setSearchParams])

  const connected = status?.connected ?? false

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'hsl(210 100% 56% / 0.12)', color: 'hsl(210 100% 56%)' }}>
            {/* Microsoft Outlook icon via SVG */}
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.11V2.55q0-.44.3-.75.3-.3.75-.3h12.79q.44 0 .75.3.3.3.3.75V9h.01q.46 0 .8.33.33.34.33.8zm-24 0z"/>
            </svg>
          </div>
          <div>
            <CardTitle className="text-base">Outlook Calendar</CardTitle>
            <CardDescription>
              Sincroniza automáticamente las sesiones con Microsoft Outlook
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Verificando conexión...</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Badge variant={connected ? 'success' : 'outline'}>
                {connected ? '✓ Conectado' : 'Desconectado'}
              </Badge>
              {connected && (
                <span className="text-xs text-muted-foreground">
                  Las sesiones se sincronizan automáticamente
                </span>
              )}
            </div>

            {connected ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                >
                  <Unlink className="h-4 w-4" />
                  Desconectar
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('https://outlook.live.com/calendar', '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                  Abrir Outlook Calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button size="sm" onClick={() => connect.mutate()} disabled={connect.isPending}>
                  <CalendarCheck className="h-4 w-4" />
                  Conectar Outlook Calendar
                </Button>
                <div className="text-xs text-muted-foreground space-y-1 border rounded-lg p-3 bg-muted/30">
                  <p className="font-medium">¿Cómo funciona?</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Haz clic en "Conectar" y autoriza con tu cuenta Microsoft</li>
                    <li>Cada sesión creada o editada se sincronizará automáticamente</li>
                    <li>Los eventos aparecen en tu calendario de Outlook</li>
                  </ol>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Theme Panel ─────────────────────────────────────────────────────────────
function ThemePanel() {
  const { theme, toggleTheme } = useSettingsStore()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </div>
          <div>
            <CardTitle className="text-base">Apariencia</CardTitle>
            <CardDescription>Elige entre modo claro u oscuro</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'light' as const, label: 'Modo claro', icon: Sun, desc: 'Interfaz clara y brillante' },
            { id: 'dark'  as const, label: 'Modo oscuro', icon: Moon, desc: 'Navy futurista' },
          ].map(({ id, label, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => id !== theme && toggleTheme()}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all"
              style={
                theme === id
                  ? { borderColor: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)' }
                  : { borderColor: 'hsl(var(--border))', background: 'transparent' }
              }
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${theme === id ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${theme === id ? 'text-primary' : 'text-foreground'}`}>
                  {label}
                </span>
                {theme === id && (
                  <span className="ml-auto text-xs font-medium text-primary">✓ Activo</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Firm Info Panel ──────────────────────────────────────────────────────────
function FirmPanel() {
  const { firm, save } = useSettingsStore()
  const [draft, setDraft] = useState<FirmInfo>({ ...firm })

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(firm)

  function handleSave() {
    save({ firm: draft })
    toast.success('Datos del despacho guardados')
  }

  function field(key: keyof FirmInfo, label: string, placeholder: string) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <Input
          value={draft[key]}
          onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
          placeholder={placeholder}
        />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Datos del Despacho</CardTitle>
            <CardDescription>
              Aparecen en el encabezado de las facturas generadas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('name', 'Nombre del despacho', 'Ej. García & Asociados')}
          {field('tax_id', 'RFC / Cédula jurídica', 'Ej. 3-101-123456')}
          {field('phone', 'Teléfono', 'Ej. +506 8888-8888')}
          {field('email', 'Correo electrónico', 'Ej. info@despacho.com')}
        </div>
        {field('address', 'Dirección', 'Ej. San José, Costa Rica')}
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
            Guardar datos
          </Button>
          {hasChanges && (
            <Button size="sm" variant="ghost" onClick={() => setDraft({ ...firm })}>
              <RotateCcw className="h-3.5 w-3.5" />
              Descartar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Settings() {
  const { currency } = useSettingsStore()

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground text-sm">
          Preferencias del sistema · Divisa activa:{' '}
          <span className="font-medium">{CURRENCIES.find((c) => c.code === currency)?.label ?? currency}</span>{' '}
          · Ejemplo: <span className="font-medium">{formatCurrency(1000)}</span>
        </p>
      </div>

      <ThemePanel />
      <CurrencyPanel />
      <FirmPanel />
      <GoogleCalendarPanel />
      <OutlookCalendarPanel />

      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Próximamente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Zona horaria · Formato de fecha · Notificaciones por correo · Backup automático
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
