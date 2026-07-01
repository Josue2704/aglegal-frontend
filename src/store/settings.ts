import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AppSettings {
  currency: string
  theme: 'light' | 'dark'
}

interface SettingsStore extends AppSettings {
  save: (s: Partial<AppSettings>) => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      currency: 'CRC',
      theme: 'dark',
      save: (s) => set((prev) => ({ ...prev, ...s })),
      toggleTheme: () =>
        set((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' })),
    }),
    { name: 'aglegal-settings' }
  )
)

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem('aglegal-settings')
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: Partial<AppSettings> }
      return {
        currency: parsed?.state?.currency ?? 'CRC',
        theme: parsed?.state?.theme ?? 'dark',
      }
    }
  } catch {}
  return { currency: 'CRC', theme: 'dark' }
}
