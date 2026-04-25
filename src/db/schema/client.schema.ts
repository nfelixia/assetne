import { bigint, pgTable, text } from 'drizzle-orm/pg-core'

export const client = pgTable('client', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

export type Client = typeof client.$inferSelect
