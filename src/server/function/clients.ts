import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import { client } from '~/db/schema/client.schema'
import { generateId } from '~/utils/id-generator'

export const getClients = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(client).orderBy(client.name)
})

export const createClient = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const row = { id: generateId('client'), name: data.name, createdAt: Date.now() }
    await db.insert(client).values(row)
    return row
  })

export const deleteClient = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.delete(client).where(eq(client.id, data.id))
  })
