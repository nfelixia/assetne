import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { desc, eq, isNull } from 'drizzle-orm'
import * as z from 'zod'
import { db } from '~/db'
import { checkout } from '~/db/schema/checkout.schema'
import { equipment } from '~/db/schema/equipment.schema'
import { verifySessionToken } from '~/lib/auth/session'
import { generateId } from '~/utils/id-generator'

async function getCurrentSession() {
  const cookies = getCookies()
  const token = cookies['assetne_session']
  if (!token) return null
  return verifySessionToken(token)
}

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
    const session = await getCurrentSession()
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
        checkedOutByUserId: session?.id ?? null,
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
    const session = await getCurrentSession()
    if (!session) throw new Error('Não autenticado')

    const [record] = await db.select().from(checkout).where(eq(checkout.id, data.checkoutId))
    if (!record) throw new Error('Registro de checkout não encontrado')

    if (session.role !== 'admin') {
      const owned = record.checkedOutByUserId
        ? record.checkedOutByUserId === session.id
        : record.responsible === session.name
      if (!owned) {
        throw new Error(
          'Este item está vinculado a outro responsável. Apenas um administrador pode concluir essa devolução.',
        )
      }
    }

    const now = Date.now()
    const newStatus = data.returnCondition === 'major' ? 'maintenance' : 'available'

    await db
      .update(checkout)
      .set({
        checkedInAt: now,
        returnCondition: data.returnCondition,
        checkedInByUserId: session.id,
        checkedInByUserName: session.name,
      })
      .where(eq(checkout.id, data.checkoutId))

    await db
      .update(equipment)
      .set({ status: newStatus })
      .where(eq(equipment.id, data.equipmentId))
  })

export const getCheckoutHistory = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db
    .select({
      id: checkout.id,
      equipmentId: checkout.equipmentId,
      equipmentName: equipment.name,
      equipmentCategory: equipment.category,
      responsible: checkout.responsible,
      responsibleRole: checkout.responsibleRole,
      project: checkout.project,
      expectedReturn: checkout.expectedReturn,
      checkedOutAt: checkout.checkedOutAt,
      checkedOutByUserId: checkout.checkedOutByUserId,
      checkedInAt: checkout.checkedInAt,
      checkedInByUserId: checkout.checkedInByUserId,
      checkedInByUserName: checkout.checkedInByUserName,
      returnCondition: checkout.returnCondition,
    })
    .from(checkout)
    .leftJoin(equipment, eq(checkout.equipmentId, equipment.id))
    .orderBy(desc(checkout.checkedOutAt))
    .limit(300)

  return rows
})
