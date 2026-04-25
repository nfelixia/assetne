import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { equipmentQueries } from '~/lib/equipment/queries'

export const Route = createFileRoute('/(app)/reports')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(equipmentQueries.list()),
  component: ReportsPage,
})

function ReportsPage() {
  const { data: equipment } = useSuspenseQuery(equipmentQueries.list())

  const total       = equipment.length
  const inUse       = equipment.filter((e) => e.status === 'in-use').length
  const available   = equipment.filter((e) => e.status === 'available').length
  const maintenance = equipment.filter((e) => e.status === 'maintenance').length

  const byCategory = equipment.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="mb-6">
        <h1 className="mb-1 font-['Space_Grotesk'] text-[22px] font-semibold text-[#e6edf3]">
          Relatórios
        </h1>
        <p className="text-[13px] text-[#6e7681]">Análise do inventário em tempo real</p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard value={total}       label="Total"        color="#e6edf3" />
        <StatCard value={available}   label="Disponíveis"  color="#3fb950" />
        <StatCard value={inUse}       label="Em Uso"       color="#e3b341" />
        <StatCard value={maintenance} label="Manutenção"   color="#f85149" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Status distribution */}
        <div className="rounded-lg border border-white/10 bg-[#161b22] p-4">
          <h3 className="mb-4 text-[13px] font-semibold text-[#e6edf3]">Distribuição de Status</h3>
          <div className="space-y-3">
            <StatusBar label="Disponíveis" value={available} total={total} color="#3fb950" />
            <StatusBar label="Em Uso"      value={inUse}     total={total} color="#e3b341" />
            <StatusBar label="Manutenção"  value={maintenance} total={total} color="#f85149" />
          </div>
        </div>

        {/* By category */}
        <div className="rounded-lg border border-white/10 bg-[#161b22] p-4">
          <h3 className="mb-4 text-[13px] font-semibold text-[#e6edf3]">Por Categoria</h3>
          <div className="space-y-3">
            {Object.entries(byCategory).map(([cat, qty]) => (
              <StatusBar key={cat} label={cat} value={qty} total={total} color="#58a6ff" />
            ))}
          </div>
        </div>
      </div>

      {/* Equipment table */}
      <div className="mt-3 overflow-hidden rounded-lg border border-white/10 bg-[#161b22]">
        <div className="border-b border-white/10 px-4 py-3 text-[13px] font-semibold text-[#e6edf3]">
          Inventário completo
        </div>
        {equipment.map((eq, i) => (
          <div
            key={eq.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < equipment.length - 1 ? 'border-b border-white/10' : ''
            }`}
          >
            <div className="w-[180px] truncate text-[13px] text-[#8b949e]">{eq.name}</div>
            <div className="text-[11px] text-[#6e7681]">{eq.category}</div>
            <div className="ml-auto font-['JetBrains_Mono'] text-[11px] text-[#6e7681]">
              {eq.value}
            </div>
            <StatusDot status={eq.status as 'available' | 'in-use' | 'maintenance'} />
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#161b22] px-[18px] py-4">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#8b949e]">
        {label}
      </div>
      <div
        className="font-['Space_Grotesk'] text-[30px] font-bold leading-none"
        style={{ color }}
      >
        {value}
      </div>
    </div>
  )
}

function StatusBar({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[110px] shrink-0 truncate text-[12px] text-[#8b949e]">{label}</div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#21262d]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="w-7 shrink-0 text-right font-['JetBrains_Mono'] text-[11px] text-[#8b949e]">
        {value}
      </div>
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  available:   '#3fb950',
  'in-use':    '#e3b341',
  maintenance: '#f85149',
}

function StatusDot({ status }: { status: 'available' | 'in-use' | 'maintenance' }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: STATUS_COLOR[status] ?? '#8b949e' }}
    />
  )
}
