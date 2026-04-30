import { createFileRoute, Link } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { equipmentQueries } from '~/lib/equipment/queries'
import { checkoutHistoryQuery, type CheckoutRecord } from '~/lib/checkout/queries'
import { productionQueries } from '~/lib/production/queries'
import { patrimonyQueries } from '~/lib/patrimony/queries'
import { DashboardSkeleton } from '~/components/assetne/Skeleton'
import type { SessionUser } from '~/lib/auth/session'

export const Route = createFileRoute('/(app)/dashboard')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(equipmentQueries.list()),
      queryClient.ensureQueryData(checkoutHistoryQuery()),
      queryClient.ensureQueryData(productionQueries.list()),
      queryClient.ensureQueryData(productionQueries.withdrawalRequests()),
      queryClient.ensureQueryData(patrimonyQueries.list()),
      queryClient.ensureQueryData(patrimonyQueries.withdrawalRequests()),
    ])
  },
  component: Dashboard,
  pendingComponent: DashboardSkeleton,
})

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function isOverdue(expectedReturn: string | null | undefined): boolean {
  if (!expectedReturn) return false
  return expectedReturn < new Date().toISOString().split('T')[0]
}

function Dashboard() {
  const { data: equipment    = [] } = useSuspenseQuery(equipmentQueries.list())
  const { data: history      = [] } = useSuspenseQuery(checkoutHistoryQuery())
  const { data: production   = [] } = useSuspenseQuery(productionQueries.list())
  const { data: prodRequests = [] } = useSuspenseQuery(productionQueries.withdrawalRequests())
  const { data: patrimony    = [] } = useSuspenseQuery(patrimonyQueries.list())
  const { data: patriReqs    = [] } = useSuspenseQuery(patrimonyQueries.withdrawalRequests())
  const { session } = Route.useRouteContext() as { session: SessionUser }

  const isAdmin = session.role === 'admin'

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  /* Equipment metrics */
  const eqInUse       = equipment.filter(e => e.status === 'in-use')
  const eqAvailable   = equipment.filter(e => e.status === 'available')
  const eqMaintenance = equipment.filter(e => e.status === 'maintenance')
  const eqOverdue     = eqInUse.filter(e => isOverdue(e.activeCheckout?.expectedReturn))

  /* Production metrics */
  const prodInUse    = production.filter(p => p.usedQty > 0)
  const prodPending  = prodRequests.filter(r => r.status === 'pending_approval')

  /* Patrimony metrics */
  const patriInUse   = patrimony.filter(p => p.status === 'emprestado' || p.status === 'em_uso')
  const patriDisp    = patrimony.filter(p => p.status === 'disponivel')
  const patriExtrav  = patrimony.filter(p => p.status === 'extraviado')
  const patriMaint   = patrimony.filter(p => p.status === 'manutencao')
  const patriPending = patriReqs.filter(r => r.status === 'pending_approval')

  /* Cross-module totals */
  const totalInUse   = eqInUse.length + patriInUse.length + prodInUse.length
  const totalAlerts  = eqOverdue.length + patriExtrav.length + eqMaintenance.length + patriMaint.length
  const totalPending = prodPending.length + patriPending.length

  const recentActivity = history.slice(0, 8)

  return (
    <div className="animate-[fadeIn_0.3s_ease] space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="mb-1 text-[22px] font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}>
          {getGreeting()}, {session.name}! 👋
        </h1>
        <p className="text-[13px] capitalize" style={{ color: '#3b5a7a' }}>{today}</p>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          value={equipment.length + production.length + patrimony.length}
          label="Total de itens" sub="no sistema" accent="#3b82f6" icon="📦"
        />
        <KpiCard
          value={totalInUse}
          label="Em uso agora" sub="em todos os módulos" accent="#f59e0b" icon="↑"
        />
        <KpiCard
          value={totalAlerts}
          label="Alertas"
          sub={totalAlerts > 0 ? 'requer atenção' : 'tudo em ordem'}
          accent={totalAlerts > 0 ? '#ef4444' : '#10b981'}
          icon={totalAlerts > 0 ? '⚠' : '✓'}
        />
        <KpiCard
          value={totalPending}
          label="Solicitações" sub="aguardando aprovação" accent="#8b5cf6" icon="🕐"
        />
      </div>

      {/* ── Module summary cards ── */}
      <div>
        <SectionTitle>Módulos</SectionTitle>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <ModuleCard
            to="/equipments" icon="🎬" title="Equipamentos" accent="#3b82f6"
            stats={[
              { label: 'Total',       value: equipment.length },
              { label: 'Em uso',      value: eqInUse.length,       color: eqInUse.length > 0       ? '#f59e0b' : undefined },
              { label: 'Disponíveis', value: eqAvailable.length,   color: '#10b981' },
              { label: 'Manutenção',  value: eqMaintenance.length, color: eqMaintenance.length > 0 ? '#a855f7' : undefined },
            ]}
            alert={eqOverdue.length > 0 ? `${eqOverdue.length} atraso${eqOverdue.length > 1 ? 's' : ''}` : undefined}
          />
          <ModuleCard
            to="/production" icon="🎭" title="Acervo de Produção" accent="#10b981"
            stats={[
              { label: 'Itens',      value: production.length },
              { label: 'Em uso',     value: prodInUse.length,   color: prodInUse.length > 0   ? '#f59e0b' : undefined },
              { label: 'Pendentes',  value: prodPending.length, color: prodPending.length > 0 ? '#8b5cf6' : undefined },
            ]}
            alert={prodPending.length > 0 ? `${prodPending.length} pendente${prodPending.length > 1 ? 's' : ''}` : undefined}
          />
          <ModuleCard
            to="/patrimony" icon="🏛" title="Patrimônio" accent="#8b5cf6"
            stats={[
              { label: 'Total',       value: patrimony.length },
              { label: 'Em uso',      value: patriInUse.length,  color: patriInUse.length > 0  ? '#f59e0b' : undefined },
              { label: 'Disponíveis', value: patriDisp.length,   color: '#10b981' },
              { label: 'Extraviados', value: patriExtrav.length, color: patriExtrav.length > 0 ? '#ef4444' : undefined },
            ]}
            alert={patriExtrav.length > 0 ? `${patriExtrav.length} extraviado${patriExtrav.length > 1 ? 's' : ''}` : undefined}
          />
        </div>
      </div>

      {/* ── Alerts ── */}
      {totalAlerts > 0 && (
        <div>
          <SectionTitle>⚠ Alertas</SectionTitle>
          <div className="space-y-2">
            {eqOverdue.map(eq => (
              <AlertRow key={eq.id} to="/equipments" color="#ef4444" badge="Atrasado"
                title={eq.name}
                sub={`${eq.activeCheckout?.responsible ?? '—'} · ${eq.activeCheckout?.project ?? '—'}`}
              />
            ))}
            {patriExtrav.map(p => (
              <AlertRow key={p.id} to="/patrimony" color="#ef4444" badge="Extraviado"
                title={p.name} sub={`Patrimônio · ${p.patrimonyCode}`}
              />
            ))}
            {eqMaintenance.map(eq => (
              <AlertRow key={eq.id} to="/equipments" color="#a855f7" badge="Manutenção"
                title={eq.name} sub={`Equipamento · ${eq.category}`}
              />
            ))}
            {patriMaint.map(p => (
              <AlertRow key={p.id} to="/patrimony" color="#a855f7" badge="Manutenção"
                title={p.name} sub={`Patrimônio · ${p.category}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Pending approvals (admin) ── */}
      {totalPending > 0 && isAdmin && (
        <div>
          <SectionTitle>Solicitações pendentes</SectionTitle>
          <div className="space-y-2">
            {prodPending.map(r => (
              <AlertRow key={r.id} to="/production" color="#8b5cf6" badge="Acervo"
                title={`${r.responsibleUserName} — ${r.quantity} un.`}
                sub={r.projectOrClient ?? 'Sem projeto'}
              />
            ))}
            {patriPending.map(r => (
              <AlertRow key={r.id} to="/patrimony" color="#8b5cf6" badge="Patrimônio"
                title={r.responsibleUserName}
                sub={r.projectOrClient ?? r.useType}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Activity feed ── */}
      {recentActivity.length > 0 && (
        <div>
          <SectionTitle>Atividade recente</SectionTitle>
          <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
            {recentActivity.map((entry, i) => (
              <ActivityRow key={entry.id} entry={entry} isLast={i === recentActivity.length - 1} />
            ))}
          </div>
        </div>
      )}

      {/* ── Quick access ── */}
      <div>
        <SectionTitle>Acesso rápido</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <QuickLink to="/equipments" label="Equipamentos"      icon="🎬" color="#3b82f6" />
          <QuickLink to="/production" label="Acervo de Produção" icon="🎭" color="#10b981" />
          <QuickLink to="/patrimony"  label="Patrimônio"        icon="🏛" color="#8b5cf6" />
          {(isAdmin || session.role === 'operator') && (
            <QuickLink to="/reports" label="Relatórios" icon="📊" color="#f59e0b" />
          )}
        </div>
      </div>

    </div>
  )
}

/* ── SectionTitle ── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>
      {children}
    </h2>
  )
}

/* ── KpiCard ── */
function KpiCard({ value, label, sub, accent, icon }: {
  value: number; label: string; sub: string; accent: string; icon: string
}) {
  return (
    <div className="relative overflow-hidden rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)', borderTop: `2px solid ${accent}` }}>
      <div className="pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full opacity-[0.06]" style={{ background: accent, filter: 'blur(32px)', transform: 'translate(30%, -30%)' }} />
      <div className="mb-2 flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: '#3b5a7a' }}>{label}</span>
        <span className="text-[16px] leading-none">{icon}</span>
      </div>
      <div className="mb-1 text-[30px] font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: accent }}>{value}</div>
      <div className="text-[11px]" style={{ color: '#2b4266' }}>{sub}</div>
    </div>
  )
}

/* ── ModuleCard ── */
function ModuleCard({ to, icon, title, accent, stats, alert }: {
  to: string; icon: string; title: string; accent: string
  stats: { label: string; value: number; color?: string }[]
  alert?: string
}) {
  return (
    <Link
      to={to as never}
      className="block overflow-hidden rounded-xl transition-transform hover:scale-[1.01] active:scale-[0.99]"
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)', borderTop: `2px solid ${accent}` }}
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <span className="text-[18px] leading-none">{icon}</span>
          <span className="text-[13px] font-semibold" style={{ color: '#eef2ff' }}>{title}</span>
        </div>
        {alert && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            {alert}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
        {stats.map(s => (
          <div key={s.label}>
            <div className="text-[22px] font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color: s.color ?? '#eef2ff' }}>{s.value}</div>
            <div className="mt-0.5 text-[11px]" style={{ color: '#3b5a7a' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </Link>
  )
}

/* ── AlertRow ── */
function AlertRow({ to, color, badge, title, sub }: {
  to: string; color: string; badge: string; title: string; sub: string
}) {
  return (
    <Link
      to={to as never}
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-80"
      style={{ background: `${color}0d`, border: `1px solid ${color}30` }}
    >
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{title}</div>
        <div className="text-[11px]" style={{ color: '#4a6380' }}>{sub}</div>
      </div>
      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${color}20`, color }}>
        {badge}
      </span>
    </Link>
  )
}

/* ── ActivityRow ── */
function ActivityRow({ entry, isLast }: { entry: CheckoutRecord; isLast: boolean }) {
  const isReturn = entry.checkedInAt !== null
  const color    = isReturn ? '#10b981' : '#3b82f6'
  const ts       = isReturn ? entry.checkedInAt! : entry.checkedOutAt

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-bold" style={{ background: `${color}18`, color }}>
        {isReturn ? '↓' : '↑'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium" style={{ color: '#d6e4f0' }}>{entry.equipmentName ?? '—'}</div>
        <div className="text-[11px]" style={{ color: '#4a6380' }}>
          {entry.responsible}{entry.project ? ` · ${entry.project}` : ''}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[11px] font-medium" style={{ color }}>{isReturn ? 'Devolução' : 'Saída'}</div>
        <div className="text-[11px]" style={{ color: '#2b4266' }}>
          {new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

/* ── QuickLink ── */
function QuickLink({ to, label, icon, color }: { to: string; label: string; icon: string; color: string }) {
  return (
    <Link
      to={to as never}
      className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-80"
      style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}
    >
      <span className="text-[15px] leading-none">{icon}</span>
      {label}
    </Link>
  )
}
