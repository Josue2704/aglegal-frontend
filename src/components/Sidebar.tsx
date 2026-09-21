import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, LogOut, X } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import { useAlerts } from '@/hooks/useAlerts'
import { NAV_GROUPS, visibleItems, type NavGroup } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { EntityAvatar } from './EntityAvatar'

const COLAPSADOS_KEY = 'ag_nav_colapsados'

function leerColapsados(): string[] {
  try { return JSON.parse(localStorage.getItem(COLAPSADOS_KEY) ?? '[]') } catch { return [] }
}

function NavGroupSection({ group, userPerms, isAdmin, onNav, badges, colapsado, onToggle }: {
  group: NavGroup; userPerms: string[]; isAdmin: boolean; onNav: () => void
  badges: Record<string, number>; colapsado: boolean; onToggle: () => void
}) {
  const items = visibleItems(group, isAdmin, userPerms)
  if (!items.length) return null

  return (
    <div>
      <button onClick={onToggle} className="section-label flex items-center gap-1 w-full hover:text-white/70 transition-colors">
        <ChevronDown className={cn('h-3 w-3 transition-transform', colapsado && '-rotate-90')} />
        {group.label}
      </button>
      {!colapsado && items.map(({ to, icon: Icon, label, badge }) => {
        const count = badge ? badges[badge] ?? 0 : 0
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNav}
            className={({ isActive }) =>
              cn(
                'group flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5',
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-2.5">
                  <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-yellow-400' : '')} />
                  {label}
                </div>
                {count > 0 ? (
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ background: 'hsl(0 70% 55% / 0.15)', color: 'hsl(0 70% 62%)', border: '1px solid hsl(0 70% 55% / 0.35)' }}
                    title={`${count} tarea${count === 1 ? '' : 's'} vencida${count === 1 ? '' : 's'}`}
                  >
                    {count}
                  </span>
                ) : isActive && <ChevronRight className="h-3 w-3 opacity-60" style={{ color: 'hsl(43 65% 60%)' }} />}
              </>
            )}
          </NavLink>
        )
      })}
    </div>
  )
}

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isAdmin = user?.is_admin ?? false
  const permissions = user?.permissions ?? []
  const { data: alerts } = useAlerts()
  const badges = { 'tareas-vencidas': alerts?.overdue_tasks.length ?? 0 }
  const [colapsados, setColapsados] = useState<string[]>(leerColapsados)

  function toggleGrupo(label: string) {
    setColapsados((prev) => {
      const next = prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
      try { localStorage.setItem(COLAPSADOS_KEY, JSON.stringify(next)) } catch { /* sin persistencia */ }
      return next
    })
  }

  function onNav() {
    if (window.innerWidth < 768) onClose()
  }

  // Close sidebar on route change (mobile)
  useEffect(() => {
    if (window.innerWidth < 768) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  async function handleLogout() {
    await authApi.logout()
    logout()
    navigate('/login')
  }

  const displayName = user?.full_name || user?.username || 'U'

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'flex h-screen flex-col z-50 transition-transform duration-300 ease-in-out',
          // Mobile: fixed drawer
          'fixed inset-y-0 left-0 w-64',
          // Desktop: static sidebar
          'md:static md:w-60 md:shrink-0 md:translate-x-0',
          // Mobile open/close
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          background: 'hsl(213 74% 8%)',
          borderRight: '1px solid hsl(213 50% 13%)',
        }}
      >
        {/* Logo + close button (mobile) */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(213 50% 13%)' }}>
          <div className="flex flex-col">
            <img
              src="/AG LOGO 04.png"
              alt="AG Legal"
              className="h-10 w-auto object-contain object-left"
            />
            <p className="text-[10px] leading-none mt-2" style={{ color: 'hsl(213 20% 38%)' }}>Sistema de Gestión</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-md hover:bg-white/10 transition-colors"
            style={{ color: 'hsl(213 20% 45%)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV_GROUPS.map(group => (
            <NavGroupSection
              key={group.label}
              group={group}
              userPerms={permissions}
              isAdmin={isAdmin}
              onNav={onNav}
              badges={badges}
              colapsado={colapsados.includes(group.label)}
              onToggle={() => toggleGrupo(group.label)}
            />
          ))}
        </nav>

        {/* User */}
        <div
          className="px-3 py-4 mx-2 mb-3 rounded-xl"
          style={{ background: 'hsl(213 60% 11%)', border: '1px solid hsl(213 45% 16%)' }}
        >
          <div className="flex items-center gap-2.5">
            {user?.id ? (
              <EntityAvatar
                entityType="user"
                entityId={user.id}
                name={displayName}
                size={32}
                editable
                className="rounded-lg"
              />
            ) : (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, hsl(43 57% 45% / 0.3), hsl(43 57% 35% / 0.3))', border: '1px solid hsl(43 57% 45% / 0.4)', color: 'hsl(43 70% 70%)' }}
              >
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px]" style={{ color: 'hsl(213 20% 45%)' }}>{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex items-center gap-1.5 text-xs transition-colors w-full hover:text-red-400"
            style={{ color: 'hsl(213 20% 42%)' }}
          >
            <LogOut className="h-3 w-3" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
