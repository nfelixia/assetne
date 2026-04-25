import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { clientsQueries, useCreateClientMutation, useDeleteClientMutation } from '~/lib/clients/queries'
import { collaboratorsQueries, useCreateCollaboratorMutation, useDeleteCollaboratorMutation } from '~/lib/collaborators/queries'
import { createUserFn, deleteUserFn, getUsersFn, changePasswordFn } from '~/server/function/auth'
import type { Client } from '~/db/schema/client.schema'
import type { Collaborator } from '~/db/schema/collaborator.schema'

export const Route = createFileRoute('/(app)/settings')({
  beforeLoad: ({ context }: any) => {
    if (context?.session?.role !== 'admin') throw redirect({ to: '/dashboard' })
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(clientsQueries.list()),
      queryClient.ensureQueryData(collaboratorsQueries.list()),
    ])
  },
  component: SettingsPage,
})

type Tab = 'collaborators' | 'clients' | 'users'

function SettingsPage() {
  const [tab, setTab] = useState<Tab>('collaborators')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'collaborators', label: 'Colaboradores' },
    { id: 'clients',       label: 'Clientes' },
    { id: 'users',         label: 'Usuários do sistema' },
  ]

  return (
    <div className="animate-[fadeIn_0.3s_ease]">
      <div className="mb-6">
        <h1 className="mb-1 font-['Space_Grotesk'] text-[22px] font-semibold text-[#e6edf3]">
          Configurações
        </h1>
        <p className="text-[13px] text-[#6e7681]">Gerencie colaboradores, clientes e usuários</p>
      </div>

      <div className="mb-5 flex gap-1 rounded-lg border border-white/10 bg-[#161b22] p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-all ${
              tab === t.id ? 'bg-[#21262d] text-[#e6edf3]' : 'text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'collaborators' && <CollaboratorsPanel />}
      {tab === 'clients'       && <ClientsPanel />}
      {tab === 'users'         && <UsersPanel />}
    </div>
  )
}

