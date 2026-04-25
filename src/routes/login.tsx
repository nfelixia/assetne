import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { loginFn, requestResetFn } from '~/server/function/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

type View = 'login' | 'forgot'

function LoginPage() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('login')

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#0d1117]"
      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <div className="w-full max-w-[360px] px-4">
        <div className="mb-8 text-center">
          <div className="font-['Space_Grotesk'] text-[24px] font-bold tracking-tight text-[#e6edf3]">
            AssetNE
          </div>
          <div className="mt-1 text-[11px] tracking-wider text-[#6e7681]">NAESTRADA · PRODUCTION CONTROL</div>
        </div>

        {view === 'login' ? (
          <LoginForm onNavigate={navigate} onForgot={() => setView('forgot')} />
        ) : (
          <ForgotForm onBack={() => setView('login')} />
        )}
      </div>
    </div>
  )
}

function LoginForm({
  onNavigate,
  onForgot,
}: {
  onNavigate: ReturnType<typeof useNavigate>
  onForgot: () => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await loginFn({ data: { username, password } })
      document.cookie = `assetne_session=${result.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
      onNavigate({ to: '/dashboard' })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#161b22] p-6">
      <h2 className="mb-5 text-[15px] font-semibold text-[#e6edf3]">Entrar</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[#8b949e]">Usuário</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu.usuario"
            required
            autoFocus
            className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] outline-none placeholder:text-[#484f58] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[#8b949e]">Senha</label>
            <button
              type="button"
              onClick={onForgot}
              className="text-[11px] text-[#6e7681] hover:text-[#58a6ff]"
            >
              Esqueci a senha
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] outline-none placeholder:text-[#484f58] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-md bg-[#238636] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2ea043] disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}

function ForgotForm({ onBack }: { onBack: () => void }) {
  const [username, setUsername] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [sent,     setSent]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await requestResetFn({ data: { username: username.trim().toLowerCase() } })
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#161b22] p-6">
      {sent ? (
        <div className="py-2">
          <div className="mb-3 text-[15px] font-semibold text-[#e6edf3]">Solicitação enviada</div>
          <p className="mb-4 text-[12px] leading-relaxed text-[#8b949e]">
            Se o usuário existe, um código de recuperação foi gerado.{' '}
            <strong className="text-[#e6edf3]">Entre em contato com o administrador</strong> para
            obter o código e acesse{' '}
            <Link to="/reset-password" className="text-[#58a6ff] hover:underline">
              /redefinir-senha
            </Link>
            .
          </p>
          <button
            onClick={onBack}
            className="text-[12px] text-[#6e7681] hover:text-[#8b949e]"
          >
            ← Voltar para o login
          </button>
        </div>
      ) : (
        <>
          <h2 className="mb-1 text-[15px] font-semibold text-[#e6edf3]">Esqueci a senha</h2>
          <p className="mb-5 text-[12px] text-[#6e7681]">
            Informe seu usuário para gerar um código de recuperação.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-[#8b949e]">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu.usuario"
                required
                autoFocus
                className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] outline-none placeholder:text-[#484f58] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="mt-1 rounded-md bg-[#1f6feb] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#388bfd] disabled:opacity-50"
            >
              {loading ? 'Aguarde...' : 'Solicitar código'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="text-[12px] text-[#6e7681] hover:text-[#8b949e]"
            >
              ← Voltar para o login
            </button>
          </form>
        </>
      )}
    </div>
  )
}
