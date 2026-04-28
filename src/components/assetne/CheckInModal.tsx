import { useState, useMemo } from 'react'
import { Modal, ModalFooter } from './Modal'
import { QRScanner } from './QRScanner'
import { CAT_ICON } from './utils'
import { useCheckinMutation, useCheckinScanMutation } from '~/lib/checkout/queries'
import type { EquipmentWithCheckout } from '~/lib/equipment/queries'
import type { SessionUser } from '~/lib/auth/session'
import { normalizeText } from '~/utils/format'

type ReturnCondition = 'perfect' | 'minor' | 'major'

const CONDITION_OPTS: { value: ReturnCondition; label: string; color: string }[] = [
  { value: 'perfect', label: 'Perfeito',   color: '#3fb950' },
  { value: 'minor',   label: 'Dano leve',  color: '#e3b341' },
  { value: 'major',   label: 'Dano grave', color: '#f85149' },
]

function canReturn(session: SessionUser, eq: EquipmentWithCheckout): boolean {
  if (session.role === 'admin') return true
  const c = eq.activeCheckout
  if (!c) return false
  return c.checkedOutByUserId ? c.checkedOutByUserId === session.id : c.responsible === session.name
}

export function CheckInModal({
  equipment,
  onClose,
  preSelectedId,
  session,
}: {
  equipment: EquipmentWithCheckout[]
  onClose: () => void
  preSelectedId?: string
  session: SessionUser
}) {
  const isAdmin = session.role === 'admin'
  const allInUse = equipment.filter((e) => e.status === 'in-use' && e.activeCheckout)

  const permittedItems = allInUse.filter((e) => canReturn(session, e))

  const [adminSearch,     setAdminSearch]     = useState('')
  const [adminFilterResp, setAdminFilterResp] = useState('')
  const [adminFilterProj, setAdminFilterProj] = useState('')
  const [scanning,        setScanning]        = useState(false)
  const [conditions,      setConditions]      = useState<Record<string, ReturnCondition>>({})
  const [scanPending,     setScanPending]      = useState<EquipmentWithCheckout | null>(null)
  const [pendingCond,     setPendingCond]      = useState<ReturnCondition>('perfect')
  const [scanFeedback,    setScanFeedback]     = useState<{ text: string; ok: boolean } | null>(null)
  const [scanReturned,    setScanReturned]     = useState<string[]>([])

  const batchMutation = useCheckinMutation()
  const scanMutation  = useCheckinScanMutation()

  const allResponsibles = useMemo(
    () => [...new Set(permittedItems.map((e) => e.activeCheckout?.responsible).filter(Boolean) as string[])],
    [permittedItems],
  )
  const allProjects = useMemo(
    () => [...new Set(permittedItems.map((e) => e.activeCheckout?.project).filter(Boolean) as string[])],
    [permittedItems],
  )

  const displayedItems = useMemo(() => {
    let items = permittedItems
    if (preSelectedId) return items.filter((e) => e.id === preSelectedId)
    if (isAdmin) {
      const q = normalizeText(adminSearch)
      if (q)             items = items.filter((e) => normalizeText(e.name).includes(q) || normalizeText(e.activeCheckout?.responsible ?? '').includes(q) || normalizeText(e.activeCheckout?.project ?? '').includes(q))
      if (adminFilterResp) items = items.filter((e) => e.activeCheckout?.responsible === adminFilterResp)
      if (adminFilterProj) items = items.filter((e) => e.activeCheckout?.project     === adminFilterProj)
    }
    return items
  }, [permittedItems, preSelectedId, isAdmin, adminSearch, adminFilterResp, adminFilterProj])

  const setC = (id: string, val: ReturnCondition) =>
    setConditions((p) => ({ ...p, [id]: val }))

  const reviewedCount = displayedItems.filter((e) => conditions[e.id]).length
  const perfectCount  = displayedItems.filter((e) => conditions[e.id] === 'perfect').length
  const issueCount    = displayedItems.filter((e) => conditions[e.id] && conditions[e.id] !== 'perfect').length

  const handleBatchConfirm = async () => {
    for (const eq of displayedItems) {
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
    const eq = allInUse.find((e) => e.id === scannedId)

    if (!eq) {
      setScanFeedback({ text: 'QR não reconhecido ou já devolvido', ok: false })
      setTimeout(() => setScanFeedback(null), 2500)
      return
    }

    if (!canReturn(session, eq)) {
      setScanFeedback({
        text: 'Este item está vinculado a outro responsável. Apenas um administrador pode concluir essa devolução.',
        ok: false,
      })
      setTimeout(() => setScanFeedback(null), 4000)
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

  const fmt = (dateStr: string | null) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR')
  }

  /* ── Scanning phase ── */
  if (scanning) {
    return (
      <QRScanner
        onScan={handleQRScan}
        onClose={() => { setScanning(false); if (scanReturned.length > 0) onClose() }}
        title="Registrar Devolução"
        hint={isAdmin ? 'Aponte para o QR Code do equipamento' : 'Aponte para o QR Code dos seus equipamentos'}
      >
        {scanPending && (
          <div className="mb-3 rounded-lg border border-[#58a6ff]/30 bg-[#58a6ff]/10 p-3">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[18px]" style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.08)' }}>
                {scanPending.photoUrl
                  ? <img src={scanPending.photoUrl} alt={`Foto de ${scanPending.name}`} className="h-full w-full rounded-lg object-cover" />
                  : (CAT_ICON[scanPending.category] ?? '📦')}
              </div>
              <div>
                <div className="text-[13px] font-semibold text-[#e6edf3]">{scanPending.name}</div>
                {isAdmin && scanPending.activeCheckout && (
                  <div className="text-[11px] text-[#f59e0b]">↩ {scanPending.activeCheckout.responsible}</div>
                )}
              </div>
            </div>
            <div className="mb-3 flex gap-1.5">
              {CONDITION_OPTS.map((o) => (
                <button key={o.value} onClick={() => setPendingCond(o.value)}
                  className={`flex-1 rounded-md py-1.5 text-[11px] font-medium transition-all ${pendingCond === o.value ? 'text-white' : 'border border-white/10 bg-[#21262d] text-[#8b949e]'}`}
                  style={pendingCond === o.value ? { backgroundColor: o.color } : {}}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleScanConfirm} disabled={scanMutation.isPending}
                className="flex-1 rounded-md bg-[#1f6feb] py-2 text-[12px] font-semibold text-white disabled:opacity-45"
              >
                {scanMutation.isPending ? 'Aguarde...' : 'Confirmar devolução'}
              </button>
              <button onClick={() => setScanPending(null)}
                className="rounded-md border border-white/10 px-3 py-2 text-[12px] text-[#6e7681] hover:text-[#e6edf3]"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {scanFeedback && !scanPending && (
          <div className={`mb-3 rounded-md px-3 py-2 text-[12px] font-medium leading-snug ${scanFeedback.ok ? 'border border-[#3fb950]/20 bg-[#3fb950]/10 text-[#3fb950]' : 'border border-[#f85149]/20 bg-[#f85149]/10 text-[#f85149]'}`}>
            {scanFeedback.text}
          </div>
        )}

        {scanReturned.length > 0 && !scanPending && (
          <div className="mb-3">
            <div className="mb-1 text-[11px] text-[#6e7681]">{scanReturned.length} devolvido{scanReturned.length > 1 ? 's' : ''}</div>
            <div className="max-h-[80px] overflow-y-auto rounded-lg border border-white/10 bg-[#161b22]">
              {scanReturned.map((id, i) => {
                const eq = allInUse.find((e) => e.id === id)
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
            onClick={() => { setScanning(false); if (scanReturned.length > 0) onClose() }}
            className="w-full rounded-md bg-[#1f6feb] py-2.5 text-[13px] font-medium text-white"
          >
            {scanReturned.length > 0 ? `Encerrar (${scanReturned.length} devolvido${scanReturned.length > 1 ? 's' : ''})` : 'Cancelar'}
          </button>
        )}
      </QRScanner>
    )
  }

  /* ── Manual phase ── */
  return (
    <Modal title="Devolução" onClose={onClose} width={540}>
      {/* Mode badge */}
      {isAdmin ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa' }}>
            Modo administrador
          </span>
          <span className="text-[11px]" style={{ color: '#3b5a7a' }}>
            Você pode devolver equipamentos de qualquer responsável.
          </span>
        </div>
      ) : (
        <p className="mb-3 text-[12px]" style={{ color: '#3b5a7a' }}>
          Mostrando apenas os equipamentos retirados por você.
        </p>
      )}

      {/* Scan button */}
      <button
        onClick={() => setScanning(true)}
        disabled={allInUse.length === 0}
        className="mb-4 w-full rounded-md bg-[#1f6feb] py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-45"
      >
        📷 Escanear para devolver
      </button>

      {/* Admin filters */}
      {isAdmin && permittedItems.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={adminSearch}
            onChange={(e) => setAdminSearch(e.target.value)}
            placeholder="Buscar equipamento..."
            className="flex-1 min-w-[140px] rounded-md border border-white/10 bg-[#0d1117] px-3 py-1.5 text-[12px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
          />
          {allResponsibles.length > 1 && (
            <select value={adminFilterResp} onChange={(e) => setAdminFilterResp(e.target.value)}
              className="rounded-md border border-white/10 bg-[#0d1117] px-2 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
            >
              <option value="">Todos os responsáveis</option>
              {allResponsibles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {allProjects.length > 1 && (
            <select value={adminFilterProj} onChange={(e) => setAdminFilterProj(e.target.value)}
              className="rounded-md border border-white/10 bg-[#0d1117] px-2 py-1.5 text-[12px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
            >
              <option value="">Todos os projetos</option>
              {allProjects.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] text-[#6e7681]">ou selecione manualmente</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* Items */}
      <div className="mb-3.5 space-y-2">
        {displayedItems.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-[#0d1117] p-6 text-center text-[13px] text-[#6e7681]">
            {!isAdmin && allInUse.length > 0
              ? 'Você não possui equipamentos pendentes de devolução.'
              : 'Nenhum equipamento em uso no momento'}
          </div>
        )}

        {displayedItems.map((eq) => {
          const c          = eq.activeCheckout!
          const workDate   = fmt(c.expectedReturn)
          const isOtherPerson = isAdmin && c.responsible !== session.name

          return (
            <div key={eq.id} className="rounded-xl border bg-[#0d1117] p-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[20px]" style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {eq.photoUrl
                    ? <img src={eq.photoUrl} alt={`Foto de ${eq.name}`} className="h-full w-full rounded-lg object-cover" />
                    : (CAT_ICON[eq.category] ?? '📦')}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[13px] font-semibold" style={{ color: '#e6edf3' }}>{eq.name}</span>
                    {eq.codigo && <span className="text-[11px]" style={{ color: '#58a6ff' }}>#{eq.codigo}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-2 text-[11px]" style={{ color: '#6e7681' }}>
                    {isAdmin && (
                      <span style={{ color: isOtherPerson ? '#f59e0b' : '#6e7681' }}>
                        {isOtherPerson ? `↩ ${c.responsible}` : c.responsible}
                      </span>
                    )}
                    <span>{c.project}</span>
                    {workDate && <span>· {workDate}</span>}
                  </div>
                </div>

                <select
                  value={conditions[eq.id] ?? ''}
                  onChange={(e) => setC(eq.id, e.target.value as ReturnCondition)}
                  className="shrink-0 cursor-pointer rounded-md border border-white/10 bg-[#161b22] px-2.5 py-1.5 text-[12px] outline-none focus:border-[#58a6ff]"
                  style={{
                    color: conditions[eq.id] === 'perfect' ? '#3fb950'
                         : conditions[eq.id] === 'minor'   ? '#e3b341'
                         : conditions[eq.id] === 'major'   ? '#f85149'
                         : '#8b949e',
                  }}
                >
                  <option value="">Condição...</option>
                  {CONDITION_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {reviewedCount > 0 && (
        <div className="mb-1 flex gap-3 rounded-md border border-white/10 bg-[#161b22] px-3 py-2 text-[12px]">
          {perfectCount > 0 && <span style={{ color: '#3fb950' }}>{perfectCount} perfeito{perfectCount !== 1 ? 's' : ''}</span>}
          {issueCount  > 0 && <span style={{ color: '#e3b341' }}>{issueCount} com ocorrência</span>}
        </div>
      )}

      {displayedItems.length > 0 && reviewedCount < displayedItems.length && (
        <div className="mb-2 rounded-md border border-[#e3b341]/20 bg-[#e3b341]/[0.06] px-3 py-2 text-[11px]" style={{ color: '#e3b341' }}>
          Selecione a condição de todos os {displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''} antes de confirmar
          {reviewedCount > 0 && ` (${displayedItems.length - reviewedCount} pendente${displayedItems.length - reviewedCount !== 1 ? 's' : ''})`}
        </div>
      )}

      <ModalFooter
        onClose={onClose}
        onConfirm={handleBatchConfirm}
        confirmLabel="Confirmar Devolução"
        disabled={displayedItems.length === 0 || reviewedCount !== displayedItems.length}
        loading={batchMutation.isPending}
      />
    </Modal>
  )
}
