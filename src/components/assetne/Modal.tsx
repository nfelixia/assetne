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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#161b22] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:rounded-xl sm:p-[26px]"
        style={{
          maxHeight: '92dvh',
          maxWidth: width,
        }}
      >
        {/* Mobile drag handle */}
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <div className="mb-[18px] flex items-center justify-between">
          <h2 className="font-['Space_Grotesk'] text-[17px] font-semibold text-[#e6edf3]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="px-1 py-0.5 text-[18px] leading-none text-[#8b949e] transition-colors hover:text-[#e6edf3]"
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
    <div className="mt-[18px] flex justify-end gap-2 border-t border-white/10 pt-3.5">
      <button
        onClick={onClose}
        className="rounded-md px-4 py-2 text-[13px] text-[#8b949e] transition-colors hover:text-[#e6edf3]"
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm ?? onClose}
        disabled={disabled || loading}
        className="rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {loading ? 'Aguarde...' : confirmLabel}
      </button>
    </div>
  )
}
