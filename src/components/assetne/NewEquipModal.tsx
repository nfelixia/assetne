import { useState } from 'react'
import { Modal, ModalFooter } from './Modal'
import { useCreateEquipmentMutation } from '~/lib/equipment/queries'

const CATEGORIES = ['Câmera', 'Estabilizador', 'Iluminação', 'Áudio', 'Outro']
const CONDITIONS: { value: 'new' | 'good' | 'regular'; label: string }[] = [
  { value: 'new',     label: 'Novo' },
  { value: 'good',    label: 'Bom' },
  { value: 'regular', label: 'Regular' },
]

export function NewEquipModal({ onClose }: { onClose: () => void }) {
  const [name,         setName]         = useState('')
  const [category,     setCategory]     = useState('')
  const [value,        setValue]        = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [condition,    setCondition]    = useState<'new' | 'good' | 'regular'>('new')
  const mutation = useCreateEquipmentMutation()

  const handleConfirm = async () => {
    await mutation.mutateAsync({ name, category, value, serialNumber, condition })
    onClose()
  }

  return (
    <Modal title="Cadastrar Equipamento" onClose={onClose}>
      <Field label="Nome do equipamento">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Canon EOS R5"
          className="w-full rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
      </Field>

      <Field label="Categoria">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full cursor-pointer rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
        >
          <option value="">Selecionar...</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Valor">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="R$ 0,00"
          className="w-full rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
      </Field>

      <Field label="Número de série (opcional)">
        <input
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="SN-XXXXXXXX"
          className="w-full rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
      </Field>

      <Field label="Condição inicial">
        <div className="flex gap-1.5">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className={`flex-1 rounded-md py-2 text-[12px] font-medium transition-all ${
                condition === c.value
                  ? 'bg-[#1f6feb] text-white'
                  : 'border border-white/10 bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      <ModalFooter
        onClose={onClose}
        onConfirm={handleConfirm}
        confirmLabel="Cadastrar"
        disabled={!name.trim() || !category || !value.trim()}
        loading={mutation.isPending}
      />
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[12px] font-medium text-[#8b949e]">{label}</div>
      {children}
    </div>
  )
}
