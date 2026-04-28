import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { eq, isNull } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import { productionItems, productionMovements } from '~/db/schema/production.schema'
import { verifySessionToken } from '~/lib/auth/session'
import { generateId } from '~/utils/id-generator'

async function getCurrentSession() {
  const cookies = getCookies()
  const token = cookies['assetne_session']
  if (!token) return null
  return verifySessionToken(token)
}

const itemBaseSchema = z.object({
  name:          z.string().min(1, 'Nome obrigatório'),
  category:      z.string().min(1, 'Categoria obrigatória'),
  totalQty:      z.number().int().min(1).default(1),
  condition:     z.enum(['bom', 'regular', 'ruim']),
  location:      z.string().optional(),
  photoUrl:      z.string().nullable().optional(),
  notes:         z.string().optional(),
  codigoInterno: z.string().optional(),
})

export const getProductionItems = createServerFn({ method: 'GET' }).handler(async () => {
  const items = await db.select().from(productionItems).orderBy(productionItems.name)

  const activeMovements = await db
    .select()
    .from(productionMovements)
    .where(isNull(productionMovements.checkedInAt))

  const activeByItem = new Map<string, typeof activeMovements>()
  for (const m of activeMovements) {
    const arr = activeByItem.get(m.itemId) ?? []
    arr.push(m)
    activeByItem.set(m.itemId, arr)
  }

  return items.map((item) => {
    const movements = activeByItem.get(item.id) ?? []
    const usedQty   = movements.reduce((s, m) => s + m.qty, 0)
    return {
      ...item,
      usedQty,
      activeMovements: movements,
    }
  })
})

export const getProductionMovements = createServerFn({ method: 'GET' }).handler(async () => {
  const movements = await db
    .select()
    .from(productionMovements)
    .orderBy(productionMovements.checkedOutAt)

  return movements.reverse()
})

export const createProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => itemBaseSchema.parse(d))
  .handler(async ({ data }) => {
    const now  = Date.now()
    const item = {
      id:            generateId('prod'),
      name:          data.name,
      category:      data.category,
      totalQty:      data.totalQty,
      availableQty:  data.totalQty,
      status:        'disponivel' as const,
      condition:     data.condition,
      location:      data.location ?? null,
      photoUrl:      data.photoUrl ?? null,
      notes:         data.notes ?? null,
      codigoInterno: data.codigoInterno ?? null,
      createdAt:     now,
      updatedAt:     now,
    }
    await db.insert(productionItems).values(item)
    return item
  })

export const updateProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => itemBaseSchema.extend({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db
      .update(productionItems)
      .set({
        name:          data.name,
        category:      data.category,
        totalQty:      data.totalQty,
        condition:     data.condition,
        location:      data.location ?? null,
        photoUrl:      data.photoUrl ?? null,
        notes:         data.notes ?? null,
        codigoInterno: data.codigoInterno ?? null,
        updatedAt:     Date.now(),
      })
      .where(eq(productionItems.id, data.id))
  })

export const deleteProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.delete(productionMovements).where(eq(productionMovements.itemId, data.id))
    await db.delete(productionItems).where(eq(productionItems.id, data.id))
  })

const checkoutSchema = z.object({
  itemId:         z.string(),
  qty:            z.number().int().min(1),
  responsible:    z.string().min(1),
  project:        z.string().optional(),
  expectedReturn: z.string().optional(),
  notes:          z.string().optional(),
})

export const checkOutProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getCurrentSession()

    const [item] = await db.select().from(productionItems).where(eq(productionItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')
    if (item.availableQty < data.qty) throw new Error(`Apenas ${item.availableQty} unidade(s) disponível(is)`)

    const movement = {
      id:                  generateId('pmov'),
      itemId:              data.itemId,
      qty:                 data.qty,
      responsible:         data.responsible,
      project:             data.project ?? null,
      expectedReturn:      data.expectedReturn ?? null,
      checkedOutAt:        Date.now(),
      checkedOutByUserId:  session?.id ?? null,
      checkedInAt:         null,
      checkedInByUserId:   null,
      checkedInByUserName: null,
      statusAfterReturn:   null,
      notes:               data.notes ?? null,
    }

    await db.insert(productionMovements).values(movement)

    const newAvailable = item.availableQty - data.qty
    await db
      .update(productionItems)
      .set({
        availableQty: newAvailable,
        status:       newAvailable === 0 ? 'em_uso' : 'disponivel',
        updatedAt:    Date.now(),
      })
      .where(eq(productionItems.id, data.itemId))

    return movement
  })

const checkinSchema = z.object({
  movementId:        z.string(),
  statusAfterReturn: z.enum(['bom', 'regular', 'ruim']),
  notes:             z.string().optional(),
})

export const checkInProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkinSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getCurrentSession()

    const [movement] = await db
      .select()
      .from(productionMovements)
      .where(eq(productionMovements.id, data.movementId))
    if (!movement) throw new Error('Movimento não encontrado')
    if (movement.checkedInAt) throw new Error('Item já devolvido')

    const now = Date.now()
    await db
      .update(productionMovements)
      .set({
        checkedInAt:         now,
        checkedInByUserId:   session?.id ?? null,
        checkedInByUserName: session?.name ?? null,
        statusAfterReturn:   data.statusAfterReturn,
        notes:               data.notes ?? null,
      })
      .where(eq(productionMovements.id, data.movementId))

    const [item] = await db.select().from(productionItems).where(eq(productionItems.id, movement.itemId))
    if (item) {
      const newAvailable = Math.min(item.totalQty, item.availableQty + movement.qty)
      await db
        .update(productionItems)
        .set({
          availableQty: newAvailable,
          condition:    data.statusAfterReturn,
          status:       newAvailable > 0 ? 'disponivel' : 'em_uso',
          updatedAt:    now,
        })
        .where(eq(productionItems.id, movement.itemId))
    }
  })

export const uploadProductionPhoto = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({
      base64:   z.string(),
      mimeType: z.string(),
      fileName: z.string(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configurados')
    }

    const base64Data = data.base64.includes(',') ? data.base64.split(',')[1] : data.base64
    const buffer     = Buffer.from(base64Data, 'base64')
    const path       = `photos/${data.fileName}`

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/production-photos/${path}`, {
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

    return { url: `${SUPABASE_URL}/storage/v1/object/public/production-photos/${path}` }
  })
