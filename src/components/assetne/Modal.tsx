import type { ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  children,
  width = 480,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(4,7,16,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-y-auto rounded-t-2xl sm:rounded-xl"
        style={{
          maxHeight: '92dvh',
          maxWidth: width,
          background: '#0a0f1d',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          padding: '20px 22px',
        }}
      >
        {/* Mobile drag handle */}
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full" style={{ background: 'rgba(255,255,255,0.12)' }} />
        </div>

        <div className="mb-[18px] flex items-center justify-between">
          <h2
            className="text-[16px] font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="px-1 py-0.5 text-[18px] leading-none transition-colors"
            style={{ color: '#3b5a7a' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e8edf5')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#3b5a7a')}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ModalFooter({
  onClose,
  onConfirm,
  confirmLabel = 'Confirmar',
  disabled,
  loading,
}: {
  onClose: () => void
  onConfirm?: () => void
  confirmLabel?: string
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <div
      className="mt-[18px] flex justify-end gap-2 pt-3.5"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
    >
      <button
        onClick={onClose}
        className="rounded-lg px-4 py-2 text-[13px] transition-colors"
        style={{ color: '#3b5a7a' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#8ba4bf')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#3b5a7a')}
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm ?? onClose}
        disabled={disabled || loading}
        className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          boxShadow: disabled || loading ? 'none' : '0 4px 16px rgba(37,99,235,0.3)',
        }}
      >
        {loading ? 'Aguarde...' : confirmLabel}
      </button>
    </div>
  )
}
