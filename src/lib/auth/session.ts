import { SignJWT, jwtVerify } from 'jose'

const SESSION_COOKIE = 'assetne_session'
const EXPIRES_IN = 60 * 60 * 24 * 7 // 7 days

function getSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET!)
}

export type SessionUser = {
  id: string
  username: string
  name: string
  role: 'admin' | 'operator'
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as SessionUser
  } catch {
    return null
  }
}

export function getSessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${EXPIRES_IN}; SameSite=Lax`
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

export function getTokenFromCookieString(cookieString: string | null): string | null {
  if (!cookieString) return null
  const match = cookieString.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]+)`))
  return match ? match[1] : null
}
