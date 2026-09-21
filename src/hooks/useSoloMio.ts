// "Solo lo mío": el despacho comparte una sola base, pero cada quien trabaja sobre sus
// expedientes. El interruptor vive aquí para que Inicio, Tareas, Expedientes y Agenda
// usen el mismo criterio y la misma preferencia guardada.
import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'

const KEY = 'ag_solo_mio'

function leer(porDefecto: boolean): boolean {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? porDefecto : v === '1'
  } catch {
    return porDefecto
  }
}

export function useSoloMio() {
  const user = useAuthStore((s) => s.user)
  const username = user?.username ?? ''
  // El administrador supervisa a todo el despacho: para él la vista completa es la normal.
  const porDefecto = !(user?.is_admin ?? false)
  const [soloMio, setSoloMioState] = useState(() => leer(porDefecto))

  useEffect(() => { setSoloMioState(leer(porDefecto)) }, [porDefecto])

  const setSoloMio = useCallback((v: boolean) => {
    setSoloMioState(v)
    try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* modo privado: solo se pierde la preferencia */ }
  }, [])

  /** Un registro es "mío" si soy su responsable. Sin responsable asignado, se muestra
   *  siempre: es trabajo que alguien tiene que tomar, no trabajo de otro. */
  const esMio = useCallback(
    (...responsables: (string | null | undefined)[]) =>
      !soloMio || !username || responsables.every((r) => !r) || responsables.some((r) => r === username),
    [soloMio, username],
  )

  return { soloMio, setSoloMio, esMio, username }
}
