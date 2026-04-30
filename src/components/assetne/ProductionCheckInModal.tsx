import { useState } from 'react'
import { Modal, ModalFooter } from './Modal'
import { useCheckInProductionItemMutation, type ProductionItemWithUsage } from '~/lib/production/queries'
import type { ProductionMovement } from '~/db/schema/production.schema'

const CONDITIONS: { value: 'bom' | 'regular' | 'ruim'; label: string; color: string }[] = [
  { value: 'bom',     label: 'Bom',     color: '#10b981' },
  { value: 'regular', label: 'Regular', color: '#f59e0b' },
  { value: 'ruim',    label: 'Ruim',    color: '#ef4444' },
]

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function ProductionCheckInModal({
  item,
  session,
  onClose,
}: {
  item:     ProductionItemWithUsage
  session?: any
  onClose:  () => void
}) {
  const canManage = session?.role === 'admin' || session?.role === 'produtor'

  // Only show movements the user is allowed to return
  const allowedMovements = canManage
    ? item.activeMovements
    : item.activeMovements.filter((m) => m.checkedOutByUserId === session?.id)

  const [selectedMovement, setSelectedMovement]   = useState<ProductionMovement | null>(
    allowedMovements.length === 1 ? allowedMovements[0] : null,
  )
  const [statusAfterReturn, setStatusAfterReturn] = useState<'bom' | 'regular' | 'ruim'>('bom')
  const [notes,             setNotes]             = useState('')

  const mutation = useCheckInProductionItemMutation()

  const handleConfirm = async () => {
    if (!selectedMovement) return
    await mutation.mutateAsync({
      movementId: selectedMovement.id,
      statusAfterReturn,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal title="Registrar Devolução" onClose={onClose}>
      {/* Info do item */}
      <div
        className="mb-4 flex items-center gap-3 rounded-lg p-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {item.photoUrl ? (
          <img src={item.photoUrl} alt={item.name} className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg text-[18px]"
            style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}>
            🎭
          </div>
        )}
        <div>
          <div className="text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{item.name}</div>
          <div className="text-[11px]" style={{ color: '#3b5a7a' }}>
            {item.activeMovements.length} retirada(s) ativa(s)
          </div>
        </div>
      </div>

      {/* Selecionar retirada se houver mais de uma */}
      {allowedMovements.length === 0 && (
        <div
          className="mb-4 rounded-lg p-3 text-[12px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
        >
          Você não tem retiradas ativas para devolver. Apenas o responsável ou um administrador pode devolver este item.
        </div>
      )}

      {allowedMovements.length > 1 && (
        <div className="mb-3">
          <div className="mb-1.5 text-[12px] font-medium" style={{ color: '#8b949e' }}>Qual retirada devolver?</div>
          <div className="flex flex-col gap-1.5">
            {allowedMovements.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMovement(m)}
                className="rounded-lg px-3 py-2.5 text-left text-[12px] transition-all"
                style={
                  selectedMovement?.id === m.id
                    ? { background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.4)', color: '#93c5fd' }
                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#8ba4bf' }
                }
              >
                <span className="font-medium" style={{ color: '#d6e4f0' }}>{m.responsible}</span>
                {m.project && <span style={{ color: '#4a6380' }}> · {m.project}</span>}
                <span style={{ color: '#3b5a7a' }}> · {m.qty} un · {formatDate(m.checkedOutAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMovement && (
        <div
          className="mb-4 rounded-lg px-3 py-2 text-[12px]"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#4a6380' }}
        >
          Devolvendo {selectedMovement.qty} un de <span style={{ color: '#8ba4bf' }}>{selectedMovement.responsible}</span>
          {selectedMovement.project && <> · <span style={{ color: '#8ba4bf' }}>{selectedMovement.project}</span></>}
        </div>
      )}

      <div className="mb-3">
        <div className="mb-1.5 text-[12px] font-medium" style={{ color: '#8b949e' }}>Condição na devolução</div>
        <div className="flex gap-1.5">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setStatusAfterReturn(c.value)}
              className="flex-1 rounded-md py-2 text-[12px] font-medium transition-all"
              style={
                statusAfterReturn === c.value
                  ? { background: c.color + '22', border: `1px solid ${c.color}66`, color: c.color }
                  : { background: '#21262d', border: '1px solid rgba(255,255,255,0.1)', color: '#8b949e' }
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1.5 text-[12px] font-medium" style={{ color: '#8b949e' }}>Observações (opcional)</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Estado do item, danos, etc..."
          rows={2}
          className="w-full resize-none rounded-md px-3 py-2 text-[13px] outline-none"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </div>

      <ModalFooter
        onClose={onClose}
        onConfirm={allowedMovements.length > 0 ? handleConfirm : undefined}
        confirmLabel="Registrar Devolução"
        disabled={!selectedMovement || allowedMovements.length === 0}
        loading={mutation.isPending}
      />
    </Modal>
  )
}
