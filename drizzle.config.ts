import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit push needs a direct connection (port 5432).
// The app uses DATABASE_URL (pooler, port 6543).
// Set DATABASE_URL_DIRECT in .env with the direct Supabase URL for migrations.
const migrateUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL!

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*.schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: migrateUrl,
  },
})
