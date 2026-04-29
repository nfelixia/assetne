import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { eq, isNull, desc } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import {
  productionItems,
  productionMovements,
  productionWithdrawalRequests,
} from '~/db/schema/production.schema'
import { verifySessionToken } from '~/lib/auth/session'
import { generateId } from '~/utils/id-generator'

async function getCurrentSession() {
  const cookies = getCookies()
  const token = cookies['assetne_session']
  if (!token) return null
  return verifySessionToken(token)
}

function isProductionApprover(role: string) {
  return role === 'admin' || role === 'gestor_patrimonio'
}

// ─── Item CRUD ────────────────────────────────────────────────────────────────

const itemBaseSchema = z.object({
  name:          z.string().min(1, 'Nome obrigatório'),
  category:      z.string().min(1, 'Categoria obrigatória'),
  totalQty:      z.number().int().min(1).default(1),
  condition:     z.enum(['bom', 'regular', 'ruim']),
  location:      z.string().optional(),
  photoUrl:      z.string().nullable().optional(),
  notes:         z.string().optional(),
  codigoInterno: z.string().optional(),
  color:         z.string().optional(),
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
    return { ...item, usedQty, activeMovements: movements }
  })
})

export const getProductionMovements = createServerFn({ method: 'GET' }).handler(async () => {
  const movements = await db
    .select()
    .from(productionMovements)
    .orderBy(desc(productionMovements.checkedOutAt))
  return movements
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
      color:         data.color ?? null,
      createdAt:     now,
      updatedAt:     now,
    }
    await db.insert(productionItems).values(item)

    const session = await getCurrentSession()
    await db.insert(productionMovements).values({
      id:                  generateId('pmov'),
      itemId:              item.id,
      type:                'created',
      qty:                 item.totalQty,
      responsible:         session?.name ?? 'Sistema',
      responsibleUserId:   session?.id ?? null,
      project:             null,
      expectedReturn:      null,
      checkedOutAt:        now,
      checkedOutByUserId:  session?.id ?? null,
      checkedOutByName:    session?.name ?? null,
      checkedInAt:         now,
      checkedInByUserId:   null,
      checkedInByUserName: null,
      statusAfterReturn:   null,
      conditionOut:        null,
      notes:               null,
    })

    return item
  })

export const updateProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => itemBaseSchema.extend({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await getCurrentSession()
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
        color:         data.color ?? null,
        updatedAt:     Date.now(),
      })
      .where(eq(productionItems.id, data.id))

    await db.insert(productionMovements).values({
      id:                  generateId('pmov'),
      itemId:              data.id,
      type:                'updated',
      qty:                 0,
      responsible:         session?.name ?? 'Sistema',
      responsibleUserId:   session?.id ?? null,
      project:             null,
      expectedReturn:      null,
      checkedOutAt:        Date.now(),
      checkedOutByUserId:  session?.id ?? null,
      checkedOutByName:    session?.name ?? null,
      checkedInAt:         Date.now(),
      checkedInByUserId:   null,
      checkedInByUserName: null,
      statusAfterReturn:   null,
      conditionOut:        null,
      notes:               null,
    })
  })

export const deleteProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ id: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await db.delete(productionWithdrawalRequests).where(eq(productionWithdrawalRequests.itemId, data.id))
    await db.delete(productionMovements).where(eq(productionMovements.itemId, data.id))
    await db.delete(productionItems).where(eq(productionItems.id, data.id))
  })

// ─── Direct checkout (admin / gestor only) ────────────────────────────────────

const checkoutSchema = z.object({
  itemId:           z.string(),
  qty:              z.number().int().min(1),
  responsibleUserId: z.string().optional(),
  responsible:      z.string().min(1),
  project:          z.string().optional(),
  expectedReturn:   z.string().optional(),
  conditionOut:     z.string().optional(),
  notes:            z.string().optional(),
})

export const checkOutProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkoutSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getCurrentSession()
    if (!session || !isProductionApprover(session.role)) {
      throw new Error('Apenas administradores e gestores podem registrar saída direta.')
    }

    const [item] = await db.select().from(productionItems).where(eq(productionItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')
    if (item.availableQty < data.qty) throw new Error(`Apenas ${item.availableQty} unidade(s) disponível(is)`)

    const now      = Date.now()
    const movement = {
      id:                  generateId('pmov'),
      itemId:              data.itemId,
      type:                'checked_out',
      qty:                 data.qty,
      responsible:         data.responsible,
      responsibleUserId:   data.responsibleUserId ?? null,
      project:             data.project ?? null,
      expectedReturn:      data.expectedReturn ?? null,
      checkedOutAt:        now,
      checkedOutByUserId:  session.id,
      checkedOutByName:    session.name,
      checkedInAt:         null,
      checkedInByUserId:   null,
      checkedInByUserName: null,
      statusAfterReturn:   null,
      conditionOut:        data.conditionOut ?? null,
      notes:               data.notes ?? null,
    }

    await db.insert(productionMovements).values(movement)

    const newAvailable = item.availableQty - data.qty
    await db
      .update(productionItems)
      .set({
        availableQty: newAvailable,
        status:       newAvailable === 0 ? 'em_uso' : 'disponivel',
        updatedAt:    now,
      })
      .where(eq(productionItems.id, data.itemId))

    return movement
  })

