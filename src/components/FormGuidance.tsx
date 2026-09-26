type Props = {
  required: string
  optional: string
  missing?: (string | false | null | undefined)[]
  recommended?: (string | false | null | undefined)[]
}

/** Explicit requirements, separate from recommendations that do not block saving. */
export function FormGuidance({ required, optional, missing = [], recommended = [] }: Props) {
  const pending = missing.filter(Boolean)
  const suggestions = recommended.filter(Boolean)
  return <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
    <p><strong>Obligatorios:</strong> {required}</p>
    <p><strong>Pueden quedar vacíos:</strong> {optional}</p>
    <div aria-live="polite" aria-atomic="true">
      {pending.length > 0 && <p className="text-destructive"><strong>Falta completar:</strong> {pending.join(', ')}.</p>}
      {suggestions.length > 0 && <p className="text-muted-foreground"><strong>Recomendado antes de continuar:</strong> {suggestions.join(', ')}. Puedes guardar y completarlo después.</p>}
    </div>
  </div>
}
