import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import {
  productionQueries,
  useDeleteProductionItemMutation,
  type ProductionItemWithUsage,
  type ProductionMovement,
  type ProductionWithdrawalRequest,
} from '~/lib/production/queries'
import { NewProductionItemModal } from '~/components/assetne/NewProductionItemModal'
import { EditProductionItemModal } from '~/components/assetne/EditProductionItemModal'
import { ProductionCheckOutModal } from '~/components/assetne/ProductionCheckOutModal'
import { ProductionCheckInModal } from '~/components/assetne/ProductionCheckInModal'
import { ProductionApprovalsPanel } from '~/components/assetne/ProductionApprovalsPanel'
import { ImageLightbox } from '~/components/assetne/ImageLightbox'
import { ProductionSkeleton } from '~/components/assetne/Skeleton'
import { ImportExcelModal } from '~/components/assetne/ImportExcelModal'
import { PROD_CAT_ICON } from '~/components/assetne/utils'
import { normalizeText } from '~/utils/format'
import { ColorBadge } from '~/components/assetne/ColorBadge'

export const Route = createFileRoute('/(app)/production/')({
  component: ProductionPage,
  pendingComponent: ProductionSkeleton,
})

type PageTab = 'items' | 'approvals' | 'history'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  disponivel: { label: 'Disponível', color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  em_uso:     { label: 'Em uso',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  manutencao: { label: 'Manutenção', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  extraviado: { label: 'Extraviado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  baixado:    { label: 'Baixado',    color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

const CONDITION_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  bom:     { label: 'Bom',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  regular: { label: 'Regular', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ruim:    { label: 'Ruim',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
}

const MOVE_LABEL: Record<string, string> = {
  created:              'Item cadastrado',
  updated:              'Item editado',
  checked_out:          'Retirada',
  checked_in:           'Devolução',
  withdrawal_requested: 'Retirada solicitada',
  withdrawal_rejected:  'Retirada recusada',
  withdrawal_cancelled: 'Solicitação cancelada',
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function ProductionPage() {
  const { session } = Route.useRouteContext() as any

  const { data: items    } = useSuspenseQuery(productionQueries.list())
  const { data: requests } = useSuspenseQuery(productionQueries.withdrawalRequests())
  const { data: movements } = useSuspenseQuery(productionQueries.movements())

  const isAdmin    = session?.role === 'admin'
  const isProdutor = session?.role === 'produtor'
  const canManage  = isAdmin || isProdutor

  const [tab,          setTab]          = useState<PageTab>('items')
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [showNew,      setShowNew]      = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [editItem,     setEditItem]     = useState<ProductionItemWithUsage | null>(null)
  const [checkoutItem, setCheckoutItem] = useState<ProductionItemWithUsage | null>(null)
  const [checkinItem,  setCheckinItem]  = useState<ProductionItemWithUsage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionItemWithUsage | null>(null)
  const [lightbox,     setLightbox]     = useState<{ src: string; alt: string } | null>(null)
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(50)

  const pendingCount = requests.filter((r) => r.status === 'pending_approval').length

  // KPIs
  const totalItems   = items.length
  const totalDisp    = items.filter((i) => i.availableQty > 0).length
  const totalInUse   = items.filter((i) => i.usedQty > 0).length
  const totalAvailQty = items.reduce((s, i) => s + i.availableQty, 0)
  const totalUsedQty  = items.reduce((s, i) => s + i.usedQty, 0)

  // Filtered + paginated items
  const filtered = items.filter((item) => {
    const q           = normalizeText(search)
    const matchSearch = !q || (
      normalizeText(item.name).includes(q) ||
      normalizeText(item.category).includes(q) ||
      (item.codigoInterno ? normalizeText(item.codigoInterno).includes(q) : false) ||
      (item.color        ? normalizeText(item.color).includes(q)         : false) ||
      (item.location     ? normalizeText(item.location).includes(q)      : false) ||
      (item.notes        ? normalizeText(item.notes).includes(q)         : false)
    )
    if (filter === 'all')        return matchSearch
    if (filter === 'disponivel') return matchSearch && item.availableQty > 0
    if (filter === 'em_uso')     return matchSearch && item.usedQty > 0
    if (filter === 'pendente')   return matchSearch && requests.some((r) => r.itemId === item.id && r.status === 'pending_approval')
    return matchSearch && item.status === filter
  })

  const totalFiltered = filtered.length
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginated     = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Export Excel
  function handleExport() {
    const rows = filtered.map((item) => ({
      'Código':           item.codigoInterno ?? '',
      'Nome':             item.name,
      'Categoria':        item.category,
      'Cor':              item.color ?? '',
      'Qtd. Total':       item.totalQty,
      'Qtd. Disponível':  item.availableQty,
      'Qtd. Em uso':      item.usedQty,
      'Status':           STATUS_BADGE[item.status]?.label ?? item.status,
      'Condição':         CONDITION_BADGE[item.condition]?.label ?? item.condition,
      'Localização':      item.location ?? '',
      'Observações':      item.notes ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Acervo de Produção')
    XLSX.writeFile(wb, `acervo_producao_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  const canViewApprovals = canManage || requests.some((r) => r.requestedByUserId === session?.id)

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="mb-1 text-[22px] font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}
          >
            Acervo de Produção
          </h1>
          <p className="text-[13px]" style={{ color: '#3b5a7a' }}>
            {totalItems} {totalItems === 1 ? 'item cadastrado' : 'itens cadastrados'}
            {totalInUse > 0 && <> · <span style={{ color: '#f59e0b' }}>{totalUsedQty} un. em uso</span></>}
            {pendingCount > 0 && <> · <span style={{ color: '#f59e0b' }}>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-lg px-4 py-2 text-[13px] font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#eef2ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8ba4bf')}
          >
            ↑ Excel
          </button>
          <button
            onClick={handleExport}
            className="rounded-lg px-4 py-2 text-[13px] font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#eef2ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8ba4bf')}
          >
            ↓ Exportar
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
          >
            + Novo item
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {totalItems > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <KpiCard label="Total de itens"    value={totalItems}    color="#8ba4bf" />
          <KpiCard label="Disponíveis"       value={totalDisp}     color="#10b981" sub={`${totalAvailQty} un.`} />
          <KpiCard label="Em uso"            value={totalInUse}    color="#f59e0b" sub={`${totalUsedQty} un.`} />
          <KpiCard
            label="Pendentes"
            value={pendingCount}
            color={pendingCount > 0 ? '#f59e0b' : '#3b5a7a'}
            onClick={canViewApprovals ? () => setTab('approvals') : undefined}
          />
        </div>
      )}

      {/* Tabs */}
      {(canViewApprovals) && (
        <div
          className="mb-4 flex gap-1 rounded-xl p-1"
          style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {[
            { id: 'items'    as PageTab, label: 'Itens'     },
            { id: 'approvals'as PageTab, label: 'Aprovações', badge: pendingCount },
            { id: 'history'  as PageTab, label: 'Histórico'  },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all"
              style={tab === t.id
                ? { background: '#162040', color: '#93c5fd' }
                : { color: '#4a6380' }}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span
                  className="rounded-full px-1.5 text-[10px] font-semibold"
                  style={
                    tab !== t.id
                      ? { background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }
                      : { background: 'rgba(255,255,255,0.1)', color: '#93c5fd' }
                  }
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Tab: Itens ─────────────────────────────────────────────── */}
      {tab === 'items' && (
        <>
          {/* Search + Filters */}
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nome, categoria, cor, código, localização..."
              className="min-w-[200px] flex-1 rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
              style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
            {[
              ['all',        'Todos'],
              ['disponivel', 'Disponíveis'],
              ['em_uso',     'Em uso'],
              ['pendente',   'Pendentes'],
              ['manutencao', 'Manutenção'],
              ['extraviado', 'Extraviados'],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => { setFilter(v); setPage(1) }}
                className="rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-all"
                style={
                  filter === v
                    ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }
                }
              >
                {l}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div
              className="rounded-xl py-10 text-center text-[13px]"
              style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', color: '#2b4266' }}
            >
              {items.length === 0 ? 'Nenhum item cadastrado ainda' : 'Nenhum item encontrado'}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Col headers */}
              <div
                className="hidden sm:grid px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider"
                style={{
                  gridTemplateColumns: '1fr 120px 80px 90px 110px 110px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  color: '#2b4266',
                }}
              >
                <div>Item</div>
                <div>Categoria</div>
                <div>Qtd</div>
                <div>Condição</div>
                <div>Status</div>
                <div className="text-right">Ações</div>
              </div>

              {paginated.map((item, i) => (
                <ProductionRow
                  key={item.id}
                  item={item}
                  isLast={i === paginated.length - 1}
                  canManage={canManage}
                  hasPending={requests.some((r) => r.itemId === item.id && r.status === 'pending_approval')}
                  session={session}
                  onEdit={() => setEditItem(item)}
                  onCheckOut={() => setCheckoutItem(item)}
                  onCheckIn={() => setCheckinItem(item)}
                  onRequestDelete={() => setDeleteTarget(item)}
                  onImageClick={item.photoUrl ? () => setLightbox({ src: item.photoUrl!, alt: item.name }) : undefined}
                />
              ))}
            </div>
          )}

          {/* Paginação */}
          {totalFiltered > pageSize && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px]" style={{ color: '#4a6380' }}>
                <span>
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalFiltered)} de {totalFiltered} itens
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="rounded-md px-2 py-0.5 text-[12px] outline-none"
                  style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
                >
                  {[25, 50, 100].map((n) => <option key={n} value={n}>{n}/pág.</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg px-3 py-1.5 text-[13px] disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
                >
                  ‹
                </button>
                <span className="px-2 text-[12px]" style={{ color: '#4a6380' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg px-3 py-1.5 text-[13px] disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Aprovações ───────────────────────────────────────── */}
      {tab === 'approvals' && session && (
        <ProductionApprovalsPanel session={session} />
      )}

      {/* ── Tab: Histórico ────────────────────────────────────────── */}
      {tab === 'history' && (
        <HistoryPanel movements={movements} items={items} />
      )}

      {/* Modals */}
      {showNew      && <NewProductionItemModal onClose={() => setShowNew(false)} />}
      {showImport   && <ImportExcelModal type="production" onClose={() => setShowImport(false)} />}
      {editItem     && <EditProductionItemModal item={editItem} onClose={() => setEditItem(null)} />}
      {checkoutItem && session && (
        <ProductionCheckOutModal item={checkoutItem} session={session} onClose={() => setCheckoutItem(null)} />
      )}
      {checkinItem  && <ProductionCheckInModal item={checkinItem} session={session} onClose={() => setCheckinItem(null)} />}
      {lightbox     && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {deleteTarget && <ConfirmDeleteModal item={deleteTarget} onClose={() => setDeleteTarget(null)} />}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, color, sub, onClick,
}: {
  label: string; value: number; color: string; sub?: string; onClick?: () => void
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 ${onClick ? 'cursor-pointer transition-all hover:opacity-80' : ''}`}
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
      onClick={onClick}
    >
      <div className="text-[11px]" style={{ color: '#3b5a7a' }}>{label}</div>
      <div className="mt-0.5 text-[22px] font-bold" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
      {sub && <div className="text-[10px]" style={{ color: '#2b4266' }}>{sub}</div>}
    </div>
  )
}

// ─── Production Row ────────────────────────────────────────────────────────────

function ProductionRow({
  item,
  isLast,
  canManage,
  hasPending,
  session,
  onEdit,
  onCheckOut,
  onCheckIn,
  onRequestDelete,
  onImageClick,
}: {
  item: ProductionItemWithUsage
  isLast: boolean
  canManage: boolean
  hasPending: boolean
  session: any
  onEdit: () => void
  onCheckOut: () => void
  onCheckIn: () => void
  onRequestDelete: () => void
  onImageClick?: () => void
}) {
  const icon      = PROD_CAT_ICON[item.category] ?? '🔹'
  const cond      = CONDITION_BADGE[item.condition] ?? CONDITION_BADGE.bom
  const statusB   = STATUS_BADGE[item.status] ?? STATUS_BADGE.disponivel
  const hasInUse  = item.usedQty > 0
  const hasAvail  = item.availableQty > 0

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 transition-colors sm:grid sm:items-center"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        gridTemplateColumns: '1fr 120px 80px 90px 110px 110px',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.015)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
    >
      {/* Foto + nome */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[20px] ${onImageClick ? 'cursor-pointer' : ''}`}
          style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}
          onClick={(e) => { if (onImageClick) { e.preventDefault(); e.stopPropagation(); onImageClick() } }}
        >
          {item.photoUrl ? (
            <img src={item.photoUrl} alt={item.name} className="h-full w-full rounded-xl object-cover transition-opacity hover:opacity-85" />
          ) : icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>
              {item.name}
            </span>
            {hasPending && (
              <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>
                pendente
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: '#3b5a7a' }}>
            {item.codigoInterno && (
              <span style={{ color: '#58a6ff', fontFamily: "'JetBrains Mono', monospace" }}>
                #{item.codigoInterno}
              </span>
            )}
            {item.color && <ColorBadge color={item.color} />}
            {item.location && <span>{item.location}</span>}
            <span className="sm:hidden">{item.category}</span>
          </div>
        </div>
      </div>

      {/* Categoria */}
      <div className="hidden sm:block text-[12px]" style={{ color: '#4a6380' }}>
        {item.category}
      </div>

      {/* Qtd */}
      <div className="hidden sm:block">
        <div className="text-[12px] font-medium" style={{ color: '#d6e4f0' }}>
          {item.availableQty}/{item.totalQty}
        </div>
        {hasInUse && (
          <div className="text-[11px]" style={{ color: '#f59e0b' }}>{item.usedQty} em uso</div>
        )}
      </div>

      {/* Condição */}
      <div className="hidden sm:block">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: cond.bg, color: cond.color }}
        >
          {cond.label}
        </span>
      </div>

      {/* Status */}
      <div className="hidden sm:block">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: statusB.bg, color: statusB.color }}
        >
          {statusB.label}
        </span>
      </div>

      {/* Ações — desktop */}
      <div className="ml-auto hidden sm:flex items-center justify-end gap-1">
        {hasAvail && (
          <ActionBtn
            title={canManage ? 'Registrar retirada' : 'Solicitar retirada'}
            onClick={(e) => { e.stopPropagation(); onCheckOut() }}
            hoverColor="#3b82f6"
            hoverBg="rgba(59,130,246,0.1)"
          >
            ↑
          </ActionBtn>
        )}
        {hasInUse && (
          <ActionBtn
            title="Registrar devolução"
            onClick={(e) => { e.stopPropagation(); onCheckIn() }}
            hoverColor="#10b981"
            hoverBg="rgba(16,185,129,0.1)"
          >
            ↓
          </ActionBtn>
        )}
        <ActionBtn title="Editar" onClick={(e) => { e.stopPropagation(); onEdit() }}>✎</ActionBtn>
        {item.usedQty === 0 && canManage && (
          <ActionBtn
            title="Excluir"
            onClick={(e) => { e.stopPropagation(); onRequestDelete() }}
            hoverColor="#ef4444"
            hoverBg="rgba(239,68,68,0.1)"
          >
            ✕
          </ActionBtn>
        )}
      </div>

      {/* Ações — mobile */}
      <div className="ml-auto flex items-center gap-1 sm:hidden">
        {hasAvail && (
          <ActionBtn
            title="Retirada"
            onClick={(e) => { e.stopPropagation(); onCheckOut() }}
            hoverColor="#3b82f6"
            hoverBg="rgba(59,130,246,0.1)"
          >
            ↑
          </ActionBtn>
        )}
        {hasInUse && (
          <ActionBtn
            title="Devolução"
            onClick={(e) => { e.stopPropagation(); onCheckIn() }}
            hoverColor="#10b981"
            hoverBg="rgba(16,185,129,0.1)"
          >
            ↓
          </ActionBtn>
        )}
      </div>
    </div>
  )
}

// ─── History Panel ─────────────────────────────────────────────────────────────

function HistoryPanel({
  movements,
  items,
}: {
  movements: ProductionMovement[]
  items: ProductionItemWithUsage[]
}) {
  const [search, setSearch] = useState('')
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]))

  const filtered = movements.filter((m) => {
    if (!search.trim()) return true
    const q    = normalizeText(search)
    const item = itemMap[m.itemId]
    return (
      normalizeText(item?.name ?? '').includes(q) ||
      normalizeText(m.responsible ?? '').includes(q) ||
      normalizeText(m.project ?? '').includes(q) ||
      normalizeText(m.type).includes(q)
    )
  })

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por item, responsável, projeto..."
        className="mb-4 w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
        style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl py-10 text-center text-[13px]" style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#2b4266' }}>
          Nenhuma movimentação encontrada
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((m) => {
            const item  = itemMap[m.itemId]
            const label = MOVE_LABEL[m.type] ?? m.type
            const isOut = m.type === 'checked_out'
            const isIn  = !!m.checkedInAt && m.type === 'checked_out'
            return (
              <div
                key={m.id}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px]"
                  style={{ background: isOut && !isIn ? 'rgba(245,158,11,0.1)' : isIn ? 'rgba(16,185,129,0.1)' : 'rgba(139,164,191,0.07)' }}
                >
                  {isIn ? '↓' : isOut ? '↑' : '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[13px] font-medium" style={{ color: '#d6e4f0' }}>
                        {item?.name ?? m.itemId}
                      </span>
                      {m.qty > 0 && m.type !== 'created' && m.type !== 'updated' && (
                        <span className="ml-1.5 text-[12px]" style={{ color: '#4a6380' }}>
                          {m.qty} un.
                        </span>
                      )}
                    </div>
                    <span className="text-[11px]" style={{ color: '#2b4266' }}>
                      {fmtDate(m.checkedOutAt)}
                    </span>
                  </div>
                  <div className="text-[11px]" style={{ color: '#4a6380' }}>
                    <span style={{ color: '#6b8fa8' }}>{label}</span>
                    {m.responsible && m.type !== 'created' && m.type !== 'updated' && (
                      <> · {m.responsible}</>
                    )}
                    {m.project && <> · {m.project}</>}
                    {m.checkedOutByName && (
                      <> · por <span style={{ color: '#8ba4bf' }}>{m.checkedOutByName}</span></>
                    )}
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

// ─── Confirm Delete ─────────────────────────────────────────────────────────────

function ConfirmDeleteModal({ item, onClose }: { item: ProductionItemWithUsage; onClose: () => void }) {
  const deleteMutation = useDeleteProductionItemMutation()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="mb-1 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full text-[18px]"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
            ✕
          </span>
          <h2 className="text-[15px] font-semibold" style={{ color: '#eef2ff' }}>Remover item</h2>
        </div>
        <p className="mb-5 mt-3 text-[13px] leading-relaxed" style={{ color: '#8ba4bf' }}>
          Tem certeza que deseja remover{' '}
          <span style={{ color: '#eef2ff', fontWeight: 600 }}>"{item.name}"</span>?
          Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg px-4 py-2 text-[13px] transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8ba4bf' }}
          >
            Cancelar
          </button>
          <button
            onClick={async () => { await deleteMutation.mutateAsync(item.id); onClose() }}
            disabled={deleteMutation.isPending}
            className="flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          >
            {deleteMutation.isPending ? 'Removendo...' : 'Sim, remover'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({
  children, onClick, title, disabled,
  hoverColor = '#8ba4bf', hoverBg = 'rgba(255,255,255,0.06)',
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  title?: string
  disabled?: boolean
  hoverColor?: string
  hoverBg?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="rounded px-1.5 py-0.5 text-[12px] transition-colors disabled:opacity-40"
      style={{ color: '#4a6380' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a6380' }}
    >
      {children}
    </button>
  )
}
