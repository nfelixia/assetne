import { Link, Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getSessionFn, logoutFn } from '~/server/function/auth'
import type { SessionUser } from '~/lib/auth/session'

export const Route = createFileRoute('/(app)')({
  beforeLoad: async () => {
    const session = await getSessionFn()
    if (!session) throw redirect({ to: '/login' })
    return { session }
  },
  component: AppLayout,
})

const NAV_ALL = [
  { to: '/dashboard',  label: 'Dashboard',    icon: HomeIcon },
  { to: '/equipments', label: 'Equipamentos',  icon: PackageIcon },
  { to: '/production', label: 'Acervo',        icon: ArchiveIcon },
]
const NAV_ADMIN = [
  { to: '/reports',    label: 'Relatórios',    icon: ChartIcon },
  { to: '/settings',   label: 'Configurações', icon: GearIcon },
]

function AppLayout() {
  const { session } = Route.useRouteContext() as { session: SessionUser }
  const router = useRouter()
  const isAdmin = session.role === 'admin'
  const nav = isAdmin ? [...NAV_ALL, ...NAV_ADMIN] : NAV_ALL

  async function handleLogout() {
    await logoutFn()
    document.cookie = 'assetne_session=; path=/; max-age=0'
    await router.invalidate()
    router.navigate({ to: '/login' })
    toast.success('Até logo!')
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col bg-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className="px-5 py-[18px] border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <LogoIcon size={26} />
            <div>
              <div
                className="text-[16px] font-bold leading-none text-sidebar-foreground"
                style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.3px' }}
              >
                AssetNE
              </div>
              <div
                className="mt-[5px] text-[9px] leading-none"
                style={{ letterSpacing: '0.14em', color: '#2b4266' }}
              >
                MAESTRADA · PRODUCTION CONTROL
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 my-0.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 text-muted-foreground hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-sidebar-primary"
                activeProps={{ className: 'active' }}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-sidebar-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-foreground">
                  {session.name}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {isAdmin ? 'Administrador' : 'Operador'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="shrink-0 p-1 transition-colors text-muted-foreground hover:text-destructive"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <div className="flex shrink-0 items-center justify-between px-4 md:px-6 py-[11px] border-b border-border bg-background/80 backdrop-blur-sm">
          {/* Mobile: logo */}
          <div className="flex items-center gap-2.5 md:hidden">
            <LogoIcon size={22} />
            <span
              className="text-[16px] font-bold text-foreground"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              AssetNE
            </span>
          </div>
          {/* Desktop: breadcrumb */}
          <div
            className="hidden md:block text-[11px]"
            style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em', color: '#1e3a5c' }}
          >
            MAESTRADA · PRODUCTION CONTROL
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-[5px]"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse"
                style={{ background: '#10b981' }}
              />
              <span
                className="hidden sm:inline text-[11px] font-medium"
                style={{ color: '#10b981' }}
              >
                Online
              </span>
            </div>

            {/* Mobile: avatar + logout */}
            <div className="flex items-center gap-2 md:hidden">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {session.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-1 text-muted-foreground"
              >
                <LogoutIcon />
              </button>
            </div>
            {/* Desktop: version */}
            <span
              className="hidden md:inline text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#1e3a5c' }}
            >
              v3.0.0
            </span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-7 md:pb-7">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom nav mobile ── */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden z-40 bg-sidebar border-t border-sidebar-border">
        <div className="flex h-16 items-center justify-around px-2">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors text-muted-foreground [&.active]:text-sidebar-primary"
                activeProps={{ className: 'active' }}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/* ── Logo ── */
function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 2L30 16L16 30L2 16Z" fill="#1e3a8a" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="0.6" strokeOpacity="0.4"/>
      <path d="M16 6L26 16L16 26L6 16Z" fill="#1e40af"/>
      <path d="M16 6L26 16L16 16Z" fill="#3b82f6"/>
      <path d="M6 16L16 6L16 16Z" fill="#2563eb"/>
      <path d="M26 16L16 26L16 16Z" fill="#1d4ed8"/>
      <path d="M16 16L16 26L6 16Z" fill="#1e3a8a"/>
      <circle cx="16" cy="16" r="2.2" fill="#93c5fd"/>
    </svg>
  )
}

/* ── Icons ── */
function HomeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function PackageIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}
function ArchiveIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
  )
}
function ChartIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}
function GearIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
