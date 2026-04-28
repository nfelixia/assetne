import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as equipmentSchema from './schema/equipment.schema'
import * as checkoutSchema from './schema/checkout.schema'
import * as clientSchema from './schema/client.schema'
import * as collaboratorSchema from './schema/collaborator.schema'
import * as userSchema from './schema/user.schema'
import * as productionSchema from './schema/production.schema'

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false, // required for Supabase pooler (PgBouncer Transaction mode)
})

export const db = drizzle(client, {
  schema: { ...equipmentSchema, ...checkoutSchema, ...clientSchema, ...collaboratorSchema, ...userSchema, ...productionSchema },
})
