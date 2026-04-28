import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { equipmentQueries } from '~/lib/equipment/queries'
import { checkoutHistoryQuery } from '~/lib/checkout/queries'
import { parseEquipmentValue, displayEquipmentValue, formatCurrency } from '~/utils/format'
import { StatusBadge } from '~/components/assetne/StatusBadge'
import { CAT_ICON } from '~/components/assetne/utils'
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
  perfect: '#3fb950',
  minor:   '#f59e0b',
  major:   '#ef4444',
}

type HistoryFilter = 'all' | 'active' | 'returned'
type InvSort = 'name' | 'value' | 'status'

function dateLabel(ts: number): string {
  const d  = new Date(ts)
  const now = new Date()
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86400000
  const dayTs     = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  if (dayTs === today)     return 'Hoje'
  if (dayTs === yesterday) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function durationDays(from: number, to: number | null): number {
  return Math.max(1, Math.floor(((to ?? Date.now()) - from) / 86400000))
}

function ReportsPage() {
  const { data: equipment }    = useSuspenseQuery(equipmentQueries.list())
  const { data: history = [] } = useSuspenseQuery(checkoutHistoryQuery())

  // ── shared date filter ──
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  // ── history controls ──
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [searchHistory, setSearchHistory] = useState('')

  // ── inventory controls ──
  const [invSearch,   setInvSearch]   = useState('')
  const [invSort,     setInvSort]     = useState<InvSort>('name')
  const [invStatus,   setInvStatus]   = useState<string>('all')
  const [collapsed,   setCollapsed]   = useState<Set<string>>(new Set())

  // ── derived stats ──
  const total       = equipment.length
  const inUse       = equipment.filter((e) => e.status === 'in-use').length
  const available   = equipment.filter((e) => e.status === 'available').length
  const maintenance = equipment.filter((e) => e.status === 'maintenance').length
  const totalValue  = equipment.reduce((s, e) => s + parseEquipmentValue(e.value), 0)

  const byCategory = equipment.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1
    return acc
  }, {})

  const dateFromMs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null
  const dateToMs   = dateTo   ? new Date(dateTo   + 'T23:59:59').getTime() : null

  // ── filtered + grouped history ──
  const filteredHistory = useMemo(() => history.filter((h) => {
    const matchStatus =
      historyFilter === 'active'   ? h.checkedInAt === null :
      historyFilter === 'returned' ? h.checkedInAt !== null : true
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

  const historyGroups = useMemo(() => {
    const groups: Record<string, typeof filteredHistory> = {}
    for (const h of filteredHistory) {
      const k = dayKey(h.checkedOutAt)
      if (!groups[k]) groups[k] = []
      groups[k].push(h)
    }
    return Object.entries(groups).map(([, items]) => ({
      label: dateLabel(items[0].checkedOutAt),
      items,
    }))
  }, [filteredHistory])

  // ── filtered + sorted inventory ──
  const invFiltered = useMemo(() => {
    const q = invSearch.toLowerCase()
    return equipment
      .filter((e) => {
        const matchSearch = !q ||
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.codigo ?? '').toLowerCase().includes(q)
        const matchStatus = invStatus === 'all' || e.status === invStatus
        return matchSearch && matchStatus
      })
      .sort((a, b) => {
        if (invSort === 'value') return parseEquipmentValue(b.value) - parseEquipmentValue(a.value)
        if (invSort === 'status') return a.status.localeCompare(b.status)
        return a.name.localeCompare(b.name, 'pt-BR')
      })
  }, [equipment, invSearch, invStatus, invSort])

  const invGrouped = useMemo(() => {
    const groups: Record<string, typeof invFiltered> = {}
    for (const e of invFiltered) {
      const cat = e.category || 'Outro'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(e)
    }
    return Object.entries(groups)
  }, [invFiltered])

  const invTotalFiltered = invFiltered.reduce((s, e) => s + parseEquipmentValue(e.value), 0)

  const toggleCat = (cat: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className="mb-1 text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}>
          Relatórios
        </h1>
        <p className="text-[13px]" style={{ color: '#3b5a7a' }}>Análise do inventário em tempo real</p>
      </div>

      {/* ── Date filter ── */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-[12px] font-medium" style={{ color: '#8ba4bf' }}>Período:</span>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border border-white/10 bg-[#161b22] px-3 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#2563eb]" />
          <span className="text-[12px]" style={{ color: '#4a6380' }}>até</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border border-white/10 bg-[#161b22] px-3 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#2563eb]" />
        </div>
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo('') }}
            className="text-[11px] transition-colors" style={{ color: '#4a6380' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#4a6380')}>
            Limpar
          </button>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard value={total}       label="Total"        sub={formatCurrency(totalValue)} accent="#3b82f6" />
        <StatCard value={available}   label="Disponíveis"  accent="#10b981" />
        <StatCard value={inUse}       label="Em Uso"       accent="#f59e0b" />
        <StatCard value={maintenance} label="Manutenção"   accent="#ef4444" />
      </div>

      {/* ── Distribution ── */}
      <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="mb-4 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Distribuição de Status</h3>
          <div className="space-y-3">
            <StatusBar label="Disponíveis" value={available}   total={total} color="#10b981" />
            <StatusBar label="Em Uso"      value={inUse}       total={total} color="#f59e0b" />
            <StatusBar label="Manutenção"  value={maintenance} total={total} color="#ef4444" />
          </div>
        </div>
        <div className="rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 className="mb-4 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Por Categoria</h3>
          <div className="space-y-3">
            {Object.entries(byCategory).map(([cat, qty]) => (
              <StatusBar key={cat} label={`${CAT_ICON[cat] ?? '📦'} ${cat}`} value={qty} total={total} color="#3b82f6" />
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          HISTÓRICO DE SAÍDAS
      ══════════════════════════════════════════════ */}
      <div className="mb-5 overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Header + controls */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Histórico de Saídas</span>
              <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", background: 'rgba(255,255,255,0.05)', color: '#8ba4bf' }}>
                {filteredHistory.length}
              </span>
            </div>
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['all', 'active', 'returned'] as HistoryFilter[]).map((f) => (
                <button key={f} onClick={() => setHistoryFilter(f)}
                  className="rounded px-2.5 py-1 text-[11px] font-medium transition-all"
                  style={historyFilter === f
                    ? { background: 'rgba(255,255,255,0.08)', color: '#eef2ff' }
                    : { color: '#4a6380' }}>
                  {f === 'all' ? 'Todos' : f === 'active' ? '🟡 Em uso' : '✓ Devolvidos'}
                </button>
              ))}
            </div>
          </div>
          <input
            value={searchHistory}
            onChange={(e) => setSearchHistory(e.target.value)}
            placeholder="Buscar por equipamento, responsável ou projeto..."
            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none transition-all"
            style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
          />
        </div>

        {/* Grouped entries */}
        {historyGroups.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: '#2b4266' }}>Nenhum registro encontrado</div>
        ) : (
          <div className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
            {historyGroups.map(({ label, items }) => (
              <div key={label}>
                {/* Day label */}
                <div className="flex items-center gap-3 px-4 py-2" style={{ background: 'rgba(255,255,255,0.015)' }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>{label}</span>
                  <span className="text-[10px]" style={{ color: '#1e3a5c' }}>{items.length} registro{items.length !== 1 ? 's' : ''}</span>
                </div>
                {/* Items */}
                {items.map((h, i) => {
                  const isActive  = h.checkedInAt === null
                  const days      = durationDays(h.checkedOutAt, h.checkedInAt)
                  const outTime   = new Date(h.checkedOutAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  const inDate    = h.checkedInAt ? new Date(h.checkedInAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null
                  const eq        = equipment.find((e) => e.id === h.equipmentId)
                  const icon      = CAT_ICON[h.equipmentCategory ?? ''] ?? '📦'
                  return (
                    <div
                      key={h.id}
                      className="flex items-center gap-3 px-4 py-3 transition-colors"
                      style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.012)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                    >
                      {/* Icon */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[16px]"
                        style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {eq?.photoUrl
                          ? <img src={eq.photoUrl} alt={h.equipmentName ?? ''} className="h-full w-full rounded-xl object-cover" />
                          : icon}
                      </div>

                      {/* Main info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[13px] font-medium" style={{ color: '#d6e4f0' }}>
                            {h.equipmentName ?? '—'}
                          </span>
                          {eq?.codigo && (
                            <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#58a6ff' }}>
                              #{eq.codigo}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px]" style={{ color: '#4a6380' }}>
                          <span style={{ color: '#8ba4bf' }}>{h.responsible}</span>
                          {h.responsibleRole && <span>· {h.responsibleRole}</span>}
                          <span style={{ color: '#2b4266' }}>→</span>
                          <span>{h.project}</span>
                        </div>
                      </div>

                      {/* Right: time + duration + status */}
                      <div className="shrink-0 text-right">
                        <div className="mb-1 flex items-center justify-end gap-2">
                          {/* Duration pill */}
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={isActive
                              ? { background: 'rgba(227,179,65,0.12)', color: '#e3b341', border: '1px solid rgba(227,179,65,0.2)' }
                              : { background: 'rgba(63,185,80,0.1)', color: '#3fb950', border: '1px solid rgba(63,185,80,0.2)' }}>
                            {days}d
                          </span>
                          {/* Status */}
                          {isActive
                            ? <span className="text-[11px] font-medium" style={{ color: '#e3b341' }}>em uso</span>
                            : <span className="text-[11px] font-medium" style={{ color: '#3fb950' }}>devolvido</span>}
                        </div>
                        <div className="text-[10px]" style={{ color: '#3b5a7a' }}>
                          saída {outTime}
                          {inDate && <span> · retorno {inDate}</span>}
                        </div>
                        {h.returnCondition && (
                          <div className="mt-0.5 text-[10px] font-medium" style={{ color: CONDITION_COLOR[h.returnCondition] ?? '#8ba4bf' }}>
                            {CONDITION_LABEL[h.returnCondition] ?? h.returnCondition}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════
          INVENTÁRIO COMPLETO
      ══════════════════════════════════════════════ */}
      <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Header + controls */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Inventário Completo</span>
              <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", background: 'rgba(255,255,255,0.05)', color: '#8ba4bf' }}>
                {invFiltered.length} de {total}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#3b5a7a' }}>
              <span>Valor total:</span>
              <span style={{ color: '#58a6ff', fontWeight: 600 }}>{formatCurrency(invTotalFiltered)}</span>
            </div>
          </div>

          {/* Search + sort + status filter */}
          <div className="flex flex-wrap gap-2">
            <input
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              placeholder="Buscar por nome, categoria ou código..."
              className="min-w-[160px] flex-1 rounded-lg px-3 py-2 text-[12px] outline-none transition-all"
              style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
            <select
              value={invStatus}
              onChange={(e) => setInvStatus(e.target.value)}
              className="rounded-lg px-2.5 py-2 text-[12px] outline-none"
              style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
            >
              <option value="all">Todos status</option>
              <option value="available">Disponíveis</option>
              <option value="in-use">Em uso</option>
              <option value="maintenance">Manutenção</option>
            </select>
            <select
              value={invSort}
              onChange={(e) => setInvSort(e.target.value as InvSort)}
              className="rounded-lg px-2.5 py-2 text-[12px] outline-none"
              style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
            >
              <option value="name">Nome A–Z</option>
              <option value="value">Valor ↓</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* Grouped by category */}
        {invGrouped.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: '#2b4266' }}>Nenhum equipamento encontrado</div>
        ) : (
          invGrouped.map(([cat, items]) => {
            const isCollapsed = collapsed.has(cat)
            const catValue    = items.reduce((s, e) => s + parseEquipmentValue(e.value), 0)
            const icon        = CAT_ICON[cat] ?? '📦'
            return (
              <div key={cat}>
                {/* Category row */}
                <button
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <span className="text-[16px]">{icon}</span>
                  <span className="flex-1 text-left text-[12px] font-semibold" style={{ color: '#8ba4bf' }}>{cat}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(255,255,255,0.05)', color: '#4a6380' }}>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#3b5a7a' }}>
                    {formatCurrency(catValue)}
                  </span>
                  <span className="ml-1 text-[10px]" style={{ color: '#2b4266' }}>{isCollapsed ? '▶' : '▼'}</span>
                </button>

                {/* Items */}
                {!isCollapsed && items.map((eq, i) => (
                  <div
                    key={eq.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{ borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.012)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    {/* Thumb */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[16px]"
                      style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {eq.photoUrl
                        ? <img src={eq.photoUrl} alt={eq.name} className="h-full w-full rounded-lg object-cover" />
                        : icon}
                    </div>

                    {/* Name + code */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{eq.name}</span>
                        {eq.codigo && (
                          <span className="shrink-0 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#58a6ff' }}>
                            #{eq.codigo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="hidden text-[12px] sm:block" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#3b5a7a' }}>
                      {displayEquipmentValue(eq.value)}
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      <StatusBadge status={eq.status as 'available' | 'in-use' | 'maintenance'} />
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}

        {/* Footer summary */}
        {invFiltered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
            <span className="text-[11px]" style={{ color: '#2b4266' }}>{invFiltered.length} equipamento{invFiltered.length !== 1 ? 's' : ''} listado{invFiltered.length !== 1 ? 's' : ''}</span>
            <span className="text-[12px] font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8ba4bf' }}>
              Total: <span style={{ color: '#58a6ff' }}>{formatCurrency(invTotalFiltered)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ value, label, sub, accent }: { value: number; label: string; sub?: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl px-[18px] py-4"
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', borderTop: `2px solid ${accent}` }}>
      <div className="pointer-events-none absolute top-0 right-0 h-20 w-20 rounded-full opacity-[0.06]"
        style={{ background: accent, filter: 'blur(24px)', transform: 'translate(30%, -30%)' }} />
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: '#3b5a7a' }}>{label}</div>
      <div className="text-[30px] font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent }}>{value}</div>
      {sub && <div className="mt-1 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#3b5a7a' }}>{sub}</div>}
    </div>
  )
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[130px] shrink-0 truncate text-[12px]" style={{ color: '#8ba4bf' }}>{label}</div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-12 shrink-0 text-right text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8ba4bf' }}>
        {value} <span style={{ color: '#2b4266' }}>({pct}%)</span>
      </div>
    </div>
  )
}
