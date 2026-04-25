import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, ModalFooter } from './Modal'
import { QRScanner } from './QRScanner'
import { CAT_ICON } from './utils'
import { useCheckoutMutation } from '~/lib/checkout/queries'
import { clientsQueries } from '~/lib/clients/queries'
import { collaboratorsQueries } from '~/lib/collaborators/queries'
import type { EquipmentWithCheckout } from '~/lib/equipment/queries'

export function CheckOutModal({
  equipment,
  onClose,
}: {
  equipment: EquipmentWithCheckout[]
  onClose: () => void
}) {
  const [selected,        setSelected]        = useState<string[]>([])
  const [collaboratorId,  setCollaboratorId]  = useState('')
  const [clientId,        setClientId]        = useState('')
  const [workDate,        setWorkDate]        = useState(new Date().toISOString().split('T')[0])
  const [showScanner,     setShowScanner]     = useState(false)
  const [scanFeedback,    setScanFeedback]    = useState<string | null>(null)

  const mutation         = useCheckoutMutation()
  const clientsQuery     = useQuery(clientsQueries.list())
  const collabsQuery     = useQuery(collaboratorsQueries.list())

  const available        = equipment.filter((e) => e.status === 'available')
  const clients          = clientsQuery.data ?? []
  const collaborators    = collabsQuery.data ?? []

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const handleQRScan = (scannedId: string) => {
    const eq = available.find((e) => e.id === scannedId)
    if (!eq) {
      setScanFeedback(`QR não reconhecido`)
      return
    }
    if (!selected.includes(eq.id)) {
      setSelected((p) => [...p, eq.id])
    }
    setScanFeedback(`✓ ${eq.name} adicionado`)
    setTimeout(() => setScanFeedback(null), 2500)
  }

  const handleConfirm = async () => {
    const selectedCollab = collaborators.find((c) => c.id === collaboratorId)
    const selectedClient = clients.find((c) => c.id === clientId)
    await mutation.mutateAsync({
      equipmentIds: selected,
      responsible: selectedCollab?.name ?? collaboratorId,
      responsibleRole: selectedCollab?.role ?? undefined,
      project: selectedClient?.name ?? clientId,
      expectedReturn: workDate,
    })
    onClose()
  }

  return (
    <>
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      <Modal title="Nova Saída" onClose={onClose}>
        {/* Equipment list */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12px] font-medium text-[#8b949e]">Selecionar equipamentos</div>
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-1.5 rounded-md border border-[#58a6ff]/30 bg-[#58a6ff]/10 px-3 py-1 text-[12px] font-medium text-[#58a6ff] transition-colors hover:bg-[#58a6ff]/20"
            >
              <span>📷</span> Escanear QR
            </button>
          </div>

          {scanFeedback && (
            <div className="mb-2 rounded-md border border-[#3fb950]/20 bg-[#3fb950]/10 px-3 py-1.5 text-[12px] font-medium text-[#3fb950]">
              {scanFeedback}
            </div>
          )}

          <div className="mb-2.5 overflow-hidden rounded-lg border border-white/10 bg-[#0d1117]">
            {available.length === 0 && (
              <div className="p-4 text-center text-[13px] text-[#6e7681]">
                Nenhum equipamento disponível
              </div>
            )}
            {available.map((eq, i) => {
              const sel = selected.includes(eq.id)
              return (
                <div
                  key={eq.id}
                  onClick={() => toggle(eq.id)}
                  className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 transition-colors ${
                    i < available.length - 1 ? 'border-b border-white/10' : ''
                  } ${sel ? 'bg-[#58a6ff]/[0.06]' : 'hover:bg-white/[0.03]'}`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] text-[10px] text-white ${
                      sel ? 'bg-[#1f6feb]' : 'border border-white/10'
                    }`}
                  >
                    {sel ? '✓' : ''}
                  </div>
                  <span className="text-[15px]">{CAT_ICON[eq.category] ?? '📦'}</span>
                  <div className="flex-1">
                    <div className={`text-[13px] font-medium ${sel ? 'text-[#58a6ff]' : 'text-[#e6edf3]'}`}>
                      {eq.name}
                    </div>
                    <div className="text-[11px] text-[#6e7681]">{eq.category}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {selected.length > 0 && (
            <div className="mb-3.5 flex items-center justify-between rounded-md border border-[#3fb950]/20 bg-[#3fb950]/[0.08] px-3 py-1.5">
              <span className="text-[12px] font-medium text-[#3fb950]">
                {selected.length} item{selected.length > 1 ? 's' : ''} selecionado{selected.length > 1 ? 's' : ''}
              </span>
              <button onClick={() => setSelected([])} className="text-[11px] text-[#6e7681] hover:text-[#8b949e]">
                Limpar
              </button>
            </div>
          )}
        </div>

        {/* Responsável */}
        <Field label="Responsável pela retirada">
          <select
            value={collaboratorId}
            onChange={(e) => setCollaboratorId(e.target.value)}
            className="w-full cursor-pointer rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
          >
            <option value="">Selecionar colaborador...</option>
            {collaborators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.role ? ` — ${c.role}` : ''}
              </option>
            ))}
          </select>
        </Field>

        {/* Cliente */}
        <Field label="Cliente">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full cursor-pointer rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
          >
            <option value="">Selecionar cliente...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {/* Data da diária */}
        <Field label="Data da diária">
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
          />
        </Field>

        <ModalFooter
          onClose={onClose}
          onConfirm={handleConfirm}
          confirmLabel="Confirmar Saída"
          disabled={selected.length === 0 || !collaboratorId || !clientId}
          loading={mutation.isPending}
        />
      </Modal>
    </>
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
