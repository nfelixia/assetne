import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { clientsQueries, useCreateClientMutation, useDeleteClientMutation } from '~/lib/clients/queries'
import { collaboratorsQueries, useCreateCollaboratorMutation, useDeleteCollaboratorMutation } from '~/lib/collaborators/queries'
import type { Client } from '~/db/schema/client.schema'
import type { Collaborator } from '~/db/schema/collaborator.schema'

export const Route = createFileRoute('/(app)/settings')({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(clientsQueries.list()),
      queryClient.ensureQueryData(collaboratorsQueries.list()),
    ])
  },
  component: SettingsPage,
})

function SettingsPage() {
  const [tab, setTab] = useState<'collaborators' | 'clients'>('collaborators')

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="mb-6">
        <h1 className="mb-1 font-['Space_Grotesk'] text-[22px] font-semibold text-[#e6edf3]">
          Configurações
        </h1>
        <p className="text-[13px] text-[#6e7681]">Gerencie colaboradores e clientes</p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-lg border border-white/10 bg-[#161b22] p-1 w-fit">
        {(['collaborators', 'clients'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-all ${
              tab === t
                ? 'bg-[#21262d] text-[#e6edf3]'
                : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            {t === 'collaborators' ? 'Colaboradores' : 'Clientes'}
          </button>
        ))}
      </div>

      {tab === 'collaborators' && <CollaboratorsPanel />}
      {tab === 'clients'       && <ClientsPanel />}
    </div>
  )
}

/* ─── COLLABORATORS ── */
function CollaboratorsPanel() {
  const { data: collaborators } = useSuspenseQuery(collaboratorsQueries.list())
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const createMutation = useCreateCollaboratorMutation()
  const deleteMutation = useDeleteCollaboratorMutation()

  const handleAdd = async () => {
    if (!name.trim()) return
    await createMutation.mutateAsync({ name: name.trim(), role: role.trim() || undefined })
    setName('')
    setRole('')
  }

  return (
    <Panel
      title="Colaboradores"
      description="Pessoas que podem retirar equipamentos"
      count={collaborators.length}
    >
      {/* Add form */}
      <div className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do colaborador"
          className="flex-1 rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Cargo (opcional)"
          className="w-44 rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim() || createMutation.isPending}
          className="rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd] disabled:opacity-45"
        >
          + Adicionar
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-lg border border-white/10">
        {collaborators.length === 0 && (
          <div className="p-6 text-center text-[13px] text-[#6e7681]">
            Nenhum colaborador cadastrado
          </div>
        )}
        {collaborators.map((c: Collaborator, i: number) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < collaborators.length - 1 ? 'border-b border-white/10' : ''
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#21262d] text-[13px] font-semibold text-[#58a6ff]">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#e6edf3]">{c.name}</div>
              {c.role && <div className="text-[11px] text-[#6e7681]">{c.role}</div>}
            </div>
            <button
              onClick={() => deleteMutation.mutate(c.id)}
              className="rounded px-2 py-1 text-[12px] text-[#6e7681] transition-colors hover:bg-[#f85149]/10 hover:text-[#f85149]"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ─── CLIENTS ── */
function ClientsPanel() {
  const { data: clients } = useSuspenseQuery(clientsQueries.list())
  const [name, setName] = useState('')
  const createMutation = useCreateClientMutation()
  const deleteMutation = useDeleteClientMutation()

  const handleAdd = async () => {
    if (!name.trim()) return
    await createMutation.mutateAsync(name.trim())
    setName('')
  }

  return (
    <Panel
      title="Clientes"
      description="Clientes disponíveis para seleção nas saídas"
      count={clients.length}
    >
      {/* Add form */}
      <div className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do cliente"
          className="flex-1 rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim() || createMutation.isPending}
          className="rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd] disabled:opacity-45"
        >
          + Adicionar
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-lg border border-white/10">
        {clients.length === 0 && (
          <div className="p-6 text-center text-[13px] text-[#6e7681]">
            Nenhum cliente cadastrado
          </div>
        )}
        {clients.map((c: Client, i: number) => (
          <div
            key={c.id}
            className={`flex items-center gap-3 px-4 py-3 ${
              i < clients.length - 1 ? 'border-b border-white/10' : ''
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#21262d] text-[13px] font-semibold text-[#3fb950]">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-[13px] font-medium text-[#e6edf3]">{c.name}</div>
            <button
              onClick={() => deleteMutation.mutate(c.id)}
              className="rounded px-2 py-1 text-[12px] text-[#6e7681] transition-colors hover:bg-[#f85149]/10 hover:text-[#f85149]"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Panel({
  title,
  description,
  count,
  children,
}: {
  title: string
  description: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#161b22] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-['Space_Grotesk'] text-[15px] font-semibold text-[#e6edf3]">{title}</div>
          <div className="text-[12px] text-[#6e7681]">{description}</div>
        </div>
        <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 font-['JetBrains_Mono'] text-[12px] text-[#8b949e]">
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}
