import { bigint, integer, real, pgTable, text } from 'drizzle-orm/pg-core'

export const patrimonyItems = pgTable('patrimony_items', {
  id:                     text('id').primaryKey(),
  name:                   text('name').notNull(),
  category:               text('category').notNull(),
  patrimonyCode:          text('patrimony_code').notNull(),
  brand:                  text('brand'),
  model:                  text('model'),
  serialNumber:           text('serial_number'),
  quantity:               integer('quantity').notNull().default(1),
  currentResponsibleId:   text('current_responsible_id'),
  currentResponsibleName: text('current_responsible_name'),
  status:                 text('status').notNull().default('disponivel'),
  location:               text('location'),
  condition:              text('condition').notNull().default('bom'),
  estimatedValue:         real('estimated_value'),
  acquisitionDate:        text('acquisition_date'),
  supplier:               text('supplier'),
  mainImageUrl:           text('main_image_url'),
  notes:                  text('notes'),
  createdAt:              bigint('created_at', { mode: 'number' }).notNull(),
  updatedAt:              bigint('updated_at', { mode: 'number' }).notNull(),
  createdByUserId:        text('created_by_user_id'),
  createdByUserName:      text('created_by_user_name'),
})

export const patrimonyMovements = pgTable('patrimony_movements', {
  id:                   text('id').primaryKey(),
  itemId:               text('item_id').notNull().references(() => patrimonyItems.id),
  type:                 text('type').notNull(),
  previousStatus:       text('previous_status'),
  newStatus:            text('new_status'),
  responsibleUserId:    text('responsible_user_id'),
  responsibleUserName:  text('responsible_user_name'),
  performedByUserId:    text('performed_by_user_id'),
  performedByUserName:  text('performed_by_user_name'),
  projectOrClient:      text('project_or_client'),
  useType:              text('use_type'),
  expectedReturnDate:   text('expected_return_date'),
  returnDate:           text('return_date'),
  conditionOut:         text('condition_out'),
  conditionIn:          text('condition_in'),
  notes:                text('notes'),
  createdAt:            bigint('created_at', { mode: 'number' }).notNull(),
})

export const patrimonyWithdrawalRequests = pgTable('patrimony_withdrawal_requests', {
  id:                   text('id').primaryKey(),
  itemId:               text('item_id').notNull().references(() => patrimonyItems.id, { onDelete: 'cascade' }),
  requestedByUserId:    text('requested_by_user_id').notNull(),
  requestedByUserName:  text('requested_by_user_name').notNull(),
  responsibleUserId:    text('responsible_user_id'),
  responsibleUserName:  text('responsible_user_name').notNull(),
  useType:              text('use_type').notNull(),
  projectOrClient:      text('project_or_client'),
  expectedReturnDate:   text('expected_return_date'),
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

export type PatrimonyItem                = typeof patrimonyItems.$inferSelect
export type NewPatrimonyItem             = typeof patrimonyItems.$inferInsert
export type PatrimonyMovement            = typeof patrimonyMovements.$inferSelect
export type PatrimonyWithdrawalRequest   = typeof patrimonyWithdrawalRequests.$inferSelect
