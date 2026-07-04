import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface FirmInfo {
  name: string
  phone: string
  email: string
  address: string
  tax_id: string
}

export interface AppSettings {
  currency: string
  theme: 'light' | 'dark'
  firm: FirmInfo
}

const DEFAULT_FIRM: FirmInfo = { name: '', phone: '', email: '', address: '', tax_id: '' }

interface SettingsStore extends AppSettings {
  save: (s: Partial<AppSettings>) => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      currency: 'CRC',
      theme: 'dark',
      firm: DEFAULT_FIRM,
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
        firm: parsed?.state?.firm ?? DEFAULT_FIRM,
      }
    }
  } catch {}
  return { currency: 'CRC', theme: 'dark', firm: DEFAULT_FIRM }
}
