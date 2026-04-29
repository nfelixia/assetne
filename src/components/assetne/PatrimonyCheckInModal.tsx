import { useState } from 'react'
import { Modal, ModalFooter } from './Modal'
import { useCheckInPatrimonyItemMutation } from '~/lib/patrimony/queries'
import type { PatrimonyItem } from '~/db/schema/patrimony.schema'

const FIELD = 'rounded-lg px-3 py-2 text-[13px] w-full outline-none transition-all'
const FIELD_STYLE = { background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium" style={{ color: '#4a6380' }}>{label}</label>
      {children}
    </div>
  )
}

export function PatrimonyCheckInModal({
  item,
  isAdmin,
  currentUserId,
  onClose,
}: {
  item:          PatrimonyItem
  isAdmin:       boolean
  currentUserId: string
  onClose:       () => void
}) {
  const [conditionIn, setConditionIn] = useState(item.condition)
  const [newStatus,   setNewStatus]   = useState('disponivel')
  const [notes,       setNotes]       = useState('')

  const checkinMut = useCheckInPatrimonyItemMutation()

  const canReturn = isAdmin || item.currentResponsibleId === currentUserId
  const select = `${FIELD} appearance-none cursor-pointer`

  async function handleConfirm() {
    await checkinMut.mutateAsync({ itemId: item.id, conditionIn, newStatus, notes: notes.trim() || undefined })
    onClose()
  }

  return (
    <Modal title="Registrar Devolução" onClose={onClose} width={480}>
      {/* Item info */}
      <div
        className="mb-4 flex items-center gap-3 rounded-lg p-3"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {item.mainImageUrl ? (
          <img src={item.mainImageUrl} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[18px]" style={{ background: '#060c1a' }}>
            🏢
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium" style={{ color: '#eef2ff' }}>{item.name}</div>
          <div className="text-[11px]" style={{ color: '#4a6380' }}>
            {item.patrimonyCode} · {item.currentResponsibleName ?? 'Responsável desconhecido'}
          </div>
        </div>
      </div>

      {!canReturn ? (
        <div
          className="mb-4 rounded-lg p-4 text-[13px]"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
        >
          <div className="mb-1 font-semibold">Acesso negado</div>
          <div style={{ color: '#f87171' }}>
            Este item foi retirado por outro usuário. Apenas o responsável pela retirada ou um administrador pode realizar a devolução.
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Condição na devolução">
              <select className={select} style={FIELD_STYLE} value={conditionIn} onChange={(e) => setConditionIn(e.target.value)}>
                <option value="novo">Novo</option>
                <option value="bom">Bom</option>
                <option value="regular">Regular</option>
                <option value="necessita_manutencao">Necessita manutenção</option>
                <option value="danificado">Danificado</option>
              </select>
            </Field>

            <Field label="Status após devolução">
              <select className={select} style={FIELD_STYLE} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="disponivel">Disponível</option>
                <option value="manutencao">Manutenção</option>
              </select>
            </Field>
          </div>

          <Field label="Observações">
            <textarea
              className={FIELD}
              style={{ ...FIELD_STYLE, resize: 'none' }}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre a devolução..."
            />
          </Field>
        </div>
      )}

      <ModalFooter
        onClose={onClose}
        onConfirm={canReturn ? handleConfirm : undefined}
        confirmLabel="Confirmar devolução"
        disabled={!canReturn || checkinMut.isPending}
        loading={checkinMut.isPending}
      />
    </Modal>
  )
}
