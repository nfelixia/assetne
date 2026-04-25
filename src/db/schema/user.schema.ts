import { bigint, pgTable, text } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('operator'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
