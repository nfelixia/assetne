import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { eq, desc } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import {
  patrimonyItems,
  patrimonyMovements,
  patrimonyWithdrawalRequests,
} from '~/db/schema/patrimony.schema'
import { verifySessionToken } from '~/lib/auth/session'
import { generateId } from '~/utils/id-generator'

async function getSession() {
  const cookies = getCookies()
  const token = cookies['assetne_session']
  if (!token) return null
  return verifySessionToken(token)
}

function isApprover(role: string) {
  return role === 'admin' || role === 'gestor_patrimonio'
}

// ─── Item CRUD ────────────────────────────────────────────────────────────────

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
    await db.delete(patrimonyWithdrawalRequests).where(eq(patrimonyWithdrawalRequests.itemId, data.id))
    await db.delete(patrimonyMovements).where(eq(patrimonyMovements.itemId, data.id))
    await db.delete(patrimonyItems).where(eq(patrimonyItems.id, data.id))
  })

// ─── Direct checkout (admin / gestor_patrimonio only) ─────────────────────────

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
    if (!session || !isApprover(session.role)) {
      throw new Error('Apenas administradores e gestores de patrimônio podem registrar saída direta.')
    }

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
      performedByUserId:   session.id,
      performedByUserName: session.name,
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

// ─── Withdrawal requests ──────────────────────────────────────────────────────

const withdrawalRequestSchema = z.object({
  itemId:             z.string(),
  responsibleUserId:  z.string().optional(),
  responsibleName:    z.string().min(1, 'Responsável obrigatório'),
  useType:            z.string().min(1),
  projectOrClient:    z.string().optional(),
  expectedReturnDate: z.string().optional(),
  conditionOut:       z.string().min(1),
  notes:              z.string().optional(),
})

export const createWithdrawalRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => withdrawalRequestSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) throw new Error('Sessão inválida')

    const [item] = await db.select().from(patrimonyItems).where(eq(patrimonyItems.id, data.itemId))
    if (!item) throw new Error('Item não encontrado')
    if (item.status !== 'disponivel') throw new Error('Item não está disponível para retirada')

    const now = Date.now()
    const reqId = generateId('wreq')

    await db.insert(patrimonyWithdrawalRequests).values({
      id:                   reqId,
      itemId:               data.itemId,
      requestedByUserId:    session.id,
      requestedByUserName:  session.name,
      responsibleUserId:    data.responsibleUserId ?? null,
      responsibleUserName:  data.responsibleName,
      useType:              data.useType,
      projectOrClient:      data.projectOrClient ?? null,
      expectedReturnDate:   data.expectedReturnDate ?? null,
      conditionOut:         data.conditionOut,
      notes:                data.notes ?? null,
      status:               'pending_approval',
      createdAt:            now,
      updatedAt:            now,
    })

    await db
      .update(patrimonyItems)
      .set({ status: 'pendente_aprovacao', updatedAt: now })
      .where(eq(patrimonyItems.id, data.itemId))

    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              data.itemId,
      type:                'withdrawal_requested',
      previousStatus:      'disponivel',
      newStatus:           'pendente_aprovacao',
      responsibleUserId:   data.responsibleUserId ?? null,
      responsibleUserName: data.responsibleName,
      performedByUserId:   session.id,
      performedByUserName: session.name,
      useType:             data.useType,
      projectOrClient:     data.projectOrClient ?? null,
      expectedReturnDate:  data.expectedReturnDate ?? null,
      conditionOut:        data.conditionOut,
      notes:               data.notes ?? null,
      createdAt:           now,
    })

    return { id: reqId }
  })

export const getWithdrawalRequests = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession()
  if (!session) throw new Error('Sessão inválida')

  if (isApprover(session.role)) {
    return db
      .select()
      .from(patrimonyWithdrawalRequests)
      .orderBy(desc(patrimonyWithdrawalRequests.createdAt))
  }

  return db
    .select()
    .from(patrimonyWithdrawalRequests)
    .where(eq(patrimonyWithdrawalRequests.requestedByUserId, session.id))
    .orderBy(desc(patrimonyWithdrawalRequests.createdAt))
})

