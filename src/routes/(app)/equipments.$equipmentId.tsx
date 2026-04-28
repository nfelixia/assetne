import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { equipmentQueries, useSetAvailableMutation, useSetMaintenanceMutation, useDeleteEquipmentMutation, type EquipmentWithCheckout } from '~/lib/equipment/queries'
import { checkoutHistoryQuery } from '~/lib/checkout/queries'
import { EditEquipModal } from '~/components/assetne/EditEquipModal'
import { CheckOutModal } from '~/components/assetne/CheckOutModal'
import { CheckInModal } from '~/components/assetne/CheckInModal'
import { StatusBadge } from '~/components/assetne/StatusBadge'
import { CAT_ICON } from '~/components/assetne/utils'
import { displayEquipmentValue } from '~/utils/format'
import { EquipmentDetailSkeleton } from '~/components/assetne/Skeleton'

export const Route = createFileRoute('/(app)/equipments/$equipmentId')({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(checkoutHistoryQuery()),
  component: EquipmentDetailPage,
  pendingComponent: EquipmentDetailSkeleton,
})

const CONDITION_LABEL: Record<string, string> = {
  new:     'Novo',
  good:    'Bom estado',
  regular: 'Regular',
}

const RETURN_CONDITION_LABEL: Record<string, { label: string; color: string }> = {
  perfect: { label: 'Perfeito',    color: '#3fb950' },
  minor:   { label: 'Dano leve',   color: '#e3b341' },
  major:   { label: 'Dano grave',  color: '#f85149' },
}

