// Definición única de la navegación: la usan la barra lateral y el título de la cabecera,
// para que no haya pantallas sin nombre (antes 11 de 19 mostraban la ruta cruda, p. ej.
// "gobierno-catalogo"). Los grupos siguen el uso real del despacho, no el módulo técnico:
// lo del día a día primero, la administración después.
import {
  BarChart2, Briefcase, CalendarDays, CalendarRange, FolderTree, Landmark, LayoutDashboard,
  ListChecks, Percent, Receipt, Settings, Shield, ShieldCheck, Target, TrendingUp, UserCog, Users, Wallet,
} from 'lucide-react'

export type NavItem = {
  to: string
  icon: React.ElementType
  label: string
  perm?: string
  adminOnly?: boolean
  /** Muestra el número de tareas vencidas junto al nombre. */
  badge?: 'tareas-vencidas'
}
export type NavGroup = { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Día a día',
    items: [
      { to: '/',         icon: LayoutDashboard, label: 'Inicio',      perm: 'dashboard.ver' },
      { to: '/sessions', icon: CalendarDays,    label: 'Agenda',      perm: 'agenda.ver' },
      { to: '/cases',    icon: Briefcase,       label: 'Expedientes', perm: 'expedientes.ver' },
      { to: '/tasks',    icon: ListChecks,      label: 'Tareas',      perm: 'tareas.ver', badge: 'tareas-vencidas' },
      { to: '/clients',  icon: Users,           label: 'Clientes',    perm: 'clientes.ver' },
    ],
  },
  {
    label: 'Dinero',
    items: [
      { to: '/cashflow',   icon: TrendingUp, label: 'Flujo de caja', perm: 'flujo_caja.ver' },
      { to: '/invoices',   icon: Receipt,    label: 'Facturas',      perm: 'facturas.ver' },
      { to: '/comisiones', icon: Percent,    label: 'Comisiones',    perm: 'comisiones.ver' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/pipeline',         icon: Target,        label: 'Pipeline comercial', perm: 'pipeline.ver' },
      { to: '/finanzas',         icon: Landmark,      label: 'Finanzas',           perm: 'finanzas.ver' },
      { to: '/resumen-mensual',  icon: CalendarRange, label: 'Resumen mensual',    perm: 'finanzas.ver' },
      { to: '/reports',          icon: BarChart2,     label: 'Reportes',           perm: 'flujo_caja.ver' },
      { to: '/payroll',          icon: Wallet,        label: 'Nóminas',            perm: 'nominas.ver' },
      { to: '/catalogo',         icon: FolderTree,    label: 'Catálogo maestro',   perm: 'catalogo.ver' },
      { to: '/gobierno-catalogo', icon: ShieldCheck,  label: 'Gobierno del catálogo', perm: 'gobierno_catalogo.ver' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      // Protegidas con AdminRoute en App.tsx: exigen is_admin, no basta el permiso.
      { to: '/users',    icon: UserCog,  label: 'Usuarios',      perm: 'usuarios.ver',      adminOnly: true },
      { to: '/roles',    icon: Shield,   label: 'Roles',         perm: 'roles.ver',         adminOnly: true },
      { to: '/settings', icon: Settings, label: 'Configuración', perm: 'configuracion.ver', adminOnly: true },
    ],
  },
]

/** Título y grupo de una ruta, para la cabecera. */
export function navCrumb(pathname: string): { label: string; parent?: string } {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.to === pathname)
    if (item) return { label: item.label, parent: item.to === '/' ? undefined : group.label }
  }
  return { label: pathname.replace('/', '') || 'Inicio' }
}

export function visibleItems(group: NavGroup, isAdmin: boolean, perms: string[]): NavItem[] {
  return group.items.filter((i) => (i.adminOnly ? isAdmin : !i.perm || isAdmin || perms.includes(i.perm)))
}
