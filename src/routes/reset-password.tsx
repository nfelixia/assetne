import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { resetPasswordFn } from '~/server/function/auth'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [token,       setToken]       = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    setLoading(true)
    try {
      await resetPasswordFn({ data: { token: token.trim().toUpperCase(), newPassword: password } })
      setDone(true)
      setTimeout(() => navigate({ to: '/login' }), 2500)
    } catch (err: any) {
      toast.error(err.message || 'Código inválido ou expirado')
    } finally {
      setLoading(false)
    }
  }

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

        <div className="rounded-lg border border-white/10 bg-[#161b22] p-6">
          {done ? (
            <div className="py-4 text-center">
              <div className="mb-2 text-[32px]">✓</div>
              <div className="text-[15px] font-semibold text-[#3fb950]">Senha redefinida!</div>
              <div className="mt-1 text-[12px] text-[#6e7681]">Redirecionando para o login...</div>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-[15px] font-semibold text-[#e6edf3]">Redefinir senha</h2>
              <p className="mb-5 text-[12px] text-[#6e7681]">
                Informe o código que o administrador enviou.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#8b949e]">Código de recuperação</label>
                  <input
                    value={token}
                    onChange={(e) => setToken(e.target.value.toUpperCase())}
                    placeholder="Ex: A3K7P2"
                    maxLength={6}
                    required
                    autoFocus
                    className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 font-['JetBrains_Mono'] text-[16px] tracking-[0.25em] text-[#e6edf3] outline-none placeholder:text-[#484f58] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#8b949e]">Nova senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] outline-none placeholder:text-[#484f58] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-[#8b949e]">Confirmar senha</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repita a nova senha"
                    required
                    className="rounded-md border border-white/10 bg-[#0d1117] px-3 py-2 text-[13px] text-[#e6edf3] outline-none placeholder:text-[#484f58] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || token.length < 6 || password.length < 6}
                  className="mt-1 rounded-md bg-[#238636] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#2ea043] disabled:opacity-50"
                >
                  {loading ? 'Aguarde...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-[12px] text-[#6e7681] hover:text-[#8b949e]">
            ← Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  )
}