function EquipmentDetailPage() {
  const { equipmentId } = Route.useParams()
  const { data: equipment } = useSuspenseQuery(equipmentQueries.list())
  const { data: history }   = useSuspenseQuery(checkoutHistoryQuery())

  const eq = equipment.find((e) => e.id === equipmentId)
  if (!eq) throw notFound()

  const eqHistory = useMemo(
    () => history.filter((h) => h.equipmentId === equipmentId),
    [history, equipmentId],
  )

  const [showEdit,     setShowEdit]     = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showCheckin,  setShowCheckin]  = useState(false)

  const maintenanceMutation = useSetMaintenanceMutation()
  const restoreMutation     = useSetAvailableMutation()
  const deleteMutation      = useDeleteEquipmentMutation()

  const icon = CAT_ICON[eq.category] ?? '📦'

  function formatTs(ts: number) {
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function daysAgo(ts: number) {
    return Math.floor((Date.now() - ts) / 86_400_000)
  }

  return (
    <div className="mx-auto max-w-3xl animate-[fadeIn_0.3s_ease]">
      {/* Back */}
      <Link
        to="/equipments"
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] transition-colors"
        style={{ color: '#3b5a7a' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#58a6ff')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#3b5a7a')}
      >
        ← Equipamentos
      </Link>

      {/* Header card */}
      <div
        className="mb-4 rounded-xl p-5"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex flex-wrap items-start gap-4">
          {/* Icon / photo */}
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-[28px]"
            style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {eq.photoUrl ? (
              <img src={eq.photoUrl} alt={eq.name} className="h-full w-full rounded-xl object-cover" />
            ) : (
              icon
            )}
          </div>

          {/* Name + status */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2.5">
              <h1
                className="text-[20px] font-bold leading-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}
              >
                {eq.name}
              </h1>
              {eq.codigo && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)', color: '#58a6ff' }}
                >
                  #{eq.codigo}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={eq.status as 'available' | 'in-use' | 'maintenance'} />
              <span className="text-[12px]" style={{ color: '#3b5a7a' }}>{eq.category}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {eq.status === 'available' && (
              <ActionButton
                onClick={() => setShowCheckout(true)}
                primary
              >
                ↑ Registrar Saída
              </ActionButton>
            )}
            {eq.status === 'in-use' && (
              <ActionButton
                onClick={() => setShowCheckin(true)}
                primary
              >
                ↓ Registrar Devolução
              </ActionButton>
            )}
            {eq.status !== 'in-use' && (
              <ActionButton onClick={() => setShowEdit(true)}>
                ✎ Editar
              </ActionButton>
            )}
            {eq.status === 'available' && (
              <ActionButton
                onClick={() => maintenanceMutation.mutate(eq.id)}
                disabled={maintenanceMutation.isPending}
                danger
              >
                ⚠ Manutenção
              </ActionButton>
            )}
            {eq.status === 'maintenance' && (
              <ActionButton
                onClick={() => restoreMutation.mutate(eq.id)}
                disabled={restoreMutation.isPending}
                success
              >
                ✓ Marcar disponível
              </ActionButton>
            )}
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div
        className="mb-4 grid gap-px overflow-hidden rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <DetailRow label="Categoria" value={`${icon}  ${eq.category}`} />
        <DetailRow label="Valor" value={displayEquipmentValue(eq.value) || '—'} />
        <DetailRow label="Condição" value={CONDITION_LABEL[eq.condition] ?? eq.condition} />
        {eq.serialNumber && <DetailRow label="Nº de Série" value={eq.serialNumber} mono />}
        {eq.codigo && <DetailRow label="Código / Etiqueta" value={`#${eq.codigo}`} mono />}
        <DetailRow label="Cadastrado em" value={formatTs(eq.createdAt)} />
      </div>

      {/* Active checkout */}
      {eq.status === 'in-use' && eq.activeCheckout && (
        <div
          className="mb-4 rounded-xl p-4"
          style={{ background: 'rgba(227,179,65,0.06)', border: '1px solid rgba(227,179,65,0.2)' }}
        >
          <div
            className="mb-3 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: '#e3b341' }}
          >
            Em uso · {daysAgo(eq.activeCheckout.checkedOutAt)} dia{daysAgo(eq.activeCheckout.checkedOutAt) !== 1 ? 's' : ''} em campo
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Responsável</div>
              <div className="text-[13px] font-medium" style={{ color: '#eef2ff' }}>
                {eq.activeCheckout.responsible}
                {eq.activeCheckout.responsibleRole && (
                  <span className="ml-1 text-[11px] font-normal" style={{ color: '#4a6380' }}>
                    · {eq.activeCheckout.responsibleRole}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Cliente / Projeto</div>
              <div className="text-[13px] font-medium" style={{ color: '#eef2ff' }}>{eq.activeCheckout.project}</div>
            </div>
            {eq.activeCheckout.expectedReturn && (
              <div>
                <div className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Saída em</div>
                <div className="text-[13px] font-medium" style={{ color: '#eef2ff' }}>
                  {formatTs(eq.activeCheckout.checkedOutAt)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span
            className="text-[12px] font-semibold uppercase tracking-wider"
            style={{ color: '#3b5a7a' }}
          >
            Histórico de uso
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#4a6380' }}
          >
            {eqHistory.length} registro{eqHistory.length !== 1 ? 's' : ''}
          </span>
        </div>

        {eqHistory.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: '#2b4266' }}>
            Nenhuma saída registrada para este equipamento
          </div>
        ) : (
          <div>
            {/* Header — desktop */}
            <div
              className="hidden sm:grid px-4 py-2 text-[10px] font-medium uppercase tracking-wider"
              style={{
                gridTemplateColumns: '110px 1fr 1fr 90px 80px',
                color: '#2b4266',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <div>Data</div>
              <div>Responsável</div>
              <div>Cliente</div>
              <div>Retorno</div>
              <div className="text-right">Estado</div>
            </div>
            {eqHistory.map((row, i) => {
              const rc = row.returnCondition ? RETURN_CONDITION_LABEL[row.returnCondition] : null
              const isOpen = !row.checkedInAt
              const duration = row.checkedInAt
                ? Math.max(0, Math.floor((row.checkedInAt - row.checkedOutAt) / 86_400_000))
                : null
              return (
                <div
                  key={row.id}
                  className="grid px-4 py-3 text-[12px]"
                  style={{
                    gridTemplateColumns: '1fr',
                    borderBottom: i < eqHistory.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  {/* Mobile layout */}
                  <div className="sm:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium" style={{ color: '#eef2ff' }}>{row.responsible}</div>
                        <div style={{ color: '#4a6380' }}>{row.project}</div>
                        <div className="mt-0.5" style={{ color: '#2b4266' }}>{formatTs(row.checkedOutAt)}</div>
                      </div>
                      <div className="shrink-0">
                        {isOpen ? (
                          <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(227,179,65,0.12)', border: '1px solid rgba(227,179,65,0.25)', color: '#e3b341' }}>
                            Em campo
                          </span>
                        ) : rc ? (
                          <span className="text-[11px] font-medium" style={{ color: rc.color }}>{rc.label}</span>
                        ) : (
                          <span style={{ color: '#3b5a7a' }}>—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop layout */}
                  <div
                    className="hidden sm:grid items-center"
                    style={{ gridTemplateColumns: '110px 1fr 1fr 90px 80px' }}
                  >
                    <div style={{ color: '#4a6380', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
                      {formatTs(row.checkedOutAt)}
                    </div>
                    <div>
                      <div style={{ color: '#d6e4f0' }}>{row.responsible}</div>
                      {row.responsibleRole && (
                        <div className="text-[11px]" style={{ color: '#3b5a7a' }}>{row.responsibleRole}</div>
                      )}
                    </div>
                    <div style={{ color: '#8ba4bf' }}>{row.project}</div>
                    <div style={{ color: '#4a6380' }}>
                      {duration !== null ? `${duration}d` : '—'}
                    </div>
                    <div className="text-right">
                      {isOpen ? (
                        <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'rgba(227,179,65,0.12)', border: '1px solid rgba(227,179,65,0.2)', color: '#e3b341' }}>
                          Em campo
                        </span>
                      ) : rc ? (
                        <span className="text-[11px] font-medium" style={{ color: rc.color }}>{rc.label}</span>
                      ) : (
                        <span style={{ color: '#2b4266' }}>—</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete (only available) */}
      {eq.status === 'available' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              if (!confirm(`Remover "${eq.name}"? Esta ação não pode ser desfeita.`)) return
              deleteMutation.mutate(eq.id)
            }}
            disabled={deleteMutation.isPending}
            className="text-[12px] transition-colors disabled:opacity-40"
            style={{ color: '#3b4a5a' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#f85149')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#3b4a5a')}
          >
            Remover equipamento
          </button>
        </div>
      )}

      {showEdit && (
        <EditEquipModal equipment={eq} onClose={() => setShowEdit(false)} />
      )}
      {showCheckout && (
        <CheckOutModal
          equipment={equipment}
          preSelectedId={eq.id}
          onClose={() => setShowCheckout(false)}
        />
      )}
      {showCheckin && (
        <CheckInModal
          equipment={equipment}
          onClose={() => setShowCheckin(false)}
        />
      )}
    </div>
  )
}

/* ── Sub-components ── */

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5"
      style={{ background: '#0a0f1d' }}
    >
      <span className="text-[12px]" style={{ color: '#3b5a7a' }}>{label}</span>
      <span
        className="text-[12px] font-medium"
        style={{
          color: '#8ba4bf',
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary,
  success,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  success?: boolean
  danger?: boolean
}) {
  const style = primary
    ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }
    : success
    ? { background: 'rgba(63,185,80,0.1)', border: '1px solid rgba(63,185,80,0.25)', color: '#3fb950' }
    : danger
    ? { background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)', color: '#f85149' }
    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#8ba4bf' }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-3.5 py-1.5 text-[12px] font-medium transition-all disabled:opacity-40"
      style={style}
    >
      {children}
    </button>
  )
}
