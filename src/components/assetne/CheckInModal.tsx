import { useState } from 'react'
import { Modal, ModalFooter } from './Modal'
import { QRScanner } from './QRScanner'
import { CAT_ICON } from './utils'
import { useCheckinMutation, useCheckinScanMutation } from '~/lib/checkout/queries'
import type { EquipmentWithCheckout } from '~/lib/equipment/queries'

type ReturnCondition = 'perfect' | 'minor' | 'major'

const CONDITION_OPTS: { value: ReturnCondition; label: string; color: string }[] = [
  { value: 'perfect', label: 'Perfeito',   color: '#3fb950' },
  { value: 'minor',   label: 'Dano leve',  color: '#e3b341' },
  { value: 'major',   label: 'Dano grave', color: '#f85149' },
]

export function CheckInModal({
  equipment,
  onClose,
  preSelectedId,
}: {
  equipment: EquipmentWithCheckout[]
  onClose: () => void
  preSelectedId?: string
}) {
  const inUse = equipment.filter((e) =>
    e.status === 'in-use' && e.activeCheckout &&
    (!preSelectedId || e.id === preSelectedId)
  )

  const [scanning,        setScanning]        = useState(false)
  const [conditions,      setConditions]      = useState<Record<string, ReturnCondition>>({})
  const [scanPending,     setScanPending]      = useState<EquipmentWithCheckout | null>(null)
  const [pendingCond,     setPendingCond]      = useState<ReturnCondition>('perfect')
  const [scanFeedback,    setScanFeedback]     = useState<{ text: string; ok: boolean } | null>(null)
  const [scanReturned,    setScanReturned]     = useState<string[]>([])

  const batchMutation = useCheckinMutation()
  const scanMutation  = useCheckinScanMutation()

  const setC = (id: string, val: ReturnCondition) =>
    setConditions((p) => ({ ...p, [id]: val }))

  const reviewed  = Object.keys(conditions).length
  const perfect   = Object.values(conditions).filter((v) => v === 'perfect').length
  const withIssue = Object.values(conditions).filter((v) => v && v !== 'perfect').length

  const handleBatchConfirm = async () => {
    for (const eq of inUse) {
      const cond = conditions[eq.id]
      if (cond && eq.activeCheckout) {
        await batchMutation.mutateAsync({
          checkoutId:      eq.activeCheckout.id,
          equipmentId:     eq.id,
          returnCondition: cond,
        })
      }
    }
    onClose()
  }

  const handleQRScan = (scannedId: string) => {
    const eq = inUse.find((e) => e.id === scannedId)
    if (!eq) {
      setScanFeedback({ text: 'QR não reconhecido ou já devolvido', ok: false })
      setTimeout(() => setScanFeedback(null), 2000)
      return
    }
    if (scanReturned.includes(eq.id)) {
      setScanFeedback({ text: `${eq.name} já devolvido`, ok: false })
      setTimeout(() => setScanFeedback(null), 2000)
      return
    }
    setScanPending(eq)
    setPendingCond('perfect')
    setScanFeedback(null)
  }

  const handleScanConfirm = async () => {
    if (!scanPending?.activeCheckout) return
    try {
      await scanMutation.mutateAsync({
        checkoutId:      scanPending.activeCheckout.id,
        equipmentId:     scanPending.id,
        returnCondition: pendingCond,
      })
      setScanReturned((p) => [...p, scanPending.id])
      setScanFeedback({ text: `✓ ${scanPending.name} devolvido`, ok: true })
      setScanPending(null)
      setTimeout(() => setScanFeedback(null), 2000)
    } catch {
      setScanFeedback({ text: 'Erro ao registrar devolução', ok: false })
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR')
  }

  if (scanning) {
    return (
      <QRScanner
        onScan={handleQRScan}
        onClose={() => {
          setScanning(false)
          if (scanReturned.length > 0) onClose()
        }}
        title="Registrar Devolução"
        hint="Aponte para o QR Code do equipamento a devolver"
      >
        {/* Pending confirm overlay */}
        {scanPending && (
          <div className="mb-3 rounded-lg border border-[#58a6ff]/30 bg-[#58a6ff]/10 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[16px]">{CAT_ICON[scanPending.category] ?? '📦'}</span>
              <span className="text-[13px] font-semibold text-[#e6edf3]">{scanPending.name}</span>
            </div>
            <div className="mb-3 flex gap-1.5">
              {CONDITION_OPTS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setPendingCond(o.value)}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${
                    pendingCond === o.value
                      ? 'text-white'
                      : 'border border-white/10 bg-[#21262d] text-[#8b949e]'
                  }`}
                  style={pendingCond === o.value ? { backgroundColor: o.color } : {}}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleScanConfirm}
                disabled={scanMutation.isPending}
                className="flex-1 rounded-md bg-[#1f6feb] py-2 text-[12px] font-semibold text-white disabled:opacity-45"
              >
                {scanMutation.isPending ? 'Aguarde...' : 'Confirmar devolução'}
              </button>
              <button
                onClick={() => setScanPending(null)}
                className="rounded-md border border-white/10 px-3 py-2 text-[12px] text-[#6e7681] hover:text-[#e6edf3]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Scan feedback */}
        {scanFeedback && !scanPending && (
          <div
            className={`mb-3 rounded-md px-3 py-2 text-[12px] font-medium ${
              scanFeedback.ok
                ? 'border border-[#3fb950]/20 bg-[#3fb950]/10 text-[#3fb950]'
                : 'border border-[#f85149]/20 bg-[#f85149]/10 text-[#f85149]'
            }`}
          >
            {scanFeedback.text}
          </div>
        )}

        {/* Returned log */}
        {scanReturned.length > 0 && !scanPending && (
          <div className="mb-3">
            <div className="mb-1 text-[11px] text-[#6e7681]">
              {scanReturned.length} devolvido{scanReturned.length > 1 ? 's' : ''}
            </div>
            <div className="max-h-[80px] overflow-y-auto rounded-lg border border-white/10 bg-[#161b22]">
              {scanReturned.map((id, i) => {
                const eq = inUse.find((e) => e.id === id)
                return (
                  <div key={id} className={`flex items-center gap-2 px-3 py-1.5 text-[12px] ${i < scanReturned.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                    <span className="text-[#3fb950]">✓</span>
                    <span className="text-[#e6edf3]">{eq?.name ?? id}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!scanPending && (
          <button
            onClick={() => {
              setScanning(false)
              if (scanReturned.length > 0) onClose()
            }}
            className="w-full rounded-md bg-[#1f6feb] py-2.5 text-[13px] font-medium text-white"
          >
            {scanReturned.length > 0
              ? `Encerrar (${scanReturned.length} devolvido${scanReturned.length > 1 ? 's' : ''})`
              : 'Cancelar'}
          </button>
        )}
      </QRScanner>
    )
  }

  return (
    <Modal title="Devolução" onClose={onClose} width={520}>
      {/* Scan button */}
      <button
        onClick={() => setScanning(true)}
        disabled={inUse.length === 0}
        className="mb-4 w-full rounded-md bg-[#1f6feb] py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-45"
      >
        📷 Escanear para devolver
      </button>

      {/* Divider */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] text-[#6e7681]">ou selecione manualmente</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="mb-3.5">
        {inUse.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-[#0d1117] p-6 text-center text-[13px] text-[#6e7681]">
            Nenhum equipamento em uso no momento
          </div>
        )}

        {inUse.map((eq) => {
          const checkout = eq.activeCheckout!
          const workDate = formatDate(checkout.expectedReturn)
          return (
            <div key={eq.id} className="mb-2 rounded-lg border border-white/10 bg-[#0d1117] p-3">
              <div className="flex items-center gap-3">
                <span className="text-[17px]">{CAT_ICON[eq.category] ?? '📦'}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[#e6edf3]">{eq.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-[#6e7681]">
                    <span>{checkout.responsible}</span>
                    {checkout.responsibleRole && (
                      <>
                        <span>·</span>
                        <span>{checkout.responsibleRole}</span>
                      </>
                    )}
                    {workDate && (
                      <>
                        <span>·</span>
                        <span className="text-[#8b949e]">Diária: {workDate}</span>
                      </>
                    )}
                  </div>
                </div>
                <select
                  value={conditions[eq.id] ?? ''}
                  onChange={(e) => setC(eq.id, e.target.value as ReturnCondition)}
                  className="shrink-0 cursor-pointer rounded-md border border-white/10 bg-[#21262d] px-2.5 py-1.5 text-[12px] outline-none"
                  style={{
                    color: conditions[eq.id] === 'perfect' ? '#3fb950'
                         : conditions[eq.id] === 'minor'   ? '#e3b341'
                         : conditions[eq.id] === 'major'   ? '#f85149'
                         : '#8b949e',
                  }}
                >
                  <option value="">Condição...</option>
                  {CONDITION_OPTS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {reviewed > 0 && (
        <div className="mb-1 flex gap-3 rounded-md border border-white/10 bg-[#21262d] px-3 py-2 text-[12px] text-[#8b949e]">
          {perfect > 0 && (
            <span style={{ color: '#3fb950' }}>
              {perfect} perfeito{perfect !== 1 ? 's' : ''}
            </span>
          )}
          {withIssue > 0 && (
            <span style={{ color: '#e3b341' }}>
              {withIssue} com ocorrência
            </span>
          )}
        </div>
      )}

      <ModalFooter
        onClose={onClose}
        onConfirm={handleBatchConfirm}
        confirmLabel="Confirmar Devolução"
        disabled={inUse.length === 0 || reviewed === 0}
        loading={batchMutation.isPending}
      />
    </Modal>
  )
}
