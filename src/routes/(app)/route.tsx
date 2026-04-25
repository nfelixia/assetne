import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(app)')({
  component: AppLayout,
})

const NAV = [
  { to: '/dashboard',  label: 'Dashboard' },
  { to: '/equipments', label: 'Equipamentos' },
  { to: '/reports',    label: 'Relatórios' },
  { to: '/settings',   label: 'Configurações' },
]

function AppLayout() {
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
          {NAV.map((item) => (
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
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1f6feb] text-[12px] font-semibold text-white">
              R
            </div>
            <div>
              <div className="text-[12px] font-medium leading-tight text-[#e6edf3]">Rafael Mendes</div>
              <div className="text-[11px] text-[#6e7681]">Administrador</div>
            </div>
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
