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
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 120% 80% at 50% 10%, #0e1d46 0%, #070b14 62%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Decorative background shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute"
          style={{
            width: 480, height: 480, top: '-120px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          className="absolute"
          style={{
            width: 200, height: 200, top: '8%', left: '12%',
            border: '1px solid rgba(37,99,235,0.08)',
            transform: 'rotate(45deg)', borderRadius: 4,
          }}
        />
        <div
          className="absolute"
          style={{
            width: 120, height: 120, top: '20%', right: '10%',
            border: '1px solid rgba(37,99,235,0.06)',
            transform: 'rotate(45deg)', borderRadius: 2,
          }}
        />
        <div
          className="absolute"
          style={{
            width: 60, height: 60, bottom: '20%', left: '18%',
            border: '1px solid rgba(96,165,250,0.07)',
            transform: 'rotate(45deg)',
          }}
        />
        <div
          className="absolute"
          style={{
            width: 300, height: 300, bottom: '-80px', right: '-60px',
            background: 'radial-gradient(circle, rgba(30,58,138,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-[400px] px-4">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <LogoIcon size={48} />
          <div className="text-center">
            <div
              className="text-[26px] font-bold leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#eef2ff', letterSpacing: '-0.5px' }}
            >
              AssetNE
            </div>
            <div
              className="mt-2 text-[10px]"
              style={{ letterSpacing: '0.16em', color: '#2b4a7a' }}
            >
              MAESTRADA · PRODUCTION CONTROL
            </div>
          </div>
        </div>

        {view === 'login' ? (
          <LoginForm onNavigate={navigate} onForgot={() => setView('forgot')} />
        ) : (
          <ForgotForm onBack={() => setView('login')} />
        )}

        {/* Secure badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          <LockIcon />
          <span className="text-[11px]" style={{ color: '#1e3a5c' }}>
            Ambiente seguro
          </span>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-[10px]" style={{ color: '#142238' }}>
          © 2025 MAESTRADA · Production Control
        </div>
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
  const [showPass, setShowPass] = useState(false)
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
    <div
      className="rounded-2xl p-8"
      style={{
        background: '#0a0f1d',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.05)',
      }}
    >
      <div className="mb-6">
        <h2 className="text-[17px] font-semibold" style={{ color: '#eef2ff' }}>
          Entrar na plataforma
        </h2>
        <p className="mt-1 text-[13px]" style={{ color: '#4a6380' }}>
          Acesse o controle de equipamentos de produção.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium" style={{ color: '#6b7f9a' }}>Usuário</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2b4266' }}>
              <UserIcon />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="seu.usuario"
              required
              autoFocus
              className="w-full rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none transition-all"
              style={{
                background: '#060c1a',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#eef2ff',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium" style={{ color: '#6b7f9a' }}>Senha</label>
            <button
              type="button"
              onClick={onForgot}
              className="text-[11px] transition-colors"
              style={{ color: '#2b4a7a' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#60a5fa')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#2b4a7a')}
            >
              Ajuda a senha
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2b4266' }}>
              <LockIcon />
            </span>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg pl-9 pr-9 py-2.5 text-[13px] outline-none transition-all"
              style={{
                background: '#060c1a',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#eef2ff',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#2b4266' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#60a5fa')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#2b4266')}
            >
              {showPass ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-lg py-2.5 text-[14px] font-semibold text-white transition-all disabled:opacity-50"
          style={{
            background: loading
              ? '#1d4ed8'
              : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(37,99,235,0.35)',
          }}
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
    <div
      className="rounded-2xl p-8"
      style={{
        background: '#0a0f1d',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}
    >
      {sent ? (
        <div className="py-2">
          <div className="mb-1 text-[17px] font-semibold" style={{ color: '#eef2ff' }}>
            Solicitação enviada
          </div>
          <p className="mb-5 text-[13px] leading-relaxed" style={{ color: '#4a6380' }}>
            Se o usuário existe, um código de recuperação foi gerado.{' '}
            <strong style={{ color: '#eef2ff' }}>Entre em contato com o administrador</strong> para
            obter o código e acesse{' '}
            <Link to="/reset-password" className="underline" style={{ color: '#60a5fa' }}>
              /redefinir-senha
            </Link>
            .
          </p>
          <button onClick={onBack} className="text-[13px]" style={{ color: '#4a6380' }}>
            ← Voltar para o login
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-[17px] font-semibold" style={{ color: '#eef2ff' }}>
              Esqueci a senha
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: '#4a6380' }}>
              Informe seu usuário para gerar um código de recuperação.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium" style={{ color: '#6b7f9a' }}>Usuário</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#2b4266' }}>
                  <UserIcon />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="seu.usuario"
                  required
                  autoFocus
                  className="w-full rounded-lg pl-9 pr-3 py-2.5 text-[13px] outline-none transition-all"
                  style={{
                    background: '#060c1a',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#eef2ff',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="mt-1 w-full rounded-lg py-2.5 text-[14px] font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 20px rgba(37,99,235,0.3)',
              }}
            >
              {loading ? 'Aguarde...' : 'Solicitar código'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="text-[12px]"
              style={{ color: '#4a6380' }}
            >
              ← Voltar para o login
            </button>
          </form>
        </>
      )}
    </div>
  )
}

/* ── Logo ── */
function LogoIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 2L30 16L16 30L2 16Z" fill="#1e3a8a" fillOpacity="0.25" stroke="#3b82f6" strokeWidth="0.6" strokeOpacity="0.4"/>
      <path d="M16 6L26 16L16 26L6 16Z" fill="#1e40af"/>
      <path d="M16 6L26 16L16 16Z" fill="#3b82f6"/>
      <path d="M6 16L16 6L16 16Z" fill="#2563eb"/>
      <path d="M26 16L16 26L16 16Z" fill="#1d4ed8"/>
      <path d="M16 16L16 26L6 16Z" fill="#1e3a8a"/>
      <circle cx="16" cy="16" r="2.2" fill="#93c5fd"/>
    </svg>
  )
}

/* ── Icons ── */
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
