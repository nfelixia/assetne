import { useEffect, useRef, useState } from 'react'

interface Props {
  onScan: (value: string) => void
  onClose: () => void
  title?: string
  hint?: string
  children?: React.ReactNode
}

const COOLDOWN_MS = 2200

export function QRScanner({ onScan, onClose, title = 'Escanear equipamento', hint, children }: Props) {
  const [error, setError]           = useState<string | null>(null)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const scannerRef  = useRef<unknown>(null)
  const lastFireRef = useRef<{ value: string; time: number } | null>(null)
  const divId       = 'qr-scanner-container'

  useEffect(() => {
    let stopped = false

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        const scanner = new Html5Qrcode(divId)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (stopped) return
            const now  = Date.now()
            const last = lastFireRef.current
            if (last && last.value === decodedText && now - last.time < COOLDOWN_MS) return
            lastFireRef.current = { value: decodedText, time: now }
            setLastScanned(decodedText)
            onScan(decodedText)
          },
          undefined
        )
      } catch {
        if (!stopped) setError('Não foi possível acessar a câmera. Verifique as permissões.')
      }
    }

    startScanner()

    return () => {
      stopped = true
      const s = scannerRef.current as { stop?: () => Promise<void> } | null
      s?.stop?.().catch(() => {})
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="font-['Space_Grotesk'] text-[16px] font-semibold text-white">{title}</span>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/20"
        >
          Fechar
        </button>
      </div>

      {/* Scanner */}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4">
        {error ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-[32px]">📷</div>
            <p className="text-[14px] text-[#f85149]">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 rounded-md bg-[#1f6feb] px-5 py-2 text-[13px] font-medium text-white"
            >
              Voltar
            </button>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden rounded-2xl border-2 border-[#58a6ff]">
              <div id={divId} style={{ width: 300, minHeight: 300 }} />
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-3 left-3 h-6 w-6 rounded-tl border-t-2 border-l-2 border-[#58a6ff]" />
                <div className="absolute top-3 right-3 h-6 w-6 rounded-tr border-t-2 border-r-2 border-[#58a6ff]" />
                <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl border-b-2 border-l-2 border-[#58a6ff]" />
                <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br border-b-2 border-r-2 border-[#58a6ff]" />
              </div>
            </div>

            <p className="text-[13px] text-[#8b949e]">
              {hint ?? 'Aponte para o QR Code do equipamento'}
            </p>

            {lastScanned && (
              <div className="flex items-center gap-2 rounded-full bg-[#3fb950]/20 px-4 py-1.5 text-[12px] font-medium text-[#3fb950]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3fb950]" />
                Leitura detectada
              </div>
            )}
          </>
        )}
      </div>

      {/* Slot for extra content (scanned list, confirm button, etc.) */}
      {children && (
        <div className="border-t border-white/10 bg-[#0d1117] px-4 pb-6 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}
