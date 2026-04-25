import { useEffect, useRef, useState } from 'react'

interface Props {
  onScan: (value: string) => void
  onClose: () => void
}

export function QRScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const scannerRef = useRef<unknown>(null)
  const divId = 'qr-scanner-container'

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
            setLastScanned(decodedText)
            onScan(decodedText)
          },
          undefined
        )
      } catch (err) {
        if (!stopped) {
          setError('Não foi possível acessar a câmera. Verifique as permissões.')
        }
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
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4">
        <span className="font-['Space_Grotesk'] text-[16px] font-semibold text-white">
          Escanear equipamento
        </span>
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-white/20"
        >
          Fechar
        </button>
      </div>

      {/* Scanner area */}
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
        <div className="flex flex-col items-center gap-4">
          {/* Video feed */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#58a6ff]">
            <div id={divId} style={{ width: 300, minHeight: 300 }} />
            {/* Corner guides */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 border-[#58a6ff] rounded-tl" />
              <div className="absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 border-[#58a6ff] rounded-tr" />
              <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-[#58a6ff] rounded-bl" />
              <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-[#58a6ff] rounded-br" />
            </div>
          </div>

          <p className="text-[13px] text-[#8b949e]">
            Aponte para o QR Code do equipamento
          </p>

          {lastScanned && (
            <div className="flex items-center gap-2 rounded-full bg-[#3fb950]/20 px-4 py-1.5 text-[12px] font-medium text-[#3fb950]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3fb950]" />
              Equipamento detectado!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
