import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, ModalFooter } from './Modal'
import {
  useCheckOutPatrimonyItemMutation,
  useCreateWithdrawalRequestMutation,
} from '~/lib/patrimony/queries'
import type { PatrimonyItem } from '~/db/schema/patrimony.schema'
import type { SessionUser } from '~/lib/auth/session'
import { PATRIMONY_USE_TYPES } from '~/utils/constants'
import { getUsersFn } from '~/server/function/auth'

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

export function PatrimonyCheckOutModal({
  item,
  session,
  onClose,
}: {
  item:    PatrimonyItem
  session: SessionUser
  onClose: () => void
}) {
  const canDirectCheckout = session.role === 'admin' || session.role === 'gestor_patrimonio'

  const [responsibleId,   setResponsibleId]   = useState(canDirectCheckout ? '' : session.id)
  const [customName,      setCustomName]      = useState('')
  const [useType,         setUseType]         = useState('uso_interno')
  const [projectOrClient, setProjectOrClient] = useState('')
  const [expectedReturn,  setExpectedReturn]  = useState('')
  const [conditionOut,    setConditionOut]    = useState(item.condition)
  const [notes,           setNotes]           = useState('')
  const [done,            setDone]            = useState(false)

  const checkoutMut = useCheckOutPatrimonyItemMutation()
  const requestMut  = useCreateWithdrawalRequestMutation()

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  () => getUsersFn(),
    staleTime: 1000 * 60 * 5,
  })

  const isCustom        = responsibleId === '__custom__'
  const selectedUser    = users.find((u) => u.id === responsibleId)
  const responsibleName = isCustom ? customName.trim() : (selectedUser?.name ?? '')
  const canSave         = responsibleName.length > 0
  const isLoading       = checkoutMut.isPending || requestMut.isPending

  async function handleConfirm() {
    const payload = {
      itemId:             item.id,
      responsibleUserId:  isCustom ? undefined : (responsibleId || undefined),
      responsibleName,
      useType,
      projectOrClient:    projectOrClient.trim() || undefined,
      expectedReturnDate: expectedReturn || undefined,
      conditionOut,
      notes:              notes.trim() || undefined,
    }

    if (canDirectCheckout) {
      await checkoutMut.mutateAsync(payload)
      onClose()
    } else {
      await requestMut.mutateAsync(payload)
      setDone(true)
    }
  }

  const select = `${FIELD} appearance-none cursor-pointer`
  const title  = canDirectCheckout ? 'Registrar Saída' : 'Solicitar Retirada'

  return (
    <Modal title={title} onClose={onClose} width={480}>
      {done ? (
        <div className="py-6 text-center">
          <div className="mb-3 text-[40px]">✓</div>
          <div className="text-[15px] font-semibold" style={{ color: '#10b981' }}>
            Solicitação enviada!
          </div>
          <p className="mt-2 text-[13px]" style={{ color: '#4a6380' }}>
            Aguardando aprovação do gestor de patrimônio.
          </p>
          <button
            onClick={onClose}
            className="mt-5 rounded-lg px-5 py-2 text-[13px] font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
          >
            Fechar
          </button>
        </div>
      ) : (
        <>
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
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium" style={{ color: '#eef2ff' }}>{item.name}</div>
              <div className="text-[11px]" style={{ color: '#4a6380' }}>
                {item.patrimonyCode} · {item.category}
              </div>
            </div>
          </div>

          {/* Info banner for non-approvers */}
          {!canDirectCheckout && (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12px]"
              style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}
            >
              <span className="mt-0.5 shrink-0">ℹ</span>
              <span>Sua solicitação será enviada para aprovação do gestor de patrimônio antes da retirada.</span>
            </div>
          )}

          <div className="grid gap-3">
            <Field label="Responsável pela retirada *">
              <select
                className={select}
                style={FIELD_STYLE}
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                autoFocus={canDirectCheckout}
              >
                {canDirectCheckout && <option value="">Selecionar usuário...</option>}
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
                <option value="__custom__">Outro (digitar nome)...</option>
              </select>
            </Field>

            {isCustom && (
              <Field label="Nome do responsável *">
                <input
                  className={FIELD}
                  style={FIELD_STYLE}
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nome completo"
                  autoFocus
                />
              </Field>
            )}

            <Field label="Tipo de uso *">
              <select className={select} style={FIELD_STYLE} value={useType} onChange={(e) => setUseType(e.target.value)}>
                {PATRIMONY_USE_TYPES.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </Field>

            {(useType === 'projeto' || useType === 'cliente' || useType === 'emprestimo') && (
              <Field label="Cliente / Projeto">
                <input
                  className={FIELD}
                  style={FIELD_STYLE}
                  value={projectOrClient}
                  onChange={(e) => setProjectOrClient(e.target.value)}
                  placeholder="Nome do cliente ou projeto"
                />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Previsão de devolução">
                <input
                  className={FIELD}
                  style={FIELD_STYLE}
                  type="date"
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                />
              </Field>

              <Field label="Condição na saída">
                <select className={select} style={FIELD_STYLE} value={conditionOut} onChange={(e) => setConditionOut(e.target.value)}>
                  <option value="novo">Novo</option>
                  <option value="bom">Bom</option>
                  <option value="regular">Regular</option>
                  <option value="necessita_manutencao">Necessita manutenção</option>
                  <option value="danificado">Danificado</option>
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
                placeholder="Observações adicionais..."
              />
            </Field>
          </div>

          <ModalFooter
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmLabel={canDirectCheckout ? 'Confirmar saída' : 'Enviar solicitação'}
            disabled={!canSave || isLoading}
            loading={isLoading}
          />
        </>
      )}
    </Modal>
  )
}
