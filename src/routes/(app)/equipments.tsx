import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { equipmentQueries, useDeleteEquipmentMutation, useSetAvailableMutation, type EquipmentWithCheckout } from '~/lib/equipment/queries'
import { NewEquipModal } from '~/components/assetne/NewEquipModal'
import { EditEquipModal } from '~/components/assetne/EditEquipModal'
import { EquipQRModal } from '~/components/assetne/EquipQRModal'
import { ImportExcelModal } from '~/components/assetne/ImportExcelModal'
import { StatusBadge } from '~/components/assetne/StatusBadge'
import { CAT_ICON } from '~/components/assetne/utils'

export const Route = createFileRoute('/(app)/equipments')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(equipmentQueries.list()),
  component: EquipmentsPage,
})

const FILTERS = [
  ['all',         'Todos'],
  ['available',   'Disponíveis'],
  ['in-use',      'Em Uso'],
  ['maintenance', 'Manutenção'],
] as const

function EquipmentsPage() {
  const { data: equipment } = useSuspenseQuery(equipmentQueries.list())
  const [search,          setSearch]          = useState('')
  const [filter,          setFilter]          = useState('all')
  const [showNewModal,    setShowNewModal]    = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [qrEquipment,     setQrEquipment]     = useState<EquipmentWithCheckout | null>(null)
  const [editEquipment,   setEditEquipment]   = useState<EquipmentWithCheckout | null>(null)

  const filtered = equipment.filter((e) => {
    const q = search.toLowerCase()
    return (e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
        && (filter === 'all' || e.status === filter)
  })

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="mb-1 text-[22px] font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}
          >
            Equipamentos
          </h1>
          <p className="text-[13px]" style={{ color: '#3b5a7a' }}>
            {equipment.length} itens cadastrados
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="rounded-lg px-4 py-2 text-[13px] font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#eef2ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8ba4bf')}
          >
            ↑ Excel
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
          >
            + Novo equipamento
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar equipamento..."
          className="min-w-[160px] flex-1 rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
          style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
        />
        {FILTERS.map(([v, l]) => (
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

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="rounded-xl py-10 text-center text-[13px]"
          style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', color: '#2b4266' }}
        >
          Nenhum equipamento encontrado
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Column headers — desktop only */}
          <div
            className="hidden sm:grid px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider"
            style={{
              gridTemplateColumns: '1fr 140px 110px 130px 96px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              color: '#2b4266',
            }}
          >
            <div>Equipamento</div>
            <div>Categoria</div>
            <div>Status</div>
            <div>Serial / Valor</div>
            <div className="text-right">Ações</div>
          </div>
          {filtered.map((eq, i) => (
            <EquipRow
              key={eq.id}
              eq={eq}
              isLast={i === filtered.length - 1}
              onShowQR={() => setQrEquipment(eq)}
              onEdit={() => setEditEquipment(eq)}
            />
          ))}
        </div>
      )}

      {showNewModal    && <NewEquipModal onClose={() => setShowNewModal(false)} />}
      {showImportModal && <ImportExcelModal type="equipment" onClose={() => setShowImportModal(false)} />}
      {editEquipment   && <EditEquipModal equipment={editEquipment} onClose={() => setEditEquipment(null)} />}
      {qrEquipment     && <EquipQRModal equipment={qrEquipment} onClose={() => setQrEquipment(null)} />}
    </div>
  )
}

function EquipRow({
  eq,
  isLast,
  onShowQR,
  onEdit,
}: {
  eq: EquipmentWithCheckout
  isLast: boolean
  onShowQR: () => void
  onEdit: () => void
}) {
  const icon = CAT_ICON[eq.category] ?? '📦'
  const deleteMutation  = useDeleteEquipmentMutation()
  const restoreMutation = useSetAvailableMutation()

  return (
    <div
      className="group flex items-center gap-3 px-4 py-3 transition-colors sm:grid sm:items-center"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        gridTemplateColumns: '1fr 140px 110px 130px 96px',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.015)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'transparent')}
    >
      {/* 1. Name + icon */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px]"
          style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {eq.photoUrl ? (
            <img src={eq.photoUrl} alt={eq.name} className="h-full w-full rounded-lg object-cover" />
          ) : (
            icon
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>
            {eq.name}
          </div>
          <div className="text-[11px] sm:hidden" style={{ color: '#3b5a7a' }}>{eq.category}</div>
        </div>
      </div>

      {/* 2. Categoria — desktop */}
      <div className="hidden sm:block text-[12px]" style={{ color: '#4a6380' }}>
        {eq.category}
      </div>

      {/* 3. Status — mobile (ml-auto) + desktop (grid cell) */}
      <div className="ml-auto sm:ml-0">
        <StatusBadge status={eq.status as 'available' | 'in-use' | 'maintenance'} />
      </div>

      {/* 4. Serial / Valor — desktop */}
      <div
        className="hidden sm:block text-[11px]"
        style={{ fontFamily: "'JetBrains Mono', monospace", color: '#3b5a7a' }}
      >
        {eq.value}
      </div>

      {/* 5. Ações — desktop */}
      <div className="hidden sm:flex items-center justify-end gap-1">
        {eq.status === 'maintenance' && (
          <ActionBtn
            title="Marcar como disponível"
            disabled={restoreMutation.isPending}
            onClick={(e) => { e.stopPropagation(); restoreMutation.mutate(eq.id) }}
            hoverColor="#10b981"
            hoverBg="rgba(16,185,129,0.1)"
          >
            ✓
          </ActionBtn>
        )}
        {eq.status !== 'in-use' && (
          <ActionBtn
            title="Editar"
            onClick={(e) => { e.stopPropagation(); onEdit() }}
          >
            ✎
          </ActionBtn>
        )}
        <ActionBtn title="Ver QR Code" onClick={onShowQR}>
          QR
        </ActionBtn>
        {eq.status === 'available' && (
          <ActionBtn
            title="Excluir"
            disabled={deleteMutation.isPending}
            onClick={(e) => {
              e.stopPropagation()
              if (!confirm(`Remover "${eq.name}"? Esta ação não pode ser desfeita.`)) return
              deleteMutation.mutate(eq.id)
            }}
            hoverColor="#ef4444"
            hoverBg="rgba(239,68,68,0.1)"
          >
            ✕
          </ActionBtn>
        )}
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
