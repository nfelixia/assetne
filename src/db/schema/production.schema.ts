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
  color:          text('color'),
  createdAt:      bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:      bigint('updated_at', { mode: 'number' }).notNull(),
})

export const productionMovements = pgTable('production_movements', {
  id:                  text('id').primaryKey(),
  itemId:              text('item_id').notNull().references(() => productionItems.id),
  type:                text('type').notNull().default('checked_out'),
  qty:                 integer('qty').notNull().default(1),
  responsible:         text('responsible').notNull(),
  responsibleUserId:   text('responsible_user_id'),
  project:             text('project'),
  expectedReturn:      text('expected_return'),
  checkedOutAt:        bigint('checked_out_at', { mode: 'number' }).notNull(),
  checkedOutByUserId:  text('checked_out_by_user_id'),
  checkedOutByName:    text('checked_out_by_name'),
  checkedInAt:         bigint('checked_in_at', { mode: 'number' }),
  checkedInByUserId:   text('checked_in_by_user_id'),
  checkedInByUserName: text('checked_in_by_user_name'),
  statusAfterReturn:   text('status_after_return'),
  conditionOut:        text('condition_out'),
  notes:               text('notes'),
})

export const productionWithdrawalRequests = pgTable('production_withdrawal_requests', {
  id:                   text('id').primaryKey(),
  itemId:               text('item_id').notNull().references(() => productionItems.id, { onDelete: 'cascade' }),
  requestedByUserId:    text('requested_by_user_id').notNull(),
  requestedByUserName:  text('requested_by_user_name').notNull(),
  responsibleUserId:    text('responsible_user_id'),
  responsibleUserName:  text('responsible_user_name').notNull(),
  quantity:             integer('quantity').notNull().default(1),
  projectOrClient:      text('project_or_client'),
  expectedReturn:       text('expected_return'),
  conditionOut:         text('condition_out').notNull(),
  notes:                text('notes'),
  status:               text('status').notNull().default('pending_approval'),
  approvedByUserId:     text('approved_by_user_id'),
  approvedByUserName:   text('approved_by_user_name'),
  approvedAt:           bigint('approved_at', { mode: 'number' }),
  rejectedByUserId:     text('rejected_by_user_id'),
  rejectedByUserName:   text('rejected_by_user_name'),
  rejectedAt:           bigint('rejected_at', { mode: 'number' }),
  rejectionReason:      text('rejection_reason'),
  createdAt:            bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:            bigint('updated_at', { mode: 'number' }).notNull(),
})

export type ProductionItem               = typeof productionItems.$inferSelect
export type NewProductionItem            = typeof productionItems.$inferInsert
export type ProductionMovement           = typeof productionMovements.$inferSelect
export type ProductionWithdrawalRequest  = typeof productionWithdrawalRequests.$inferSelect
