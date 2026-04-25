type Status = 'available' | 'in-use' | 'maintenance'

const CFG: Record<Status, { label: string; color: string; bg: string; border: string }> = {
  available:   { label: 'Disponível', color: '#3fb950', bg: 'rgba(63,185,80,0.12)',  border: 'rgba(63,185,80,0.25)' },
  'in-use':    { label: 'Em Uso',     color: '#e3b341', bg: 'rgba(227,179,65,0.12)', border: 'rgba(227,179,65,0.25)' },
  maintenance: { label: 'Manutenção', color: '#f85149', bg: 'rgba(248,81,73,0.12)',  border: 'rgba(248,81,73,0.25)' },
}

export function StatusBadge({ status }: { status: Status }) {
  const c = CFG[status] ?? CFG.available
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      <span
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: c.color }}
      />
      {c.label}
    </span>
  )
}
