import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Modal, ModalFooter } from './Modal'
import { QRScanner } from './QRScanner'
import { CAT_ICON } from './utils'
import { useCheckoutMutation, useCheckoutScanMutation } from '~/lib/checkout/queries'
import { clientsQueries } from '~/lib/clients/queries'
import { collaboratorsQueries } from '~/lib/collaborators/queries'
import type { EquipmentWithCheckout } from '~/lib/equipment/queries'

type Phase = 'form' | 'scanning'

export function CheckOutModal({
  equipment,
  onClose,
}: {
  equipment: EquipmentWithCheckout[]
  onClose: () => void
}) {
  const [phase,          setPhase]          = useState<Phase>('form')
  const [selected,       setSelected]       = useState<string[]>([])
  const [collaboratorId, setCollaboratorId] = useState('')
  const [clientId,       setClientId]       = useState('')
  const [workDate,       setWorkDate]       = useState(new Date().toISOString().split('T')[0])
  const [scanLog,        setScanLog]        = useState<{ id: string; name: string }[]>([])
  const [scanFeedback,   setScanFeedback]   = useState<{ text: string; ok: boolean } | null>(null)

  const batchMutation = useCheckoutMutation()
  const scanMutation  = useCheckoutScanMutation()

  const clientsQuery  = useQuery(clientsQueries.list())
  const collabsQuery  = useQuery(collaboratorsQueries.list())

  const available      = equipment.filter((e) => e.status === 'available')
  const clients        = clientsQuery.data  ?? []
  const collaborators  = collabsQuery.data  ?? []

  const selectedCollab = collaborators.find((c) => c.id === collaboratorId)
  const selectedClient = clients.find((c) => c.id === clientId)
  const bookingReady   = !!collaboratorId && !!clientId

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const handleQRScan = async (scannedId: string) => {
    const eq = available.find((e) => e.id === scannedId)
    if (!eq) {
      setScanFeedback({ text: 'QR não reconhecido', ok: false })
      setTimeout(() => setScanFeedback(null), 2000)
      return
    }
    if (scanLog.some((s) => s.id === eq.id)) {
      setScanFeedback({ text: `${eq.name} já registrado`, ok: false })
      setTimeout(() => setScanFeedback(null), 2000)
      return
    }
    try {
      await scanMutation.mutateAsync({
        equipmentIds:    [eq.id],
        responsible:     selectedCollab?.name    ?? collaboratorId,
        responsibleRole: selectedCollab?.role    ?? undefined,
        project:         selectedClient?.name    ?? clientId,
        expectedReturn:  workDate,
      })
      setScanLog((p) => [...p, { id: eq.id, name: eq.name }])
      setScanFeedback({ text: `✓ ${eq.name}`, ok: true })
    } catch {
      setScanFeedback({ text: 'Erro ao registrar', ok: false })
    }
    setTimeout(() => setScanFeedback(null), 2000)
  }

  const handleBatchConfirm = async () => {
    await batchMutation.mutateAsync({
      equipmentIds:    selected,
      responsible:     selectedCollab?.name    ?? collaboratorId,
      responsibleRole: selectedCollab?.role    ?? undefined,
      project:         selectedClient?.name    ?? clientId,
      expectedReturn:  workDate,
    })
    onClose()
  }

  if (phase === 'scanning') {
    return (
      <QRScanner
        onScan={handleQRScan}
        onClose={() => {
          setPhase('form')
          if (scanLog.length > 0) onClose()
        }}
        title="Registrar Saída"
        hint={`${selectedCollab?.name ?? ''} · ${selectedClient?.name ?? ''}`}
      >
        {/* Feedback */}
        {scanFeedback && (
          <div
            className={`mb-3 rounded-md px-3 py-2 text-[13px] font-medium ${
              scanFeedback.ok
                ? 'border border-[#3fb950]/20 bg-[#3fb950]/10 text-[#3fb950]'
                : 'border border-[#f85149]/20 bg-[#f85149]/10 text-[#f85149]'
            }`}
          >
            {scanFeedback.text}
          </div>
        )}

        {/* Scanned log */}
        {scanLog.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 text-[11px] font-medium text-[#6e7681]">
              {scanLog.length} item{scanLog.length > 1 ? 's' : ''} registrado{scanLog.length > 1 ? 's' : ''}
            </div>
            <div className="max-h-[120px] overflow-y-auto rounded-lg border border-white/10 bg-[#161b22]">
              {scanLog.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-3 py-2 text-[12px] ${i < scanLog.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                >
                  <span className="text-[#3fb950]">✓</span>
                  <span className="text-[#e6edf3]">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => {
            setPhase('form')
            if (scanLog.length > 0) onClose()
          }}
          className="w-full rounded-md bg-[#1f6feb] py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd]"
        >
          {scanLog.length > 0 ? `Encerrar (${scanLog.length} registrado${scanLog.length > 1 ? 's' : ''})` : 'Cancelar'}
        </button>
      </QRScanner>
    )
  }

  return (
    <Modal title="Nova Saída" onClose={onClose}>
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

      {/* Data */}
      <Field label="Data da diária">
        <input
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[13px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
        />
      </Field>

      {/* Scan button — primary action */}
      <button
        onClick={() => setPhase('scanning')}
        disabled={!bookingReady}
        className="mt-1 mb-4 w-full rounded-md bg-[#1f6feb] py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-45"
      >
        📷 Escanear equipamentos
      </button>

      {/* Divider */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] text-[#6e7681]">ou selecione manualmente</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Manual equipment list */}
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

      <ModalFooter
        onClose={onClose}
        onConfirm={handleBatchConfirm}
        confirmLabel="Confirmar Saída"
        disabled={selected.length === 0 || !bookingReady}
        loading={batchMutation.isPending}
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