// ─── Withdrawal requests ──────────────────────────────────────────────────────

const withdrawalRequestSchema = z.object({
  itemId:             z.string(),
  responsibleUserId:  z.string().optional(),
  responsibleName:    z.string().min(1, 'Responsável obrigatório'),
  quantity:           z.number().int().min(1),
  projectOrClient:    z.string().optional(),
  expectedReturn:     z.string().optional(),
  conditionOut:       z.string().min(1),
  notes:              z.string().optional(),
})

export const createProductionWithdrawalRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => withdrawalRequestSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getCurrentSession()
    if (!session) throw new Error('Sessão inválida')

    const [item] = await db.select().from(productionItems).where(eq(productionItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')
    if (item.availableQty < data.quantity) {
      throw new Error(`Apenas ${item.availableQty} unidade(s) disponível(is)`)
    }

    const now   = Date.now()
    const reqId = generateId('wreq')

    await db.insert(productionWithdrawalRequests).values({
      id:                   reqId,
      itemId:               data.itemId,
      requestedByUserId:    session.id,
      requestedByUserName:  session.name,
      responsibleUserId:    data.responsibleUserId ?? null,
      responsibleUserName:  data.responsibleName,
      quantity:             data.quantity,
      projectOrClient:      data.projectOrClient ?? null,
      expectedReturn:       data.expectedReturn ?? null,
      conditionOut:         data.conditionOut,
      notes:                data.notes ?? null,
      status:               'pending_approval',
      createdAt:            now,
      updatedAt:            now,
    })

    await db.insert(productionMovements).values({
      id:                  generateId('pmov'),
      itemId:              data.itemId,
      type:                'withdrawal_requested',
      qty:                 data.quantity,
      responsible:         data.responsibleName,
      responsibleUserId:   data.responsibleUserId ?? null,
      project:             data.projectOrClient ?? null,
      expectedReturn:      data.expectedReturn ?? null,
      checkedOutAt:        now,
      checkedOutByUserId:  session.id,
      checkedOutByName:    session.name,
      checkedInAt:         now,
      checkedInByUserId:   null,
      checkedInByUserName: null,
      statusAfterReturn:   null,
      conditionOut:        data.conditionOut,
      notes:               data.notes ?? null,
    })

    return { id: reqId }
  })

export const getProductionWithdrawalRequests = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getCurrentSession()
  if (!session) throw new Error('Sessão inválida')

  if (isProductionApprover(session.role)) {
    return db
      .select()
      .from(productionWithdrawalRequests)
      .orderBy(desc(productionWithdrawalRequests.createdAt))
  }

  return db
    .select()
    .from(productionWithdrawalRequests)
    .where(eq(productionWithdrawalRequests.requestedByUserId, session.id))
    .orderBy(desc(productionWithdrawalRequests.createdAt))
})

export const approveProductionWithdrawalRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ requestId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await getCurrentSession()
    if (!session || !isProductionApprover(session.role)) {
      throw new Error('Sem permissão para aprovar solicitações')
    }

    const [req] = await db
      .select()
      .from(productionWithdrawalRequests)
      .where(eq(productionWithdrawalRequests.id, data.requestId))
    if (!req) throw new Error('Solicitação não encontrada')
    if (req.status !== 'pending_approval') throw new Error('Solicitação não está pendente')

    const [item] = await db.select().from(productionItems).where(eq(productionItems.id, req.itemId))
    if (!item) throw new Error('Item não encontrado')
    if (item.availableQty < req.quantity) {
      throw new Error(`Estoque insuficiente: ${item.availableQty} disponível(is), solicitado: ${req.quantity}`)
    }

    const now = Date.now()

    await db
      .update(productionWithdrawalRequests)
      .set({
        status:             'approved',
        approvedByUserId:   session.id,
        approvedByUserName: session.name,
        approvedAt:         now,
        updatedAt:          now,
      })
      .where(eq(productionWithdrawalRequests.id, req.id))

    const newAvailable = item.availableQty - req.quantity
    await db
      .update(productionItems)
      .set({
        availableQty: newAvailable,
        status:       newAvailable === 0 ? 'em_uso' : 'disponivel',
        updatedAt:    now,
      })
      .where(eq(productionItems.id, req.itemId))

    await db.insert(productionMovements).values({
      id:                  generateId('pmov'),
      itemId:              req.itemId,
      type:                'checked_out',
      qty:                 req.quantity,
      responsible:         req.responsibleUserName,
      responsibleUserId:   req.responsibleUserId ?? null,
      project:             req.projectOrClient ?? null,
      expectedReturn:      req.expectedReturn ?? null,
      checkedOutAt:        now,
      checkedOutByUserId:  session.id,
      checkedOutByName:    session.name,
      checkedInAt:         null,
      checkedInByUserId:   null,
      checkedInByUserName: null,
      statusAfterReturn:   null,
      conditionOut:        req.conditionOut,
      notes:               req.notes ?? null,
    })
  })

export const rejectProductionWithdrawalRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ requestId: z.string(), rejectionReason: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getCurrentSession()
    if (!session || !isProductionApprover(session.role)) {
      throw new Error('Sem permissão para recusar solicitações')
    }

    const [req] = await db
      .select()
      .from(productionWithdrawalRequests)
      .where(eq(productionWithdrawalRequests.id, data.requestId))
    if (!req) throw new Error('Solicitação não encontrada')
    if (req.status !== 'pending_approval') throw new Error('Solicitação não está pendente')

    const now = Date.now()

    await db
      .update(productionWithdrawalRequests)
      .set({
        status:             'rejected',
        rejectedByUserId:   session.id,
        rejectedByUserName: session.name,
        rejectedAt:         now,
        rejectionReason:    data.rejectionReason ?? null,
        updatedAt:          now,
      })
      .where(eq(productionWithdrawalRequests.id, req.id))

    await db.insert(productionMovements).values({
      id:                  generateId('pmov'),
      itemId:              req.itemId,
      type:                'withdrawal_rejected',
      qty:                 req.quantity,
      responsible:         req.responsibleUserName,
      responsibleUserId:   req.responsibleUserId ?? null,
      project:             req.projectOrClient ?? null,
      expectedReturn:      null,
      checkedOutAt:        now,
      checkedOutByUserId:  session.id,
      checkedOutByName:    session.name,
      checkedInAt:         now,
      checkedInByUserId:   null,
      checkedInByUserName: null,
      statusAfterReturn:   null,
      conditionOut:        null,
      notes:               data.rejectionReason ?? null,
    })
  })

export const cancelProductionWithdrawalRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ requestId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await getCurrentSession()
    if (!session) throw new Error('Sessão inválida')

    const [req] = await db
      .select()
      .from(productionWithdrawalRequests)
      .where(eq(productionWithdrawalRequests.id, data.requestId))
    if (!req) throw new Error('Solicitação não encontrada')
    if (req.status !== 'pending_approval') throw new Error('Solicitação não está pendente')

    if (!isProductionApprover(session.role) && req.requestedByUserId !== session.id) {
      throw new Error('Sem permissão para cancelar esta solicitação')
    }

    const now = Date.now()

    await db
      .update(productionWithdrawalRequests)
      .set({ status: 'cancelled', updatedAt: now })
      .where(eq(productionWithdrawalRequests.id, req.id))

    await db.insert(productionMovements).values({
      id:                  generateId('pmov'),
      itemId:              req.itemId,
      type:                'withdrawal_cancelled',
      qty:                 req.quantity,
      responsible:         req.responsibleUserName,
      responsibleUserId:   req.responsibleUserId ?? null,
      project:             null,
      expectedReturn:      null,
      checkedOutAt:        now,
      checkedOutByUserId:  session.id,
      checkedOutByName:    session.name,
      checkedInAt:         now,
      checkedInByUserId:   null,
      checkedInByUserName: null,
      statusAfterReturn:   null,
      conditionOut:        null,
      notes:               null,
    })
  })

// ─── Check-in ─────────────────────────────────────────────────────────────────

const checkinSchema = z.object({
  movementId:        z.string(),
  statusAfterReturn: z.enum(['bom', 'regular', 'ruim']),
  notes:             z.string().optional(),
})

export const checkInProductionItem = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => checkinSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getCurrentSession()
    if (!session) throw new Error('Sessão inválida')

    const [movement] = await db
      .select()
      .from(productionMovements)
      .where(eq(productionMovements.id, data.movementId))
    if (!movement) throw new Error('Movimento não encontrado')
    if (movement.checkedInAt) throw new Error('Item já devolvido')

    if (!isProductionApprover(session.role) && movement.checkedOutByUserId !== session.id) {
      throw new Error('Apenas o responsável pela retirada ou um administrador pode realizar a devolução.')
    }

    const now = Date.now()
    await db
      .update(productionMovements)
      .set({
        checkedInAt:         now,
        checkedInByUserId:   session.id,
        checkedInByUserName: session.name,
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

// ─── Photo upload ─────────────────────────────────────────────────────────────

export const uploadProductionPhoto = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ base64: z.string(), mimeType: z.string(), fileName: z.string() }).parse(d),
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
