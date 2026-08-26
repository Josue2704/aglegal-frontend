import { useState } from 'react'
import { Sparkles, FolderOpen, Wallet, LayoutDashboard, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/store/settings'
import { casesHelp, cashflowHelp, dashboardHelp } from '@/lib/helpContent'

interface TourStep {
  icon: React.ElementType
  title: string
  body: string
  bullets?: string[]
}

// Reutiliza el mismo contenido que ya está escrito para los botones de ayuda por pantalla —
// este recorrido es solo el empujón inicial, no un texto nuevo que mantener por separado.
const STEPS: TourStep[] = [
  {
    icon: Sparkles,
    title: 'Bienvenido a AG Legal',
    body: 'Este es el sistema de gestión del despacho: clientes, expedientes, cobros y el dashboard, todo conectado entre sí. Este recorrido toma un minuto y te muestra por dónde empezar — puedes saltarlo cuando quieras.',
  },
  {
    icon: FolderOpen,
    title: 'Así se ve un expediente',
    body: casesHelp.description,
    bullets: casesHelp.steps?.slice(0, 3),
  },
  {
    icon: Wallet,
    title: 'Así se registra un cobro',
    body: cashflowHelp.description,
    bullets: cashflowHelp.steps,
  },
  {
    icon: LayoutDashboard,
    title: 'Así se lee el Dashboard',
    body: dashboardHelp.description,
    bullets: dashboardHelp.steps?.slice(0, 2),
  },
  {
    icon: HelpCircle,
    title: 'Ayuda en cualquier pantalla',
    body: 'Cada pantalla tiene un botón de ayuda (el ícono de interrogación junto al título) con la explicación específica de esa pantalla — instrucciones, qué necesitas antes de empezar y tips. Úsalo siempre que lo necesites.',
    bullets: ['Puedes volver a ver este recorrido de bienvenida desde Configuración, cuando quieras.'],
  },
]

export function OnboardingTour() {
  const { onboardingCompletado, save } = useSettingsStore()
  const [open, setOpen] = useState(!onboardingCompletado)
  const [step, setStep] = useState(0)

  function finish() {
    save({ onboardingCompletado: true })
    setOpen(false)
  }

  if (!open) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const Icon = current.icon

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary shrink-0" />
            {current.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm pt-1">
          <p className="text-muted-foreground leading-relaxed">{current.body}</p>
          {current.bullets && current.bullets.length > 0 && (
            <ul className="space-y-1.5 list-disc list-inside">
              {current.bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 pt-1">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === step ? '18px' : '6px', background: i === step ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
            />
          ))}
        </div>

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={finish}>Saltar</Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />Anterior
              </Button>
            )}
            {isLast ? (
              <Button type="button" size="sm" onClick={finish}>Empezar a usar AG Legal</Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setStep((s) => s + 1)}>
                Siguiente<ChevronRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
