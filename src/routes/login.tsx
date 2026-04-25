import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { loginFn } from '~/server/function/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await loginFn({ data: { username, password } })
      document.cookie = `assetne_session=${result.token}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
      await router.invalidate()
      router.navigate({ to: '/dashboard' })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer login')
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
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="font-['Space_Grotesk'] text-[24px] font-bold tracking-tight text-[#e6edf3]">
            AssetNE
          </div>
          <div className="mt-1 text-[11px] tracking-wider text-[#6e7681]">NAESTRADA · PRODUCTION CONTROL</div>
        </div>

        {/* Card */}
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
              <label className="text-[12px] font-medium text-[#8b949e]">Senha</label>
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
      </div>
    </div>
  )
}
