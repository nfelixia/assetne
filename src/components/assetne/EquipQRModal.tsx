import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface Props {
  equipment: { id: string; name: string; category: string }
  onClose: () => void
}

export function EquipQRModal({ equipment, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const svgRef   = useRef<SVGSVGElement>(null)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank')
    if (!win) return
    const safeName = equipment.name.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    )
    win.document.write(`
      <html><head><title>QR — ${safeName}</title></head>
      <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#fff;">
        ${content.innerHTML}
      </body></html>
    `)
    win.document.close()
    win.print()
    win.close()
  }

  const handleDownloadPNG = () => {
    const svg = svgRef.current
    if (!svg) return

    const SIZE    = 260
    const PADDING = 20
    const LABEL_H = 40

    const canvas  = document.createElement('canvas')
    canvas.width  = SIZE + PADDING * 2
    canvas.height = SIZE + PADDING * 2 + LABEL_H
    const ctx     = canvas.getContext('2d')!

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const xml   = new XMLSerializer().serializeToString(svg)
    const blob  = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url   = URL.createObjectURL(blob)
    const img   = new Image()

    img.onload = () => {
      ctx.drawImage(img, PADDING, PADDING, SIZE, SIZE)
      URL.revokeObjectURL(url)

      ctx.fillStyle = '#0d1117'
      ctx.font      = 'bold 13px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(equipment.name, canvas.width / 2, SIZE + PADDING * 2 + 16, canvas.width - PADDING * 2)

      ctx.fillStyle = '#6e7681'
      ctx.font      = '10px monospace'
      ctx.fillText(equipment.id, canvas.width / 2, SIZE + PADDING * 2 + 32, canvas.width - PADDING * 2)

      const a    = document.createElement('a')
      a.download = `qr-${equipment.name.replace(/\s+/g, '-').toLowerCase()}.png`
      a.href     = canvas.toDataURL('image/png')
      a.click()
    }
    img.src = url
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center gap-5 rounded-xl border border-white/10 bg-[#161b22] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        <div className="text-center">
          <h2 className="font-['Space_Grotesk'] text-[17px] font-semibold text-[#e6edf3]">
            QR Code
          </h2>
          <p className="mt-0.5 text-[12px] text-[#6e7681]">{equipment.category}</p>
        </div>

        {/* QR Code */}
        <div
          ref={printRef}
          className="flex flex-col items-center gap-3 rounded-xl bg-white p-5"
        >
          <QRCodeSVG
            ref={svgRef}
            value={equipment.id}
            size={200}
            bgColor="#ffffff"
            fgColor="#0d1117"
            level="M"
          />
          <div style={{ textAlign: 'center', fontFamily: 'sans-serif' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0d1117' }}>{equipment.name}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadPNG}
            className="rounded-md bg-[#1f6feb] px-5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd]"
          >
            ↓ Baixar QR Code
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-white/10 px-5 py-2 text-[13px] text-[#8b949e] transition-colors hover:text-[#e6edf3]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
