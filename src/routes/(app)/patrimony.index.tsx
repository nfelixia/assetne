import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState, Suspense } from 'react'
import * as XLSX from 'xlsx'
import { patrimonyQueries } from '~/lib/patrimony/queries'
import type { PatrimonyItem } from '~/db/schema/patrimony.schema'
import { NewPatrimonyModal }         from '~/components/assetne/NewPatrimonyModal'
import { EditPatrimonyModal }        from '~/components/assetne/EditPatrimonyModal'
import { PatrimonyCheckOutModal }    from '~/components/assetne/PatrimonyCheckOutModal'
import { PatrimonyCheckInModal }     from '~/components/assetne/PatrimonyCheckInModal'
import { PatrimonyDetailModal }      from '~/components/assetne/PatrimonyDetailModal'
import { PatrimonyApprovalsPanel }   from '~/components/assetne/PatrimonyApprovalsPanel'
import { ImportExcelModal }          from '~/components/assetne/ImportExcelModal'
import { normalizeText, formatCurrency } from '~/utils/format'
import type { SessionUser } from '~/lib/auth/session'

export const Route = createFileRoute('/(app)/patrimony/')({
  component: PatrimonyPage,
})

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  disponivel:         { label: 'Disponível',        color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  pendente_aprovacao: { label: 'Aguard. aprovação', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  em_uso:             { label: 'Em Uso',            color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  emprestado:         { label: 'Emprestado',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  manutencao:         { label: 'Manutenção',        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  extraviado:         { label: 'Extraviado',        color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  baixado:            { label: 'Baixado',           color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

const CONDITION_LABEL: Record<string, string> = {
  novo:                 'Novo',
  bom:                  'Bom',
  regular:              'Regular',
  necessita_manutencao: 'Necessita manutenção',
  danificado:           'Danificado',
}

const FILTERS = [
  ['all',                'Todos'],
  ['disponivel',         'Disponíveis'],
  ['pendente_aprovacao', 'Pendentes'],
  ['em_uso',             'Em Uso'],
  ['emprestado',         'Emprestados'],
  ['manutencao',         'Manutenção'],
  ['extraviado',         'Extraviados'],
  ['baixado',            'Baixados'],
] as const

type PageTab = 'items' | 'approvals'

function exportToExcel(items: PatrimonyItem[]) {
  const rows = items.map((i) => ({
    'Código':          i.patrimonyCode,
    'Nome':            i.name,
    'Categoria':       i.category,
    'Status':          STATUS_BADGE[i.status]?.label ?? i.status,
    'Responsável':     i.currentResponsibleName ?? '',
    'Localização':     i.location ?? '',
    'Marca':           i.brand ?? '',
    'Modelo':          i.model ?? '',
    'N° Série':        i.serialNumber ?? '',
    'Condição':        CONDITION_LABEL[i.condition] ?? i.condition,
    'Valor Estimado':  i.estimatedValue ?? '',
    'Data Aquisição':  i.acquisitionDate ?? '',
    'Observações':     i.notes ?? '',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Patrimônio')
  XLSX.writeFile(wb, `patrimonio-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)', borderTop: `2px solid ${color}` }}>
      <div className="text-[22px] font-bold" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</div>
      <div className="mt-0.5 text-[12px]" style={{ color: '#4a6380' }}>{label}</div>
      {sub && <div className="mt-0.5 text-[11px]" style={{ color: '#3b5a7a' }}>{sub}</div>}
    </div>
  )
}

function PatrimonyPage() {
  const { data: items    } = useSuspenseQuery(patrimonyQueries.list())
  const { data: requests } = useSuspenseQuery(patrimonyQueries.withdrawalRequests())
  const { session }        = Route.useRouteContext() as { session: SessionUser }

  const isAdmin            = session.role === 'admin'
  const isGestorPatrimonio = session.role === 'gestor_patrimonio'
  const canManage          = isAdmin || isGestorPatrimonio
  const canViewApprovals   = canManage || requests.some((r) => r.requestedByUserId === session.id)

  const [pageTab,      setPageTab]      = useState<PageTab>('items')
  const [search,       setSearch]       = useState('')
  const [filter,       setFilter]       = useState('all')
  const [showNew,      setShowNew]      = useState(false)
  const [showImport,   setShowImport]   = useState(false)
  const [editItem,     setEditItem]     = useState<PatrimonyItem | null>(null)
  const [detailItem,   setDetailItem]   = useState<PatrimonyItem | null>(null)
  const [checkoutItem, setCheckoutItem] = useState<PatrimonyItem | null>(null)
  const [checkinItem,  setCheckinItem]  = useState<PatrimonyItem | null>(null)

  // KPIs
  const total      = items.length
  const disponivel = items.filter((i) => i.status === 'disponivel').length
  const emUso      = items.filter((i) => i.status === 'em_uso').length
  const emprestado = items.filter((i) => i.status === 'emprestado').length
  const manutencao = items.filter((i) => i.status === 'manutencao').length
  const extraviado = items.filter((i) => i.status === 'extraviado').length
  const pendente   = items.filter((i) => i.status === 'pendente_aprovacao').length
  const semResp    = items.filter((i) => (i.status === 'em_uso' || i.status === 'emprestado') && !i.currentResponsibleName).length
  const atencao    = extraviado + semResp
  const valorTotal = items.reduce((s, i) => s + (i.estimatedValue ?? 0), 0)

  const pendingApprovals = requests.filter((r) => r.status === 'pending_approval').length

  const filtered = items.filter((item) => {
    const q = normalizeText(search)
    const matchSearch = !q || [
      item.name, item.category, item.patrimonyCode, item.brand,
      item.model, item.serialNumber, item.currentResponsibleName, item.location,
    ].some((v) => v && normalizeText(v).includes(q))
    const matchFilter = filter === 'all' || item.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1
            className="mb-1 text-[22px] font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}
          >
            Patrimônio
          </h1>
          <p className="text-[13px]" style={{ color: '#3b5a7a' }}>
            Controle geral de bens internos da produtora
            {total > 0 && <> · <span style={{ color: '#8ba4bf' }}>{total} {total === 1 ? 'item' : 'itens'}</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button onClick={() => setShowImport(true)} className="rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}>
              Importar Excel
            </button>
          )}
          {isAdmin && total > 0 && (
            <button onClick={() => exportToExcel(items)} className="rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}>
              Exportar Excel
            </button>
          )}
          {canManage && (
            <button onClick={() => setShowNew(true)} className="rounded-lg px-4 py-2 text-[13px] font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}>
              + Novo item
            </button>
          )}
        </div>
      </div>

      {/* Page tabs (Itens | Aprovações) */}
      {canViewApprovals && (
        <div className="mb-5 flex gap-1 rounded-xl p-1 w-fit" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['items', 'Itens'], ['approvals', 'Aprovações']] as const).map(([tab, label]) => {
            const badge = tab === 'approvals' && pendingApprovals > 0 ? pendingApprovals : null
            return (
              <button
                key={tab}
                onClick={() => setPageTab(tab)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all"
                style={pageTab === tab ? { background: '#162040', color: '#93c5fd' } : { color: '#4a6380' }}
              >
                {label}
                {badge && (
                  <span
                    className="rounded-full px-1.5 text-[10px] font-bold"
                    style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ── ITENS TAB ── */}
      {pageTab === 'items' && (
        <>
          {/* KPI Cards */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total de bens"  value={total}      color="#3b82f6" />
            <StatCard label="Disponíveis"    value={disponivel} color="#10b981" />
            <StatCard label="Em Uso"         value={emUso + emprestado} color="#8b5cf6"
              sub={emprestado > 0 ? `${emprestado} emprestado(s)` : undefined} />
            <StatCard label="Pendentes"      value={pendente}   color="#f59e0b"
              sub={pendente > 0 ? 'aguardando aprovação' : undefined} />
            <StatCard label="Atenção"        value={atencao}    color={atencao > 0 ? '#ef4444' : '#4a6380'}
              sub={atencao > 0 ? `${extraviado} extraviado(s)` : 'Tudo em ordem'} />
            <StatCard label="Valor total"    value={valorTotal > 0 ? formatCurrency(valorTotal) : '—'} color="#10b981" />
          </div>

          {/* Alert bar */}
          {atencao > 0 && (
            <div className="mb-4 flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <span style={{ color: '#ef4444', fontSize: 16 }}>⚠</span>
              <div className="text-[12px]" style={{ color: '#ef4444' }}>
                <span className="font-semibold">Atenção: </span>
                {[
                  extraviado > 0 && `${extraviado} item(ns) extraviado(s)`,
                  semResp > 0    && `${semResp} item(ns) em uso sem responsável definido`,
                ].filter(Boolean).join(' · ')}
              </div>
            </div>
          )}

          {/* Filters + Search */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1 rounded-xl p-1" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}>
              {FILTERS.map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setFilter(val)}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
                  style={filter === val ? { background: '#162040', color: '#93c5fd' } : { color: '#4a6380' }}
                >
                  {label}
                  {val !== 'all' && (() => {
                    const n = items.filter((i) => i.status === val).length
                    return n > 0 ? <span className="ml-1.5 opacity-60">{n}</span> : null
                  })()}
                </button>
              ))}
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código, marca..."
              className="flex-1 min-w-[200px] rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
              style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)', color: '#eef2ff' }}
            />
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="rounded-xl py-16 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-[32px] mb-2">🏢</div>
              <div className="text-[14px] font-medium" style={{ color: '#2b4266' }}>
                {search || filter !== 'all' ? 'Nenhum item encontrado' : 'Nenhum bem patrimonial cadastrado'}
              </div>
              {canManage && !search && filter === 'all' && (
                <button onClick={() => setShowNew(true)} className="mt-4 rounded-lg px-4 py-2 text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                  + Cadastrar primeiro item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Item</th>
                      <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider md:table-cell" style={{ color: '#3b5a7a' }}>Categoria</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Status</th>
                      <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider lg:table-cell" style={{ color: '#3b5a7a' }}>Responsável</th>
                      <th className="hidden px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider lg:table-cell" style={{ color: '#3b5a7a' }}>Localização</th>
                      <th className="hidden px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider xl:table-cell" style={{ color: '#3b5a7a' }}>Valor</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#3b5a7a' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => {
                      const badge  = STATUS_BADGE[item.status] ?? { label: item.status, color: '#8ba4bf', bg: 'rgba(255,255,255,0.05)' }
                      const canOut = item.status === 'disponivel'
                      const canIn  = item.status === 'em_uso' || item.status === 'emprestado'
                      const isPending = item.status === 'pendente_aprovacao'

                      return (
                        <tr key={item.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                                style={{ background: '#060c1a', border: '1px solid rgba(255,255,255,0.07)' }}>
                                {item.mainImageUrl
                                  ? <img src={item.mainImageUrl} className="h-full w-full object-cover" />
                                  : <span className="text-[16px]">🏢</span>}
                              </div>
                              <div className="min-w-0">
                                <button onClick={() => setDetailItem(item)} className="text-left text-[13px] font-medium transition-colors hover:underline" style={{ color: '#eef2ff' }}>
                                  {item.name}
                                </button>
                                <div className="text-[11px]" style={{ color: '#3b5a7a' }}>
                                  {item.patrimonyCode}{item.brand && <> · {item.brand}</>}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell">
                            <span className="text-[12px]" style={{ color: '#8ba4bf' }}>{item.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
                              style={{ background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 lg:table-cell">
                            <span className="text-[12px]" style={{ color: item.currentResponsibleName ? '#8ba4bf' : '#2b4266' }}>
                              {item.currentResponsibleName ?? '—'}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 lg:table-cell">
                            <span className="text-[12px]" style={{ color: '#4a6380' }}>{item.location ?? '—'}</span>
                          </td>
                          <td className="hidden px-4 py-3 text-right xl:table-cell">
                            <span className="text-[12px]" style={{ color: '#3b5a7a' }}>
                              {item.estimatedValue != null ? formatCurrency(item.estimatedValue) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setDetailItem(item)} className="rounded-md px-2 py-1 text-[11px] transition-colors" style={{ color: '#4a6380' }}>
                                Detalhes
                              </button>
                              {canOut && (
                                <button
                                  onClick={() => setCheckoutItem(item)}
                                  className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
                                  style={{ color: canManage ? '#3b82f6' : '#8b5cf6' }}
                                >
                                  {canManage ? 'Retirar' : 'Solicitar'}
                                </button>
                              )}
                              {isPending && canManage && (
                                <button
                                  onClick={() => { setPageTab('approvals') }}
                                  className="rounded-md px-2 py-1 text-[11px] font-medium"
                                  style={{ color: '#f59e0b' }}
                                >
                                  Aprovar
                                </button>
                              )}
                              {canIn && (
                                <button onClick={() => setCheckinItem(item)} className="rounded-md px-2 py-1 text-[11px] font-medium transition-colors" style={{ color: '#10b981' }}>
                                  Devolver
                                </button>
                              )}
                              {canManage && (
                                <button onClick={() => setEditItem(item)} className="rounded-md px-2 py-1 text-[11px] transition-colors" style={{ color: '#3b5a7a' }}>
                                  Editar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── APROVAÇÕES TAB ── */}
      {pageTab === 'approvals' && canViewApprovals && (
        <Suspense fallback={null}>
          <PatrimonyApprovalsPanel session={session} />
        </Suspense>
      )}

      {/* Modals */}
      {showNew && <NewPatrimonyModal onClose={() => setShowNew(false)} />}

      {showImport && <ImportExcelModal type="patrimony" onClose={() => setShowImport(false)} />}

      {editItem && <EditPatrimonyModal item={editItem} onClose={() => setEditItem(null)} />}

      {checkoutItem && (
        <PatrimonyCheckOutModal
          item={checkoutItem}
          session={session}
          onClose={() => setCheckoutItem(null)}
        />
      )}

      {checkinItem && (
        <PatrimonyCheckInModal
          item={checkinItem}
          isAdmin={isAdmin}
          isGestorPatrimonio={isGestorPatrimonio}
          currentUserId={session.id}
          onClose={() => setCheckinItem(null)}
        />
      )}

      {detailItem && (
        <Suspense fallback={null}>
          <PatrimonyDetailModal
            item={detailItem}
            isAdmin={isAdmin}
            isGestorPatrimonio={isGestorPatrimonio}
            onEdit={() => { setEditItem(detailItem); setDetailItem(null) }}
            onCheckout={() => { setCheckoutItem(detailItem); setDetailItem(null) }}
            onCheckin={() => { setCheckinItem(detailItem); setDetailItem(null) }}
            onClose={() => setDetailItem(null)}
          />
        </Suspense>
      )}
    </div>
  )
}
