import { useState, useRef } from 'react'
import { Modal, ModalFooter } from './Modal'
import { useUpdatePatrimonyItemMutation, useUploadPatrimonyPhotoMutation } from '~/lib/patrimony/queries'
import type { PatrimonyItem } from '~/db/schema/patrimony.schema'
import { PATRIMONY_CATEGORIES } from '~/utils/constants'

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

export function EditPatrimonyModal({ item, onClose }: { item: PatrimonyItem; onClose: () => void }) {
  const [name,            setName]            = useState(item.name)
  const [category,        setCategory]        = useState(item.category)
  const [patrimonyCode,   setPatrimonyCode]   = useState(item.patrimonyCode)
  const [brand,           setBrand]           = useState(item.brand ?? '')
  const [model,           setModel]           = useState(item.model ?? '')
  const [serialNumber,    setSerialNumber]    = useState(item.serialNumber ?? '')
  const [quantity,        setQuantity]        = useState(item.quantity)
  const [location,        setLocation]        = useState(item.location ?? '')
  const [condition,       setCondition]       = useState(item.condition)
  const [estimatedValue,  setEstimatedValue]  = useState(item.estimatedValue != null ? String(item.estimatedValue) : '')
  const [acquisitionDate, setAcquisitionDate] = useState(item.acquisitionDate ?? '')
  const [supplier,        setSupplier]        = useState(item.supplier ?? '')
  const [notes,           setNotes]           = useState(item.notes ?? '')
  const [photoUrl,        setPhotoUrl]        = useState<string | null>(item.mainImageUrl ?? null)
  const [photoPreview,    setPhotoPreview]    = useState<string | null>(item.mainImageUrl ?? null)

  const fileRef   = useRef<HTMLInputElement>(null)
  const updateMut = useUpdatePatrimonyItemMutation()
  const uploadMut = useUploadPatrimonyPhotoMutation()

  const canSave = name.trim().length > 0 && category.length > 0 && patrimonyCode.trim().length > 0

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target!.result as string
      setPhotoPreview(base64)
      try {
        const ext      = file.name.split('.').pop() ?? 'jpg'
        const fileName = `pat_${Date.now()}.${ext}`
        const result   = await uploadMut.mutateAsync({ base64, mimeType: file.type, fileName })
        setPhotoUrl(result.url)
      } catch {}
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    const value = estimatedValue ? parseFloat(estimatedValue.replace(',', '.')) : null
    await updateMut.mutateAsync({
      id:              item.id,
      name:            name.trim(),
      category,
      patrimonyCode:   patrimonyCode.trim(),
      brand:           brand.trim() || undefined,
      model:           model.trim() || undefined,
      serialNumber:    serialNumber.trim() || undefined,
      quantity,
      location:        location.trim() || undefined,
      condition,
      status:          item.status,
      estimatedValue:  value,
      acquisitionDate: acquisitionDate || undefined,
      supplier:        supplier.trim() || undefined,
      mainImageUrl:    photoUrl,
      notes:           notes.trim() || undefined,
    })
    onClose()
  }

  const select = `${FIELD} appearance-none cursor-pointer`

  return (
    <Modal title="Editar Item Patrimonial" onClose={onClose} width={560}>
      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl"
            style={{ background: '#060c1a', border: '1px dashed rgba(255,255,255,0.12)' }}
            onClick={() => fileRef.current?.click()}
          >
            {photoPreview ? (
              <img src={photoPreview} className="h-full w-full object-cover" />
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
              {uploadMut.isPending ? 'Enviando...' : photoPreview ? 'Trocar foto' : 'Adicionar foto'}
            </button>
            <p className="mt-1 text-[11px]" style={{ color: '#3b5a7a' }}>Opcional · JPG, PNG</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Nome *">
              <input className={FIELD} style={FIELD_STYLE} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
          </div>

          <Field label="Categoria *">
            <select className={select} style={FIELD_STYLE} value={category} onChange={(e) => setCategory(e.target.value)}>
              {PATRIMONY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              {!PATRIMONY_CATEGORIES.includes(category as any) && <option value={category}>{category}</option>}
            </select>
          </Field>

          <Field label="Código patrimonial *">
            <input className={FIELD} style={FIELD_STYLE} value={patrimonyCode} onChange={(e) => setPatrimonyCode(e.target.value)} />
          </Field>

          <Field label="Marca">
            <input className={FIELD} style={FIELD_STYLE} value={brand} onChange={(e) => setBrand(e.target.value)} />
          </Field>

          <Field label="Modelo">
            <input className={FIELD} style={FIELD_STYLE} value={model} onChange={(e) => setModel(e.target.value)} />
          </Field>

          <Field label="Número de série">
            <input className={FIELD} style={FIELD_STYLE} value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
          </Field>

          <Field label="Quantidade">
            <input className={FIELD} style={FIELD_STYLE} type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
          </Field>

          <Field label="Localização">
            <input className={FIELD} style={FIELD_STYLE} value={location} onChange={(e) => setLocation(e.target.value)} />
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

          <Field label="Valor estimado (R$)">
            <input className={FIELD} style={FIELD_STYLE} value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder="0,00" />
          </Field>

          <Field label="Data de aquisição">
            <input className={FIELD} style={FIELD_STYLE} type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} />
          </Field>

          <div className="col-span-2">
            <Field label="Fornecedor">
              <input className={FIELD} style={FIELD_STYLE} value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Field>
          </div>

          <div className="col-span-2">
            <Field label="Observações">
              <textarea className={FIELD} style={{ ...FIELD_STYLE, resize: 'none' }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </div>
      </div>

      <ModalFooter
        onClose={onClose}
        onConfirm={handleSave}
        confirmLabel="Salvar"
        disabled={!canSave || updateMut.isPending || uploadMut.isPending}
        loading={updateMut.isPending}
      />
    </Modal>
  )
}
