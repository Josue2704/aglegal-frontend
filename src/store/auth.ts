import { create } from 'zustand'
import type { UserInfo } from '@/types'

interface AuthState {
  token: string | null
  user: UserInfo | null
  setAuth: (token: string, user: UserInfo) => void
  logout: () => void
  isAuthenticated: () => boolean
}

const stored = {
  token: localStorage.getItem('ag_token'),
  user: (() => { try { return JSON.parse(localStorage.getItem('ag_user') ?? 'null') } catch { return null } })(),
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: stored.token,
  user: stored.user,
  setAuth: (token, user) => {
    localStorage.setItem('ag_token', token)
    localStorage.setItem('ag_user', JSON.stringify(user))
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem('ag_token')
    localStorage.removeItem('ag_user')
    set({ token: null, user: null })
  },
  isAuthenticated: () => Boolean(get().token),
}))
