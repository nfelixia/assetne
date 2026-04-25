import { useState } from 'react'
import { Modal, ModalFooter } from './Modal'
import { CAT_ICON } from './utils'
import { useCheckinMutation } from '~/lib/checkout/queries'
import type { EquipmentWithCheckout } from '~/lib/equipment/queries'

type ReturnCondition = 'perfect' | 'minor' | 'major'

const CONDITION_OPTS: { value: ReturnCondition; label: string; color: string }[] = [
  { value: 'perfect', label: 'Perfeito',   color: '#3fb950' },
  { value: 'minor',   label: 'Dano leve',  color: '#e3b341' },
  { value: 'major',   label: 'Dano grave', color: '#f85149' },
]

export function CheckInModal({
  equipment,
  onClose,
}: {
  equipment: EquipmentWithCheckout[]
  onClose: () => void
}) {
  const inUse = equipment.filter((e) => e.status === 'in-use' && e.activeCheckout)
  const [conditions, setConditions] = useState<Record<string, ReturnCondition>>({})
  const mutation = useCheckinMutation()

  const setC = (id: string, val: ReturnCondition) =>
    setConditions((p) => ({ ...p, [id]: val }))

  const reviewed   = Object.keys(conditions).length
  const perfect    = Object.values(conditions).filter((v) => v === 'perfect').length
  const withIssue  = Object.values(conditions).filter((v) => v && v !== 'perfect').length

  const handleConfirm = async () => {
    for (const eq of inUse) {
      const cond = conditions[eq.id]
      if (cond && eq.activeCheckout) {
        await mutation.mutateAsync({
          checkoutId: eq.activeCheckout.id,
          equipmentId: eq.id,
          returnCondition: cond,
        })
      }
    }
    onClose()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('pt-BR')
  }

  return (
    <Modal title="Devolução" onClose={onClose} width={520}>
      <div className="mb-3.5">
        <div className="mb-2 text-[12px] font-medium text-[#8b949e]">Equipamentos em uso</div>

        {inUse.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-[#0d1117] p-6 text-center text-[13px] text-[#6e7681]">
            Nenhum equipamento em uso no momento
          </div>
        )}

        {inUse.map((eq) => {
          const checkout = eq.activeCheckout!
          const workDate = formatDate(checkout.expectedReturn)
          return (
            <div
              key={eq.id}
              className="mb-2 rounded-lg border border-white/10 bg-[#0d1117] p-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-[17px]">{CAT_ICON[eq.category] ?? '📦'}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[#e6edf3]">{eq.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-[#6e7681]">
                    <span>{checkout.responsible}</span>
                    {checkout.responsibleRole && (
                      <>
                        <span>·</span>
                        <span>{checkout.responsibleRole}</span>
                      </>
                    )}
                    {workDate && (
                      <>
                        <span>·</span>
                        <span className="text-[#8b949e]">Diária: {workDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <select
                  value={conditions[eq.id] ?? ''}
                  onChange={(e) => setC(eq.id, e.target.value as ReturnCondition)}
                  className="shrink-0 cursor-pointer rounded-md border border-white/10 bg-[#21262d] px-2.5 py-1.5 text-[12px] outline-none"
                  style={{
                    color: conditions[eq.id] === 'perfect' ? '#3fb950'
                         : conditions[eq.id] === 'minor'   ? '#e3b341'
                         : conditions[eq.id] === 'major'   ? '#f85149'
                         : '#8b949e',
                  }}
                >
                  <option value="">Condição...</option>
                  {CONDITION_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {reviewed > 0 && (
        <div className="mb-1 flex gap-3 rounded-md border border-white/10 bg-[#21262d] px-3 py-2 text-[12px] text-[#8b949e]">
          {perfect > 0 && (
            <span style={{ color: '#3fb950' }}>
              {perfect} perfeito{perfect !== 1 ? 's' : ''}
            </span>
          )}
          {withIssue > 0 && (
            <span style={{ color: '#e3b341' }}>
              {withIssue} com ocorrência
            </span>
          )}
        </div>
      )}

      <ModalFooter
        onClose={onClose}
        onConfirm={handleConfirm}
        confirmLabel="Confirmar Devolução"
        disabled={inUse.length === 0 || reviewed === 0}
        loading={mutation.isPending}
      />
    </Modal>
  )
}
