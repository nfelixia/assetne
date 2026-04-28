import { useEffect } from 'react'

export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: 'rgba(4,7,16,0.88)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-[88vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-[14px] transition-colors"
        style={{ background: 'rgba(255,255,255,0.08)', color: '#8ba4bf' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      >
        ✕
      </button>
    </div>
  )
}
