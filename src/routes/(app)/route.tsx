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
  { to: '/dashboard',   label: 'Dashboard' },
  { to: '/equipments',  label: 'Equipamentos' },
]

const NAV_ADMIN = [
  { to: '/reports',     label: 'Relatórios' },
  { to: '/settings',    label: 'Configurações' },
]

function AppLayout() {
  const { session } = Route.useRouteContext() as { session: SessionUser }
  const router = useRouter()
  const isAdmin = session.role === 'admin'

  async function handleLogout() {
    await logoutFn()
    document.cookie = 'assetne_session=; path=/; max-age=0'
    await router.invalidate()
    router.navigate({ to: '/login' })
    toast.success('Até logo!')
  }

  const nav = isAdmin ? [...NAV_ALL, ...NAV_ADMIN] : NAV_ALL

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d1117] text-[#e6edf3]" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Sidebar */}
      <aside className="flex w-[216px] shrink-0 flex-col border-r border-white/10 bg-[#161b22]">
        {/* Logo */}
        <div className="border-b border-white/10 px-[18px] pb-4 pt-[18px]">
          <div className="font-['Space_Grotesk'] text-[17px] font-bold tracking-tight text-[#e6edf3]">
            AssetNE
          </div>
          <div className="mt-0.5 text-[11px] tracking-wider text-[#6e7681]">NAESTRADA</div>
        </div>

        {/* Nav */}
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

        {/* User */}
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
            <button
              onClick={handleLogout}
              title="Sair"
              className="shrink-0 text-[#6e7681] transition-colors hover:text-[#f85149]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-[11px]">
          <div className="font-['JetBrains_Mono'] text-[11px] tracking-wider text-[#6e7681]">
            NAESTRADA · PRODUCTION CONTROL
          </div>
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-1.5 text-[11px] text-[#3fb950]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#3fb950]" />
              Online
            </div>
            <span className="font-['JetBrains_Mono'] text-[11px] text-[#6e7681]">v3.0.0</span>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-7">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
