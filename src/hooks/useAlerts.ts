import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api/dashboard'
import { useAuthStore } from '@/store/auth'

export type AlertsData = Awaited<ReturnType<typeof dashboardApi.alerts>>

export function useAlerts() {
  const { user } = useAuthStore()
  const canView =
    user?.is_admin ||
    user?.permissions.some((p) =>
      ['tareas.ver', 'expedientes.ver'].includes(p)
    )

  const query = useQuery({
    queryKey: ['dashboard-alerts'],
    queryFn: dashboardApi.alerts,
    enabled: !!user && canView,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const data = query.data
  const totalCount = (data?.overdue_tasks.length ?? 0) + (data?.stale_cases.length ?? 0)

  return { ...query, totalCount }
}
