import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import { collaborator } from '~/db/schema/collaborator.schema'
import { generateId } from '~/utils/id-generator'

export const getCollaborators = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(collaborator).orderBy(collaborator.name)
})

export const createCollaborator = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1), role: z.string().optional() }).parse(d)
  )
  .handler(async ({ data }) => {
    const row = {
      id: generateId('collab'),
      name: data.name,
      role: data.role ?? null,
      createdAt: Date.now(),
    }
    await db.insert(collaborator).values(row)
    return row
  })

export const deleteCollaborator = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.delete(collaborator).where(eq(collaborator.id, data.id))
  })
