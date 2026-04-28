import { bigint, pgTable, text } from 'drizzle-orm/pg-core'

export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  value: text('value').notNull(),
  serialNumber: text('serial_number'),
  codigo: text('codigo'),
  status: text('status').notNull().default('available'),
  condition: text('condition').notNull().default('new'),
  photoUrl: text('photo_url'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

export type Equipment = typeof equipment.$inferSelect
export type NewEquipment = typeof equipment.$inferInsert
