import { useState, useRef } from 'react'
import { Modal, ModalFooter } from './Modal'
import { useCreatePatrimonyItemMutation, useUploadPatrimonyPhotoMutation } from '~/lib/patrimony/queries'
import { PATRIMONY_CATEGORIES } from '~/utils/constants'
import { resizeToJpeg } from '~/utils/image'

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

export function NewPatrimonyModal({ onClose }: { onClose: () => void }) {
  const [name,            setName]            = useState('')
  const [category,        setCategory]        = useState('')
  const [patrimonyCode,   setPatrimonyCode]   = useState('')
  const [brand,           setBrand]           = useState('')
  const [model,           setModel]           = useState('')
  const [serialNumber,    setSerialNumber]    = useState('')
  const [quantity,        setQuantity]        = useState(1)
  const [location,        setLocation]        = useState('')
  const [condition,       setCondition]       = useState('bom')
  const [status,          setStatus]          = useState('disponivel')
  const [estimatedValue,  setEstimatedValue]  = useState('')
  const [acquisitionDate, setAcquisitionDate] = useState('')
  const [notes,           setNotes]           = useState('')
  const [photoData,       setPhotoData]       = useState<{ base64: string; mimeType: string; fileName: string } | null>(null)

  const fileRef   = useRef<HTMLInputElement>(null)
  const createMut = useCreatePatrimonyItemMutation()
  const uploadMut = useUploadPatrimonyPhotoMutation()

  const canSave = name.trim().length > 0 && category.length > 0 && patrimonyCode.trim().length > 0

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const data = await resizeToJpeg(file)
    setPhotoData(data)
  }

  async function handleSave() {
    let photoUrl: string | null = null
    if (photoData) {
      const res = await uploadMut.mutateAsync(photoData)
      photoUrl = res.url
    }
    const value = estimatedValue ? parseFloat(estimatedValue.replace(',', '.')) : null
    await createMut.mutateAsync({
      name:            name.trim(),
      category,
      patrimonyCode:   patrimonyCode.trim(),
      brand:           brand.trim() || undefined,
      model:           model.trim() || undefined,
      serialNumber:    serialNumber.trim() || undefined,
      quantity,
      location:        location.trim() || undefined,
      condition,
      status,
      estimatedValue:  value,
      acquisitionDate: acquisitionDate || undefined,
      mainImageUrl:    photoUrl,
      notes:           notes.trim() || undefined,
    })
    onClose()
  }

  const select = `${FIELD} appearance-none cursor-pointer`
  const isLoading = createMut.isPending || uploadMut.isPending

  return (
    <Modal title="Cadastrar Item Patrimonial" onClose={onClose} width={560}>
      <div className="grid gap-3">
        {/* Photo */}
        <div className="flex items-center gap-3">
          <div
            className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl"
            style={{ background: '#060c1a', border: '1px dashed rgba(255,255,255,0.12)' }}
            onClick={() => fileRef.current?.click()}
          >
            {photoData ? (
              <img src={photoData.base64} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[22px]">📸</span>
            )}
          </div>
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
            >
              {photoData ? 'Trocar foto' : 'Adicionar foto'}
            </button>
            <p className="mt-1 text-[11px]" style={{ color: '#3b5a7a' }}>Opcional · JPG, PNG</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Nome *">
              <input className={FIELD} style={FIELD_STYLE} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Notebook Dell Latitude" />
            </Field>
          </div>

          <Field label="Categoria *">
            <select className={select} style={FIELD_STYLE} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Selecionar...</option>
              {PATRIMONY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Código patrimonial *">
            <input className={FIELD} style={FIELD_STYLE} value={patrimonyCode} onChange={(e) => setPatrimonyCode(e.target.value)} placeholder="Ex: PAT-001" />
          </Field>

          <Field label="Marca">
            <input className={FIELD} style={FIELD_STYLE} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex: Dell" />
          </Field>

          <Field label="Modelo">
            <input className={FIELD} style={FIELD_STYLE} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: Latitude 5420" />
          </Field>

          <Field label="Número de série">
            <input className={FIELD} style={FIELD_STYLE} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="SN" />
          </Field>

          <Field label="Quantidade">
            <input className={FIELD} style={FIELD_STYLE} type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
          </Field>

          <Field label="Localização">
            <input className={FIELD} style={FIELD_STYLE} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Escritório, Estoque" />
          </Field>

          <Field label="Condição *">
            <select className={select} style={FIELD_STYLE} value={condition} onChange={(e) => setCondition(e.target.value)}>
              <option value="novo">Novo</option>
              <option value="bom">Bom</option>
              <option value="regular">Regular</option>
              <option value="necessita_manutencao">Necessita manutenção</option>
              <option value="danificado">Danificado</option>
            </select>
          </Field>

          <Field label="Status inicial *">
            <select className={select} style={FIELD_STYLE} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="disponivel">Disponível</option>
              <option value="em_uso">Em Uso</option>
              <option value="emprestado">Emprestado</option>
              <option value="manutencao">Manutenção</option>
              <option value="extraviado">Extraviado</option>
              <option value="baixado">Baixado</option>
            </select>
          </Field>

          <Field label="Valor estimado (R$)">
            <input className={FIELD} style={FIELD_STYLE} value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="0,00" />
          </Field>

          <Field label="Data de aquisição">
            <input className={FIELD} style={FIELD_STYLE} type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
          </Field>

          <div className="col-span-2">
            <Field label="Observações">
              <textarea className={FIELD} style={{ ...FIELD_STYLE, resize: 'none' }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais..." />
            </Field>
          </div>
        </div>
      </div>

      <ModalFooter
        onClose={onClose}
        onConfirm={handleSave}
        confirmLabel="Cadastrar"
        disabled={!canSave || isLoading}
        loading={isLoading}
      />
    </Modal>
  )
}
