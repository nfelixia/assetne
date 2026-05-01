import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { equipmentQueries } from '~/lib/equipment/queries'
import { checkoutHistoryQuery } from '~/lib/checkout/queries'
import { productionQueries } from '~/lib/production/queries'
import { patrimonyQueries } from '~/lib/patrimony/queries'
import { parseEquipmentValue, formatCurrency } from '~/utils/format'
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
      queryClient.ensureQueryData(productionQueries.list()),
      queryClient.ensureQueryData(productionQueries.withdrawalRequests()),
      queryClient.ensureQueryData(productionQueries.movements()),
      queryClient.ensureQueryData(patrimonyQueries.list()),
      queryClient.ensureQueryData(patrimonyQueries.withdrawalRequests()),
    ])
  },
  component: ReportsPage,
  pendingComponent: ReportsSkeleton,
})

/* ── Types ── */
type ModuleFilter = 'all' | 'equipment' | 'production' | 'patrimony'

type UnifiedEntry = {
  id: string
  module: 'equipment' | 'production' | 'patrimony'
  movType: 'saida' | 'devolucao' | 'solicitacao' | 'aprovacao' | 'recusa'
  itemName: string
  responsible: string
  project: string
  date: number
  returnDate: number | null
  qty: number
  conditionOut: string | null
  conditionIn: string | null
  isActive: boolean
}

/* ── Constants ── */
const MODULE_LABEL: Record<string, string>  = { equipment: 'Equipamentos', production: 'Acervo', patrimony: 'Patrimônio' }
const MODULE_COLOR: Record<string, string>  = { equipment: '#3b82f6', production: '#10b981', patrimony: '#8b5cf6' }
const MOVTYPE_LABEL: Record<string, string> = {
  saida: 'Saída', devolucao: 'Devolução', solicitacao: 'Solicitação', aprovacao: 'Aprovação', recusa: 'Recusa',
}
const MOVTYPE_COLOR: Record<string, string> = {
  saida: '#f59e0b', devolucao: '#10b981', solicitacao: '#8b5cf6', aprovacao: '#3b82f6', recusa: '#ef4444',
}
const COND_LABEL: Record<string, string> = { perfect: 'Perfeito', minor: 'Dano leve', major: 'Dano grave', bom: 'Bom', regular: 'Regular', ruim: 'Ruim' }

