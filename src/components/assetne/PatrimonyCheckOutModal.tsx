import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, ModalFooter } from './Modal'
import { useCheckOutPatrimonyItemMutation } from '~/lib/patrimony/queries'
import type { PatrimonyItem } from '~/db/schema/patrimony.schema'
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

export function PatrimonyCheckOutModal({ item, onClose }: { item: PatrimonyItem; onClose: () => void }) {
  const [responsibleId,    setResponsibleId]    = useState('')
  const [customName,       setCustomName]       = useState('')
  const [useType,          setUseType]          = useState('uso_interno')
  const [projectOrClient,  setProjectOrClient]  = useState('')
  const [expectedReturn,   setExpectedReturn]   = useState('')
  const [conditionOut,     setConditionOut]     = useState(item.condition)
  const [notes,            setNotes]            = useState('')

  const checkoutMut = useCheckOutPatrimonyItemMutation()
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsersFn(),
    staleTime: 1000 * 60 * 5,
  })

  const isCustom = responsibleId === '__custom__'
  const responsibleName = isCustom ? customName.trim() : (users.find((u) => u.id === responsibleId)?.name ?? '')
  const canSave = responsibleName.length > 0

  async function handleConfirm() {
    await checkoutMut.mutateAsync({
      itemId:             item.id,
      responsibleUserId:  isCustom ? undefined : (responsibleId || undefined),
      responsibleName,
      useType,
      projectOrClient:    projectOrClient.trim() || undefined,
      expectedReturnDate: expectedReturn || undefined,
      conditionOut,
      notes:              notes.trim() || undefined,
    })
    onClose()
  }

  const select = `${FIELD} appearance-none cursor-pointer`

  return (
    <Modal title="Registrar Saída" onClose={onClose} width={480}>
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

      <div className="grid gap-3">
        <Field label="Responsável pela retirada *">
          <select
            className={select}
            style={FIELD_STYLE}
            value={responsibleId}
            onChange={(e) => setResponsibleId(e.target.value)}
            autoFocus
          >
            <option value="">Selecionar usuário...</option>
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
            <input className={FIELD} style={FIELD_STYLE} type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} />
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
        confirmLabel="Confirmar saída"
        disabled={!canSave || checkoutMut.isPending}
        loading={checkoutMut.isPending}
      />
    </Modal>
  )
}
