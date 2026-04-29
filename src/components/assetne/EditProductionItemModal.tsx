import { useRef, useState } from 'react'
import { Modal, ModalFooter } from './Modal'
import { useUpdateProductionItemMutation, useUploadProductionPhotoMutation, type ProductionItemWithUsage } from '~/lib/production/queries'
import { PRODUCTION_CATEGORIES } from '~/utils/constants'
import { resizeToJpeg } from '~/utils/image'

const CONDITIONS: { value: 'bom' | 'regular' | 'ruim'; label: string }[] = [
  { value: 'bom',     label: 'Bom' },
  { value: 'regular', label: 'Regular' },
  { value: 'ruim',    label: 'Ruim' },
]

export function EditProductionItemModal({
  item,
  onClose,
}: {
  item: ProductionItemWithUsage
  onClose: () => void
}) {
  const [name,          setName]          = useState(item.name)
  const [category,      setCategory]      = useState(item.category)
  const [color,         setColor]         = useState(item.color ?? '')
  const [totalQty,      setTotalQty]      = useState(item.totalQty)
  const [condition,     setCondition]     = useState<'bom' | 'regular' | 'ruim'>(item.condition as 'bom' | 'regular' | 'ruim')
  const [location,      setLocation]      = useState(item.location ?? '')
  const [codigoInterno, setCodigoInterno] = useState(item.codigoInterno ?? '')
  const [notes,         setNotes]         = useState(item.notes ?? '')
  const [photoData,     setPhotoData]     = useState<{ base64: string; mimeType: string; fileName: string } | null>(null)
  const [currentPhoto,  setCurrentPhoto]  = useState(item.photoUrl)

  const mutation       = useUpdateProductionItemMutation()
  const uploadMutation = useUploadProductionPhotoMutation()
  const fileRef        = useRef<HTMLInputElement>(null)

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await resizeToJpeg(file)
    setPhotoData(data)
    setCurrentPhoto(null)
  }

  const handleConfirm = async () => {
    let photoUrl: string | null = currentPhoto ?? null
    if (photoData) {
      const res = await uploadMutation.mutateAsync(photoData)
      photoUrl = res.url
    }
    await mutation.mutateAsync({
      id: item.id,
      name: name.trim(),
      category,
      totalQty,
      condition,
      location: location.trim() || undefined,
      codigoInterno: codigoInterno.trim() || undefined,
      notes: notes.trim() || undefined,
      color: color.trim() || undefined,
      photoUrl,
    })
    onClose()
  }

  const previewSrc = photoData?.base64 ?? currentPhoto ?? null
  const isLoading  = mutation.isPending || uploadMutation.isPending

  return (
    <Modal title="Editar Item de Produção" onClose={onClose}>
      {/* Foto */}
      <div className="mb-3">
        <div className="mb-1.5 text-[12px] font-medium" style={{ color: '#8b949e' }}>Foto (opcional)</div>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors"
          style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(88,166,255,0.4)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        >
          {previewSrc ? (
            <img src={previewSrc} alt="preview" className="h-14 w-14 rounded-md object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-md text-[20px]"
              style={{ background: '#21262d' }}>
              📷
            </div>
          )}
          <div className="text-[12px]" style={{ color: '#6e7681' }}>
            {previewSrc ? 'Clique para trocar a foto' : 'Clique para adicionar uma foto'}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
        </div>
      </div>

      <Field label="Nome do item">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-colors"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </Field>

      <Field label="Categoria">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full cursor-pointer rounded-md px-3 py-2 text-[13px] outline-none"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
        >
          {PRODUCTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Cor (opcional)">
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="Ex: Amarela, Preta, Multicolorida..."
          className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-colors"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </Field>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <Field label="Quantidade total">
          <input
            type="number"
            min={item.usedQty || 1}
            value={totalQty}
            onChange={(e) => setTotalQty(Math.max(item.usedQty || 1, parseInt(e.target.value) || 1))}
            className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </Field>
        <Field label="Código interno (opcional)">
          <input
            value={codigoInterno}
            onChange={(e) => setCodigoInterno(e.target.value)}
            placeholder="Ex: FIG-001"
            className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </Field>
      </div>

      <Field label="Localização (opcional)">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex: Armário A3, Sala de figurino"
          className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
          style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.1)', color: '#e6edf3' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#58a6ff')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      </Field>

      <Field label="Condição">
        <div className="flex gap-1.5">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCondition(c.value)}
              className="flex-1 rounded-md py-2 text-[12px] font-medium transition-all"
              style={
                condition === c.value
                  ? { background: '#1f6feb', color: '#fff' }
                  : { background: '#21262d', border: '1px solid rgba(255,255,255,0.1)', color: '#8b949e' }
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Observações (opcional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
        confirmLabel="Salvar"
        disabled={!name.trim() || !category}
        loading={isLoading}
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
