import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { equipmentQueries, type EquipmentWithCheckout } from '~/lib/equipment/queries'
import { checkoutHistoryQuery } from '~/lib/checkout/queries'
import { CheckOutModal } from '~/components/assetne/CheckOutModal'
import { CheckInModal } from '~/components/assetne/CheckInModal'
import { NewEquipModal } from '~/components/assetne/NewEquipModal'
import { CAT_ICON } from '~/components/assetne/utils'
import { displayEquipmentValue } from '~/utils/format'
import { DashboardSkeleton } from '~/components/assetne/Skeleton'
import type { SessionUser } from '~/lib/auth/session'

export const Route = createFileRoute('/(app)/dashboard')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(equipmentQueries.list()),
      queryClient.ensureQueryData(checkoutHistoryQuery()),
    ])
  },
  component: Dashboard,
  pendingComponent: DashboardSkeleton,
})

type ViewMode = 'by-responsible' | 'by-project' | 'list'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24))
}

function isOverdue(expectedReturn: string | null): boolean {
  if (!expectedReturn) return false
  return expectedReturn < new Date().toISOString().split('T')[0]
}

function Dashboard() {
  const { data: equipment } = useSuspenseQuery(equipmentQueries.list())
  const { data: history = [] } = useSuspenseQuery(checkoutHistoryQuery())
  const { session } = Route.useRouteContext() as { session: SessionUser }

  const [modal,       setModal]       = useState<'checkout' | 'checkin' | 'newequip' | null>(null)
  const [viewMode,    setViewMode]    = useState<ViewMode>('by-responsible')
  const [inUseSearch, setInUseSearch] = useState('')

  const total       = equipment.length
  const inUse       = equipment.filter((e) => e.status === 'in-use')
  const available   = equipment.filter((e) => e.status === 'available')
  const maintenance = equipment.filter((e) => e.status === 'maintenance')

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const overdue = inUse.filter((e) => isOverdue(e.activeCheckout?.expectedReturn ?? null))

  const longestOut = [...inUse]
    .filter((e) => e.activeCheckout)
    .sort((a, b) => a.activeCheckout!.checkedOutAt - b.activeCheckout!.checkedOutAt)
    .slice(0, 5)

  const recentReturns = history.filter((h) => h.checkedInAt !== null).slice(0, 5)

  const filteredInUse = useMemo(() => {
    const q = inUseSearch.toLowerCase()
    if (!q) return inUse
    return inUse.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      (e.activeCheckout?.responsible ?? '').toLowerCase().includes(q) ||
      (e.activeCheckout?.project ?? '').toLowerCase().includes(q),
    )
  }, [inUse, inUseSearch])

  const byResponsible = useMemo(() =>
    filteredInUse.reduce<Record<string, EquipmentWithCheckout[]>>((acc, eq) => {
      const r = eq.activeCheckout?.responsible ?? '—'
      if (!acc[r]) acc[r] = []
      acc[r].push(eq)
      return acc
    }, {}),
  [filteredInUse])

  const byProject = useMemo(() =>
    filteredInUse.reduce<Record<string, EquipmentWithCheckout[]>>((acc, eq) => {
      const p = eq.activeCheckout?.project ?? '—'
      if (!acc[p]) acc[p] = []
      acc[p].push(eq)
      return acc
    }, {}),
  [filteredInUse])

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-1 text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}>
          {getGreeting()}! 👋
        </h1>
        <p className="text-[13px] capitalize" style={{ color: '#3b5a7a' }}>{today}</p>
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard value={total}            label="Total de itens"  sub="no inventário"                                                          accent="#3b82f6" icon={<BoxIcon />}     />
        <StatCard value={inUse.length}     label="Em uso agora"    sub={`${new Set(inUse.map((e) => e.activeCheckout?.project)).size} projeto(s)`} accent="#f59e0b" icon={<ArrowUpIcon />} />
        <StatCard value={available.length} label="Disponíveis"     sub={total > 0 ? `${Math.round((available.length / total) * 100)}% do inventário` : '—'} accent="#10b981" icon={<CheckIcon />}    />
        <StatCard value={maintenance.length} label="Em manutenção" sub={overdue.length > 0 ? `${overdue.length} atrasado(s)` : 'requer atenção'} accent="#ef4444" icon={<WrenchIcon />}  />
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-2">
        <ActionButton onClick={() => setModal('checkout')} primary icon="↑" label="Nova Saída" />
        <ActionButton onClick={() => setModal('checkin')}         icon="↓" label="Devolução" />
        <ActionButton onClick={() => setModal('newequip')}        icon="+" label="Cadastrar Equipamento" />
      </div>

      {/* ── Em uso agora ── */}
      <div className="mb-5">
        {/* Section header */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-semibold" style={{ color: '#eef2ff' }}>Em uso agora</h2>
            <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#10b981' }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }} />
              {inUse.length}
            </div>
          </div>

          {inUse.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                value={inUseSearch}
                onChange={(e) => setInUseSearch(e.target.value)}
                placeholder="Buscar..."
                className="h-7 w-[130px] rounded-lg px-2.5 text-[12px] outline-none transition-all"
                style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
                onFocus={(e)  => (e.currentTarget.style.borderColor = '#2563eb')}
                onBlur={(e)   => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
              />
              <div className="flex overflow-hidden rounded-lg" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}>
                <ViewBtn mode="by-responsible" current={viewMode} onClick={setViewMode} title="Por responsável">👤</ViewBtn>
                <ViewBtn mode="by-project"     current={viewMode} onClick={setViewMode} title="Por projeto">📋</ViewBtn>
                <ViewBtn mode="list"           current={viewMode} onClick={setViewMode} title="Lista">≡</ViewBtn>
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {inUse.length === 0 && (
          <div className="rounded-xl p-10 text-center text-[13px]" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', color: '#2b4266' }}>
            Nenhum equipamento em uso no momento
          </div>
        )}

        {/* No search results */}
        {inUse.length > 0 && filteredInUse.length === 0 && (
          <div className="rounded-xl p-8 text-center text-[13px]" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', color: '#2b4266' }}>
            Nenhum resultado para "{inUseSearch}"
          </div>
        )}

        {/* By responsible */}
        {viewMode === 'by-responsible' && filteredInUse.length > 0 && (
          <div className="space-y-3">
            {Object.entries(byResponsible).map(([responsible, items]) => (
              <ResponsibleCard key={responsible} responsible={responsible} role={items[0]?.activeCheckout?.responsibleRole ?? null} items={items} />
            ))}
          </div>
        )}

        {/* By project */}
        {viewMode === 'by-project' && filteredInUse.length > 0 && (
          <div className="space-y-3">
            {Object.entries(byProject).map(([project, items]) => (
              <ProjectCard key={project} project={project} items={items} />
            ))}
          </div>
        )}

        {/* List mode */}
        {viewMode === 'list' && filteredInUse.length > 0 && (
          <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
            {filteredInUse.map((eq, i) => (
              <EquipRow key={eq.id} eq={eq} isLast={i === filteredInUse.length - 1} />
            ))}
          </div>
        )}
      </div>

      {/* Longer out */}
      {longestOut.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-3 text-[14px] font-semibold" style={{ color: '#eef2ff' }}>Há mais tempo fora</h2>
          <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
            {longestOut.map((eq, i) => {
              const days = daysSince(eq.activeCheckout!.checkedOutAt)
              const icon = CAT_ICON[eq.category] ?? '📦'
              return (
                <div key={eq.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < longestOut.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[15px]" style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {eq.photoUrl ? <img src={eq.photoUrl} alt={eq.name} className="h-full w-full rounded-lg object-cover" /> : icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>
                      {eq.name}{eq.codigo ? <span className="ml-1.5 text-[11px] text-[#58a6ff]">#{eq.codigo}</span> : null}
                    </div>
                    <div className="mt-0.5 text-[11px]" style={{ color: '#2b4266' }}>
                      {eq.activeCheckout?.responsible} · {eq.activeCheckout?.project}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: days > 14 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', color: days > 14 ? '#ef4444' : '#f59e0b' }}>
                    {days === 0 ? 'Hoje' : `${days}d fora`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent returns */}
      {recentReturns.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-3 text-[14px] font-semibold" style={{ color: '#eef2ff' }}>Devoluções recentes</h2>
          <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
            {recentReturns.map((h, i) => (
              <div key={h.id} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < recentReturns.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: '#10b981' }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{h.equipmentName ?? '—'}</div>
                  <div className="text-[11px]" style={{ color: '#4a6380' }}>{h.responsible}</div>
                </div>
                <div className="shrink-0 text-[12px]" style={{ color: '#8ba4bf' }}>
                  {h.checkedInAt ? new Date(h.checkedInAt).toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal === 'checkout' && <CheckOutModal equipment={equipment} onClose={() => setModal(null)} />}
      {modal === 'checkin'  && <CheckInModal  equipment={equipment} session={session} onClose={() => setModal(null)} />}
      {modal === 'newequip' && <NewEquipModal onClose={() => setModal(null)} />}
    </div>
  )
}

/* ── ViewBtn ── */
function ViewBtn({ mode, current, onClick, title, children }: {
  mode: ViewMode; current: ViewMode; onClick: (m: ViewMode) => void; title: string; children: React.ReactNode
}) {
  const active = mode === current
  return (
    <button
      onClick={() => onClick(mode)}
      title={title}
      className="flex h-7 w-7 items-center justify-center text-[13px] transition-colors"
      style={{ background: active ? 'rgba(37,99,235,0.2)' : 'transparent', color: active ? '#60a5fa' : '#4a6380' }}
    >
      {children}
    </button>
  )
}

/* ── ResponsibleCard ── */
function ResponsibleCard({ responsible, role, items }: {
  responsible: string; role: string | null; items: EquipmentWithCheckout[]
}) {
  const overdueCount = items.filter((e) => isOverdue(e.activeCheckout?.expectedReturn ?? null)).length
  const projectGroups = items.reduce<Record<string, EquipmentWithCheckout[]>>((acc, eq) => {
    const p = eq.activeCheckout?.project ?? '—'
    if (!acc[p]) acc[p] = []
    acc[p].push(eq)
    return acc
  }, {})

  return (
    <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
          {responsible.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold" style={{ color: '#eef2ff' }}>{responsible}</div>
          {role && <div className="text-[11px]" style={{ color: '#3b5a7a' }}>{role}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {overdueCount > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              {overdueCount} atraso{overdueCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            {items.length} item{items.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {Object.entries(projectGroups).map(([project, projItems], pi, arr) => {
        const exp         = projItems[0]?.activeCheckout?.expectedReturn
        const dateLabel   = exp ? new Date(exp + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null
        const projOverdue = projItems.some((e) => isOverdue(e.activeCheckout?.expectedReturn ?? null))
        return (
          <div key={project} style={{ borderBottom: pi < arr.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[11px]" style={{ color: '#3b5a7a' }}>📋</span>
                <span className="truncate text-[12px] font-medium" style={{ color: '#8ba4bf' }}>{project}</span>
              </div>
              {dateLabel && (
                <span className="shrink-0 text-[11px]" style={{ color: projOverdue ? '#ef4444' : '#2b4266', fontFamily: "'JetBrains Mono', monospace" }}>
                  📅 {dateLabel}{projOverdue ? ' · atrasado' : ''}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {projItems.slice(0, 5).map((eq) => <EquipChip key={eq.id} eq={eq} />)}
              {projItems.length > 5 && (
                <span className="flex items-center rounded-lg px-2.5 py-1 text-[11px]" style={{ background: 'rgba(255,255,255,0.04)', color: '#4a6380' }}>
                  +{projItems.length - 5} mais
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── ProjectCard ── */
function ProjectCard({ project, items }: { project: string; items: EquipmentWithCheckout[] }) {
  const overdueCount  = items.filter((e) => isOverdue(e.activeCheckout?.expectedReturn ?? null)).length
  const responsibles  = [...new Set(items.map((e) => e.activeCheckout?.responsible).filter(Boolean) as string[])]
  const exp           = items[0]?.activeCheckout?.expectedReturn
  const dateLabel     = exp ? new Date(exp + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : null

  return (
    <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[18px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
          📋
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold" style={{ color: '#eef2ff' }}>{project}</div>
          <div className="text-[11px] truncate" style={{ color: '#3b5a7a' }}>{responsibles.join(' · ')}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dateLabel && (
            <span className="text-[11px]" style={{ color: overdueCount > 0 ? '#ef4444' : '#3b5a7a', fontFamily: "'JetBrains Mono', monospace" }}>
              📅 {dateLabel}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              {overdueCount} atraso{overdueCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)', color: '#f59e0b' }}>
            {items.length} item{items.length > 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 py-3">
        {items.slice(0, 6).map((eq) => <EquipChip key={eq.id} eq={eq} />)}
        {items.length > 6 && (
          <span className="flex items-center rounded-lg px-2.5 py-1 text-[11px]" style={{ background: 'rgba(255,255,255,0.04)', color: '#4a6380' }}>
            +{items.length - 6} mais
          </span>
        )}
      </div>
    </div>
  )
}

/* ── EquipChip ── */
function EquipChip({ eq }: { eq: EquipmentWithCheckout }) {
  const icon = CAT_ICON[eq.category] ?? '📦'
  const overdue = isOverdue(eq.activeCheckout?.expectedReturn ?? null)
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px]"
      style={{
        background: overdue ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.04)',
        border: overdue ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {eq.photoUrl
        ? <img src={eq.photoUrl} alt="" className="h-3.5 w-3.5 shrink-0 rounded object-cover" />
        : <span className="shrink-0 text-[12px]">{icon}</span>}
      <span className="truncate max-w-[120px]" style={{ color: overdue ? '#fca5a5' : '#8ba4bf' }}>
        {eq.name}{eq.codigo ? ` #${eq.codigo}` : ''}
      </span>
      {overdue && <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide" style={{ color: '#ef4444' }}>!</span>}
    </div>
  )
}

/* ── EquipRow (list mode) ── */
function EquipRow({ eq, isLast }: { eq: EquipmentWithCheckout; isLast: boolean }) {
  const icon    = CAT_ICON[eq.category] ?? '📦'
  const overdue = isOverdue(eq.activeCheckout?.expectedReturn ?? null)

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)', background: overdue ? 'rgba(239,68,68,0.03)' : 'transparent' }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: '#0e1628', border: '1px solid rgba(255,255,255,0.06)' }}>
        {eq.photoUrl ? <img src={eq.photoUrl} alt={`Foto de ${eq.name}`} className="h-full w-full rounded-lg object-cover" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{eq.name}</span>
          {eq.codigo && <span className="shrink-0 text-[11px]" style={{ color: '#58a6ff' }}>#{eq.codigo}</span>}
          {overdue && <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>Atrasado</span>}
        </div>
        <div className="mt-0.5 text-[11px]" style={{ color: '#2b4266' }}>
          {eq.category} · <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#3b5a7a' }}>{displayEquipmentValue(eq.value)}</span>
        </div>
      </div>
      {eq.activeCheckout && (
        <div className="hidden sm:block min-w-0 flex-1">
          <div className="truncate text-[12px]" style={{ color: '#4a6380' }}>{eq.activeCheckout.responsible}</div>
          <div className="truncate text-[11px]" style={{ color: '#2b4266' }}>
            {eq.activeCheckout.project}
            {eq.activeCheckout.expectedReturn && (
              <span className="ml-1.5" style={{ color: overdue ? '#ef4444' : '#2b4266' }}>
                · {new Date(eq.activeCheckout.expectedReturn + 'T12:00:00').toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        </div>
      )}
      <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
        Em uso
      </span>
    </div>
  )
}

/* ── Shared sub-components ── */
function StatCard({ value, label, sub, accent, icon }: { value: number; label: string; sub: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', borderTop: `2px solid ${accent}` }}>
      <div className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full opacity-[0.06]" style={{ background: accent, filter: 'blur(32px)', transform: 'translate(30%, -30%)' }} />
      <div className="mb-3 flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#3b5a7a' }}>{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: `${accent}18`, color: accent }}>{icon}</span>
      </div>
      <div className="mb-1 text-[30px] font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent }}>{value}</div>
      <div className="text-[11px]" style={{ color: '#2b4266' }}>{sub}</div>
    </div>
  )
}

function ActionButton({ onClick, primary, icon, label }: { onClick: () => void; primary?: boolean; icon: string; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all"
      style={primary
        ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }
        : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
    >
      <span className="text-[15px] leading-none">{icon}</span>
      {label}
    </button>
  )
}

/* ── Icons ── */
function BoxIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg> }
function ArrowUpIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg> }
function CheckIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function WrenchIcon()  { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> }
