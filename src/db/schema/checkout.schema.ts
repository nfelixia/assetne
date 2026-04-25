import { bigint, pgTable, text } from 'drizzle-orm/pg-core'
import { equipment } from './equipment.schema'

export const checkout = pgTable('checkout', {
  id: text('id').primaryKey(),
  equipmentId: text('equipment_id').notNull().references(() => equipment.id),
  responsible: text('responsible').notNull(),
  responsibleRole: text('responsible_role'),
  project: text('project').notNull(),
  expectedReturn: text('expected_return'),
  checkedOutAt: bigint('checked_out_at', { mode: 'number' }).notNull(),
  checkedInAt: bigint('checked_in_at', { mode: 'number' }),
  returnCondition: text('return_condition'),
  notes: text('notes'),
})

export type Checkout = typeof checkout.$inferSelect
export type NewCheckout = typeof checkout.$inferInsert
