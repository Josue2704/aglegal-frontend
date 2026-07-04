import { useAuthStore } from '@/store/auth'

export function usePermission(module: string, action: string): boolean {
  const user = useAuthStore(s => s.user)
  if (!user) return false
  if (user.is_admin) return true
  return user.permissions.includes(`${module}.${action}`)
}

export function useHasAnyPermission(...keys: string[]): boolean {
  const user = useAuthStore(s => s.user)
  if (!user) return false
  if (user.is_admin) return true
  return keys.some(k => user.permissions.includes(k))
}