/* ─── USERS ── */
function UsersPanel() {
  const qc = useQueryClient()
  const { data: users = [] } = useSuspenseQuery({
    queryKey: ['users'],
    queryFn: () => getUsersFn(),
  })

  const [username,      setUsername]      = useState('')
  const [name,          setName]          = useState('')
  const [password,      setPassword]      = useState('')
  const [role,          setRole]          = useState<'admin' | 'operator'>('operator')
  const [resetingId,    setResetingId]    = useState<string | null>(null)
  const [newPass,       setNewPass]       = useState('')
  const [copiedToken,   setCopiedToken]   = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: () => createUserFn({ data: { username, name, password, role } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setUsername(''); setName(''); setPassword('')
      toast.success('Usuário criado')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar usuário'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUserFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário removido')
    },
  })

  const changePassMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      changePasswordFn({ data: { id, newPassword } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setResetingId(null); setNewPass('')
      toast.success('Senha alterada')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao alterar senha'),
  })

  const canAdd = username.trim().length >= 3 && name.trim().length >= 2 && password.length >= 6

  function copyToken(token: string) {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 2000)
    })
  }

  return (
    <Panel title="Usuários do sistema" description="Credenciais de acesso ao AssetNE" count={users.length}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuário (login)"
          className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
          className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Senha (mín. 6 caracteres)"
          className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
        />
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'operator')}
            className="flex-1 rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] outline-none focus:border-[#58a6ff]"
          >
            <option value="operator">Operador</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!canAdd || createMutation.isPending}
            className="rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd] disabled:opacity-45"
          >
            + Criar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10">
        {users.length === 0 && (
          <div className="p-6 text-center text-[13px] text-[#6e7681]">Nenhum usuário cadastrado</div>
        )}
        {users.map((u: any, i: number) => (
          <div key={u.id} className={i < users.length - 1 ? 'border-b border-white/10' : ''}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f6feb] text-[12px] font-semibold text-white">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[#e6edf3]">{u.name}</div>
                <div className="text-[11px] text-[#6e7681]">
                  @{u.username} · {u.role === 'admin' ? 'Administrador' : 'Operador'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => { setResetingId(resetingId === u.id ? null : u.id); setNewPass('') }}
                  className="rounded px-2 py-1 text-[12px] text-[#6e7681] transition-colors hover:bg-white/[0.06] hover:text-[#8b949e]"
                >
                  Alterar senha
                </button>
                <button
                  onClick={() => deleteMutation.mutate(u.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded px-2 py-1 text-[12px] text-[#6e7681] transition-colors hover:bg-[#f85149]/10 hover:text-[#f85149]"
                >
                  Remover
                </button>
              </div>
            </div>

            {/* Reset token banner */}
            {u.resetToken && (
              <div className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-md border border-[#e3b341]/20 bg-[#e3b341]/[0.07] px-3 py-2">
                <div>
                  <div className="text-[11px] text-[#e3b341]">Código de recuperação solicitado</div>
                  <div className="mt-0.5 font-['JetBrains_Mono'] text-[16px] font-bold tracking-[0.3em] text-[#e6edf3]">
                    {u.resetToken}
                  </div>
                </div>
                <button
                  onClick={() => copyToken(u.resetToken)}
                  className="shrink-0 rounded-md border border-white/10 px-3 py-1.5 text-[12px] font-medium text-[#8b949e] transition-colors hover:text-[#e6edf3]"
                >
                  {copiedToken === u.resetToken ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            )}

            {/* Inline change password */}
            {resetingId === u.id && (
              <div className="mx-4 mb-3 flex gap-2">
                <input
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  type="password"
                  placeholder="Nova senha (mín. 6 caracteres)"
                  autoFocus
                  className="flex-1 rounded-md border border-white/10 bg-[#0d1117] px-3 py-1.5 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]"
                />
                <button
                  onClick={() => changePassMutation.mutate({ id: u.id, newPassword: newPass })}
                  disabled={newPass.length < 6 || changePassMutation.isPending}
                  className="rounded-md bg-[#1f6feb] px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-45"
                >
                  Salvar
                </button>
                <button
                  onClick={() => { setResetingId(null); setNewPass('') }}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-[#6e7681] hover:text-[#e6edf3]"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
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
    setName(''); setRole('')
  }

  return (
    <Panel title="Colaboradores" description="Pessoas que podem retirar equipamentos" count={collaborators.length}>
      <div className="mb-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do colaborador"
          className="flex-1 rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]" />
        <input value={role} onChange={(e) => setRole(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Cargo (opcional)"
          className="w-44 rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]" />
        <button onClick={handleAdd} disabled={!name.trim() || createMutation.isPending}
          className="rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd] disabled:opacity-45">
          + Adicionar
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10">
        {collaborators.length === 0 && <div className="p-6 text-center text-[13px] text-[#6e7681]">Nenhum colaborador cadastrado</div>}
        {collaborators.map((c: Collaborator, i: number) => (
          <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i < collaborators.length - 1 ? 'border-b border-white/10' : ''}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#21262d] text-[13px] font-semibold text-[#58a6ff]">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#e6edf3]">{c.name}</div>
              {c.role && <div className="text-[11px] text-[#6e7681]">{c.role}</div>}
            </div>
            <button onClick={() => deleteMutation.mutate(c.id)}
              className="rounded px-2 py-1 text-[12px] text-[#6e7681] transition-colors hover:bg-[#f85149]/10 hover:text-[#f85149]">
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
    <Panel title="Clientes" description="Clientes disponíveis para seleção nas saídas" count={clients.length}>
      <div className="mb-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do cliente"
          className="flex-1 rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] placeholder-[#6e7681] outline-none focus:border-[#58a6ff]" />
        <button onClick={handleAdd} disabled={!name.trim() || createMutation.isPending}
          className="rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#388bfd] disabled:opacity-45">
          + Adicionar
        </button>
      </div>
      <div className="overflow-hidden rounded-lg border border-white/10">
        {clients.length === 0 && <div className="p-6 text-center text-[13px] text-[#6e7681]">Nenhum cliente cadastrado</div>}
        {clients.map((c: Client, i: number) => (
          <div key={c.id} className={`flex items-center gap-3 px-4 py-3 ${i < clients.length - 1 ? 'border-b border-white/10' : ''}`}>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#21262d] text-[13px] font-semibold text-[#3fb950]">
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-[13px] font-medium text-[#e6edf3]">{c.name}</div>
            <button onClick={() => deleteMutation.mutate(c.id)}
              className="rounded px-2 py-1 text-[12px] text-[#6e7681] transition-colors hover:bg-[#f85149]/10 hover:text-[#f85149]">
              Remover
            </button>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Panel({ title, description, count, children }: { title: string; description: string; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#161b22] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-['Space_Grotesk'] text-[15px] font-semibold text-[#e6edf3]">{title}</div>
          <div className="text-[12px] text-[#6e7681]">{description}</div>
        </div>
        <span className="rounded-full bg-[#21262d] px-2.5 py-0.5 font-['JetBrains_Mono'] text-[12px] text-[#8b949e]">{count}</span>
      </div>
      {children}
    </div>
  )
}
