const COLOR_MAP: Record<string, string> = {
  branco:         '#f8f8f8',
  preto:          '#2a2a2a',
  vermelho:       '#ef4444',
  azul:           '#3b82f6',
  verde:          '#22c55e',
  amarelo:        '#eab308',
  laranja:        '#f97316',
  roxo:           '#a855f7',
  rosa:           '#ec4899',
  cinza:          '#6b7280',
  marrom:         '#92400e',
  bege:           '#d4b896',
  dourado:        '#d97706',
  prata:          '#94a3b8',
  turquesa:       '#14b8a6',
  'lilás':        '#c084fc',
  lilas:          '#c084fc',
  salmon:         '#fa8072',
  salmão:         '#fa8072',
  nude:           '#e8c9b0',
  caramelo:       '#c27c45',
  vinho:          '#7f1d1d',
  navy:           '#1e3a5f',
  creme:          '#f5f0e8',
  khaki:          '#c3b091',
  coral:          '#ff6b6b',
  azul_claro:     '#7dd3fc',
  verde_claro:    '#86efac',
  cinza_escuro:   '#374151',
  azul_escuro:    '#1e40af',
  verde_escuro:   '#166534',
}

const LIGHT_COLORS = new Set([
  'branco', 'bege', 'amarelo', 'nude', 'prata', 'creme', 'khaki', 'verde_claro', 'azul_claro',
])

export function ColorBadge({ color }: { color: string }) {
  const key        = color.toLowerCase().trim().replace(/\s+/g, '_')
  const cssColor   = COLOR_MAP[key]
  const isTransp   = key === 'transparente'
  const isMulti    = key === 'colorido' || key === 'multicolorido' || key === 'estampado'
  const isDotLight = LIGHT_COLORS.has(key)

  const displayName = color.charAt(0).toUpperCase() + color.slice(1).toLowerCase()

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: 'rgba(139,164,191,0.08)', border: '1px solid rgba(139,164,191,0.15)', color: '#8ba4bf' }}
    >
      {isTransp ? (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ border: '1.5px dashed #6b7280' }} />
      ) : isMulti ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 40%, #22c55e 70%, #eab308 100%)' }}
        />
      ) : cssColor ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            background: cssColor,
            boxShadow: isDotLight ? 'inset 0 0 0 1px rgba(0,0,0,0.15)' : 'inset 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        />
      ) : null}
      {displayName}
    </span>
  )
}
