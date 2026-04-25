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
  { to: '/dashboard',  label: 'Dashboard',      icon: HomeIcon },
  { to: '/equipments', label: 'Equipamentos',    icon: PackageIcon },
]
const NAV_ADMIN = [
  { to: '/reports',    label: 'Relatórios',      icon: ChartIcon },
  { to: '/settings',   label: 'Configurações',   icon: GearIcon },
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
    <div
      className="flex h-[100dvh] overflow-hidden bg-[#0d1117] text-[#e6edf3]"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden md:flex w-[216px] shrink-0 flex-col border-r border-white/10 bg-[#161b22]">
        <div className="border-b border-white/10 px-[18px] pb-4 pt-[18px]">
          <div className="font-['Space_Grotesk'] text-[17px] font-bold tracking-tight text-[#e6edf3]">
            AssetNE
          </div>
          <div className="mt-0.5 text-[11px] tracking-wider text-[#6e7681]">NAESTRADA</div>
        </div>

        <nav className="flex-1 py-1.5">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center border-l-2 border-transparent px-[18px] py-2 text-[13px] text-[#8b949e] transition-all duration-150 hover:border-transparent hover:bg-white/[0.04] hover:text-[#e6edf3] [&.active]:border-[#58a6ff] [&.active]:bg-[#21262d] [&.active]:font-medium [&.active]:text-[#e6edf3]"
              activeProps={{ className: 'active' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1f6feb] text-[12px] font-semibold text-white">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium leading-tight text-[#e6edf3]">{session.name}</div>
                <div className="text-[11px] text-[#6e7681]">{isAdmin ? 'Administrador' : 'Operador'}</div>
              </div>
            </div>
            <button onClick={handleLogout} title="Sair" className="shrink-0 text-[#6e7681] transition-colors hover:text-[#f85149]">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#161b22] md:bg-transparent px-4 md:px-6 py-3 md:py-[11px]">
          {/* Mobile: logo */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-['Space_Grotesk'] text-[17px] font-bold tracking-tight text-[#e6edf3]">
              AssetNE
            </span>
            <span className="text-[10px] tracking-widest text-[#6e7681]">NE</span>
          </div>
          {/* Desktop: breadcrumb-style label */}
          <div className="hidden md:block font-['JetBrains_Mono'] text-[11px] tracking-wider text-[#6e7681]">
            NAESTRADA · PRODUCTION CONTROL
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-[#3fb950]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#3fb950]" />
              <span className="hidden sm:inline">Online</span>
            </div>
            {/* Mobile: user avatar + logout */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1f6feb] text-[12px] font-semibold text-white">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <button onClick={handleLogout} title="Sair" className="p-1 text-[#6e7681] hover:text-[#f85149]">
                <LogoutIcon />
              </button>
            </div>
            {/* Desktop: version */}
            <span className="hidden md:inline font-['JetBrains_Mono'] text-[11px] text-[#6e7681]">v3.0.0</span>
          </div>
        </div>

        {/* Page content — extra bottom padding on mobile for bottom nav */}
        <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-7 md:pb-7">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="fixed bottom-0 inset-x-0 md:hidden z-40 border-t border-white/10 bg-[#161b22]">
        <div className="flex h-16 items-center justify-around px-2">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[#6e7681] transition-colors [&.active]:text-[#58a6ff]"
                activeProps={{ className: 'active' }}
              >
                <Icon />
                <span className="text-[10px] font-medium">{item.label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

/* ── Icons ── */
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function PackageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}
function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
