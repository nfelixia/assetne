import { useState } from 'react'
import { Modal, ModalFooter } from './Modal'
import { useCheckOutProductionItemMutation, type ProductionItemWithUsage } from '~/lib/production/queries'

export function ProductionCheckOutModal({
  item,
  onClose,
}: {
  item: ProductionItemWithUsage
  onClose: () => void
}) {
  const [qty,            setQty]            = useState(1)
  const [responsible,    setResponsible]    = useState('')
  const [project,        setProject]        = useState('')
  const [expectedReturn, setExpectedReturn] = useState('')
  const [notes,          setNotes]          = useState('')

  const mutation   = useCheckOutProductionItemMutation()
  const maxQty     = item.availableQty

  const handleConfirm = async () => {
    await mutation.mutateAsync({
      itemId: item.id,
      qty,
      responsible: responsible.trim(),
      project: project.trim() || undefined,
      expectedReturn: expectedReturn || undefined,
      notes: notes.trim() || undefined,
    })
    onClose()
  }

  return (
    <Modal title="Registrar Retirada" onClose={onClose}>
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
            {item.availableQty} de {item.totalQty} disponível(is)
          </div>
        </div>
      </div>

      {maxQty > 1 && (
        <Field label={`Quantidade (máx. ${maxQty})`}>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={qty}
            onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </Field>
      )}

      <Field label="Responsável">
        <input
          value={responsible}
          onChange={(e) => setResponsible(e.target.value)}
          placeholder="Nome de quem está retirando"
          className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </Field>

      <Field label="Projeto (opcional)">
        <input
          value={project}
          onChange={(e) => setProject(e.target.value)}
          placeholder="Nome do projeto ou gravação"
          className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </Field>

      <Field label="Previsão de devolução (opcional)">
        <input
          type="date"
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3', colorScheme: 'dark' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </Field>

      <Field label="Observações (opcional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Informações adicionais..."
          rows={2}
          className="w-full resize-none rounded-md px-3 py-2 text-[13px] outline-none"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </Field>

      <ModalFooter
        onClose={onClose}
        onConfirm={handleConfirm}
        confirmLabel="Registrar Retirada"
        disabled={!responsible.trim()}
        loading={mutation.isPending}
      />
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[12px] font-medium" style={{ color: '#8b949e' }}>{label}</div>
      {children}
    </div>
  )
}
