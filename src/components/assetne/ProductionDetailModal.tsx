import { useState } from 'react'
import { Modal } from './Modal'
import { useDeleteProductionItemMutation } from '~/lib/production/queries'
import type { ProductionItemWithUsage, ProductionMovement } from '~/lib/production/queries'
import { PROD_CAT_ICON } from '~/components/assetne/utils'
import { ColorBadge } from '~/components/assetne/ColorBadge'

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

const MOVE_COLOR: Record<string, string> = {
  created:              '#10b981',
  updated:              '#3b82f6',
  checked_out:          '#f59e0b',
  withdrawal_requested: '#8b5cf6',
  withdrawal_rejected:  '#ef4444',
  withdrawal_cancelled: '#6b7280',
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div
      className="flex justify-between gap-2 py-1.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <span className="shrink-0 text-[12px]" style={{ color: '#4a6380' }}>{label}</span>
      <span className="text-right text-[12px]" style={{ color: '#8ba4bf' }}>{value}</span>
    </div>
  )
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function ProductionDetailModal({
  item,
  movements,
  canManage,
  hasPending,
  onEdit,
  onCheckOut,
  onCheckIn,
  onClose,
}: {
  item:       ProductionItemWithUsage
  movements:  ProductionMovement[]
  canManage:  boolean
  hasPending: boolean
  onEdit:     () => void
  onCheckOut: () => void
  onCheckIn:  () => void
  onClose:    () => void
}) {
  const [tab, setTab] = useState<'info' | 'active' | 'history'>('info')

  const deleteMut = useDeleteProductionItemMutation()

  const icon    = PROD_CAT_ICON[item.category] ?? '🎭'
  const badge   = STATUS_BADGE[item.status]     ?? { label: item.status,    color: '#8ba4bf', bg: 'rgba(255,255,255,0.05)' }
  const cond    = CONDITION_BADGE[item.condition] ?? { label: item.condition, color: '#8ba4bf', bg: 'rgba(255,255,255,0.05)' }

  const hasAvail = item.availableQty > 0
  const hasInUse = item.usedQty > 0

  // Movements for this item only
  const itemMovements  = movements.filter((m) => m.itemId === item.id)
  const activeCheckouts = item.activeMovements.filter((m) => m.type === 'checked_out')

  return (
    <Modal title="Detalhes do Item" onClose={onClose} width={520}>

      {/* ── Header: foto + info ── */}
      <div className="mb-4 flex gap-4">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl"
          style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {item.photoUrl ? (
            <img src={item.photoUrl} className="h-full w-full object-cover" alt={item.name} />
          ) : (
            <span className="text-[32px]">{icon}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold leading-tight" style={{ color: '#eef2ff' }}>
            {item.name}
          </h3>
          <div className="mt-0.5 text-[12px]" style={{ color: '#4a6380' }}>
            {item.category}
            {item.codigoInterno && (
              <> · <span style={{ color: '#58a6ff', fontFamily: "'JetBrains Mono', monospace" }}>#{item.codigoInterno}</span></>
            )}
          </div>
          {item.color && (
            <div className="mt-1">
              <ColorBadge color={item.color} />
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
              style={{ background: cond.bg, color: cond.color }}
            >
              {cond.label}
            </span>
            {hasPending && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
              >
                pendente
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Qty bar ── */}
      <div
        className="mb-4 flex items-center gap-4 rounded-lg px-4 py-2.5"
        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="text-center">
          <div className="text-[18px] font-bold" style={{ color: '#eef2ff', fontFamily: "'Space Grotesk', sans-serif" }}>
            {item.totalQty}
          </div>
          <div className="text-[10px]" style={{ color: '#3b5a7a' }}>total</div>
        </div>
        <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="text-center">
          <div className="text-[18px] font-bold" style={{ color: '#10b981', fontFamily: "'Space Grotesk', sans-serif" }}>
            {item.availableQty}
          </div>
          <div className="text-[10px]" style={{ color: '#3b5a7a' }}>disponível</div>
        </div>
        {hasInUse && (
          <>
            <div className="h-8 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="text-center">
              <div className="text-[18px] font-bold" style={{ color: '#f59e0b', fontFamily: "'Space Grotesk', sans-serif" }}>
                {item.usedQty}
              </div>
              <div className="text-[10px]" style={{ color: '#3b5a7a' }}>em uso</div>
            </div>
          </>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {hasAvail && (
          <button
            onClick={onCheckOut}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
            style={canManage
              ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff' }
              : { background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
          >
            {canManage ? 'Retirar' : 'Solicitar'}
          </button>
        )}
        {hasInUse && (
          <button
            onClick={onCheckIn}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}
          >
            Devolver
          </button>
        )}
        <button
          onClick={onEdit}
          className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
        >
          Editar
        </button>
        {item.usedQty === 0 && canManage && (
          <button
            onClick={async () => {
              if (!confirm('Remover este item permanentemente?')) return
              await deleteMut.mutateAsync(item.id)
              onClose()
            }}
            disabled={deleteMut.isPending}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            Excluir
          </button>
        )}
      </div>

      {/* ── Inner tabs ── */}
      <div
        className="mb-3 flex gap-1 rounded-lg p-0.5"
        style={{ background: 'rgba(255,255,255,0.03)' }}
      >
        {([
          { id: 'info'    as const, label: 'Informações'       },
          { id: 'active'  as const, label: `Retiradas ativas${activeCheckouts.length > 0 ? ` (${activeCheckouts.length})` : ''}` },
          { id: 'history' as const, label: 'Histórico'         },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 rounded-md py-1.5 text-[12px] font-medium transition-all"
            style={tab === t.id ? { background: '#162040', color: '#93c5fd' } : { color: '#4a6380' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Info tab ── */}
      {tab === 'info' && (
        <div>
          <InfoRow label="Categoria"   value={item.category} />
          <InfoRow label="Cor"         value={item.color} />
          <InfoRow label="Código"      value={item.codigoInterno ? `#${item.codigoInterno}` : null} />
          <InfoRow label="Localização" value={item.location} />
          <InfoRow label="Observações" value={item.notes} />
          <InfoRow label="Cadastrado"  value={fmtDate(item.createdAt)} />
          <InfoRow label="Atualizado"  value={fmtDate(item.updatedAt)} />
        </div>
      )}

      {/* ── Active checkouts tab ── */}
      {tab === 'active' && (
        <div>
          {activeCheckouts.length === 0 ? (
            <div className="py-8 text-center text-[13px]" style={{ color: '#2b4266' }}>
              Nenhuma retirada ativa
            </div>
          ) : (
            <div className="space-y-2">
              {activeCheckouts.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg p-3"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: '#eef2ff' }}>
                        {m.responsible}
                      </div>
                      {m.project && (
                        <div className="text-[11px]" style={{ color: '#4a6380' }}>{m.project}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-semibold" style={{ color: '#f59e0b' }}>
                        {m.qty} un.
                      </div>
                      <div className="text-[10px]" style={{ color: '#3b5a7a' }}>
                        {fmtDate(m.checkedOutAt)}
                      </div>
                    </div>
                  </div>
                  {m.expectedReturn && (
                    <div className="mt-1.5 text-[11px]" style={{ color: '#3b5a7a' }}>
                      Devolução prevista: <span style={{ color: '#8ba4bf' }}>{m.expectedReturn}</span>
                    </div>
                  )}
                  {m.checkedOutByName && (
                    <div className="mt-0.5 text-[11px]" style={{ color: '#3b5a7a' }}>
                      Retirado por: <span style={{ color: '#8ba4bf' }}>{m.checkedOutByName}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {tab === 'history' && (
        <div>
          {itemMovements.length === 0 ? (
            <div className="py-8 text-center text-[13px]" style={{ color: '#2b4266' }}>
              Nenhuma movimentação registrada
            </div>
          ) : (
            <div className="space-y-2">
              {itemMovements.map((m) => {
                const color = MOVE_COLOR[m.type] ?? '#8ba4bf'
                const label = MOVE_LABEL[m.type] ?? m.type
                return (
                  <div
                    key={m.id}
                    className="flex gap-3 rounded-lg p-3"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[12px] font-semibold" style={{ color }}>
                          {label}
                        </span>
                        <span className="shrink-0 text-[11px]" style={{ color: '#2b4266' }}>
                          {fmtDate(m.checkedOutAt)}
                        </span>
                      </div>
                      {m.responsible && m.type !== 'created' && m.type !== 'updated' && (
                        <div className="text-[11px]" style={{ color: '#3b5a7a' }}>
                          {m.responsible}
                          {m.qty > 0 && <> · <span style={{ color: '#8ba4bf' }}>{m.qty} un.</span></>}
                          {m.project && <> · {m.project}</>}
                        </div>
                      )}
                      {m.checkedOutByName && (
                        <div className="text-[11px]" style={{ color: '#3b5a7a' }}>
                          por <span style={{ color: '#8ba4bf' }}>{m.checkedOutByName}</span>
                        </div>
                      )}
                      {m.statusAfterReturn && (
                        <div className="text-[11px]" style={{ color: '#3b5a7a' }}>
                          condição: <span style={{ color: '#8ba4bf' }}>{m.statusAfterReturn}</span>
                        </div>
                      )}
                      {m.notes && (
                        <div className="mt-1 text-[11px]" style={{ color: '#4a6380' }}>{m.notes}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
