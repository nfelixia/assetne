import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { equipmentQueries } from '~/lib/equipment/queries'
import { checkoutHistoryQuery } from '~/lib/checkout/queries'
import { formatCurrency, parseEquipmentValue, displayEquipmentValue } from '~/utils/format'
import { ReportsSkeleton } from '~/components/assetne/Skeleton'

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
  pendingComponent: ReportsSkeleton,
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
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000

function ReportsPage() {
  const { data: equipment }    = useSuspenseQuery(equipmentQueries.list())
  const { data: history = [] } = useSuspenseQuery(checkoutHistoryQuery())

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [searchHistory, setSearchHistory] = useState('')
  const [dateFrom,      setDateFrom]      = useState('')
  const [dateTo,        setDateTo]        = useState('')

  const total       = equipment.length
  const inUse       = equipment.filter((e) => e.status === 'in-use').length
  const available   = equipment.filter((e) => e.status === 'available').length
  const maintenance = equipment.filter((e) => e.status === 'maintenance').length

  const byCategory = equipment.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1
    return acc
  }, {})

  const dateFromMs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null
  const dateToMs   = dateTo   ? new Date(dateTo   + 'T23:59:59').getTime() : null

  const filteredHistory = useMemo(() => history.filter((h) => {
    const matchStatus =
      historyFilter === 'all'    ? true :
      historyFilter === 'active' ? h.checkedInAt === null :
      h.checkedInAt !== null

    const q = searchHistory.toLowerCase()
    const matchSearch = !q ||
      (h.equipmentName ?? '').toLowerCase().includes(q) ||
      h.responsible.toLowerCase().includes(q) ||
      h.project.toLowerCase().includes(q)

    const matchDate =
      (!dateFromMs || h.checkedOutAt >= dateFromMs) &&
      (!dateToMs   || h.checkedOutAt <= dateToMs)

    return matchStatus && matchSearch && matchDate
  }), [history, historyFilter, searchHistory, dateFromMs, dateToMs])

  // Top 10 most used
  const top10 = useMemo(() => {
    const counts: Record<string, { id: string; name: string; codigo: string | null; count: number }> = {}
    for (const h of history) {
      if (!counts[h.equipmentId]) {
        const eq = equipment.find((e) => e.id === h.equipmentId)
        counts[h.equipmentId] = { id: h.equipmentId, name: h.equipmentName ?? h.equipmentId, codigo: eq?.codigo ?? null, count: 0 }
      }
      counts[h.equipmentId].count++
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [history, equipment])

  const maxCount = top10[0]?.count ?? 1

  // By client/project
  const byClient = useMemo(() => {
    const map: Record<string, { count: number; value: number; equipIds: Set<string> }> = {}
    for (const h of history) {
      const proj = h.project
      if (!map[proj]) map[proj] = { count: 0, value: 0, equipIds: new Set() }
      map[proj].count++
      const eq = equipment.find((e) => e.id === h.equipmentId)
      if (eq) {
        map[proj].value += parseEquipmentValue(eq.value)
        map[proj].equipIds.add(h.equipmentId)
      }
    }
    return Object.entries(map)
      .map(([project, data]) => ({ project, ...data, uniqueEquips: data.equipIds.size }))
      .sort((a, b) => b.count - a.count)
  }, [history, equipment])

  // Idle equipment (available, no checkout in 90 days or never)
  const idleEquipment = useMemo(() => {
    const threshold = Date.now() - NINETY_DAYS
    return equipment.filter((e) => {
      if (e.status !== 'available') return false
      const last = history.find((h) => h.equipmentId === e.id)
      if (!last) return true
      return last.checkedOutAt < threshold
    })
  }, [equipment, history])

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="mb-5">
        <h1 className="mb-1 text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}>
          Relatórios
        </h1>
        <p className="text-[13px]" style={{ color: '#3b5a7a' }}>Análise do inventário em tempo real</p>
      </div>

      {/* Date filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[12px] font-medium" style={{ color: '#8ba4bf' }}>Período:</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-white/10 bg-[#161b22] px-3 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#2563eb]"
          />
          <span className="text-[12px]" style={{ color: '#4a6380' }}>até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-white/10 bg-[#161b22] px-3 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#2563eb]"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-[11px] transition-colors"
            style={{ color: '#4a6380' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#4a6380')}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard value={total}       label="Total"        accent="#3b82f6" />
        <StatCard value={available}   label="Disponíveis"  accent="#10b981" />
        <StatCard value={inUse}       label="Em Uso"       accent="#f59e0b" />
        <StatCard value={maintenance} label="Manutenção"   accent="#ef4444" />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Status distribution */}
        <div className="rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="mb-4 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Distribuição de Status</h3>
          <div className="space-y-3">
            <StatusBar label="Disponíveis" value={available}   total={total} color="#10b981" />
            <StatusBar label="Em Uso"      value={inUse}       total={total} color="#f59e0b" />
            <StatusBar label="Manutenção"  value={maintenance} total={total} color="#ef4444" />
          </div>
        </div>

        {/* By category */}
        <div className="rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="mb-4 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Por Categoria</h3>
          <div className="space-y-3">
            {Object.entries(byCategory).map(([cat, qty]) => (
              <StatusBar key={cat} label={cat} value={qty} total={total} color="#3b82f6" />
            ))}
          </div>
        </div>
      </div>

      {/* Checkout history */}
      <div className="mb-3 overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Histórico de saídas</span>
            <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", background: 'rgba(255,255,255,0.05)', color: '#8ba4bf' }}>
              {filteredHistory.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Buscar..."
              className="h-7 rounded-lg px-2.5 text-[12px] outline-none transition-all"
              style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
            {(['all', 'active', 'returned'] as HistoryFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setHistoryFilter(f)}
                className="rounded-lg px-2.5 py-0.5 text-[11px] font-medium transition-all"
                style={historyFilter === f ? { background: 'rgba(255,255,255,0.06)', color: '#eef2ff' } : { color: '#4a6380' }}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Em uso' : 'Devolvidos'}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-6 text-center text-[13px]" style={{ color: '#2b4266' }}>Nenhum registro encontrado</div>
        ) : (
          filteredHistory.map((h, i) => {
            const isActive = h.checkedInAt === null
            const outDate  = new Date(h.checkedOutAt).toLocaleDateString('pt-BR')
            const inDate   = h.checkedInAt ? new Date(h.checkedInAt).toLocaleDateString('pt-BR') : null
            return (
              <div key={h.id} className="flex items-start gap-3 px-4 py-3" style={{ borderBottom: i < filteredHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: isActive ? '#f59e0b' : '#10b981' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{h.equipmentName ?? '—'}</span>
                    <span className="text-[11px]" style={{ color: '#3b5a7a' }}>{h.equipmentCategory ?? ''}</span>
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
                        <span className="ml-1" style={{ color: CONDITION_COLOR[h.returnCondition] ?? '#8ba4bf' }}>
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

      {/* Top 10 most used */}
      {top10.length > 0 && (
        <div className="mb-3 rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="mb-4 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Top 10 Mais Utilizados</h3>
          <div className="space-y-3">
            {top10.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-5 shrink-0 text-center text-[11px] font-bold" style={{ color: idx < 3 ? '#f59e0b' : '#4a6380' }}>
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="truncate text-[12px] font-medium" style={{ color: '#d6e4f0' }}>{item.name}</span>
                    {item.codigo && <span className="shrink-0 text-[11px]" style={{ color: '#58a6ff' }}>#{item.codigo}</span>}
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((item.count / maxCount) * 100)}%`, background: '#3b82f6' }} />
                  </div>
                </div>
                <div className="shrink-0 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8ba4bf' }}>
                  {item.count} saída{item.count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By client */}
      {byClient.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="px-4 py-3 text-[13px] font-semibold" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#eef2ff' }}>
            Relatório por Cliente / Projeto
          </div>
          {byClient.map((c, i) => (
            <div key={c.project} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < byClient.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{c.project}</div>
                <div className="text-[11px]" style={{ color: '#4a6380' }}>
                  {c.count} saída{c.count !== 1 ? 's' : ''} · {c.uniqueEquips} equipamento{c.uniqueEquips !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8ba4bf' }}>
                  {formatCurrency(c.value)}
                </div>
                <div className="text-[10px]" style={{ color: '#4a6380' }}>em equipamentos</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Idle equipment */}
      {idleEquipment.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Equipamentos Parados</span>
            <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              ⚠ {idleEquipment.length}
            </span>
          </div>
          {idleEquipment.map((eq, i) => {
            const lastCheckout = history.find((h) => h.equipmentId === eq.id)
            const daysIdle = lastCheckout
              ? Math.floor((Date.now() - lastCheckout.checkedOutAt) / (1000 * 60 * 60 * 24))
              : null
            return (
              <div key={eq.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < idleEquipment.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{eq.name}</span>
                    {eq.codigo && <span className="text-[11px]" style={{ color: '#58a6ff' }}>#{eq.codigo}</span>}
                  </div>
                  <div className="text-[11px]" style={{ color: '#4a6380' }}>{eq.category}</div>
                </div>
                <div className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  {daysIdle !== null ? `Parado há ${daysIdle}d` : 'Nunca utilizado'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Full inventory */}
      <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="px-4 py-3 text-[13px] font-semibold" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#eef2ff' }}>
          Inventário completo
        </div>
        {equipment.map((eq, i) => (
          <div key={eq.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < equipment.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div className="w-[180px] truncate text-[13px]" style={{ color: '#8ba4bf' }}>{eq.name}</div>
            <div className="text-[11px]" style={{ color: '#4a6380' }}>{eq.category}</div>
            {eq.codigo && <div className="text-[11px]" style={{ color: '#58a6ff' }}>#{eq.codigo}</div>}
            <div className="ml-auto text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#4a6380' }}>
              {displayEquipmentValue(eq.value)}
            </div>
            <StatusDot status={eq.status as 'available' | 'in-use' | 'maintenance'} />
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl px-[18px] py-4"
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', borderTop: `2px solid ${accent}` }}
    >
      <div className="pointer-events-none absolute top-0 right-0 h-20 w-20 rounded-full opacity-[0.06]" style={{ background: accent, filter: 'blur(24px)', transform: 'translate(30%, -30%)' }} />
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: '#3b5a7a' }}>{label}</div>
      <div className="text-[30px] font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent }}>{value}</div>
    </div>
  )
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[110px] shrink-0 truncate text-[12px]" style={{ color: '#8ba4bf' }}>{label}</div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-7 shrink-0 text-right text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8ba4bf' }}>{value}</div>
    </div>
  )
}

const STATUS_COLOR: Record<string, string> = {
  available:   '#10b981',
  'in-use':    '#f59e0b',
  maintenance: '#ef4444',
}

function StatusDot({ status }: { status: 'available' | 'in-use' | 'maintenance' }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[status] ?? '#8ba4bf' }} />
}
