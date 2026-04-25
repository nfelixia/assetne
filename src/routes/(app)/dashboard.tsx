import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { equipmentQueries, type EquipmentWithCheckout } from '~/lib/equipment/queries'
import { CheckOutModal } from '~/components/assetne/CheckOutModal'
import { CheckInModal } from '~/components/assetne/CheckInModal'
import { NewEquipModal } from '~/components/assetne/NewEquipModal'
import { CAT_ICON } from '~/components/assetne/utils'

export const Route = createFileRoute('/(app)/dashboard')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(equipmentQueries.list()),
  component: Dashboard,
})

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function Dashboard() {
  const { data: equipment } = useSuspenseQuery(equipmentQueries.list())
  const [modal, setModal] = useState<'checkout' | 'checkin' | 'newequip' | null>(null)

  const total       = equipment.length
  const inUse       = equipment.filter((e) => e.status === 'in-use')
  const available   = equipment.filter((e) => e.status === 'available')
  const maintenance = equipment.filter((e) => e.status === 'maintenance')

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const overdue = inUse.filter((e) => {
    const exp = e.activeCheckout?.expectedReturn
    if (!exp) return false
    return exp < new Date().toISOString().split('T')[0]
  })

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="mb-1 text-[22px] font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}
        >
          {getGreeting()}! 👋
        </h1>
        <p className="text-[13px] capitalize" style={{ color: '#3b5a7a' }}>{today}</p>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          value={total}
          label="Total de itens"
          sub="no inventário"
          accent="#3b82f6"
          icon={<BoxIcon />}
        />
        <StatCard
          value={inUse.length}
          label="Em uso agora"
          sub={`${new Set(inUse.map((e) => e.activeCheckout?.project)).size} projeto(s)`}
          accent="#f59e0b"
          icon={<ArrowUpIcon />}
        />
        <StatCard
          value={available.length}
          label="Disponíveis"
          sub={total > 0 ? `${Math.round((available.length / total) * 100)}% do inventário` : '—'}
          accent="#10b981"
          icon={<CheckIcon />}
        />
        <StatCard
          value={maintenance.length}
          label="Em manutenção"
          sub={overdue.length > 0 ? `${overdue.length} atrasado(s)` : 'requer atenção'}
          accent="#ef4444"
          icon={<WrenchIcon />}
        />
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <ActionButton
          onClick={() => setModal('checkout')}
          primary
          icon="↑"
          label="Nova Saída"
        />
        <ActionButton
          onClick={() => setModal('checkin')}
          icon="↓"
          label="Devolução"
        />
        <ActionButton
          onClick={() => setModal('newequip')}
          icon="+"
          label="Cadastrar Equipamento"
        />
      </div>

      {/* In-use list */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold" style={{ color: '#eef2ff' }}>
            Em uso agora
          </h2>
          <div
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={{
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.15)',
              color: '#10b981',
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            Ao vivo
          </div>
        </div>

        {inUse.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center text-[13px]"
            style={{
              background: '#0a0f1d',
              border: '1px solid rgba(255,255,255,0.05)',
              color: '#2b4266',
            }}
          >
            Nenhum equipamento em uso no momento
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl"
            style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            {inUse.map((eq, i) => (
              <EquipRow key={eq.id} eq={eq} isLast={i === inUse.length - 1} />
            ))}
          </div>
        )}
      </div>

      {modal === 'checkout' && <CheckOutModal equipment={equipment} onClose={() => setModal(null)} />}
      {modal === 'checkin'  && <CheckInModal  equipment={equipment} onClose={() => setModal(null)} />}
      {modal === 'newequip' && <NewEquipModal onClose={() => setModal(null)} />}
    </div>
  )
}

function StatCard({
  value, label, sub, accent, icon,
}: {
  value: number; label: string; sub: string; accent: string; icon: React.ReactNode
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4"
      style={{
        background: '#0a0f1d',
        border: '1px solid rgba(255,255,255,0.05)',
        borderTop: `2px solid ${accent}`,
      }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full opacity-[0.06]"
        style={{ background: accent, filter: 'blur(32px)', transform: 'translate(30%, -30%)' }}
      />

      <div className="mb-3 flex items-start justify-between">
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: '#3b5a7a' }}
        >
          {label}
        </span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `${accent}18`, color: accent }}
        >
          {icon}
        </span>
      </div>

      <div
        className="mb-1 text-[30px] font-bold leading-none"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent }}
      >
        {value}
      </div>
      <div className="text-[11px]" style={{ color: '#2b4266' }}>{sub}</div>
    </div>
  )
}

function ActionButton({
  onClick, primary, icon, label,
}: {
  onClick: () => void; primary?: boolean; icon: string; label: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all"
      style={
        primary
          ? {
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(37,99,235,0.3)',
            }
          : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#8ba4bf',
            }
      }
    >
      <span className="text-[15px] leading-none">{icon}</span>
      {label}
    </button>
  )
}

function isOverdue(expectedReturn: string | null): boolean {
  if (!expectedReturn) return false
  return expectedReturn < new Date().toISOString().split('T')[0]
}

function EquipRow({ eq, isLast }: { eq: EquipmentWithCheckout; isLast: boolean }) {
  const icon    = CAT_ICON[eq.category] ?? '📦'
  const overdue = eq.activeCheckout ? isOverdue(eq.activeCheckout.expectedReturn) : false

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        background: overdue ? 'rgba(239,68,68,0.03)' : 'transparent',
      }}
    >
      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
        style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {eq.photoUrl ? (
          <img src={eq.photoUrl} alt={eq.name} className="h-full w-full rounded-lg object-cover" />
        ) : (
          icon
        )}
      </div>

      {/* Name + category */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>
            {eq.name}
          </span>
          {overdue && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
            >
              Atrasado
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px]" style={{ color: '#2b4266' }}>
          {eq.category} ·{' '}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#3b5a7a' }}>
            {eq.value}
          </span>
        </div>
      </div>

      {/* Responsible + project */}
      {eq.activeCheckout && (
        <div className="hidden sm:block min-w-0 flex-1">
          <div className="truncate text-[12px]" style={{ color: '#4a6380' }}>
            {eq.activeCheckout.responsible}
          </div>
          <div className="truncate text-[11px]" style={{ color: '#2b4266' }}>
            {eq.activeCheckout.project}
            {eq.activeCheckout.expectedReturn && (
              <span
                className="ml-1.5"
                style={{ color: overdue ? '#ef4444' : '#2b4266' }}
              >
                · {new Date(eq.activeCheckout.expectedReturn + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status badge */}
      <span
        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium"
        style={{
          background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.2)',
          color: '#f59e0b',
        }}
      >
        Em uso
      </span>
    </div>
  )
}

/* ── Icons ── */
function BoxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  )
}
function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function WrenchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  )
}
