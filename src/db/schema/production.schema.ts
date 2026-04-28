import { bigint, integer, pgTable, text } from 'drizzle-orm/pg-core'

export const productionItems = pgTable('production_items', {
  id:             text('id').primaryKey(),
  name:           text('name').notNull(),
  category:       text('category').notNull(),
  totalQty:       integer('total_qty').notNull().default(1),
  availableQty:   integer('available_qty').notNull().default(1),
  status:         text('status').notNull().default('disponivel'),
  condition:      text('condition').notNull().default('bom'),
  location:       text('location'),
  photoUrl:       text('photo_url'),
  notes:          text('notes'),
  codigoInterno:  text('codigo_interno'),
  createdAt:      bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:      bigint('updated_at', { mode: 'number' }).notNull(),
})

export const productionMovements = pgTable('production_movements', {
  id:                  text('id').primaryKey(),
  itemId:              text('item_id').notNull().references(() => productionItems.id),
  qty:                 integer('qty').notNull().default(1),
  responsible:         text('responsible').notNull(),
  project:             text('project'),
  expectedReturn:      text('expected_return'),
  checkedOutAt:        bigint('checked_out_at', { mode: 'number' }).notNull(),
  checkedOutByUserId:  text('checked_out_by_user_id'),
  checkedInAt:         bigint('checked_in_at', { mode: 'number' }),
  checkedInByUserId:   text('checked_in_by_user_id'),
  checkedInByUserName: text('checked_in_by_user_name'),
  statusAfterReturn:   text('status_after_return'),
  notes:               text('notes'),
})

export type ProductionItem = typeof productionItems.$inferSelect
export type NewProductionItem = typeof productionItems.$inferInsert
export type ProductionMovement = typeof productionMovements.$inferSelect