/* ── Helpers ── */
function dateLabel(ts: number): string {
  const d = new Date(ts)
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
function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtDateShort(ts: number): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function topN<T>(map: Map<string, T[]>, n = 10): [string, T[]][] {
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, n)
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
function ReportsPage() {
  const { data: equipment    = [] } = useSuspenseQuery(equipmentQueries.list())
  const { data: history      = [] } = useSuspenseQuery(checkoutHistoryQuery())
  const { data: production   = [] } = useSuspenseQuery(productionQueries.list())
  const { data: prodReqs     = [] } = useSuspenseQuery(productionQueries.withdrawalRequests())
  const { data: prodMoves    = [] } = useSuspenseQuery(productionQueries.movements())
  const { data: patrimony    = [] } = useSuspenseQuery(patrimonyQueries.list())
  const { data: patriReqs    = [] } = useSuspenseQuery(patrimonyQueries.withdrawalRequests())

  /* Filters */
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')
  const [histSearch,   setHistSearch]   = useState('')
  const [histStatus,   setHistStatus]   = useState<'all' | 'active' | 'returned'>('all')

  /* Lookup maps */
  const prodNameMap  = useMemo(() => new Map(production.map(p => [p.id, p.name])), [production])
  const patriNameMap = useMemo(() => new Map(patrimony.map(p => [p.id, p.name])), [patrimony])

  /* Metrics ── equipment */
  const eqInUse   = equipment.filter(e => e.status === 'in-use')
  const eqAvail   = equipment.filter(e => e.status === 'available')
  const eqMaint   = equipment.filter(e => e.status === 'maintenance')
  const eqValue   = equipment.reduce((s, e) => s + parseEquipmentValue(e.value), 0)

  /* Metrics ── production */
  const prodInUse   = production.filter(p => p.usedQty > 0)
  const prodAvail   = production.filter(p => p.usedQty === 0)
  const prodPending = prodReqs.filter(r => r.status === 'pending_approval')

  /* Metrics ── patrimony */
  const patriInUse   = patrimony.filter(p => p.status === 'emprestado' || p.status === 'em_uso')
  const patriAvail   = patrimony.filter(p => p.status === 'disponivel')
  const patriMaint   = patrimony.filter(p => p.status === 'manutencao')
  const patriExtrav  = patrimony.filter(p => p.status === 'extraviado')
  const patriLowered = patrimony.filter(p => p.status === 'baixado')
  const patriPending = patriReqs.filter(r => r.status === 'pending_approval')
  const patriValue   = patrimony.reduce((s, p) => s + (p.estimatedValue ?? 0), 0)

  /* KPI per module */
  const kpi = useMemo(() => {
    if (moduleFilter === 'equipment') return {
      total: equipment.length, available: eqAvail.length, inUse: eqInUse.length,
      maintenance: eqMaint.length, pending: 0, extraviado: 0, baixado: 0, value: eqValue,
    }
    if (moduleFilter === 'production') return {
      total: production.length, available: prodAvail.length, inUse: prodInUse.length,
      maintenance: 0, pending: prodPending.length, extraviado: 0, baixado: 0, value: 0,
    }
    if (moduleFilter === 'patrimony') return {
      total: patrimony.length, available: patriAvail.length, inUse: patriInUse.length,
      maintenance: patriMaint.length, pending: patriPending.length,
      extraviado: patriExtrav.length, baixado: patriLowered.length, value: patriValue,
    }
    return {
      total: equipment.length + production.length + patrimony.length,
      available: eqAvail.length + prodAvail.length + patriAvail.length,
      inUse: eqInUse.length + prodInUse.length + patriInUse.length,
      maintenance: eqMaint.length + patriMaint.length,
      pending: prodPending.length + patriPending.length,
      extraviado: patriExtrav.length,
      baixado: patriLowered.length,
      value: eqValue + patriValue,
    }
  }, [moduleFilter, equipment, production, patrimony,
      eqAvail, eqInUse, eqMaint, eqValue,
      prodAvail, prodInUse, prodPending,
      patriAvail, patriInUse, patriMaint, patriExtrav, patriLowered, patriPending, patriValue])

  /* Unified history entries */
  const allEntries = useMemo((): UnifiedEntry[] => {
    const entries: UnifiedEntry[] = []

    for (const h of history) {
      entries.push({
        id: `eq-${h.id}`, module: 'equipment',
        movType: h.checkedInAt === null ? 'saida' : 'devolucao',
        itemName: h.equipmentName ?? '—',
        responsible: h.responsible, project: h.project ?? '',
        date: h.checkedOutAt, returnDate: h.checkedInAt,
        qty: 1, conditionOut: null, conditionIn: h.returnCondition,
        isActive: h.checkedInAt === null,
      })
    }
    for (const m of prodMoves) {
      entries.push({
        id: `prod-${m.id}`, module: 'production',
        movType: m.checkedInAt === null ? 'saida' : 'devolucao',
        itemName: prodNameMap.get(m.itemId) ?? '—',
        responsible: m.responsible, project: m.project ?? '',
        date: m.checkedOutAt, returnDate: m.checkedInAt,
        qty: m.qty, conditionOut: m.conditionOut, conditionIn: m.statusAfterReturn,
        isActive: m.checkedInAt === null,
      })
    }
    for (const r of patriReqs) {
      entries.push({
        id: `patri-${r.id}`, module: 'patrimony',
        movType: r.status === 'pending_approval' ? 'solicitacao' : r.status === 'approved' ? 'aprovacao' : 'recusa',
        itemName: patriNameMap.get(r.itemId) ?? '—',
        responsible: r.responsibleUserName, project: r.projectOrClient ?? '',
        date: r.createdAt, returnDate: null,
        qty: 1, conditionOut: r.conditionOut, conditionIn: null,
        isActive: r.status === 'approved',
      })
    }

    return entries.sort((a, b) => b.date - a.date)
  }, [history, prodMoves, patriReqs, prodNameMap, patriNameMap])

  /* Apply module + date + text + status filters */
  const dateFromMs = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null
  const dateToMs   = dateTo   ? new Date(dateTo   + 'T23:59:59').getTime() : null

  const filteredEntries = useMemo(() => allEntries.filter(e => {
    if (moduleFilter !== 'all' && e.module !== moduleFilter.replace('production', 'production'))
      return false
    const matchMod =
      moduleFilter === 'all' ||
      (moduleFilter === 'equipment'  && e.module === 'equipment')  ||
      (moduleFilter === 'production' && e.module === 'production') ||
      (moduleFilter === 'patrimony'  && e.module === 'patrimony')
    if (!matchMod) return false
    if (histStatus === 'active'   && !e.isActive)  return false
    if (histStatus === 'returned' && e.isActive)   return false
    if (dateFromMs && e.date < dateFromMs) return false
    if (dateToMs   && e.date > dateToMs)  return false
    const q = histSearch.toLowerCase()
    if (q && !e.itemName.toLowerCase().includes(q) &&
             !e.responsible.toLowerCase().includes(q) &&
             !e.project.toLowerCase().includes(q)) return false
    return true
  }), [allEntries, moduleFilter, histStatus, dateFromMs, dateToMs, histSearch])

  /* Grouped by day */
  const historyGroups = useMemo(() => {
    const groups: Record<string, UnifiedEntry[]> = {}
    for (const e of filteredEntries) {
      const k = dayKey(e.date)
      if (!groups[k]) groups[k] = []
      groups[k].push(e)
    }
    return Object.entries(groups).map(([, items]) => ({ label: dateLabel(items[0].date), items }))
  }, [filteredEntries])

  /* Rankings */
  const byResponsible = useMemo(() => {
    const map = new Map<string, UnifiedEntry[]>()
    for (const e of allEntries.filter(e => moduleFilter === 'all' || e.module === moduleFilter.replace('production', 'production'))) {
      if (!e.responsible) continue
      const list = map.get(e.responsible) ?? []
      list.push(e)
      map.set(e.responsible, list)
    }
    return topN(map)
  }, [allEntries, moduleFilter])

  const byItem = useMemo(() => {
    const map = new Map<string, UnifiedEntry[]>()
    for (const e of allEntries.filter(e => moduleFilter === 'all' || e.module === moduleFilter.replace('production', 'production'))) {
      const list = map.get(e.itemName) ?? []
      list.push(e)
      map.set(e.itemName, list)
    }
    return topN(map)
  }, [allEntries, moduleFilter])

  const byProject = useMemo(() => {
    const map = new Map<string, UnifiedEntry[]>()
    for (const e of allEntries.filter(e => (moduleFilter === 'all' || e.module === moduleFilter.replace('production', 'production')) && e.project)) {
      const list = map.get(e.project) ?? []
      list.push(e)
      map.set(e.project, list)
    }
    return topN(map)
  }, [allEntries, moduleFilter])

  /* Category distribution */
  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    const include = (cat: string) => { map.set(cat, (map.get(cat) ?? 0) + 1) }
    if (moduleFilter === 'all' || moduleFilter === 'equipment')  equipment.forEach(e => include(e.category))
    if (moduleFilter === 'all' || moduleFilter === 'production') production.forEach(p => include(p.category))
    if (moduleFilter === 'all' || moduleFilter === 'patrimony')  patrimony.forEach(p => include(p.category))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [moduleFilter, equipment, production, patrimony])

  const totalCatItems = byCategory.reduce((s, [, n]) => s + n, 0)

  /* Export */
  function handleExport() {
    const wb = XLSX.utils.book_new()

    /* Sheet 1: Resumo */
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['AssetNE — Relatório Analítico', new Date().toLocaleString('pt-BR')],
      ['Filtro', moduleFilter === 'all' ? 'Todos os módulos' : MODULE_LABEL[moduleFilter]],
      [],
      ['Indicador', 'Valor'],
      ['Total de itens',  kpi.total],
      ['Disponíveis',     kpi.available],
      ['Em uso',          kpi.inUse],
      ['Em manutenção',   kpi.maintenance],
      ['Pendente',        kpi.pending],
      ['Extraviado',      kpi.extraviado],
      ['Baixado',         kpi.baixado],
      ['Valor estimado',  formatCurrency(kpi.value)],
    ]), 'Resumo')

    /* Sheet 2: Histórico */
    const histRows = [['Módulo', 'Tipo', 'Item', 'Responsável', 'Projeto', 'Data', 'Qtd', 'Cond. Saída', 'Cond. Retorno', 'Status']]
    for (const e of filteredEntries) {
      histRows.push([
        MODULE_LABEL[e.module], MOVTYPE_LABEL[e.movType],
        e.itemName, e.responsible, e.project,
        new Date(e.date).toLocaleString('pt-BR'),
        String(e.qty), e.conditionOut ?? '', e.conditionIn ?? '',
        e.isActive ? 'Ativo' : 'Encerrado',
      ])
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histRows), 'Histórico')

    /* Sheet 3: Ranking responsáveis */
    const respRows = [['Responsável', 'Total movimentações']]
    byResponsible.forEach(([name, items]) => respRows.push([name, String(items.length)]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(respRows), 'Ranking Responsáveis')

    /* Sheet 4: Ranking itens */
    const itemRows = [['Item', 'Total movimentações']]
    byItem.forEach(([name, items]) => itemRows.push([name, String(items.length)]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemRows), 'Ranking Itens')

    /* Sheet 5: Ranking projetos */
    const projRows = [['Projeto/Cliente', 'Total movimentações']]
    byProject.forEach(([name, items]) => projRows.push([name, String(items.length)]))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projRows), 'Ranking Projetos')

    XLSX.writeFile(wb, `assetne-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  /* Status distribution items */
  const statusDist = useMemo(() => {
    if (moduleFilter === 'equipment') return [
      { label: 'Disponíveis', value: eqAvail.length,  color: '#10b981' },
      { label: 'Em uso',      value: eqInUse.length,  color: '#f59e0b' },
      { label: 'Manutenção',  value: eqMaint.length,  color: '#a855f7' },
    ]
    if (moduleFilter === 'production') return [
      { label: 'Disponíveis', value: prodAvail.length,   color: '#10b981' },
      { label: 'Em uso',      value: prodInUse.length,   color: '#f59e0b' },
      { label: 'Pendentes',   value: prodPending.length, color: '#8b5cf6' },
    ]
    if (moduleFilter === 'patrimony') return [
      { label: 'Disponível',  value: patriAvail.length,   color: '#10b981' },
      { label: 'Em uso',      value: patriInUse.length,   color: '#f59e0b' },
      { label: 'Manutenção',  value: patriMaint.length,   color: '#a855f7' },
      { label: 'Pendente',    value: patriPending.length, color: '#8b5cf6' },
      { label: 'Extraviado',  value: patriExtrav.length,  color: '#ef4444' },
      { label: 'Baixado',     value: patriLowered.length, color: '#4a6380' },
    ]
    return [
      { label: 'Disponíveis',        value: eqAvail.length + prodAvail.length + patriAvail.length,     color: '#10b981' },
      { label: 'Em uso',             value: eqInUse.length + prodInUse.length + patriInUse.length,     color: '#f59e0b' },
      { label: 'Manutenção',         value: eqMaint.length + patriMaint.length,                        color: '#a855f7' },
      { label: 'Pendente aprovação', value: prodPending.length + patriPending.length,                  color: '#8b5cf6' },
      { label: 'Extraviados',        value: patriExtrav.length,                                        color: '#ef4444' },
      { label: 'Baixados',           value: patriLowered.length,                                       color: '#4a6380' },
    ]
  }, [moduleFilter, eqAvail, eqInUse, eqMaint, prodAvail, prodInUse, prodPending,
      patriAvail, patriInUse, patriMaint, patriPending, patriExtrav, patriLowered])

  return (
    <div className="animate-[fadeIn_0.3s_ease] space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}>
            Relatórios
          </h1>
          <p className="text-[13px]" style={{ color: '#3b5a7a' }}>Análise consolidada de todo o sistema AssetNE</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
        >
          <span>↓</span> Exportar Excel
        </button>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* Module tabs */}
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['all', 'equipment', 'production', 'patrimony'] as ModuleFilter[]).map(m => (
            <ModuleTab key={m} value={m} current={moduleFilter} onClick={setModuleFilter} />
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium" style={{ color: '#4a6380' }}>Período:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="rounded-md border border-white/10 bg-[#161b22] px-2.5 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#2563eb]" />
          <span className="text-[12px]" style={{ color: '#4a6380' }}>—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="rounded-md border border-white/10 bg-[#161b22] px-2.5 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#2563eb]" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo('') }}
              className="text-[11px] transition-colors hover:text-red-400" style={{ color: '#4a6380' }}>
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <StatCard value={kpi.total}       label="Total de itens"  accent="#3b82f6" />
        <StatCard value={kpi.available}   label="Disponíveis"     accent="#10b981" />
        <StatCard value={kpi.inUse}       label="Em uso"          accent="#f59e0b" />
        <StatCard value={kpi.maintenance} label="Manutenção"      accent="#a855f7" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        <StatCard value={kpi.pending}     label="Pendentes"       accent="#8b5cf6" />
        <StatCard value={kpi.extraviado}  label="Extraviados"     accent="#ef4444" />
        <StatCard value={kpi.baixado}     label="Baixados"        accent="#4a6380" />
        <StatCard
          value={0}
          label="Valor do inventário"
          accent="#58a6ff"
          valueText={formatCurrency(kpi.value)}
        />
      </div>

      {/* ── Distribution charts ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Status distribution */}
        <ChartCard title="Distribuição por Status">
          <div className="space-y-3">
            {statusDist.map(s => (
              <StatusBar key={s.label} label={s.label} value={s.value} total={kpi.total} color={s.color} />
            ))}
          </div>
        </ChartCard>

        {/* Module distribution (only when 'all') */}
        {moduleFilter === 'all' ? (
          <ChartCard title="Distribuição por Módulo">
            <div className="space-y-3">
              <StatusBar label="🎬 Equipamentos"      value={equipment.length} total={kpi.total} color="#3b82f6" />
              <StatusBar label="🎭 Acervo de Produção" value={production.length} total={kpi.total} color="#10b981" />
              <StatusBar label="🏛 Patrimônio"         value={patrimony.length} total={kpi.total} color="#8b5cf6" />
            </div>
          </ChartCard>
        ) : (
          <ChartCard title="Distribuição por Categoria">
            <div className="space-y-3">
              {byCategory.slice(0, 8).map(([cat, qty]) => (
                <StatusBar key={cat} label={`${CAT_ICON[cat] ?? '📦'} ${cat}`} value={qty} total={totalCatItems} color="#3b82f6" />
              ))}
              {byCategory.length === 0 && <p className="text-[12px]" style={{ color: '#2b4266' }}>Sem dados</p>}
            </div>
          </ChartCard>
        )}
      </div>

      {/* Category chart (when 'all') */}
      {moduleFilter === 'all' && (
        <ChartCard title="Distribuição por Categoria">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {byCategory.slice(0, 10).map(([cat, qty]) => (
              <StatusBar key={cat} label={`${CAT_ICON[cat] ?? '📦'} ${cat}`} value={qty} total={totalCatItems} color="#3b82f6" />
            ))}
            {byCategory.length === 0 && <p className="text-[12px]" style={{ color: '#2b4266' }}>Sem dados</p>}
          </div>
        </ChartCard>
      )}

      {/* ── Rankings ── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <RankingCard title="Top Responsáveis" icon="👤" entries={byResponsible} />
        <RankingCard title="Itens Mais Movimentados" icon="📦" entries={byItem} />
        <RankingCard title="Projetos / Clientes" icon="📋" entries={byProject} />
      </div>

      {/* ── Unified movement history ── */}
      <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        {/* History header */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold" style={{ color: '#eef2ff' }}>Histórico de Movimentações</span>
              <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", background: 'rgba(255,255,255,0.05)', color: '#8ba4bf' }}>
                {filteredEntries.length}
              </span>
            </div>
            <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['all', 'active', 'returned'] as const).map(f => (
                <button key={f} onClick={() => setHistStatus(f)}
                  className="rounded px-2.5 py-1 text-[11px] font-medium transition-all"
                  style={histStatus === f
                    ? { background: 'rgba(255,255,255,0.08)', color: '#eef2ff' }
                    : { color: '#4a6380' }}>
                  {f === 'all' ? 'Todos' : f === 'active' ? '🟡 Ativos' : '✓ Encerrados'}
                </button>
              ))}
            </div>
          </div>
          <input
            value={histSearch} onChange={e => setHistSearch(e.target.value)}
            placeholder="Buscar por item, responsável ou projeto..."
            className="w-full rounded-lg px-3 py-2 text-[12px] outline-none"
            style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
            onFocus={e  => (e.currentTarget.style.borderColor = '#2563eb')}
            onBlur={e   => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
          />
        </div>

        {historyGroups.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: '#2b4266' }}>Nenhum registro encontrado</div>
        ) : (
          historyGroups.map(({ label, items }) => (
            <div key={label}>
              <div className="flex items-center gap-3 px-4 py-2" style={{ background: 'rgba(255,255,255,0.015)' }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>{label}</span>
                <span className="text-[10px]" style={{ color: '#1e3a5c' }}>{items.length} registro{items.length !== 1 ? 's' : ''}</span>
              </div>
              {items.map((e, i) => (
                <HistoryEntryRow key={e.id} entry={e} isLast={i === items.length - 1} />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════════════════════════════ */

function ModuleTab({ value, current, onClick }: { value: ModuleFilter; current: ModuleFilter; onClick: (v: ModuleFilter) => void }) {
  const label = value === 'all' ? 'Todos' : value === 'equipment' ? 'Equipamentos' : value === 'production' ? 'Acervo' : 'Patrimônio'
  const active = value === current
  return (
    <button onClick={() => onClick(value)}
      className="rounded px-2.5 py-1 text-[11px] font-medium transition-all"
      style={active
        ? { background: value === 'all' ? 'rgba(37,99,235,0.2)' : `${MODULE_COLOR[value]}25`, color: value === 'all' ? '#60a5fa' : MODULE_COLOR[value] }
        : { color: '#4a6380' }}>
      {label}
    </button>
  )
}

function StatCard({ value, label, accent, valueText }: { value: number; label: string; accent: string; valueText?: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl px-4 py-4"
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', borderTop: `2px solid ${accent}` }}>
      <div className="pointer-events-none absolute top-0 right-0 h-20 w-20 rounded-full opacity-[0.06]"
        style={{ background: accent, filter: 'blur(24px)', transform: 'translate(30%, -30%)' }} />
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider" style={{ color: '#3b5a7a' }}>{label}</div>
      <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent }}>
        {valueText ?? value}
      </div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
      <h3 className="mb-4 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>{title}</h3>
      {children}
    </div>
  )
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[150px] shrink-0 truncate text-[12px]" style={{ color: '#8ba4bf' }}>{label}</div>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-14 shrink-0 text-right text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8ba4bf' }}>
        {value} <span style={{ color: '#2b4266' }}>({pct}%)</span>
      </div>
    </div>
  )
}

function RankingCard({ title, icon, entries }: { title: string; icon: string; entries: [string, UnifiedEntry[]][] }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
      <h3 className="mb-3 text-[13px] font-semibold" style={{ color: '#eef2ff' }}>{icon} {title}</h3>
      {entries.length === 0 ? (
        <p className="text-[12px]" style={{ color: '#2b4266' }}>Sem dados</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([name, items], idx) => {
            const pct = entries[0][1].length > 0 ? Math.round((items.length / entries[0][1].length) * 100) : 0
            return (
              <div key={name} className="flex items-center gap-2.5">
                <span className="w-4 shrink-0 text-center text-[11px] font-bold" style={{ color: idx === 0 ? '#f59e0b' : '#2b4266' }}>
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[12px] font-medium" style={{ color: '#d6e4f0' }}>{name}</span>
                    <span className="shrink-0 text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8ba4bf' }}>
                      {items.length}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: idx === 0 ? '#f59e0b' : 'rgba(255,255,255,0.15)' }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HistoryEntryRow({ entry, isLast }: { entry: UnifiedEntry; isLast: boolean }) {
  const modColor  = MODULE_COLOR[entry.module]
  const typeColor = MOVTYPE_COLOR[entry.movType]

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.012)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {/* Module + type badges */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `${modColor}18`, color: modColor }}>
          {entry.module === 'equipment' ? 'Equip' : entry.module === 'production' ? 'Acervo' : 'Patrim'}
        </span>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ background: `${typeColor}18`, color: typeColor }}>
          {MOVTYPE_LABEL[entry.movType]}
        </span>
      </div>

      {/* Item + responsible */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{entry.itemName}</span>
          {entry.qty > 1 && (
            <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#58a6ff' }}>×{entry.qty}</span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px]" style={{ color: '#4a6380' }}>
          <span style={{ color: '#8ba4bf' }}>{entry.responsible}</span>
          {entry.project && <><span style={{ color: '#2b4266' }}>→</span><span>{entry.project}</span></>}
        </div>
      </div>

      {/* Time + condition */}
      <div className="shrink-0 text-right">
        <div className="text-[11px] font-medium" style={{ color: typeColor }}>{fmtTime(entry.date)}</div>
        <div className="text-[10px]" style={{ color: '#3b5a7a' }}>{fmtDateShort(entry.date)}</div>
        {entry.conditionIn && (
          <div className="mt-0.5 text-[10px] font-medium" style={{ color: '#8ba4bf' }}>
            {COND_LABEL[entry.conditionIn] ?? entry.conditionIn}
          </div>
        )}
      </div>
    </div>
  )
}
