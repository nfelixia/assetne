import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { equipmentQueries, type EquipmentWithCheckout } from '~/lib/equipment/queries'
import { CheckOutModal } from '~/components/assetne/CheckOutModal'
import { CheckInModal } from '~/components/assetne/CheckInModal'
import { NewEquipModal } from '~/components/assetne/NewEquipModal'
import { StatusBadge } from '~/components/assetne/StatusBadge'
import { CAT_ICON } from '~/components/assetne/utils'

export const Route = createFileRoute('/(app)/dashboard')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(equipmentQueries.list()),
  component: Dashboard,
})

function Dashboard() {
  const { data: equipment } = useSuspenseQuery(equipmentQueries.list())
  const [modal, setModal] = useState<'checkout' | 'checkin' | 'newequip' | null>(null)

  const total       = equipment.length
  const inUse       = equipment.filter((e) => e.status === 'in-use')
  const available   = equipment.filter((e) => e.status === 'available')
  const maintenance = equipment.filter((e) => e.status === 'maintenance')

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-1 font-['Space_Grotesk'] text-[22px] font-semibold text-[#e6edf3]">
          Dashboard
        </h1>
        <p className="text-[13px] capitalize text-[#6e7681]">{today}</p>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard value={total}            label="Total de itens"  color="#e6edf3" sub="no inventário" />
        <StatCard value={inUse.length}     label="Em uso agora"    color="#e3b341" sub={`${new Set(inUse.map(e => e.activeCheckout?.project)).size} projeto(s)`} />
        <StatCard value={available.length} label="Disponíveis"     color="#3fb950" sub={`${Math.round((available.length / total) * 100)}% do inventário`} />
        <StatCard value={maintenance.length} label="Em manutenção" color="#f85149" sub="requer atenção" />
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setModal('checkout')}
          className="rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd]"
        >
          ↑ Nova Saída
        </button>
        <button
          onClick={() => setModal('checkin')}
          className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-[#e6edf3] transition-colors hover:bg-white/[0.08]"
        >
          ↓ Devolução
        </button>
        <button
          onClick={() => setModal('newequip')}
          className="rounded-md border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-[#e6edf3] transition-colors hover:bg-white/[0.08]"
        >
          + Cadastrar
        </button>
      </div>

      {/* In-use list */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-[#e6edf3]">Em uso agora</h2>
          <div className="flex items-center gap-1.5 text-[11px] text-[#3fb950]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#3fb950]" />
            Ao vivo
          </div>
        </div>

        {inUse.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#161b22] p-8 text-center text-[13px] text-[#6e7681]">
            Nenhum equipamento em uso no momento
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-[#161b22]">
            {inUse.map((eq, i) => (
              <EquipRow key={eq.id} eq={eq} isLast={i === inUse.length - 1} />
            ))}
          </div>
        )}
      </div>

      {modal === 'checkout' && (
        <CheckOutModal equipment={equipment} onClose={() => setModal(null)} />
      )}
      {modal === 'checkin' && (
        <CheckInModal equipment={equipment} onClose={() => setModal(null)} />
      )}
      {modal === 'newequip' && (
        <NewEquipModal onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function StatCard({
  value,
  label,
  color,
  sub,
}: {
  value: number
  label: string
  color: string
  sub: string
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#161b22] px-[18px] py-4">
      <div className="mb-2.5 text-[11px] font-medium uppercase tracking-wider text-[#8b949e]">
        {label}
      </div>
      <div
        className="mb-1.5 font-['Space_Grotesk'] text-[30px] font-bold leading-none"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[11px] text-[#6e7681]">{sub}</div>
    </div>
  )
}

function isOverdue(expectedReturn: string | null): boolean {
  if (!expectedReturn) return false
  const today = new Date().toISOString().split('T')[0]
  return expectedReturn < today
}

function EquipRow({ eq, isLast }: { eq: EquipmentWithCheckout; isLast: boolean }) {
  const icon = CAT_ICON[eq.category] ?? '📦'
  const overdue = eq.activeCheckout ? isOverdue(eq.activeCheckout.expectedReturn) : false

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#21262d] ${
        !isLast ? 'border-b border-white/10' : ''
      } ${overdue ? 'bg-[#f85149]/[0.03]' : ''}`}
    >
      <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#21262d] text-base">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-[#e6edf3]">{eq.name}</span>
          {overdue && (
            <span className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-[#f85149]/15 text-[#f85149]">
              Atrasado
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-[#6e7681]">
          {eq.category} ·{' '}
          <span className="font-['JetBrains_Mono'] text-[#8b949e]">{eq.value}</span>
        </div>
      </div>
      {eq.activeCheckout && (
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] text-[#8b949e]">
            {eq.activeCheckout.responsible}
          </div>
          <div className="truncate text-[11px] text-[#6e7681]">
            {eq.activeCheckout.project}
            {eq.activeCheckout.expectedReturn && (
              <span className={`ml-1.5 ${overdue ? 'text-[#f85149]' : 'text-[#6e7681]'}`}>
                · {new Date(eq.activeCheckout.expectedReturn + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      )}
      <StatusBadge status={eq.status as 'available' | 'in-use' | 'maintenance'} />
    </div>
  )
}
