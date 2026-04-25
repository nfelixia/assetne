import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'assetne_session'
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

export const SESSION_MAX_AGE = EXPIRES_IN
