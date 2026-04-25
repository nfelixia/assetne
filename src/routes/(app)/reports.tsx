import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { equipmentQueries } from '~/lib/equipment/queries'
import { checkoutHistoryQuery } from '~/lib/checkout/queries'

export const Route = createFileRoute('/(app)/reports')({
  beforeLoad: ({ context }: any) => {
    if (context?.session?.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(equipmentQueries.list()),
      queryClient.ensureQueryData(checkoutHistoryQuery()),
    ])
  },
  component: ReportsPage,
})

const CONDITION_LABEL: Record<string, string> = {
  perfect: 'Perfeito',
  minor:   'Dano leve',
  major:   'Dano grave',
}

const CONDITION_COLOR: Record<string, string> = {
  perfect: '#10b981',
  minor:   '#f59e0b',
  major:   '#ef4444',
}

type HistoryFilter = 'all' | 'active' | 'returned'

function ReportsPage() {
  const { data: equipment }    = useSuspenseQuery(equipmentQueries.list())
  const { data: history = [] } = useSuspenseQuery(checkoutHistoryQuery())

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [searchHistory, setSearchHistory] = useState('')

  const total       = equipment.length
  const inUse       = equipment.filter((e) => e.status === 'in-use').length
  const available   = equipment.filter((e) => e.status === 'available').length
  const maintenance = equipment.filter((e) => e.status === 'maintenance').length

  const byCategory = equipment.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1
    return acc
  }, {})

  const filteredHistory = history.filter((h) => {
    const matchStatus =
      historyFilter === 'all'      ? true :
      historyFilter === 'active'   ? h.checkedInAt === null :
      h.checkedInAt !== null

    const q = searchHistory.toLowerCase()
    const matchSearch =
      !q ||
      (h.equipmentName ?? '').toLowerCase().includes(q) ||
      h.responsible.toLowerCase().includes(q) ||
      h.project.toLowerCase().includes(q)

    return matchStatus && matchSearch
  })

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="mb-6">
        <h1
          className="mb-1 text-[22px] font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}
        >
          Relatórios
        </h1>
        <p className="text-[13px]" style={{ color: '#3b5a7a' }}>Análise do inventário em tempo real</p>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard value={total}       label="Total"        accent="#3b82f6" />
        <StatCard value={available}   label="Disponíveis"  accent="#10b981" />
        <StatCard value={inUse}       label="Em Uso"       accent="#f59e0b" />
        <StatCard value={maintenance} label="Manutenção"   accent="#ef4444" />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Status distribution */}
        <div
          className="rounded-xl p-4"
          style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <h3 className="mb-4 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>
            Distribuição de Status
          </h3>
          <div className="space-y-3">
            <StatusBar label="Disponíveis" value={available}   total={total} color="#10b981" />
            <StatusBar label="Em Uso"      value={inUse}       total={total} color="#f59e0b" />
            <StatusBar label="Manutenção"  value={maintenance} total={total} color="#ef4444" />
          </div>
        </div>

        {/* By category */}
        <div
          className="rounded-xl p-4"
          style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <h3 className="mb-4 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>
            Por Categoria
          </h3>
          <div className="space-y-3">
            {Object.entries(byCategory).map(([cat, qty]) => (
              <StatusBar key={cat} label={cat} value={qty} total={total} color="#3b82f6" />
            ))}
          </div>
        </div>
      </div>

      {/* Inventory table */}
      <div
        className="mt-3 overflow-hidden rounded-xl"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="px-4 py-3 text-[13px] font-semibold"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#eef2ff' }}
        >
          Inventário completo
        </div>
        {equipment.map((eq, i) => (
          <div
            key={eq.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < equipment.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
          >
            <div className="w-[180px] truncate text-[13px]" style={{ color: '#8ba4bf' }}>{eq.name}</div>
            <div className="text-[11px]" style={{ color: '#4a6380' }}>{eq.category}</div>
            <div
              className="ml-auto text-[11px]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#4a6380' }}
            >
              {eq.value}
            </div>
            <StatusDot status={eq.status as 'available' | 'in-use' | 'maintenance'} />
          </div>
        ))}
      </div>

      {/* Checkout history */}
      <div
        className="mt-3 overflow-hidden rounded-xl"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: '#eef2ff' }}>
              Histórico de saídas
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                background: 'rgba(255,255,255,0.05)',
                color: '#8ba4bf',
              }}
            >
              {filteredHistory.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Buscar..."
              className="h-7 rounded-lg px-2.5 text-[12px] outline-none transition-all"
              style={{
                background: '#060c1a',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#eef2ff',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
            {(['all', 'active', 'returned'] as HistoryFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className="rounded-lg px-2.5 py-0.5 text-[11px] font-medium transition-all"
                style={
                  historyFilter === f
                    ? { background: 'rgba(255,255,255,0.06)', color: '#eef2ff' }
                    : { color: '#4a6380' }
                }
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Em uso' : 'Devolvidos'}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-6 text-center text-[13px]" style={{ color: '#2b4266' }}>
            Nenhum registro encontrado
          </div>
        ) : (
          filteredHistory.map((h, i) => {
            const isActive = h.checkedInAt === null
            const outDate  = new Date(h.checkedOutAt).toLocaleDateString('pt-BR')
            const inDate   = h.checkedInAt
              ? new Date(h.checkedInAt).toLocaleDateString('pt-BR')
              : null

            return (
              <div
                key={h.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{ borderBottom: i < filteredHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
              >
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: isActive ? '#f59e0b' : '#10b981' }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[13px] font-medium" style={{ color: '#d6e4f0' }}>
                      {h.equipmentName ?? '—'}
                    </span>
                    <span className="text-[11px]" style={{ color: '#3b5a7a' }}>
                      {h.equipmentCategory ?? ''}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px]" style={{ color: '#4a6380' }}>
                    {h.responsible}{h.responsibleRole ? ` · ${h.responsibleRole}` : ''}{' '}
                    <span style={{ color: '#2b4266' }}>→ {h.project}</span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[12px]" style={{ color: '#8ba4bf' }}>{outDate}</div>
                  {inDate ? (
                    <div className="text-[11px]" style={{ color: '#4a6380' }}>
                      devolvido {inDate}
                      {h.returnCondition && (
                        <span
                          className="ml-1"
                          style={{ color: CONDITION_COLOR[h.returnCondition] ?? '#8ba4bf' }}
                        >
                          · {CONDITION_LABEL[h.returnCondition] ?? h.returnCondition}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: '#f59e0b' }}>em uso</div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl px-[18px] py-4"
      style={{
        background: '#0a0f1d',
        border: '1px solid rgba(255,255,255,0.05)',
        borderTop: `2px solid ${accent}`,
      }}
    >
      <div
        className="pointer-events-none absolute top-0 right-0 h-20 w-20 rounded-full opacity-[0.06]"
        style={{ background: accent, filter: 'blur(24px)', transform: 'translate(30%, -30%)' }}
      />
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: '#3b5a7a' }}>
        {label}
      </div>
      <div
        className="text-[30px] font-bold leading-none"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent }}
      >
        {value}
      </div>
    </div>
  )
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[110px] shrink-0 truncate text-[12px]" style={{ color: '#8ba4bf' }}>{label}</div>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div
        className="w-7 shrink-0 text-right text-[11px]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8ba4bf' }}
      >
        {value}
      </div>
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  available:   '#10b981',
  'in-use':    '#f59e0b',
  maintenance: '#ef4444',
}

function StatusDot({ status }: { status: 'available' | 'in-use' | 'maintenance' }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: STATUS_COLOR[status] ?? '#8ba4bf' }}
    />
  )
}
