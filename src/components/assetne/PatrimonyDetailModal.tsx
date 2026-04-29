import { useState } from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Modal } from './Modal'
import {
  useDeletePatrimonyItemMutation,
  useSendPatrimonyToMaintenanceMutation,
  useReturnPatrimonyFromMaintenanceMutation,
  useChangePatrimonyStatusMutation,
  patrimonyQueries,
} from '~/lib/patrimony/queries'
import type { PatrimonyItem } from '~/db/schema/patrimony.schema'
import { PATRIMONY_MOVEMENT_LABELS } from '~/utils/constants'
import { formatCurrency } from '~/utils/format'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  disponivel:          { label: 'Disponível',         color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  pendente_aprovacao:  { label: 'Aguard. aprovação',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  em_uso:              { label: 'Em Uso',             color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  emprestado:          { label: 'Emprestado',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  manutencao:          { label: 'Manutenção',         color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  extraviado:          { label: 'Extraviado',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  baixado:             { label: 'Baixado',            color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

const CONDITION_LABEL: Record<string, string> = {
  novo:                 'Novo',
  bom:                  'Bom',
  regular:              'Regular',
  necessita_manutencao: 'Necessita manutenção',
  danificado:           'Danificado',
}

const MOV_COLOR: Record<string, string> = {
  created:              '#10b981',
  updated:              '#3b82f6',
  checked_out:          '#f59e0b',
  returned:             '#10b981',
  sent_to_maintenance:  '#ef4444',
  maintenance_returned: '#10b981',
  status_changed:       '#8b5cf6',
  discarded:            '#6b7280',
  admin_correction:     '#f59e0b',
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex justify-between gap-2 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="shrink-0 text-[12px]" style={{ color: '#4a6380' }}>{label}</span>
      <span className="text-right text-[12px]" style={{ color: '#8ba4bf' }}>{value}</span>
    </div>
  )
}

function HistoryTab({ itemId }: { itemId: string }) {
  const { data: movements } = useSuspenseQuery(patrimonyQueries.movements(itemId))

  if (movements.length === 0) {
    return (
      <div className="py-8 text-center text-[13px]" style={{ color: '#2b4266' }}>
        Nenhuma movimentação registrada
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {movements.map((m) => {
        const color = MOV_COLOR[m.type] ?? '#8ba4bf'
        const date  = new Date(m.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
        })
        return (
          <div
            key={m.id}
            className="flex gap-3 rounded-lg p-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div
              className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
              style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[12px] font-semibold" style={{ color }}>
                  {PATRIMONY_MOVEMENT_LABELS[m.type] ?? m.type}
                </span>
                <span className="shrink-0 text-[11px]" style={{ color: '#2b4266' }}>{date}</span>
              </div>
              {m.performedByUserName && (
                <div className="text-[11px]" style={{ color: '#3b5a7a' }}>por {m.performedByUserName}</div>
              )}
              {m.responsibleUserName && m.type === 'checked_out' && (
                <div className="text-[11px]" style={{ color: '#3b5a7a' }}>responsável: {m.responsibleUserName}</div>
              )}
              {m.notes && (
                <div className="mt-1 text-[11px]" style={{ color: '#4a6380' }}>{m.notes}</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PatrimonyDetailModal({
  item,
  isAdmin,
  isGestorPatrimonio,
  onEdit,
  onCheckout,
  onCheckin,
  onClose,
}: {
  item:               PatrimonyItem
  isAdmin:            boolean
  isGestorPatrimonio: boolean
  onEdit:    () => void
  onCheckout: () => void
  onCheckin:  () => void
  onClose:   () => void
}) {
  const [tab,              setTab]              = useState<'info' | 'history'>('info')
  const [maintenanceNotes, setMaintenanceNotes] = useState('')
  const [retCondition,     setRetCondition]     = useState(item.condition)
  const [showMaintForm,    setShowMaintForm]    = useState(false)
  const [showRetMaintForm, setShowRetMaintForm] = useState(false)

  const deleteMut     = useDeletePatrimonyItemMutation()
  const maintMut      = useSendPatrimonyToMaintenanceMutation()
  const retMaintMut   = useReturnPatrimonyFromMaintenanceMutation()
  const statusMut     = useChangePatrimonyStatusMutation()

  const badge = STATUS_BADGE[item.status] ?? { label: item.status, color: '#8ba4bf', bg: 'rgba(255,255,255,0.05)' }

  const isPendingApproval = item.status === 'pendente_aprovacao'
  const canCheckout = item.status === 'disponivel'
  const canCheckin  = item.status === 'em_uso' || item.status === 'emprestado'
  const canMaint    = item.status !== 'manutencao' && item.status !== 'baixado' && !isPendingApproval
  const canRetMaint = item.status === 'manutencao'

  return (
    <Modal title="Detalhes do Item" onClose={onClose} width={540}>
      {/* Photo + name */}
      <div className="mb-4 flex gap-4">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl"
          style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          {item.mainImageUrl ? (
            <img src={item.mainImageUrl} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[32px]">🏢</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold leading-tight" style={{ color: '#eef2ff' }}>{item.name}</h3>
          <div className="mt-0.5 text-[12px]" style={{ color: '#4a6380' }}>
            {item.patrimonyCode} · {item.category}
          </div>
          {(item.brand || item.model) && (
            <div className="mt-0.5 text-[12px]" style={{ color: '#3b5a7a' }}>
              {[item.brand, item.model].filter(Boolean).join(' ')}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: badge.bg, color: badge.color }}
            >
              {badge.label}
            </span>
            {item.estimatedValue != null && (
              <span className="text-[11px]" style={{ color: '#2b4266' }}>
                {formatCurrency(item.estimatedValue)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pending approval banner */}
      {isPendingApproval && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[12px]"
          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}
        >
          <span>⏳</span>
          <span>
            <span className="font-semibold">Solicitação pendente</span>
            {isAdmin || isGestorPatrimonio
              ? ' — acesse a aba Aprovações para aprovar ou recusar.'
              : ' — aguardando aprovação do gestor de patrimônio.'}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {canCheckout && (
          <button onClick={onCheckout} className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff' }}>
            Retirar
          </button>
        )}
        {canCheckin && (
          <button onClick={onCheckin} className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981' }}>
            Devolver
          </button>
        )}
        {isAdmin && canMaint && !showMaintForm && (
          <button onClick={() => setShowMaintForm(true)} className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
            Manutenção
          </button>
        )}
        {isAdmin && canRetMaint && !showRetMaintForm && (
          <button onClick={() => setShowRetMaintForm(true)} className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981' }}>
            Retornou da manutenção
          </button>
        )}
        {(isAdmin || isGestorPatrimonio) && (
          <button onClick={onEdit} className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}>
            Editar
          </button>
        )}
        {isAdmin && item.status !== 'baixado' && (
          <button
            onClick={() => statusMut.mutate({ itemId: item.id, newStatus: 'baixado', notes: 'Baixa administrativa' })}
            className="rounded-lg px-3 py-1.5 text-[12px] font-medium"
            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
            Baixar item
          </button>
        )}
      </div>

      {/* Maintenance form */}
      {showMaintForm && (
        <div className="mb-3 rounded-lg p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p className="mb-2 text-[12px] font-medium" style={{ color: '#f59e0b' }}>Enviar para manutenção</p>
          <textarea
            className="mb-2 w-full rounded-lg px-3 py-2 text-[12px] outline-none"
            style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff', resize: 'none' }}
            rows={2}
            placeholder="Motivo da manutenção..."
            value={maintenanceNotes}
            onChange={(e) => setMaintenanceNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { maintMut.mutate({ itemId: item.id, notes: maintenanceNotes || undefined }); setShowMaintForm(false); onClose() }}
              disabled={maintMut.isPending}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              Confirmar
            </button>
            <button onClick={() => setShowMaintForm(false)} className="rounded-lg px-3 py-1.5 text-[12px]" style={{ color: '#4a6380' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Return from maintenance form */}
      {showRetMaintForm && (
        <div className="mb-3 rounded-lg p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <p className="mb-2 text-[12px] font-medium" style={{ color: '#10b981' }}>Retorno da manutenção</p>
          <select
            className="mb-2 w-full rounded-lg px-3 py-2 text-[12px] outline-none"
            style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
            value={retCondition}
            onChange={(e) => setRetCondition(e.target.value)}
          >
            <option value="novo">Novo</option>
            <option value="bom">Bom</option>
            <option value="regular">Regular</option>
            <option value="necessita_manutencao">Necessita manutenção</option>
            <option value="danificado">Danificado</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => { retMaintMut.mutate({ itemId: item.id, condition: retCondition }); setShowRetMaintForm(false); onClose() }}
              disabled={retMaintMut.isPending}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            >
              Confirmar
            </button>
            <button onClick={() => setShowRetMaintForm(false)} className="rounded-lg px-3 py-1.5 text-[12px]" style={{ color: '#4a6380' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
        {(['info', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-md py-1.5 text-[12px] font-medium transition-all"
            style={tab === t ? { background: '#162040', color: '#93c5fd' } : { color: '#4a6380' }}
          >
            {t === 'info' ? 'Informações' : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div>
          <InfoRow label="Código patrimonial" value={item.patrimonyCode} />
          <InfoRow label="Categoria"           value={item.category} />
          <InfoRow label="Responsável atual"   value={item.currentResponsibleName ?? (item.status === 'em_uso' || item.status === 'emprestado' ? 'Não definido' : 'Sem responsável')} />
          <InfoRow label="Localização"         value={item.location} />
          <InfoRow label="Marca"               value={item.brand} />
          <InfoRow label="Modelo"              value={item.model} />
          <InfoRow label="N° de série"         value={item.serialNumber} />
          <InfoRow label="Condição"            value={CONDITION_LABEL[item.condition] ?? item.condition} />
          <InfoRow label="Valor estimado"      value={item.estimatedValue != null ? formatCurrency(item.estimatedValue) : undefined} />
          <InfoRow label="Data de aquisição"   value={item.acquisitionDate} />
          <InfoRow label="Fornecedor"          value={item.supplier} />
          <InfoRow label="Observações"         value={item.notes} />
          {isAdmin && (
            <div className="mt-4 flex justify-end">
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
                Remover item
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <HistoryTab itemId={item.id} />
      )}
    </Modal>
  )
}
