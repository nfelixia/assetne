import { createServerFn } from '@tanstack/react-start'
import { getWebRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import * as z from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '~/db'
import { users } from '~/db/schema/user.schema'
import {
  createSessionToken,
  verifySessionToken,
  getSessionCookieHeader,
  clearSessionCookieHeader,
  getTokenFromCookieString,
  type SessionUser,
} from '~/lib/auth/session'
import { generateId } from '~/utils/id-generator'

export const loginFn = createServerFn({ method: 'POST' })
  .validator(z.object({ username: z.string(), password: z.string() }))
  .handler(async ({ data }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.username, data.username.toLowerCase()),
    })

    if (!user) throw new Error('Usuário ou senha inválidos')

    const valid = await bcrypt.compare(data.password, user.passwordHash)
    if (!valid) throw new Error('Usuário ou senha inválidos')

    const sessionUser: SessionUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'admin' | 'operator',
    }

    const token = await createSessionToken(sessionUser)

    return { token, user: sessionUser }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  return { cleared: true }
})

export const getSessionFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getWebRequest()
  const cookie = request?.headers.get('cookie') ?? null
  const token = getTokenFromCookieString(cookie)
  if (!token) return null
  return verifySessionToken(token)
})

export const createUserFn = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      username: z.string().min(3),
      name: z.string().min(2),
      password: z.string().min(6),
      role: z.enum(['admin', 'operator']),
    }),
  )
  .handler(async ({ data }) => {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, data.username.toLowerCase()),
    })
    if (existing) throw new Error('Nome de usuário já existe')

    const passwordHash = await bcrypt.hash(data.password, 10)
    const [user] = await db
      .insert(users)
      .values({
        id: generateId(),
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
  .validator(z.object({ id: z.string() }))
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
