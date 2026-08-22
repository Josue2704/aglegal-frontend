import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface HelpContent {
  title: string
  description: string
  /** Datos u operaciones previas necesarias antes de usar la pantalla */
  before?: string[]
  /** Pasos para completar la operación principal de la pantalla */
  steps?: string[]
  /** Aclaraciones, advertencias o atajos útiles */
  tips?: string[]
}

export function HelpButton({ content }: { content: HelpContent }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center transition-colors hover:bg-primary/10 hover:text-primary hover:border-primary/40"
        style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
        title="Ayuda: cómo usar esta pantalla"
        aria-label="Ayuda sobre esta pantalla"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary shrink-0" />
              {content.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm pt-1">
            <p className="text-muted-foreground leading-relaxed">{content.description}</p>

            {content.before && content.before.length > 0 && (
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Antes de empezar necesitas
                </p>
                <ul className="space-y-1 list-disc list-inside marker:text-primary">
                  {content.before.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {content.steps && content.steps.length > 0 && (
              <div>
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Cómo se usa
                </p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {content.steps.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ol>
              </div>
            )}

            {content.tips && content.tips.length > 0 && (
              <div
                className="rounded-lg p-3"
                style={{ background: 'hsl(var(--muted)/0.5)', border: '1px solid hsl(var(--border))' }}
              >
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                  Tips
                </p>
                <ul className="space-y-1 list-disc list-inside">
                  {content.tips.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
