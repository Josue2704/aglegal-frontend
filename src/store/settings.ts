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
  onboardingCompletado: boolean
}

const DEFAULT_FIRM: FirmInfo = { name: '', phone: '', email: '', address: '', tax_id: '' }

interface SettingsStore extends AppSettings {
  save: (s: Partial<AppSettings>) => void
  toggleTheme: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      currency: 'USD',
      theme: 'dark',
      firm: DEFAULT_FIRM,
      onboardingCompletado: false,
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
        currency: parsed?.state?.currency ?? 'USD',
        theme: parsed?.state?.theme ?? 'dark',
        firm: parsed?.state?.firm ?? DEFAULT_FIRM,
        onboardingCompletado: parsed?.state?.onboardingCompletado ?? false,
      }
    }
  } catch {}
  return { currency: 'USD', theme: 'dark', firm: DEFAULT_FIRM, onboardingCompletado: false }
}
