import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { equipmentQueries, type EquipmentWithCheckout } from '~/lib/equipment/queries'
import { NewEquipModal } from '~/components/assetne/NewEquipModal'
import { EquipQRModal } from '~/components/assetne/EquipQRModal'
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
  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState('all')
  const [showNewModal,  setShowNewModal]  = useState(false)
  const [qrEquipment,   setQrEquipment]   = useState<EquipmentWithCheckout | null>(null)

  const filtered = equipment.filter((e) => {
    const q = search.toLowerCase()
    return (e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
        && (filter === 'all' || e.status === filter)
  })

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-['Space_Grotesk'] text-[22px] font-semibold text-[#e6edf3]">
            Equipamentos
          </h1>
          <p className="text-[13px] text-[#6e7681]">{equipment.length} itens cadastrados</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd]"
        >
          + Novo equipamento
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar equipamento..."
          className="min-w-[160px] flex-1 rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
        {FILTERS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`rounded-md px-3.5 py-1.5 text-[12px] font-medium transition-all ${
              filter === v
                ? 'bg-[#1f6feb] text-white'
                : 'border border-white/10 text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[#6e7681]">
          Nenhum equipamento encontrado
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(195px,1fr))] gap-2.5">
          {filtered.map((eq) => (
            <EquipCard
              key={eq.id}
              eq={eq}
              onShowQR={() => setQrEquipment(eq)}
            />
          ))}
        </div>
      )}

      {showNewModal && <NewEquipModal onClose={() => setShowNewModal(false)} />}
      {qrEquipment && (
        <EquipQRModal
          equipment={qrEquipment}
          onClose={() => setQrEquipment(null)}
        />
      )}
    </div>
  )
}

function EquipCard({
  eq,
  onShowQR,
}: {
  eq: EquipmentWithCheckout
  onShowQR: () => void
}) {
  const icon = CAT_ICON[eq.category] ?? '📦'
  return (
    <div className="group rounded-lg border border-white/10 bg-[#161b22] p-[14px] transition-all hover:border-white/20 hover:bg-[#21262d]">
      <div className="mb-2.5 flex items-start justify-between">
        <div className="text-[22px]">{icon}</div>
        <button
          onClick={onShowQR}
          title="Ver QR Code"
          className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[#6e7681] opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-[#8b949e]"
        >
          QR
        </button>
      </div>
      <div className="mb-0.5 font-['Space_Grotesk'] text-[13px] font-semibold leading-tight text-[#e6edf3]">
        {eq.name}
      </div>
      <div className="mb-2 text-[11px] text-[#6e7681]">{eq.category}</div>
      <div className="mb-2.5 font-['JetBrains_Mono'] text-[12px] text-[#8b949e]">{eq.value}</div>
      <StatusBadge status={eq.status as 'available' | 'in-use' | 'maintenance'} />
    </div>
  )
}
