import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import {
  equipmentQueries,
  useDeleteEquipmentMutation,
  useSetAvailableMutation,
  useSetMaintenanceMutation,
  type EquipmentWithCheckout,
} from '~/lib/equipment/queries'
import { checkoutHistoryQuery, type CheckoutRecord } from '~/lib/checkout/queries'
import { NewEquipModal }      from '~/components/assetne/NewEquipModal'
import { EditEquipModal }     from '~/components/assetne/EditEquipModal'
import { EquipQRModal }       from '~/components/assetne/EquipQRModal'
import { CheckOutModal }      from '~/components/assetne/CheckOutModal'
import { CheckInModal }       from '~/components/assetne/CheckInModal'
import { ImportExcelModal }   from '~/components/assetne/ImportExcelModal'
import { ImageLightbox }      from '~/components/assetne/ImageLightbox'
import { EquipmentsSkeleton } from '~/components/assetne/Skeleton'
import { CAT_ICON }           from '~/components/assetne/utils'
import { displayEquipmentValue, normalizeText } from '~/utils/format'
import type { SessionUser }   from '~/lib/auth/session'

export const Route = createFileRoute('/(app)/equipments/')({
  component: EquipmentsPage,
  pendingComponent: EquipmentsSkeleton,
})

type PageTab = 'items' | 'in_use' | 'history'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  available:   { label: 'Disponível', color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  'in-use':    { label: 'Em uso',     color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  maintenance: { label: 'Manutenção', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
}

const CONDITION_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  new:     { label: 'Novo',    color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  good:    { label: 'Bom',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  regular: { label: 'Regular', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

const RETURN_COND: Record<string, { label: string; color: string }> = {
  perfect: { label: 'Perfeito',   color: '#10b981' },
  minor:   { label: 'Dano leve',  color: '#f59e0b' },
  major:   { label: 'Dano grave', color: '#ef4444' },
}

const FILTERS = [
  ['all',         'Todos'],
  ['available',   'Disponíveis'],
  ['in-use',      'Em uso'],
  ['maintenance', 'Manutenção'],
] as const

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDateOnly(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function getDeadlineStatus(expectedReturn: string | null) {
  if (!expectedReturn) return null
  const today = new Date().toISOString().slice(0, 10)
  if (expectedReturn < today) return 'late' as const
  if (expectedReturn === today) return 'today' as const
  return 'ok' as const
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function EquipmentsPage() {
  const { session } = Route.useRouteContext() as { session: SessionUser }

  const { data: equipment } = useSuspenseQuery(equipmentQueries.list())
  const { data: history }   = useSuspenseQuery(checkoutHistoryQuery())

  const isAdmin = session?.role === 'admin'

  const [tab,          setTab]          = useState<PageTab>('items')
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(50)
  const [showNew,      setShowNew]      = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showCheckin,  setShowCheckin]  = useState(false)
  const [checkoutItem, setCheckoutItem] = useState<EquipmentWithCheckout | null>(null)
  const [checkinItem,  setCheckinItem]  = useState<EquipmentWithCheckout | null>(null)
  const [editItem,     setEditItem]     = useState<EquipmentWithCheckout | null>(null)
  const [qrItem,       setQrItem]       = useState<EquipmentWithCheckout | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EquipmentWithCheckout | null>(null)
  const [lightbox,     setLightbox]     = useState<{ src: string; alt: string } | null>(null)

  const totalItems       = equipment.length
  const availableCount   = equipment.filter((e) => e.status === 'available').length
  const inUseCount       = equipment.filter((e) => e.status === 'in-use').length
  const maintenanceCount = equipment.filter((e) => e.status === 'maintenance').length
  const inUseItems       = equipment.filter((e) => e.status === 'in-use' && e.activeCheckout !== null)

  function filterCount(val: string) {
    if (val === 'available')   return availableCount
    if (val === 'in-use')      return inUseCount
    if (val === 'maintenance') return maintenanceCount
    return totalItems
  }

  const filtered = equipment.filter((e) => {
    const q           = normalizeText(search)
    const matchSearch = !q || (
      normalizeText(e.name).includes(q) ||
      normalizeText(e.category).includes(q) ||
      (e.codigo                        ? normalizeText(e.codigo).includes(q)                             : false) ||
      (e.serialNumber                  ? normalizeText(e.serialNumber).includes(q)                       : false) ||
      (e.activeCheckout?.responsible   ? normalizeText(e.activeCheckout.responsible).includes(q)         : false) ||
      (e.activeCheckout?.project       ? normalizeText(e.activeCheckout.project).includes(q)             : false)
    )
    return matchSearch && (filter === 'all' || e.status === filter)
  })

  const totalFiltered = filtered.length
  const totalPages    = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginated     = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleExport() {
    const rows = filtered.map((e) => ({
      'Código':       e.codigo ?? '',
      'Nome':         e.name,
      'Categoria':    e.category,
      'Status':       STATUS_BADGE[e.status]?.label ?? e.status,
      'Condição':     CONDITION_BADGE[e.condition]?.label ?? e.condition,
      'Responsável':  e.activeCheckout?.responsible ?? '',
      'Projeto':      e.activeCheckout?.project ?? '',
      'Saída em':     e.activeCheckout ? fmtDateOnly(e.activeCheckout.checkedOutAt) : '',
      'Dev. prevista': e.activeCheckout?.expectedReturn ?? '',
      'Nº de Série':  e.serialNumber ?? '',
      'Valor':        displayEquipmentValue(e.value),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Equipamentos')
    XLSX.writeFile(wb, `equipamentos_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="animate-[fadeIn_0.3s_ease]">

      {/* ── Header ── */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="mb-1 text-[22px] font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}
          >
            Equipamentos
          </h1>
          <p className="text-[13px]" style={{ color: '#3b5a7a' }}>
            Câmeras, lentes, iluminação e acessórios
            {totalItems > 0 && (
              <> · <span style={{ color: '#8ba4bf' }}>{totalItems} {totalItems === 1 ? 'item' : 'itens'}</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
          >
            Importar Excel
          </button>
          {totalItems > 0 && (
            <button
              onClick={handleExport}
              className="rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
            >
              Exportar Excel
            </button>
          )}
          <button
            onClick={() => setShowCheckin(true)}
            className="rounded-lg px-3 py-2 text-[13px] font-semibold transition-all"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
          >
            Devolução
          </button>
          <button
            onClick={() => setShowCheckout(true)}
            className="rounded-lg px-3 py-2 text-[13px] font-semibold transition-all"
            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6' }}
          >
            Nova Saída
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
          >
            + Cadastrar
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {totalItems > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total" value={totalItems} color="#3b82f6" />
          <StatCard
            label="Disponíveis" value={availableCount} color="#10b981"
            onClick={availableCount > 0 ? () => { setTab('items'); setFilter('available'); setPage(1) } : undefined}
          />
          <StatCard
            label="Em uso" value={inUseCount} color="#f59e0b"
            onClick={inUseCount > 0 ? () => setTab('in_use') : undefined}
          />
          <StatCard
            label="Manutenção" value={maintenanceCount} color={maintenanceCount > 0 ? '#8b5cf6' : '#4a6380'}
            onClick={maintenanceCount > 0 ? () => { setTab('items'); setFilter('maintenance'); setPage(1) } : undefined}
          />
        </div>
      )}

      {/* ── Tabs ── */}
      <div
        className="mb-5 flex w-fit gap-1 rounded-xl p-1"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {([
          { id: 'items'   as PageTab, label: 'Itens'    },
          { id: 'in_use'  as PageTab, label: 'Em Uso',  badge: inUseCount },
          { id: 'history' as PageTab, label: 'Histórico' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all"
            style={tab === t.id ? { background: '#162040', color: '#93c5fd' } : { color: '#4a6380' }}
          >
            {t.label}
            {'badge' in t && t.badge != null && t.badge > 0 && (
              <span
                className="rounded-full px-1.5 text-[10px] font-bold"
                style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Itens ── */}
      {tab === 'items' && (
        <>
          {/* Filters + Search */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div
              className="flex flex-wrap gap-1 rounded-xl p-1"
              style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {FILTERS.map(([val, label]) => {
                const count = val !== 'all' ? filterCount(val) : 0
                return (
                  <button
                    key={val}
                    onClick={() => { setFilter(val); setPage(1) }}
                    className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
                    style={filter === val ? { background: '#162040', color: '#93c5fd' } : { color: '#4a6380' }}
                  >
                    {label}
                    {val !== 'all' && count > 0 && (
                      <span className="ml-1.5 opacity-60">{count}</span>
                    )}
                  </button>
                )
              })}
            </div>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nome, categoria, código, responsável..."
              className="min-w-[200px] flex-1 rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
              style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
              onFocus={(e)  => (e.currentTarget.style.borderColor = '#2563eb')}
              onBlur={(e)   => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="rounded-xl py-16 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="mb-2 text-[32px]">📷</div>
              <div className="text-[14px] font-medium" style={{ color: '#2b4266' }}>
                {search || filter !== 'all' ? 'Nenhum equipamento encontrado' : 'Nenhum equipamento cadastrado'}
              </div>
              {!search && filter === 'all' && (
                <button
                  onClick={() => setShowNew(true)}
                  className="mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
                >
                  + Cadastrar primeiro equipamento
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Equipamento</th>
                      <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider md:table-cell" style={{ color: '#3b5a7a' }}>Categoria</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Status</th>
                      <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider lg:table-cell" style={{ color: '#3b5a7a' }}>Responsável</th>
                      <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider xl:table-cell" style={{ color: '#3b5a7a' }}>Código / Valor</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((eq, i) => (
                      <EquipRow
                        key={eq.id}
                        eq={eq}
                        isLast={i === paginated.length - 1}
                        isAdmin={isAdmin}
                        onCheckOut={() => setCheckoutItem(eq)}
                        onCheckIn={() => setCheckinItem(eq)}
                        onEdit={() => setEditItem(eq)}
                        onQR={() => setQrItem(eq)}
                        onRequestDelete={() => setDeleteTarget(eq)}
                        onImageClick={eq.photoUrl ? () => setLightbox({ src: eq.photoUrl!, alt: `Foto de ${eq.name}` }) : undefined}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
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
                >‹</button>
                <span className="px-2 text-[12px]" style={{ color: '#4a6380' }}>{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg px-3 py-1.5 text-[13px] disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
                >›</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Em Uso ── */}
      {tab === 'in_use' && (
        <InUsePanel
          items={inUseItems}
          onCheckIn={(eq) => {
            if (eq) setCheckinItem(eq)
            else setShowCheckin(true)
          }}
        />
      )}

      {/* ── Tab: Histórico ── */}
      {tab === 'history' && (
        <HistoryPanel history={history} />
      )}

      {/* ── Modals ── */}
      {showNew      && <NewEquipModal onClose={() => setShowNew(false)} />}
      {showImport   && <ImportExcelModal type="equipment" onClose={() => setShowImport(false)} />}
      {editItem     && <EditEquipModal equipment={editItem} onClose={() => setEditItem(null)} />}
      {qrItem       && <EquipQRModal equipment={qrItem} onClose={() => setQrItem(null)} />}
      {lightbox     && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {deleteTarget && <ConfirmDeleteModal equipment={deleteTarget} onClose={() => setDeleteTarget(null)} />}

      {(showCheckout || checkoutItem) && (
        <CheckOutModal
          equipment={equipment}
          preSelectedId={checkoutItem?.id}
          onClose={() => { setShowCheckout(false); setCheckoutItem(null) }}
        />
      )}
      {(showCheckin || checkinItem) && (
        <CheckInModal
          equipment={equipment}
          preSelectedId={checkinItem?.id}
          session={session}
          onClose={() => { setShowCheckin(false); setCheckinItem(null) }}
        />
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, color, sub, onClick,
}: {
  label: string; value: number; color: string; sub?: string; onClick?: () => void
}) {
  return (
    <div
      className={`rounded-xl p-4 ${onClick ? 'cursor-pointer transition-all hover:opacity-80' : ''}`}
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)', borderTop: `2px solid ${color}` }}
      onClick={onClick}
    >
      <div className="text-[22px] font-bold" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      <div className="mt-0.5 text-[12px]" style={{ color: '#4a6380' }}>{label}</div>
      {sub && <div className="mt-0.5 text-[11px]" style={{ color: '#3b5a7a' }}>{sub}</div>}
    </div>
  )
}

// ─── Equipment Row ────────────────────────────────────────────────────────────

function EquipRow({
  eq,
  isLast,
  isAdmin,
  onCheckOut,
  onCheckIn,
  onEdit,
  onQR,
  onRequestDelete,
  onImageClick,
}: {
  eq:              EquipmentWithCheckout
  isLast:          boolean
  isAdmin:         boolean
  onCheckOut:      () => void
  onCheckIn:       () => void
  onEdit:          () => void
  onQR:            () => void
  onRequestDelete: () => void
  onImageClick?:   () => void
}) {
  const icon       = CAT_ICON[eq.category] ?? '📦'
  const statusB    = STATUS_BADGE[eq.status]     ?? STATUS_BADGE.available
  const restoreMut = useSetAvailableMutation()
  const maintenMut = useSetMaintenanceMutation()

  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>

      {/* Equipamento */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${onImageClick ? 'cursor-pointer' : ''}`}
            style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)' }}
            onClick={(e) => { if (onImageClick) { e.preventDefault(); e.stopPropagation(); onImageClick() } }}
          >
            {eq.photoUrl ? (
              <img src={eq.photoUrl} alt={eq.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[16px]">{icon}</span>
            )}
          </div>
          <div className="min-w-0">
            <Link
              to="/equipments/$equipmentId"
              params={{ equipmentId: eq.id }}
              className="text-[13px] font-medium transition-colors hover:underline"
              style={{ color: '#eef2ff' }}
            >
              {eq.name}
            </Link>
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#3b5a7a' }}>
              {eq.codigo && (
                <span style={{ color: '#58a6ff', fontFamily: "'JetBrains Mono', monospace" }}>#{eq.codigo}</span>
              )}
              {eq.serialNumber && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>S/N {eq.serialNumber}</span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Categoria */}
      <td className="hidden px-4 py-3 md:table-cell">
        <span className="text-[12px]" style={{ color: '#8ba4bf' }}>{eq.category}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
          style={{ background: statusB.bg, color: statusB.color }}
        >
          {statusB.label}
        </span>
      </td>

      {/* Responsável */}
      <td className="hidden px-4 py-3 lg:table-cell">
        {eq.activeCheckout ? (
          <div>
            <div className="text-[12px]" style={{ color: '#8ba4bf' }}>{eq.activeCheckout.responsible}</div>
            {eq.activeCheckout.project && (
              <div className="text-[11px]" style={{ color: '#3b5a7a' }}>{eq.activeCheckout.project}</div>
            )}
          </div>
        ) : (
          <span className="text-[12px]" style={{ color: '#2b4266' }}>—</span>
        )}
      </td>

      {/* Código / Valor */}
      <td className="hidden px-4 py-3 xl:table-cell">
        <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#4a6380' }}>
          {displayEquipmentValue(eq.value)}
        </span>
      </td>

      {/* Ações */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {eq.status === 'available' && (
            <button
              onClick={(e) => { e.stopPropagation(); onCheckOut() }}
              className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
              style={{ color: '#3b82f6' }}
            >
              Retirar
            </button>
          )}
          {eq.status === 'in-use' && (
            <button
              onClick={(e) => { e.stopPropagation(); onCheckIn() }}
              className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
              style={{ color: '#10b981' }}
            >
              Devolver
            </button>
          )}
          {eq.status === 'maintenance' && isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); restoreMut.mutate(eq.id) }}
              disabled={restoreMut.isPending}
              className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-40"
              style={{ color: '#10b981' }}
            >
              Disponível
            </button>
          )}
          {eq.status !== 'in-use' && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="rounded-md px-2 py-1 text-[11px] transition-colors"
              style={{ color: '#3b5a7a' }}
            >
              Editar
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onQR() }}
            className="rounded-md px-2 py-1 text-[11px] transition-colors"
            style={{ color: '#3b5a7a' }}
          >
            QR
          </button>
          {eq.status === 'available' && isAdmin && (
            <button
              onClick={(e) => { e.stopPropagation(); maintenMut.mutate(eq.id) }}
              disabled={maintenMut.isPending}
              className="rounded-md px-2 py-1 text-[11px] transition-colors disabled:opacity-40"
              style={{ color: '#8b5cf6' }}
            >
              Manutenção
            </button>
          )}
          {eq.status === 'available' && (
            <button
              onClick={(e) => { e.stopPropagation(); onRequestDelete() }}
              className="rounded-md px-2 py-1 text-[11px] transition-colors"
              style={{ color: '#ef4444' }}
            >
              Excluir
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── Em Uso Panel — helpers ──────────────────────────────────────────────────

type InUseGroup = {
  responsible:        string
  responsibleRole:    string | null
  checkedOutByUserId: string | null
  items:              EquipmentWithCheckout[]
  projects:           string[]
  earliestReturn:     string | null
  deadlineStatus:     'late' | 'today' | 'ok' | null
  checkedOutAt:       number
}

function buildGroups(items: EquipmentWithCheckout[]): InUseGroup[] {
  const map = new Map<string, InUseGroup>()
  for (const eq of items) {
    const c   = eq.activeCheckout!
    const key = c.responsible.toLowerCase().trim()
    if (!map.has(key)) {
      map.set(key, {
        responsible:        c.responsible,
        responsibleRole:    c.responsibleRole,
        checkedOutByUserId: c.checkedOutByUserId,
        items:              [],
        projects:           [],
        earliestReturn:     null,
        deadlineStatus:     null,
        checkedOutAt:       c.checkedOutAt,
      })
    }
    const g = map.get(key)!
    g.items.push(eq)
    if (c.project && !g.projects.includes(c.project)) g.projects.push(c.project)
    if (c.expectedReturn && (!g.earliestReturn || c.expectedReturn < g.earliestReturn))
      g.earliestReturn = c.expectedReturn
    if (c.checkedOutAt < g.checkedOutAt) g.checkedOutAt = c.checkedOutAt
  }
  for (const g of map.values()) g.deadlineStatus = getDeadlineStatus(g.earliestReturn)
  return [...map.values()].sort((a, b) => a.responsible.localeCompare(b.responsible))
}

function avatarColor(name: string) {
  const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#f97316', '#ec4899']
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return palette[Math.abs(h) % palette.length]
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── Em Uso Panel ─────────────────────────────────────────────────────────────

function InUsePanel({
  items,
  onCheckIn,
}: {
  items:     EquipmentWithCheckout[]
  onCheckIn: (eq: EquipmentWithCheckout | null) => void
}) {
  const [search, setSearch] = useState('')
  const groups   = buildGroups(items)
  const filtered = groups.filter((g) => {
    if (!search.trim()) return true
    const q = normalizeText(search)
    return (
      normalizeText(g.responsible).includes(q) ||
      g.projects.some((p) => normalizeText(p).includes(q)) ||
      g.items.some(
        (eq) =>
          normalizeText(eq.name).includes(q) ||
          (eq.codigo ? normalizeText(eq.codigo).includes(q) : false),
      )
    )
  })

  return (
    <div>
      {/* Cabeçalho da seção */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-semibold" style={{ color: '#d6e4f0' }}>Em uso agora</span>
          {groups.length > 0 && (
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              {groups.length} {groups.length === 1 ? 'responsável' : 'responsáveis'} · {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar responsável, projeto, item..."
          className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-all sm:w-[260px]"
          style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
          onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
        />
      </div>

      {/* Estados */}
      {items.length === 0 ? (
        <div className="rounded-xl py-16 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="mb-2 text-[32px]">✓</div>
          <div className="text-[14px] font-medium" style={{ color: '#2b4266' }}>
            Nenhum equipamento em uso no momento
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl py-10 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[13px]" style={{ color: '#2b4266' }}>
            Nenhum resultado para "{search}"
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((group) => (
            <InUseCard key={group.responsible} group={group} onCheckIn={onCheckIn} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Em Uso Card ──────────────────────────────────────────────────────────────

function InUseCard({
  group,
  onCheckIn,
}: {
  group:     InUseGroup
  onCheckIn: (eq: EquipmentWithCheckout | null) => void
}) {
  const color     = avatarColor(group.responsible)
  const initials  = getInitials(group.responsible)
  const daysSince = Math.floor((Date.now() - group.checkedOutAt) / 86_400_000)

  const deadlineStyle =
    group.deadlineStatus === 'late'  ? { background: 'rgba(239,68,68,0.12)',   color: '#ef4444' } :
    group.deadlineStatus === 'today' ? { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' } :
                                        { background: 'rgba(16,185,129,0.1)',  color: '#10b981' }

  function handleDevolver() {
    onCheckIn(group.items.length === 1 ? group.items[0] : null)
  }

  return (
    <div
      className="flex flex-col rounded-xl"
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* ── Header: avatar + nome + badge ── */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
            style={{ background: color, boxShadow: `0 0 0 2px ${color}33` }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold" style={{ color: '#eef2ff' }}>
              {group.responsible}
            </div>
            <div className="truncate text-[11px]" style={{ color: '#4a6380' }}>
              {group.responsibleRole ?? (daysSince === 0 ? 'Retirou hoje' : `há ${daysSince}d`)}
            </div>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={{ background: `${color}1a`, color, border: `1px solid ${color}30` }}
        >
          {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>

      {/* ── Divisor ── */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />

      {/* ── Projeto + prazo ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="shrink-0 text-[12px]" style={{ color: '#3b5a7a' }}>📁</span>
          {group.projects.length > 0 ? (
            <span className="truncate text-[12px]" style={{ color: '#8ba4bf' }}>
              {group.projects.length === 1
                ? group.projects[0]
                : `${group.projects[0]} +${group.projects.length - 1}`}
            </span>
          ) : (
            <span className="text-[12px]" style={{ color: '#2b4266' }}>Sem projeto</span>
          )}
        </div>
        {group.earliestReturn && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
            style={deadlineStyle}
          >
            📅{' '}
            {group.deadlineStatus === 'late'
              ? 'Atrasado'
              : group.deadlineStatus === 'today'
              ? 'Hoje'
              : group.earliestReturn}
          </span>
        )}
      </div>

      {/* ── Chips dos equipamentos ── */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        {group.items.map((eq) => {
          const icon = CAT_ICON[eq.category] ?? '📦'
          return (
            <Link
              key={eq.id}
              to="/equipments/$equipmentId"
              params={{ equipmentId: eq.id }}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all hover:opacity-75"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border:     '1px solid rgba(255,255,255,0.08)',
                color:      '#8ba4bf',
              }}
            >
              <span className="text-[11px]">{icon}</span>
              <span className="max-w-[120px] truncate">{eq.name}</span>
              {eq.codigo && (
                <span style={{ color: '#4a6380', fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                  #{eq.codigo}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* ── Divisor ── */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

      {/* ── Footer: tempo + ação ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5">
        <span className="text-[11px]" style={{ color: '#3b5a7a' }}>
          {group.responsibleRole
            ? `${group.responsibleRole} · ${daysSince === 0 ? 'hoje' : `há ${daysSince}d`}`
            : daysSince === 0
            ? 'Retirou hoje'
            : `Retirou há ${daysSince}d`}
        </span>
        <button
          onClick={handleDevolver}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all hover:opacity-80"
          style={{
            background: 'rgba(16,185,129,0.1)',
            border:     '1px solid rgba(16,185,129,0.25)',
            color:      '#10b981',
          }}
        >
          Devolver
        </button>
      </div>
    </div>
  )
}

// ─── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel({ history }: { history: CheckoutRecord[] }) {
  const [search, setSearch] = useState('')

  const filtered = history.filter((row) => {
    if (!search.trim()) return true
    const q = normalizeText(search)
    return (
      normalizeText(row.equipmentName ?? '').includes(q) ||
      normalizeText(row.responsible   ?? '').includes(q) ||
      normalizeText(row.project       ?? '').includes(q)
    )
  })

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por equipamento, responsável, projeto..."
        className="mb-4 w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
        style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
        onBlur={(e)  => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
      />

      {filtered.length === 0 ? (
        <div
          className="rounded-xl py-10 text-center text-[13px]"
          style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#2b4266' }}
        >
          Nenhum registro encontrado
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((row) => {
            const isOpen   = !row.checkedInAt
            const rc       = row.returnCondition ? RETURN_COND[row.returnCondition] : null
            const duration = row.checkedInAt
              ? Math.max(0, Math.floor((row.checkedInAt - row.checkedOutAt) / 86_400_000))
              : null

            return (
              <div
                key={row.id}
                className="flex items-start gap-3 rounded-xl px-4 py-3"
                style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px]"
                  style={{
                    background: isOpen
                      ? 'rgba(245,158,11,0.1)'
                      : rc?.color === '#ef4444'
                      ? 'rgba(239,68,68,0.1)'
                      : 'rgba(16,185,129,0.1)',
                  }}
                >
                  {isOpen ? '↑' : '↓'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/equipments/$equipmentId"
                        params={{ equipmentId: row.equipmentId }}
                        className="text-[13px] font-medium hover:underline"
                        style={{ color: '#d6e4f0' }}
                      >
                        {row.equipmentName ?? row.equipmentId}
                      </Link>
                      <span className="text-[12px]" style={{ color: '#4a6380' }}>{row.responsible}</span>
                    </div>
                    <span className="shrink-0 text-[11px]" style={{ color: '#2b4266' }}>
                      {fmtDate(row.checkedOutAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                    {row.project && <span style={{ color: '#4a6380' }}>{row.project}</span>}
                    {isOpen ? (
                      <span
                        className="rounded-full px-2 py-0.5"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                      >
                        Em campo
                      </span>
                    ) : rc ? (
                      <span style={{ color: rc.color }}>{rc.label}</span>
                    ) : null}
                    {duration !== null && (
                      <span style={{ color: '#3b5a7a' }}>{duration === 0 ? 'mesmo dia' : `${duration}d`}</span>
                    )}
                    {row.checkedInByUserName && (
                      <span style={{ color: '#3b5a7a' }}>por {row.checkedInByUserName}</span>
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

// ─── Confirm Delete ───────────────────────────────────────────────────────────

function ConfirmDeleteModal({
  equipment,
  onClose,
}: {
  equipment: EquipmentWithCheckout
  onClose: () => void
}) {
  const deleteMutation = useDeleteEquipmentMutation()

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
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-[18px]"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            ✕
          </span>
          <h2 className="text-[15px] font-semibold" style={{ color: '#eef2ff' }}>Remover equipamento</h2>
        </div>
        <p className="mb-5 mt-3 text-[13px] leading-relaxed" style={{ color: '#8ba4bf' }}>
          Tem certeza que deseja remover{' '}
          <span style={{ color: '#eef2ff', fontWeight: 600 }}>"{equipment.name}"</span>?{' '}
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
            onClick={async () => { await deleteMutation.mutateAsync(equipment.id); onClose() }}
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
