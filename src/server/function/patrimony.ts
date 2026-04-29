import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { eq, desc, isNull } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import { patrimonyItems, patrimonyMovements } from '~/db/schema/patrimony.schema'
import { verifySessionToken } from '~/lib/auth/session'
import { generateId } from '~/utils/id-generator'

async function getSession() {
  const cookies = getCookies()
  const token = cookies['assetne_session']
  if (!token) return null
  return verifySessionToken(token)
}

const itemSchema = z.object({
  name:            z.string().min(1, 'Nome obrigatório'),
  category:        z.string().min(1, 'Categoria obrigatória'),
  patrimonyCode:   z.string().min(1, 'Código patrimonial obrigatório'),
  brand:           z.string().optional(),
  model:           z.string().optional(),
  serialNumber:    z.string().optional(),
  quantity:        z.number().int().min(1).default(1),
  location:        z.string().optional(),
  condition:       z.string().min(1, 'Condição obrigatória'),
  status:          z.string().min(1, 'Status obrigatório'),
  estimatedValue:  z.number().min(0).nullable().optional(),
  acquisitionDate: z.string().optional(),
  supplier:        z.string().optional(),
  mainImageUrl:    z.string().nullable().optional(),
  notes:           z.string().optional(),
})

export const getPatrimonyItems = createServerFn({ method: 'GET' }).handler(async () => {
  return db.select().from(patrimonyItems).orderBy(patrimonyItems.name)
})

export const getPatrimonyItemMovements = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ itemId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    return db
      .select()
      .from(patrimonyMovements)
      .where(eq(patrimonyMovements.itemId, data.itemId))
      .orderBy(desc(patrimonyMovements.createdAt))
  })

export const createPatrimonyItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => itemSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getSession()

    const existing = await db
      .select({ id: patrimonyItems.id })
      .from(patrimonyItems)
      .where(eq(patrimonyItems.patrimonyCode, data.patrimonyCode))
    if (existing.length > 0) throw new Error('Código patrimonial já cadastrado')

    const now  = Date.now()
    const item = {
      id:                     generateId('pat'),
      name:                   data.name,
      category:               data.category,
      patrimonyCode:          data.patrimonyCode,
      brand:                  data.brand ?? null,
      model:                  data.model ?? null,
      serialNumber:           data.serialNumber ?? null,
      quantity:               data.quantity,
      currentResponsibleId:   null,
      currentResponsibleName: null,
      status:                 data.status,
      location:               data.location ?? null,
      condition:              data.condition,
      estimatedValue:         data.estimatedValue ?? null,
      acquisitionDate:        data.acquisitionDate ?? null,
      supplier:               data.supplier ?? null,
      mainImageUrl:           data.mainImageUrl ?? null,
      notes:                  data.notes ?? null,
      createdAt:              now,
      updatedAt:              now,
      createdByUserId:        session?.id ?? null,
      createdByUserName:      session?.name ?? null,
    }

    await db.insert(patrimonyItems).values(item)
    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              item.id,
      type:                'created',
      previousStatus:      null,
      newStatus:           item.status,
      performedByUserId:   session?.id ?? null,
      performedByUserName: session?.name ?? null,
      notes:               null,
      createdAt:           now,
    })

    return item
  })

export const updatePatrimonyItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => itemSchema.extend({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await getSession()

    const [current] = await db.select().from(patrimonyItems).where(eq(patrimonyItems.id, data.id))
    if (!current) throw new Error('Item não encontrado')

    const dupCheck = await db
      .select({ id: patrimonyItems.id })
      .from(patrimonyItems)
      .where(eq(patrimonyItems.patrimonyCode, data.patrimonyCode))
    if (dupCheck.length > 0 && dupCheck[0].id !== data.id) {
      throw new Error('Código patrimonial já utilizado por outro item')
    }

    const now = Date.now()
    await db
      .update(patrimonyItems)
      .set({
        name:            data.name,
        category:        data.category,
        patrimonyCode:   data.patrimonyCode,
        brand:           data.brand ?? null,
        model:           data.model ?? null,
        serialNumber:    data.serialNumber ?? null,
        quantity:        data.quantity,
        location:        data.location ?? null,
        condition:       data.condition,
        estimatedValue:  data.estimatedValue ?? null,
        acquisitionDate: data.acquisitionDate ?? null,
        supplier:        data.supplier ?? null,
        mainImageUrl:    data.mainImageUrl ?? null,
        notes:           data.notes ?? null,
        updatedAt:       now,
      })
      .where(eq(patrimonyItems.id, data.id))

    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              data.id,
      type:                'updated',
      previousStatus:      current.status,
      newStatus:           current.status,
      performedByUserId:   session?.id ?? null,
      performedByUserName: session?.name ?? null,
      notes:               null,
      createdAt:           now,
    })
  })

export const deletePatrimonyItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.delete(patrimonyMovements).where(eq(patrimonyMovements.itemId, data.id))
    await db.delete(patrimonyItems).where(eq(patrimonyItems.id, data.id))
  })

const checkoutSchema = z.object({
  itemId:             z.string(),
  responsibleUserId:  z.string().optional(),
  responsibleName:    z.string().min(1, 'Responsável obrigatório'),
  useType:            z.string().min(1),
  projectOrClient:    z.string().optional(),
  expectedReturnDate: z.string().optional(),
  conditionOut:       z.string().min(1),
  notes:              z.string().optional(),
})

