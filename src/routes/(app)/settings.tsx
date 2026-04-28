import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { clientsQueries, useCreateClientMutation, useDeleteClientMutation } from '~/lib/clients/queries'
import { ImportExcelModal } from '~/components/assetne/ImportExcelModal'
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
        <h1
          className="mb-1 text-[22px] font-bold"
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.3px' }}
        >
          Configurações
        </h1>
        <p className="text-[13px]" style={{ color: '#3b5a7a' }}>
          Gerencie colaboradores, clientes e usuários
        </p>
      </div>

      {/* Tabs */}
      <div
        className="mb-5 flex w-fit gap-1 rounded-xl p-1"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all"
            style={
              tab === t.id
                ? { background: '#162040', color: '#93c5fd' }
                : { color: '#4a6380' }
            }
            onMouseEnter={(e) => { if (tab !== t.id) e.currentTarget.style.color = '#8ba4bf' }}
            onMouseLeave={(e) => { if (tab !== t.id) e.currentTarget.style.color = '#4a6380' }}
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

  const [username,    setUsername]    = useState('')
  const [name,        setName]        = useState('')
  const [password,    setPassword]    = useState('')
  const [role,        setRole]        = useState<'admin' | 'operator' | 'produtor'>('operator')
  const [resetingId,  setResetingId]  = useState<string | null>(null)
  const [newPass,     setNewPass]     = useState('')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

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
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <FieldInput value={username} onChange={setUsername} placeholder="Usuário (login)" />
        <FieldInput value={name}     onChange={setName}     placeholder="Nome completo" />
        <FieldInput value={password} onChange={setPassword} placeholder="Senha (mín. 6 caracteres)" type="password" />
        <div className="flex gap-2">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'operator' | 'produtor')}
            className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none transition-all"
            style={{
              background: '#060c1a',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#eef2ff',
            }}
          >
            <option value="operator">Operador</option>
            <option value="produtor">Produtor</option>
            <option value="admin">Administrador</option>
          </select>
          <PrimaryBtn
            onClick={() => createMutation.mutate()}
            disabled={!canAdd || createMutation.isPending}
          >
            + Criar
          </PrimaryBtn>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        {users.length === 0 && (
          <div className="p-6 text-center text-[13px]" style={{ color: '#2b4266' }}>
            Nenhum usuário cadastrado
          </div>
        )}
        {users.map((u: any, i: number) => (
          <div
            key={u.id}
            style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium" style={{ color: '#eef2ff' }}>{u.name}</div>
                <div className="text-[11px]" style={{ color: '#4a6380' }}>
                  @{u.username} · {{ admin: 'Administrador', produtor: 'Produtor', operator: 'Operador' }[u.role as string] ?? 'Operador'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <GhostBtn
                  onClick={() => { setResetingId(resetingId === u.id ? null : u.id); setNewPass('') }}
                >
                  Alterar senha
                </GhostBtn>
                <DangerBtn
                  onClick={() => deleteMutation.mutate(u.id)}
                  disabled={deleteMutation.isPending}
                >
                  Remover
                </DangerBtn>
              </div>
            </div>

            {/* Reset token banner */}
            {u.resetToken && (
              <div
                className="mx-4 mb-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                style={{
                  background: 'rgba(245,158,11,0.07)',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}
              >
                <div>
                  <div className="text-[11px]" style={{ color: '#f59e0b' }}>
                    Código de recuperação solicitado
                  </div>
                  <div
                    className="mt-0.5 text-[16px] font-bold tracking-[0.3em]"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: '#eef2ff' }}
                  >
                    {u.resetToken}
                  </div>
                </div>
                <button
                  onClick={() => copyToken(u.resetToken)}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                  style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#eef2ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#8ba4bf')}
                >
                  {copiedToken === u.resetToken ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            )}

            {/* Inline change password */}
            {resetingId === u.id && (
              <div className="mx-4 mb-3 flex gap-2">
                <FieldInput
                  value={newPass}
                  onChange={setNewPass}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  type="password"
                  autoFocus
                  className="flex-1"
                />
                <PrimaryBtn
                  onClick={() => changePassMutation.mutate({ id: u.id, newPassword: newPass })}
                  disabled={newPass.length < 6 || changePassMutation.isPending}
                  size="sm"
                >
                  Salvar
                </PrimaryBtn>
                <GhostBtn
                  onClick={() => { setResetingId(null); setNewPass('') }}
                  size="sm"
                >
                  Cancelar
                </GhostBtn>
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
    <Panel
      title="Colaboradores"
      description="Pessoas que podem retirar equipamentos"
      count={collaborators.length}
    >
      <div className="mb-4 flex gap-2">
        <FieldInput
          value={name}
          onChange={setName}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nome do colaborador"
          className="flex-1"
        />
        <FieldInput
          value={role}
          onChange={setRole}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Cargo (opcional)"
          className="w-44"
        />
        <PrimaryBtn
          onClick={handleAdd}
          disabled={!name.trim() || createMutation.isPending}
        >
          + Adicionar
        </PrimaryBtn>
      </div>

      <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        {collaborators.length === 0 && (
          <div className="p-6 text-center text-[13px]" style={{ color: '#2b4266' }}>
            Nenhum colaborador cadastrado
          </div>
        )}
        {collaborators.map((c: Collaborator, i: number) => (
          <div
            key={c.id}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < collaborators.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
              style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa' }}
            >
              {c.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium" style={{ color: '#eef2ff' }}>{c.name}</div>
              {c.role && <div className="text-[11px]" style={{ color: '#4a6380' }}>{c.role}</div>}
            </div>
            <DangerBtn onClick={() => deleteMutation.mutate(c.id)}>Remover</DangerBtn>
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
  const [showImport, setShowImport] = useState(false)
  const createMutation = useCreateClientMutation()
  const deleteMutation = useDeleteClientMutation()

  const handleAdd = async () => {
    if (!name.trim()) return
    await createMutation.mutateAsync(name.trim())
    setName('')
  }

  return (
    <>
      {showImport && <ImportExcelModal type="clients" onClose={() => setShowImport(false)} />}
      <Panel
        title="Clientes"
        description="Clientes disponíveis para seleção nas saídas"
        count={clients.length}
      >
        <div className="mb-4 flex gap-2">
          <FieldInput
            value={name}
            onChange={setName}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Nome do cliente"
            className="flex-1"
          />
          <button
            onClick={() => setShowImport(true)}
            className="rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#8ba4bf' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#eef2ff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8ba4bf')}
          >
            ↑ Excel
          </button>
          <PrimaryBtn
            onClick={handleAdd}
            disabled={!name.trim() || createMutation.isPending}
          >
            + Adicionar
          </PrimaryBtn>
        </div>

        <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {clients.length === 0 && (
            <div className="p-6 text-center text-[13px]" style={{ color: '#2b4266' }}>
              Nenhum cliente cadastrado
            </div>
          )}
          {clients.map((c: Client, i: number) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < clients.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}
              >
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-[13px] font-medium" style={{ color: '#eef2ff' }}>{c.name}</div>
              <DangerBtn onClick={() => deleteMutation.mutate(c.id)}>Remover</DangerBtn>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

/* ─── Shared UI primitives ── */

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
    <div
      className="rounded-xl p-5"
      style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div
            className="text-[15px] font-semibold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff' }}
          >
            {title}
          </div>
          <div className="text-[12px]" style={{ color: '#4a6380' }}>{description}</div>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-[12px]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: 'rgba(255,255,255,0.05)',
            color: '#8ba4bf',
          }}
        >
          {count}
        </span>
      </div>
      {children}
    </div>
  )
}

function FieldInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
  onKeyDown,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      className={`rounded-lg px-3 py-2 text-[13px] outline-none transition-all ${className}`}
      style={{
        background: '#060c1a',
        border: '1px solid rgba(255,255,255,0.07)',
        color: '#eef2ff',
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
    />
  )
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  size = 'md',
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  size?: 'md' | 'sm'
}) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-4 py-2 text-[13px]'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg font-medium text-white transition-all disabled:opacity-40 ${pad}`}
      style={{
        background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
        boxShadow: disabled ? 'none' : '0 4px 12px rgba(37,99,235,0.25)',
      }}
    >
      {children}
    </button>
  )
}

function GhostBtn({
  children,
  onClick,
  size = 'md',
}: {
  children: React.ReactNode
  onClick: () => void
  size?: 'md' | 'sm'
}) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-[12px]' : 'px-2 py-1 text-[12px]'
  return (
    <button
      onClick={onClick}
      className={`rounded-lg transition-colors ${pad}`}
      style={{ color: '#4a6380' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#8ba4bf' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a6380' }}
    >
      {children}
    </button>
  )
}

function DangerBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg px-2 py-1 text-[12px] transition-colors disabled:opacity-40"
      style={{ color: '#4a6380' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#4a6380' }}
    >
      {children}
    </button>
  )
}
