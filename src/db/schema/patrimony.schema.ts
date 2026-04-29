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

export type PatrimonyItem     = typeof patrimonyItems.$inferSelect
export type NewPatrimonyItem  = typeof patrimonyItems.$inferInsert
export type PatrimonyMovement = typeof patrimonyMovements.$inferSelect