export const checkOutPatrimonyItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getSession()

    const [item] = await db.select().from(patrimonyItems).where(eq(patrimonyItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')
    if (item.status !== 'disponivel') throw new Error(`Item não está disponível (status: ${item.status})`)

    const newStatus = data.useType === 'emprestimo' ? 'emprestado' : 'em_uso'
    const now = Date.now()

    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              data.itemId,
      type:                'checked_out',
      previousStatus:      item.status,
      newStatus,
      responsibleUserId:   data.responsibleUserId ?? null,
      responsibleUserName: data.responsibleName,
      performedByUserId:   session?.id ?? null,
      performedByUserName: session?.name ?? null,
      projectOrClient:     data.projectOrClient ?? null,
      useType:             data.useType,
      expectedReturnDate:  data.expectedReturnDate ?? null,
      conditionOut:        data.conditionOut,
      notes:               data.notes ?? null,
      createdAt:           now,
    })

    await db
      .update(patrimonyItems)
      .set({
        status:                 newStatus,
        currentResponsibleId:   data.responsibleUserId ?? null,
        currentResponsibleName: data.responsibleName,
        updatedAt:              now,
      })
      .where(eq(patrimonyItems.id, data.itemId))
  })

const checkinSchema = z.object({
  itemId:      z.string(),
  conditionIn: z.string().min(1),
  newStatus:   z.string().default('disponivel'),
  notes:       z.string().optional(),
})

export const checkInPatrimonyItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkinSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) throw new Error('Sessão inválida')

    const [item] = await db.select().from(patrimonyItems).where(eq(patrimonyItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')

    const activeMovement = await db
      .select()
      .from(patrimonyMovements)
      .where(eq(patrimonyMovements.itemId, data.itemId))
      .orderBy(desc(patrimonyMovements.createdAt))
      .limit(10)
      .then((rows) => rows.find((r) => r.type === 'checked_out' && !r.returnDate))

    if (session.role !== 'admin' && activeMovement?.performedByUserId !== session.id) {
      throw new Error(
        'Este item foi retirado por outro usuário. Apenas o responsável pela retirada ou um administrador pode realizar a devolução.',
      )
    }

    const now = Date.now()
    const todayStr = new Date().toISOString().slice(0, 10)

    if (activeMovement) {
      await db
        .update(patrimonyMovements)
        .set({ returnDate: todayStr, conditionIn: data.conditionIn })
        .where(eq(patrimonyMovements.id, activeMovement.id))
    }

    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              data.itemId,
      type:                'returned',
      previousStatus:      item.status,
      newStatus:           data.newStatus,
      performedByUserId:   session.id,
      performedByUserName: session.name,
      conditionIn:         data.conditionIn,
      notes:               data.notes ?? null,
      createdAt:           now,
    })

    await db
      .update(patrimonyItems)
      .set({
        status:                 data.newStatus,
        currentResponsibleId:   null,
        currentResponsibleName: null,
        condition:              data.conditionIn,
        updatedAt:              now,
      })
      .where(eq(patrimonyItems.id, data.itemId))
  })

export const sendPatrimonyToMaintenance = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ itemId: z.string(), notes: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getSession()

    const [item] = await db.select().from(patrimonyItems).where(eq(patrimonyItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')

    const now = Date.now()
    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              data.itemId,
      type:                'sent_to_maintenance',
      previousStatus:      item.status,
      newStatus:           'manutencao',
      performedByUserId:   session?.id ?? null,
      performedByUserName: session?.name ?? null,
      notes:               data.notes ?? null,
      createdAt:           now,
    })

    await db
      .update(patrimonyItems)
      .set({ status: 'manutencao', currentResponsibleId: null, currentResponsibleName: null, updatedAt: now })
      .where(eq(patrimonyItems.id, data.itemId))
  })

export const returnPatrimonyFromMaintenance = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ itemId: z.string(), condition: z.string(), notes: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getSession()

    const [item] = await db.select().from(patrimonyItems).where(eq(patrimonyItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')

    const now = Date.now()
    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              data.itemId,
      type:                'maintenance_returned',
      previousStatus:      'manutencao',
      newStatus:           'disponivel',
      performedByUserId:   session?.id ?? null,
      performedByUserName: session?.name ?? null,
      conditionIn:         data.condition,
      notes:               data.notes ?? null,
      createdAt:           now,
    })

    await db
      .update(patrimonyItems)
      .set({ status: 'disponivel', condition: data.condition, updatedAt: now })
      .where(eq(patrimonyItems.id, data.itemId))
  })

export const changePatrimonyStatus = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ itemId: z.string(), newStatus: z.string(), notes: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getSession()

    const [item] = await db.select().from(patrimonyItems).where(eq(patrimonyItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')

    const now = Date.now()
    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              data.itemId,
      type:                'status_changed',
      previousStatus:      item.status,
      newStatus:           data.newStatus,
      performedByUserId:   session?.id ?? null,
      performedByUserName: session?.name ?? null,
      notes:               data.notes ?? null,
      createdAt:           now,
    })

    const clearResponsible = ['disponivel', 'extraviado', 'baixado'].includes(data.newStatus)
    await db
      .update(patrimonyItems)
      .set({
        status:                 data.newStatus,
        currentResponsibleId:   clearResponsible ? null : item.currentResponsibleId,
        currentResponsibleName: clearResponsible ? null : item.currentResponsibleName,
        updatedAt:              now,
      })
      .where(eq(patrimonyItems.id, data.itemId))
  })

export const uploadPatrimonyPhoto = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ base64: z.string(), mimeType: z.string(), fileName: z.string() }).parse(d),
  )
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Storage não configurado')

    const base64Data = data.base64.includes(',') ? data.base64.split(',')[1] : data.base64
    const buffer     = Buffer.from(base64Data, 'base64')
    const path       = `photos/${data.fileName}`

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/patrimony-photos/${path}`, {
      method:  'PUT',
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

    return { url: `${SUPABASE_URL}/storage/v1/object/public/patrimony-photos/${path}` }
  })
