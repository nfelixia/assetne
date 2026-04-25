import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import { checkout } from '~/db/schema/checkout.schema'
import { equipment } from '~/db/schema/equipment.schema'
import { generateId } from '~/utils/id-generator'

const checkoutSchema = z.object({
  equipmentIds: z.array(z.string()).min(1, 'Selecione ao menos um equipamento'),
  responsible: z.string().min(1, 'Responsável obrigatório'),
  responsibleRole: z.string().optional(),
  project: z.string().min(1, 'Projeto obrigatório'),
  expectedReturn: z.string().optional(),
})

export const createCheckout = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data }) => {
    const now = Date.now()
    for (const eqId of data.equipmentIds) {
      await db.insert(checkout).values({
        id: generateId('checkout'),
        equipmentId: eqId,
        responsible: data.responsible,
        responsibleRole: data.responsibleRole ?? null,
        project: data.project,
        expectedReturn: data.expectedReturn ?? null,
        checkedOutAt: now,
        checkedInAt: null,
        returnCondition: null,
        notes: null,
      })
      await db.update(equipment).set({ status: 'in-use' }).where(eq(equipment.id, eqId))
    }
  })

const checkinItemSchema = z.object({
  checkoutId: z.string(),
  equipmentId: z.string(),
  returnCondition: z.enum(['perfect', 'minor', 'major']),
})

export const createCheckin = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkinItemSchema.parse(d))
  .handler(async ({ data }) => {
    const now = Date.now()
    const newStatus = data.returnCondition === 'major' ? 'maintenance' : 'available'

    await db
      .update(checkout)
      .set({ checkedInAt: now, returnCondition: data.returnCondition })
      .where(eq(checkout.id, data.checkoutId))

    await db
      .update(equipment)
      .set({ status: newStatus })
      .where(eq(equipment.id, data.equipmentId))
  })
