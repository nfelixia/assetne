import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, ModalFooter } from './Modal'
import {
  useCheckOutProductionItemMutation,
  useCreateProductionWithdrawalRequestMutation,
  type ProductionItemWithUsage,
} from '~/lib/production/queries'
import type { SessionUser } from '~/lib/auth/session'
import { getUsersFn } from '~/server/function/auth'

const FIELD       = 'rounded-lg px-3 py-2 text-[13px] w-full outline-none transition-all'
const FIELD_STYLE = { background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }

const PROD_CONDITION_OPTIONS = [
  { value: 'bom',     label: 'Bom'    },
  { value: 'regular', label: 'Regular' },
  { value: 'ruim',    label: 'Ruim'   },
]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium" style={{ color: '#4a6380' }}>{label}</label>
      {children}
    </div>
  )
}

export function ProductionCheckOutModal({
  item,
  session,
  onClose,
}: {
  item:    ProductionItemWithUsage
  session: SessionUser
  onClose: () => void
}) {
  const canDirectCheckout = session.role === 'admin' || session.role === 'produtor'

  const [qty,            setQty]            = useState(1)
  const [responsibleId,  setResponsibleId]  = useState(canDirectCheckout ? '' : session.id)
  const [customName,     setCustomName]     = useState('')
  const [project,        setProject]        = useState('')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [conditionOut,   setConditionOut]   = useState('bom')
  const [notes,          setNotes]          = useState('')
  const [done,           setDone]           = useState(false)

  const checkoutMut = useCheckOutProductionItemMutation()
  const requestMut  = useCreateProductionWithdrawalRequestMutation()

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  () => getUsersFn(),
    staleTime: 1000 * 60 * 5,
  })

  const maxQty          = item.availableQty
  const isCustom        = responsibleId === '__custom__'
  const selectedUser    = users.find((u) => u.id === responsibleId)
  const responsibleName = isCustom ? customName.trim() : (selectedUser?.name ?? '')
  const canSave         = responsibleName.length > 0 && qty >= 1 && qty <= maxQty
  const isLoading       = checkoutMut.isPending || requestMut.isPending
  const select          = `${FIELD} appearance-none cursor-pointer`
  const title           = canDirectCheckout ? 'Registrar Retirada' : 'Solicitar Retirada'

  async function handleConfirm() {
    if (canDirectCheckout) {
      await checkoutMut.mutateAsync({
        itemId:            item.id,
        qty,
        responsibleUserId: isCustom ? undefined : (responsibleId || undefined),
        responsible:       responsibleName,
        project:           project.trim() || undefined,
        expectedReturn:    expectedReturn || undefined,
        conditionOut,
        notes:             notes.trim() || undefined,
      })
      onClose()
    } else {
      await requestMut.mutateAsync({
        itemId:             item.id,
        responsibleUserId:  responsibleId || undefined,
        responsibleName,
        quantity:           qty,
        projectOrClient:    project.trim() || undefined,
        expectedReturn:     expectedReturn || undefined,
        conditionOut,
        notes:              notes.trim() || undefined,
      })
      setDone(true)
    }
  }

  return (
    <Modal title={title} onClose={onClose} width={480}>
      {done ? (
        <div className="py-6 text-center">
          <div className="mb-3 text-[40px]">✓</div>
          <div className="text-[15px] font-semibold" style={{ color: '#10b981' }}>Solicitação enviada!</div>
          <p className="mt-2 text-[13px]" style={{ color: '#4a6380' }}>
            Aguardando aprovação do gestor.
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
            {item.photoUrl ? (
              <img src={item.photoUrl} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[18px]" style={{ background: '#060c1a' }}>
                🎭
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium" style={{ color: '#eef2ff' }}>{item.name}</div>
              <div className="text-[11px]" style={{ color: '#4a6380' }}>
                {item.availableQty} de {item.totalQty} disponível(is)
                {item.color && <> · <span style={{ color: '#8ba4bf' }}>{item.color}</span></>}
              </div>
            </div>
          </div>

          {!canDirectCheckout && (
            <div
              className="mb-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12px]"
              style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', color: '#93c5fd' }}
            >
              <span className="mt-0.5 shrink-0">ℹ</span>
              <span>Sua solicitação será enviada para aprovação antes da retirada.</span>
            </div>
          )}

          <div className="grid gap-3">
            {maxQty > 1 && (
              <Field label={`Quantidade (máx. ${maxQty})`}>
                <input
                  type="number"
                  min={1}
                  max={maxQty}
                  value={qty}
                  onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                  className={FIELD}
                  style={FIELD_STYLE}
                />
              </Field>
            )}

            <Field label="Responsável pela retirada *">
              <select
                className={select}
                style={FIELD_STYLE}
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
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

            <div className="grid grid-cols-2 gap-3">
              <Field label="Previsão de devolução">
                <input
                  type="date"
                  className={FIELD}
                  style={{ ...FIELD_STYLE, colorScheme: 'dark' }}
                  value={expectedReturn}
                  onChange={(e) => setExpectedReturn(e.target.value)}
                />
              </Field>
              <Field label="Condição na saída">
                <select
                  className={select}
                  style={FIELD_STYLE}
                  value={conditionOut}
                  onChange={(e) => setConditionOut(e.target.value)}
                >
                  {PROD_CONDITION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Projeto / Gravação (opcional)">
              <input
                className={FIELD}
                style={FIELD_STYLE}
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="Nome do projeto ou produção"
              />
            </Field>

            <Field label="Observações (opcional)">
              <textarea
                className={FIELD}
                style={{ ...FIELD_STYLE, resize: 'none' }}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais..."
              />
            </Field>
          </div>

          <ModalFooter
            onClose={onClose}
            onConfirm={handleConfirm}
            confirmLabel={canDirectCheckout ? 'Confirmar retirada' : 'Enviar solicitação'}
            disabled={!canSave || isLoading}
            loading={isLoading}
          />
        </>
      )}
    </Modal>
  )
}
