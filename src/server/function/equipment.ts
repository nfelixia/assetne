import { createServerFn } from '@tanstack/react-start'
import { eq, isNull } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import { equipment } from '~/db/schema/equipment.schema'
import { checkout } from '~/db/schema/checkout.schema'
import { generateId } from '~/utils/id-generator'

export const getEquipmentWithCheckouts = createServerFn({ method: 'GET' }).handler(async () => {
  const equipmentList = await db.select().from(equipment).orderBy(equipment.name)

  const activeCheckouts = await db
    .select()
    .from(checkout)
    .where(isNull(checkout.checkedInAt))

  const checkoutMap = new Map(activeCheckouts.map((c) => [c.equipmentId, c]))

  return equipmentList.map((eq) => ({
    ...eq,
    activeCheckout: checkoutMap.get(eq.id) ?? null,
  }))
})

const createEquipmentSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.string().min(1, 'Categoria obrigatória'),
  value: z.string().min(1, 'Valor obrigatório'),
  serialNumber: z.string().optional(),
  condition: z.enum(['new', 'good', 'regular']),
})

export const createEquipment = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => createEquipmentSchema.parse(d))
  .handler(async ({ data }) => {
    const newEquip = {
      id: generateId('equip'),
      name: data.name,
      category: data.category,
      value: data.value,
      serialNumber: data.serialNumber ?? null,
      status: 'available' as const,
      condition: data.condition,
      createdAt: Date.now(),
    }
    await db.insert(equipment).values(newEquip)
    return newEquip
  })

export const setEquipmentMaintenance = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.update(equipment).set({ status: 'maintenance' }).where(eq(equipment.id, data.id))
  })
