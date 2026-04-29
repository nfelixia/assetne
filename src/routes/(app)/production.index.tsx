import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { productionQueries, useDeleteProductionItemMutation, type ProductionItemWithUsage } from '~/lib/production/queries'
import { NewProductionItemModal } from '~/components/assetne/NewProductionItemModal'
import { EditProductionItemModal } from '~/components/assetne/EditProductionItemModal'
import { ProductionCheckOutModal } from '~/components/assetne/ProductionCheckOutModal'
import { ProductionCheckInModal } from '~/components/assetne/ProductionCheckInModal'
import { ImageLightbox } from '~/components/assetne/ImageLightbox'
import { ProductionSkeleton } from '~/components/assetne/Skeleton'
import { ImportExcelModal } from '~/components/assetne/ImportExcelModal'
import { PROD_CAT_ICON } from '~/components/assetne/utils'
import { normalizeText } from '~/utils/format'

export const Route = createFileRoute('/(app)/production/')({
  component: ProductionPage,
  pendingComponent: ProductionSkeleton,
})

const STATUS_FILTERS = [
  ['all',        'Todos'],
  ['disponivel', 'Disponíveis'],
  ['em_uso',     'Em Uso'],
] as const

const CONDITION_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  bom:     { label: 'Bom',     color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  regular: { label: 'Regular', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  ruim:    { label: 'Ruim',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
}

function ProductionPage() {
  const { data: items } = useSuspenseQuery(productionQueries.list())

  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [showNew,      setShowNew]      = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [editItem,     setEditItem]     = useState<ProductionItemWithUsage | null>(null)
  const [checkoutItem, setCheckoutItem] = useState<ProductionItemWithUsage | null>(null)
  const [checkinItem,  setCheckinItem]  = useState<ProductionItemWithUsage | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionItemWithUsage | null>(null)
  const [lightbox,     setLightbox]     = useState<{ src: string; alt: string } | null>(null)

  const filtered = items.filter((item) => {
    const q           = normalizeText(search)
    const matchSearch = !q || (
      normalizeText(item.name).includes(q) ||
      normalizeText(item.category).includes(q) ||
      (item.codigoInterno ? normalizeText(item.codigoInterno).includes(q) : false) ||
      (item.color ? normalizeText(item.color).includes(q) : false)
    )
    const matchFilter = filter === 'all' || item.status === filter
    return matchSearch && matchFilter
  })

  const totalItems    = items.length
  const disponivel    = items.filter((i) => i.status === 'disponivel').length
  const emUso         = items.filter((i) => i.usedQty > 0).length

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
            {emUso > 0 && <> · <span style={{ color: '#f59e0b' }}>{emUso} em uso</span></>}
          </p>
        </div>
        <div className="flex gap-2">
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
            onClick={() => setShowNew(true)}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
          >
            + Novo item
          </button>
        </div>
      </div>

      {/* Stats */}
      {totalItems > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatCard label="Total" value={totalItems} color="#8ba4bf" />
          <StatCard label="Disponíveis" value={disponivel} color="#10b981" />
          <StatCard label="Em uso" value={emUso} color="#f59e0b" />
        </div>
      )}

      {/* Search + Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, categoria ou código..."
          className="min-w-[180px] flex-1 rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
          style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
        />
        {STATUS_FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
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

      {/* List */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl py-10 text-center text-[13px]"
          style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', color: '#2b4266' }}
        >
          {items.length === 0 ? 'Nenhum item cadastrado ainda' : 'Nenhum item encontrado'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Col headers — desktop */}
          <div
            className="hidden sm:grid px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider"
            style={{
              gridTemplateColumns: '1fr 130px 100px 110px 120px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              color: '#2b4266',
            }}
          >
            <div>Item</div>
            <div>Categoria</div>
            <div>Qtd</div>
            <div>Condição</div>
            <div className="text-right">Ações</div>
          </div>

          {filtered.map((item, i) => (
            <ProductionRow
              key={item.id}
              item={item}
              isLast={i === filtered.length - 1}
              onEdit={() => setEditItem(item)}
              onCheckOut={() => setCheckoutItem(item)}
              onCheckIn={() => setCheckinItem(item)}
              onRequestDelete={() => setDeleteTarget(item)}
              onImageClick={item.photoUrl ? () => setLightbox({ src: item.photoUrl!, alt: item.name }) : undefined}
            />
          ))}
        </div>
      )}

      {showNew      && <NewProductionItemModal onClose={() => setShowNew(false)} />}
      {showImport   && <ImportExcelModal type="production" onClose={() => setShowImport(false)} />}
      {editItem     && <EditProductionItemModal item={editItem} onClose={() => setEditItem(null)} />}
      {checkoutItem && <ProductionCheckOutModal item={checkoutItem} onClose={() => setCheckoutItem(null)} />}
      {checkinItem  && <ProductionCheckInModal item={checkinItem} onClose={() => setCheckinItem(null)} />}
      {lightbox     && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
      {deleteTarget && (
        <ConfirmDeleteModal item={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="text-[11px]" style={{ color: '#3b5a7a' }}>{label}</div>
      <div className="mt-0.5 text-[20px] font-bold" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>
        {value}
      </div>
    </div>
  )
}

function ProductionRow({
  item,
  isLast,
  onEdit,
  onCheckOut,
  onCheckIn,
  onRequestDelete,
  onImageClick,
}: {
  item: ProductionItemWithUsage
  isLast: boolean
  onEdit: () => void
  onCheckOut: () => void
  onCheckIn: () => void
  onRequestDelete: () => void
  onImageClick?: () => void
}) {
  const icon      = PROD_CAT_ICON[item.category] ?? '🔹'
  const cond      = CONDITION_BADGE[item.condition] ?? CONDITION_BADGE.bom
  const hasInUse  = item.usedQty > 0
  const hasAvail  = item.availableQty > 0

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 transition-colors sm:grid sm:items-center"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        gridTemplateColumns: '1fr 130px 100px 110px 120px',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.015)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
    >
      {/* 1. Foto + nome */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[20px] ${onImageClick ? 'cursor-pointer' : ''}`}
          style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}
          onClick={(e) => { if (onImageClick) { e.preventDefault(); e.stopPropagation(); onImageClick() } }}
          title={onImageClick ? 'Ampliar imagem' : undefined}
        >
          {item.photoUrl ? (
            <img src={item.photoUrl} alt={item.name} className="h-full w-full rounded-xl object-cover transition-opacity hover:opacity-85" />
          ) : (
            icon
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>
            {item.name}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]" style={{ color: '#3b5a7a' }}>
            {item.codigoInterno && (
              <span style={{ color: '#58a6ff', fontFamily: "'JetBrains Mono', monospace" }}>
                #{item.codigoInterno}
              </span>
            )}
            {item.color && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ background: 'rgba(139,164,191,0.1)', border: '1px solid rgba(139,164,191,0.15)', color: '#8ba4bf' }}
              >
                {item.color.charAt(0).toUpperCase() + item.color.slice(1).toLowerCase()}
              </span>
            )}
            {item.location && <span>{item.location}</span>}
            <span className="sm:hidden">{item.category}</span>
          </div>
        </div>
      </div>

      {/* 2. Categoria — desktop */}
      <div className="hidden sm:block text-[12px]" style={{ color: '#4a6380' }}>
        {item.category}
      </div>

      {/* 3. Qtd — desktop */}
      <div className="hidden sm:block">
        <div className="text-[12px]" style={{ color: '#d6e4f0' }}>
          {item.availableQty}/{item.totalQty}
        </div>
        {hasInUse && (
          <div className="text-[11px]" style={{ color: '#f59e0b' }}>{item.usedQty} em uso</div>
        )}
      </div>

      {/* 4. Condição — desktop */}
      <div className="hidden sm:block">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ background: cond.bg, color: cond.color }}
        >
          {cond.label}
        </span>
      </div>

      {/* 5. Ações */}
      <div className="ml-auto sm:flex hidden items-center justify-end gap-1">
        {hasAvail && (
          <ActionBtn
            title="Registrar retirada"
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
        <ActionBtn title="Editar" onClick={(e) => { e.stopPropagation(); onEdit() }}>
          ✎
        </ActionBtn>
        {item.usedQty === 0 && (
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

      {/* Mobile: ações resumidas */}
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

function ConfirmDeleteModal({
  item,
  onClose,
}: {
  item: ProductionItemWithUsage
  onClose: () => void
}) {
  const deleteMutation = useDeleteProductionItemMutation()

  const handleConfirm = async () => {
    await deleteMutation.mutateAsync(item.id)
    onClose()
  }

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
            onMouseEnter={(e) => (e.currentTarget.style.color = '#eef2ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8ba4bf')}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="flex-1 rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
          >
            {deleteMutation.isPending ? 'Removendo...' : 'Sim, remover'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  title,
  disabled,
  hoverColor = '#8ba4bf',
  hoverBg = 'rgba(255,255,255,0.06)',
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
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg
        e.currentTarget.style.color = hoverColor
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = '#4a6380'
      }}
    >
      {children}
    </button>
  )
}
