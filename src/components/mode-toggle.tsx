import { ClientOnly } from '@tanstack/react-router'
import { useTheme } from '~/components/theme-provider'
import type { Theme } from '~/lib/theme'

const THEME_ICONS: Record<Theme, string> = {
  light:  '☀️',
  dark:   '🌙',
  system: '🖥️',
}

const THEME_LABELS: Record<Theme, string> = {
  light:  'Tema: Claro',
  dark:   'Tema: Escuro',
  system: 'Tema: Sistema',
}

function ModeToggleInner() {
  const { theme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'light')  setTheme('dark')
    else if (theme === 'dark')   setTheme('system')
    else                         setTheme('light')
  }

  const current = (theme as Theme) ?? 'system'

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={THEME_LABELS[current]}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[14px] transition-colors hover:bg-white/[0.06]"
    >
      {THEME_ICONS[current]}
    </button>
  )
}

export function ModeToggle() {
  return (
    <ClientOnly fallback={
      <button type="button" className="flex h-7 w-7 items-center justify-center rounded-md text-[14px]">
        🖥️
      </button>
    }>
      <ModeToggleInner />
    </ClientOnly>
  )
}
