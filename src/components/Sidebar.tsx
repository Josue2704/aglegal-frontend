import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Briefcase, CalendarDays,
  TrendingUp, Tag, Wallet, UserCog, LogOut, Scale, Settings,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'
import { cn } from '@/lib/utils'

const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { to: '/clients',   icon: Users,        label: 'Clientes' },
      { to: '/cases',     icon: Briefcase,    label: 'Expedientes' },
      { to: '/sessions',  icon: CalendarDays, label: 'Agenda' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/cashflow',   icon: TrendingUp, label: 'Flujo de Caja' },
      { to: '/payroll',    icon: Wallet,     label: 'Nóminas' },
      { to: '/categories', icon: Tag,        label: 'Categorías' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { to: '/users',    icon: UserCog,  label: 'Usuarios' },
      { to: '/settings', icon: Settings, label: 'Configuración' },
    ],
  },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await authApi.logout()
    logout()
    navigate('/login')
  }

  const initials = (user?.full_name || user?.username || 'U')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <aside
      className="flex h-screen w-60 shrink-0 flex-col"
      style={{
        background: 'hsl(225 40% 4%)',
        borderRight: '1px solid hsl(225 25% 10%)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid hsl(225 25% 10%)' }}>
        <div className="relative">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg, hsl(220 100% 63%), hsl(260 70% 62%))' }}
          >
            <Scale className="h-4 w-4 text-white" />
          </div>
          <div
            className="absolute -inset-1 rounded-xl opacity-30 blur-md"
            style={{ background: 'linear-gradient(135deg, hsl(220 100% 63%), hsl(260 70% 62%))' }}
          />
        </div>
        <div>
          <span className="font-bold text-base text-white tracking-tight gradient-text">AGLegal</span>
          <p className="text-[10px] leading-none mt-0.5" style={{ color: 'hsl(225 15% 45%)' }}>Sistema de Gestión</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="section-label">{group.label}</p>
            {group.items.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
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
                      <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-blue-400' : '')} />
                      {label}
                    </div>
                    {isActive && <ChevronRight className="h-3 w-3 text-blue-400 opacity-60" />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div
        className="px-3 py-4 mx-2 mb-3 rounded-xl"
        style={{ background: 'hsl(225 28% 7%)', border: '1px solid hsl(225 25% 12%)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, hsl(220 100% 63% / 0.3), hsl(260 70% 62% / 0.3))', border: '1px solid hsl(220 100% 63% / 0.3)' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.full_name || user?.username}</p>
            <p className="text-[10px]" style={{ color: 'hsl(225 15% 45%)' }}>{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 flex items-center gap-1.5 text-xs transition-colors w-full hover:text-red-400"
          style={{ color: 'hsl(225 15% 42%)' }}
        >
          <LogOut className="h-3 w-3" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
