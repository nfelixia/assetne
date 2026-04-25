import { createServerFn } from '@tanstack/react-start'
import { eq, isNull } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import { equipment } from '~/db/schema/equipment.schema'
import { checkout } from '~/db/schema/checkout.schema'
import { generateId } from '~/utils/id-generator'

const equipmentBaseSchema = z.object({
  name:         z.string().min(1, 'Nome obrigatório'),
  category:     z.string().min(1, 'Categoria obrigatória'),
  value:        z.string().min(1, 'Valor obrigatório'),
  serialNumber: z.string().optional(),
  condition:    z.enum(['new', 'good', 'regular']),
  photoUrl:     z.string().nullable().optional(),
})

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

export const createEquipment = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => equipmentBaseSchema.parse(d))
  .handler(async ({ data }) => {
    const newEquip = {
      id:           generateId('equip'),
      name:         data.name,
      category:     data.category,
      value:        data.value,
      serialNumber: data.serialNumber ?? null,
      status:       'available' as const,
      condition:    data.condition,
      photoUrl:     data.photoUrl ?? null,
      createdAt:    Date.now(),
    }
    await db.insert(equipment).values(newEquip)
    return newEquip
  })

export const setEquipmentMaintenance = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.update(equipment).set({ status: 'maintenance' }).where(eq(equipment.id, data.id))
  })

export const setEquipmentAvailable = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.update(equipment).set({ status: 'available' }).where(eq(equipment.id, data.id))
  })

export const updateEquipment = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => equipmentBaseSchema.extend({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db
      .update(equipment)
      .set({
        name:         data.name,
        category:     data.category,
        value:        data.value,
        serialNumber: data.serialNumber ?? null,
        condition:    data.condition,
        photoUrl:     data.photoUrl ?? null,
      })
      .where(eq(equipment.id, data.id))
  })

export const uploadEquipmentPhoto = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({
      base64:   z.string(),
      mimeType: z.string(),
      fileName: z.string(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL  = process.env.SUPABASE_URL
    const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configurados')
    }

    const base64Data = data.base64.includes(',') ? data.base64.split(',')[1] : data.base64
    const buffer     = Buffer.from(base64Data, 'base64')
    const path       = `photos/${data.fileName}`

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/equipment-photos/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': data.mimeType,
        'x-upsert':     'true',
      },
      body: buffer,
    })

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText)
      throw new Error(`Upload falhou: ${msg}`)
    }

    return { url: `${SUPABASE_URL}/storage/v1/object/public/equipment-photos/${path}` }
  })

export const deleteEquipment = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.delete(equipment).where(eq(equipment.id, data.id))
  })
