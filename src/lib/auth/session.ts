import { createHmac, timingSafeEqual } from 'node:crypto'

export const SESSION_COOKIE = 'assetne_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export type SessionUser = {
  id: string
  username: string
  name: string
  role: 'admin' | 'operator' | 'produtor' | 'gestor_patrimonio'
}

function b64(input: string): string {
  return Buffer.from(input).toString('base64url')
}

export function createSessionToken(user: SessionUser): string {
  const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64(
    JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE }),
  )
  const sig = createHmac('sha256', process.env.AUTH_SECRET!)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${sig}`
}

export function verifySessionToken(token: string): SessionUser | null {
  try {
    const [header, payload, sig] = token.split('.')
    if (!header || !payload || !sig) return null

    const expected = createHmac('sha256', process.env.AUTH_SECRET!)
      .update(`${header}.${payload}`)
      .digest('base64url')

    if (!timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(expected, 'base64url')))
      return null

    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (data.exp && Math.floor(Date.now() / 1000) > data.exp) return null

    return data as SessionUser
  } catch {
    return null
  }
}
