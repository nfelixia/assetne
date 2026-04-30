import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import {
  productionQueries,
  useApproveProductionWithdrawalRequestMutation,
  useRejectProductionWithdrawalRequestMutation,
  useCancelProductionWithdrawalRequestMutation,
  type ProductionWithdrawalRequest,
  type ProductionItemWithUsage,
} from '~/lib/production/queries'
import type { SessionUser } from '~/lib/auth/session'

type ReqStatus = 'pending_approval' | 'approved' | 'rejected' | 'cancelled'

const STATUS_BADGE: Record<ReqStatus, { label: string; color: string; bg: string }> = {
  pending_approval: { label: 'Pendente',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  approved:         { label: 'Aprovada',  color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  rejected:         { label: 'Recusada',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  cancelled:        { label: 'Cancelada', color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

const TABS: { id: ReqStatus; label: string }[] = [
  { id: 'pending_approval', label: 'Pendentes'  },
  { id: 'approved',         label: 'Aprovadas'  },
  { id: 'rejected',         label: 'Recusadas'  },
  { id: 'cancelled',        label: 'Canceladas' },
]

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function RequestCard({
  req,
  item,
  session,
  onApprove,
  onReject,
  onCancel,
}: {
  req:       ProductionWithdrawalRequest
  item:      ProductionItemWithUsage | undefined
  session:   SessionUser
  onApprove: (id: string) => void
  onReject:  (id: string, reason: string) => void
  onCancel:  (id: string) => void
}) {
  const [rejecting,    setRejecting]    = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const canApprove = session.role === 'admin' || session.role === 'produtor'
  const canCancel  = canApprove || req.requestedByUserId === session.id
  const badge      = STATUS_BADGE[req.status as ReqStatus] ?? STATUS_BADGE.pending_approval

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Item row */}
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg"
          style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {item?.photoUrl ? (
            <img src={item.photoUrl} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[20px]">🎭</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[13px] font-semibold" style={{ color: '#eef2ff' }}>
                {item?.name ?? req.itemId}
              </div>
              <div className="text-[11px]" style={{ color: '#4a6380' }}>
                {item?.category}
                {item?.color && <> · <span style={{ color: '#8ba4bf' }}>{item.color}</span></>}
                {item?.codigoInterno && <> · <span style={{ color: '#58a6ff' }}>#{item.codigoInterno}</span></>}
              </div>
            </div>
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div>
          <span style={{ color: '#3b5a7a' }}>Solicitado por</span>
          <div style={{ color: '#8ba4bf' }}>{req.requestedByUserName}</div>
        </div>
        <div>
          <span style={{ color: '#3b5a7a' }}>Responsável</span>
          <div style={{ color: '#8ba4bf' }}>{req.responsibleUserName}</div>
        </div>
        <div>
          <span style={{ color: '#3b5a7a' }}>Quantidade</span>
          <div style={{ color: '#8ba4bf' }}>{req.quantity} un</div>
        </div>
        <div>
          <span style={{ color: '#3b5a7a' }}>Condição na saída</span>
          <div style={{ color: '#8ba4bf' }}>{req.conditionOut}</div>
        </div>
        {req.expectedReturn && (
          <div>
            <span style={{ color: '#3b5a7a' }}>Previsão de retorno</span>
            <div style={{ color: '#8ba4bf' }}>{req.expectedReturn}</div>
          </div>
        )}
        {req.projectOrClient && (
          <div>
            <span style={{ color: '#3b5a7a' }}>Projeto / Produção</span>
            <div style={{ color: '#8ba4bf' }}>{req.projectOrClient}</div>
          </div>
        )}
        {req.notes && (
          <div className="col-span-2">
            <span style={{ color: '#3b5a7a' }}>Observações</span>
            <div style={{ color: '#8ba4bf' }}>{req.notes}</div>
          </div>
        )}
        <div className="col-span-2">
          <span style={{ color: '#3b5a7a' }}>Solicitado em</span>
          <div style={{ color: '#4a6380' }}>{fmtDate(req.createdAt)}</div>
        </div>
        {req.status === 'approved' && req.approvedAt && (
          <div className="col-span-2">
            <span style={{ color: '#3b5a7a' }}>Aprovado por</span>
            <div style={{ color: '#10b981' }}>{req.approvedByUserName} · {fmtDate(req.approvedAt)}</div>
          </div>
        )}
        {req.status === 'rejected' && req.rejectedAt && (
          <>
            <div className="col-span-2">
              <span style={{ color: '#3b5a7a' }}>Recusado por</span>
              <div style={{ color: '#ef4444' }}>{req.rejectedByUserName} · {fmtDate(req.rejectedAt)}</div>
            </div>
            {req.rejectionReason && (
              <div className="col-span-2">
                <span style={{ color: '#3b5a7a' }}>Motivo</span>
                <div style={{ color: '#ef4444' }}>{req.rejectionReason}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {req.status === 'pending_approval' && (
        <>
          {rejecting ? (
            <div
              className="rounded-lg p-3"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <p className="mb-2 text-[11px] font-medium" style={{ color: '#ef4444' }}>Motivo da recusa (opcional)</p>
              <textarea
                className="mb-2 w-full rounded-lg px-3 py-2 text-[12px] outline-none"
                style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff', resize: 'none' }}
                rows={2}
                placeholder="Ex: Item em uso, data inválida..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onReject(req.id, rejectReason); setRejecting(false) }}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-semibold"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
                >
                  Confirmar recusa
                </button>
                <button
                  onClick={() => setRejecting(false)}
                  className="rounded-lg px-3 py-1.5 text-[12px]"
                  style={{ color: '#4a6380' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {canApprove && (
                <>
                  <button
                    onClick={() => onApprove(req.id)}
                    className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  >
                    Aprovar
                  </button>
                  <button
                    onClick={() => setRejecting(true)}
                    className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                  >
                    Recusar
                  </button>
                </>
              )}
              {canCancel && !canApprove && (
                <button
                  onClick={() => onCancel(req.id)}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
                  style={{ background: 'rgba(107,114,128,0.1)', border: '1px solid rgba(107,114,128,0.2)', color: '#9ca3af' }}
                >
                  Cancelar solicitação
                </button>
              )}
              {canApprove && (
                <button
                  onClick={() => onCancel(req.id)}
                  className="rounded-lg px-3 py-1.5 text-[12px]"
                  style={{ color: '#4a6380' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function ProductionApprovalsPanel({ session }: { session: SessionUser }) {
  const { data: requests } = useSuspenseQuery(productionQueries.withdrawalRequests())
  const { data: items    } = useSuspenseQuery(productionQueries.list())

  const canApprove = session.role === 'admin' || session.role === 'produtor'

  const [activeTab, setActiveTab] = useState<ReqStatus>('pending_approval')

  const approveMut = useApproveProductionWithdrawalRequestMutation()
  const rejectMut  = useRejectProductionWithdrawalRequestMutation()
  const cancelMut  = useCancelProductionWithdrawalRequestMutation()

  const itemMap    = Object.fromEntries(items.map((i) => [i.id, i]))
  const filtered   = requests.filter((r) => r.status === activeTab)
  const pendingCount = requests.filter((r) => r.status === 'pending_approval').length

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl p-1" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}>
        {TABS.map((t) => {
          const count = t.id === 'pending_approval' ? pendingCount
            : requests.filter((r) => r.status === t.id).length
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
              style={activeTab === t.id ? { background: '#162040', color: '#93c5fd' } : { color: '#4a6380' }}
            >
              {t.label}
              {count > 0 && (
                <span
                  className="rounded-full px-1.5 text-[10px] font-semibold"
                  style={
                    t.id === 'pending_approval' && activeTab !== t.id
                      ? { background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }
                      : { background: 'rgba(255,255,255,0.08)', color: '#8ba4bf' }
                  }
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl py-14 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-[28px] mb-2">
            {activeTab === 'pending_approval' ? '⏳' : activeTab === 'approved' ? '✓' : activeTab === 'rejected' ? '✗' : '○'}
          </div>
          <div className="text-[13px]" style={{ color: '#2b4266' }}>
            {activeTab === 'pending_approval'
              ? canApprove ? 'Nenhuma solicitação pendente' : 'Você não tem solicitações pendentes'
              : `Nenhuma solicitação ${TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}`}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            item={itemMap[req.itemId]}
            session={session}
            onApprove={(id) => approveMut.mutate(id)}
            onReject={(id, reason) => rejectMut.mutate({ requestId: id, rejectionReason: reason || undefined })}
            onCancel={(id) => cancelMut.mutate(id)}
          />
        ))}
      </div>
    </div>
  )
}
