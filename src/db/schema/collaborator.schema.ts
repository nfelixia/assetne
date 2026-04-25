import { bigint, pgTable, text } from 'drizzle-orm/pg-core'

export const collaborator = pgTable('collaborator', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

export type Collaborator = typeof collaborator.$inferSelect
