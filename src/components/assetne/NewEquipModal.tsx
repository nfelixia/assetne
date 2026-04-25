import { useRef, useState } from 'react'
import { Modal, ModalFooter } from './Modal'
import { useCreateEquipmentMutation, useUploadEquipmentPhotoMutation } from '~/lib/equipment/queries'

const CATEGORIES = ['Câmera', 'Estabilizador', 'Iluminação', 'Áudio', 'Outro']
const CONDITIONS: { value: 'new' | 'good' | 'regular'; label: string }[] = [
  { value: 'new',     label: 'Novo' },
  { value: 'good',    label: 'Bom' },
  { value: 'regular', label: 'Regular' },
]

async function resizeToJpeg(file: File, maxPx = 800): Promise<{ base64: string; mimeType: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const w      = Math.round(img.width  * ratio)
      const h      = Math.round(img.height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const base64   = canvas.toDataURL('image/jpeg', 0.85)
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      resolve({ base64, mimeType: 'image/jpeg', fileName })
    }
    img.onerror = reject
    img.src = url
  })
}

export function NewEquipModal({ onClose }: { onClose: () => void }) {
  const [name,         setName]         = useState('')
  const [category,     setCategory]     = useState('')
  const [value,        setValue]        = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [condition,    setCondition]    = useState<'new' | 'good' | 'regular'>('new')
  const [photoData,    setPhotoData]    = useState<{ base64: string; mimeType: string; fileName: string } | null>(null)

  const mutation       = useCreateEquipmentMutation()
  const uploadMutation = useUploadEquipmentPhotoMutation()
  const fileRef        = useRef<HTMLInputElement>(null)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await resizeToJpeg(file)
    setPhotoData(data)
  }

  const handleConfirm = async () => {
    let photoUrl: string | null = null
    if (photoData) {
      const res = await uploadMutation.mutateAsync(photoData)
      photoUrl = res.url
    }
    await mutation.mutateAsync({ name, category, value, serialNumber, condition, photoUrl })
    onClose()
  }

  const isLoading = mutation.isPending || uploadMutation.isPending

  return (
    <Modal title="Cadastrar Equipamento" onClose={onClose}>
      {/* Photo picker */}
      <div className="mb-3">
        <div className="mb-1.5 text-[12px] font-medium text-[#8b949e]">Foto (opcional)</div>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/10 p-3 transition-colors hover:border-[#58a6ff]/40 hover:bg-[#58a6ff]/[0.03]"
        >
          {photoData ? (
            <img src={photoData.base64} alt="preview" className="h-14 w-14 rounded-md object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#21262d] text-[20px]">
              📷
            </div>
          )}
          <div className="text-[12px] text-[#6e7681]">
            {photoData ? 'Clique para trocar a foto' : 'Clique para adicionar uma foto'}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />
        </div>
      </div>

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
        loading={isLoading}
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
