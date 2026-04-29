import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import * as z from 'zod'
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from '~/db'
import { users } from '~/db/schema/user.schema'
import { createSessionToken, verifySessionToken, type SessionUser } from '~/lib/auth/session'
import { generateId } from '~/utils/id-generator'

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buf = (await scryptAsync(password, salt, 64)) as Buffer
  return `${buf.toString('hex')}.${salt}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hash, salt] = stored.split('.')
  const buf = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(buf, Buffer.from(hash, 'hex'))
}

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ username: z.string(), password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.username, data.username.toLowerCase()),
    })

    if (!user) throw new Error('Usuário ou senha inválidos')

    const valid = await verifyPassword(data.password, user.passwordHash)
    if (!valid) throw new Error('Usuário ou senha inválidos')

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'admin' | 'operator' | 'produtor',
    }

    const token = await createSessionToken(sessionUser)
    return { token, user: sessionUser }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  return { cleared: true }
})

export const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const cookies = getCookies()
  const token = cookies['assetne_session']
  if (!token) return null
  return verifySessionToken(token)
})

export const createUserFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({
      username: z.string().min(3),
      name: z.string().min(2),
      password: z.string().min(6),
      role: z.enum(['admin', 'operator', 'produtor']),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, data.username.toLowerCase()),
    })
    if (existing) throw new Error('Nome de usuário já existe')

    const passwordHash = await hashPassword(data.password)
    const [user] = await db
      .insert(users)
      .values({
        id: generateId('user'),
        username: data.username.toLowerCase(),
        name: data.name,
        passwordHash,
        role: data.role,
        createdAt: Date.now(),
      })
      .returning()

    return user
  })

export const deleteUserFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.delete(users).where(eq(users.id, data.id))
    return { ok: true }
  })

export const getUsersFn = createServerFn({ method: 'GET' }).handler(async () => {
  return db.query.users.findMany({
    columns: { passwordHash: false },
    orderBy: (u, { asc }) => asc(u.name),
  })
})

export const changeRoleFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string(), role: z.enum(['admin', 'operator', 'produtor']) }).parse(d),
  )
  .handler(async ({ data }) => {
    await db.update(users).set({ role: data.role }).where(eq(users.id, data.id))
    return { ok: true }
  })

export const changePasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ id: z.string(), newPassword: z.string().min(6) }).parse(d),
  )
  .handler(async ({ data }) => {
    const passwordHash = await hashPassword(data.newPassword)
    await db
      .update(users)
      .set({ passwordHash, resetToken: null, resetExpiresAt: null })
      .where(eq(users.id, data.id))
    return { ok: true }
  })

function generateResetToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('')
}

export const requestResetFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ username: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.username, data.username.toLowerCase()),
    })
    if (!user) return { ok: true }

    const token = generateResetToken()
    const expiresAt = Date.now() + 60 * 60 * 1000

    await db
      .update(users)
      .set({ resetToken: token, resetExpiresAt: expiresAt })
      .where(eq(users.id, user.id))

    return { ok: true }
  })

export const resetPasswordFn = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ token: z.string(), newPassword: z.string().min(6) }).parse(d),
  )
  .handler(async ({ data }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.resetToken, data.token),
    })

    if (!user || !user.resetExpiresAt || user.resetExpiresAt < Date.now()) {
      throw new Error('Código inválido ou expirado')
    }

    const passwordHash = await hashPassword(data.newPassword)
    await db
      .update(users)
      .set({ passwordHash, resetToken: null, resetExpiresAt: null })
      .where(eq(users.id, user.id))

    return { ok: true }
  })