export const approveWithdrawalRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ requestId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session || !isApprover(session.role)) {
      throw new Error('Sem permissão para aprovar solicitações')
    }

    const [req] = await db
      .select()
      .from(patrimonyWithdrawalRequests)
      .where(eq(patrimonyWithdrawalRequests.id, data.requestId))
    if (!req) throw new Error('Solicitação não encontrada')
    if (req.status !== 'pending_approval') throw new Error('Solicitação não está pendente')

    const newStatus = req.useType === 'emprestimo' ? 'emprestado' : 'em_uso'
    const now = Date.now()

    await db
      .update(patrimonyWithdrawalRequests)
      .set({
        status:             'approved',
        approvedByUserId:   session.id,
        approvedByUserName: session.name,
        approvedAt:         now,
        updatedAt:          now,
      })
      .where(eq(patrimonyWithdrawalRequests.id, req.id))

    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              req.itemId,
      type:                'checked_out',
      previousStatus:      'pendente_aprovacao',
      newStatus,
      responsibleUserId:   req.responsibleUserId ?? null,
      responsibleUserName: req.responsibleUserName,
      performedByUserId:   session.id,
      performedByUserName: session.name,
      projectOrClient:     req.projectOrClient ?? null,
      useType:             req.useType,
      expectedReturnDate:  req.expectedReturnDate ?? null,
      conditionOut:        req.conditionOut,
      notes:               req.notes ?? null,
      createdAt:           now,
    })

    await db
      .update(patrimonyItems)
      .set({
        status:                 newStatus,
        currentResponsibleId:   req.responsibleUserId ?? null,
        currentResponsibleName: req.responsibleUserName,
        updatedAt:              now,
      })
      .where(eq(patrimonyItems.id, req.itemId))
  })

export const rejectWithdrawalRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) =>
    z.object({ requestId: z.string(), rejectionReason: z.string().optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session || !isApprover(session.role)) {
      throw new Error('Sem permissão para recusar solicitações')
    }

    const [req] = await db
      .select()
      .from(patrimonyWithdrawalRequests)
      .where(eq(patrimonyWithdrawalRequests.id, data.requestId))
    if (!req) throw new Error('Solicitação não encontrada')
    if (req.status !== 'pending_approval') throw new Error('Solicitação não está pendente')

    const now = Date.now()

    await db
      .update(patrimonyWithdrawalRequests)
      .set({
        status:             'rejected',
        rejectedByUserId:   session.id,
        rejectedByUserName: session.name,
        rejectedAt:         now,
        rejectionReason:    data.rejectionReason ?? null,
        updatedAt:          now,
      })
      .where(eq(patrimonyWithdrawalRequests.id, req.id))

    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              req.itemId,
      type:                'withdrawal_rejected',
      previousStatus:      'pendente_aprovacao',
      newStatus:           'disponivel',
      performedByUserId:   session.id,
      performedByUserName: session.name,
      notes:               data.rejectionReason ?? null,
      createdAt:           now,
    })

    await db
      .update(patrimonyItems)
      .set({ status: 'disponivel', updatedAt: now })
      .where(eq(patrimonyItems.id, req.itemId))
  })

export const cancelWithdrawalRequest = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ requestId: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await getSession()
    if (!session) throw new Error('Sessão inválida')

    const [req] = await db
      .select()
      .from(patrimonyWithdrawalRequests)
      .where(eq(patrimonyWithdrawalRequests.id, data.requestId))
    if (!req) throw new Error('Solicitação não encontrada')
    if (req.status !== 'pending_approval') throw new Error('Solicitação não está pendente')

    if (!isApprover(session.role) && req.requestedByUserId !== session.id) {
      throw new Error('Sem permissão para cancelar esta solicitação')
    }

    const now = Date.now()

    await db
      .update(patrimonyWithdrawalRequests)
      .set({ status: 'cancelled', updatedAt: now })
      .where(eq(patrimonyWithdrawalRequests.id, req.id))

    await db.insert(patrimonyMovements).values({
      id:                  generateId('pmvt'),
      itemId:              req.itemId,
      type:                'withdrawal_cancelled',
      previousStatus:      'pendente_aprovacao',
      newStatus:           'disponivel',
      performedByUserId:   session.id,
      performedByUserName: session.name,
      createdAt:           now,
    })

    await db
      .update(patrimonyItems)
      .set({ status: 'disponivel', updatedAt: now })
      .where(eq(patrimonyItems.id, req.itemId))
  })

// ─── Check-in ─────────────────────────────────────────────────────────────────

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

    if (!isApprover(session.role) && item.currentResponsibleId !== session.id) {
      throw new Error(
        'Este item está associado a outro usuário. Apenas o responsável, gestor de patrimônio ou administrador pode realizar a devolução.',
      )
    }

    const activeMovement = await db
      .select()
      .from(patrimonyMovements)
      .where(eq(patrimonyMovements.itemId, data.itemId))
      .orderBy(desc(patrimonyMovements.createdAt))
      .limit(10)
      .then((rows) => rows.find((r) => r.type === 'checked_out' && !r.returnDate))

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

// ─── Maintenance ──────────────────────────────────────────────────────────────

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

// ─── Photo upload ─────────────────────────────────────────────────────────────

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
