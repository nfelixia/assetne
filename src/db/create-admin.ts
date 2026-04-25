import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import { scrypt, randomBytes } from 'node:crypto'
import { promisify } from 'node:util'
import { users } from './schema/user.schema'

const scryptAsync = promisify(scrypt)

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const buf = (await scryptAsync(password, salt, 64)) as Buffer
  return `${buf.toString('hex')}.${salt}`
}

const USERNAME = process.env.ADMIN_USERNAME ?? 'admin'
const NAME     = process.env.ADMIN_NAME     ?? 'Administrador'
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'assetne2025'

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
  const db  = drizzle(sql)

  const existing = await db.select().from(users).where(eq(users.username, USERNAME))
  if (existing.length > 0) {
    console.log(`Usuário "${USERNAME}" já existe. Atualizando senha...`)
    const hash = await hashPassword(PASSWORD)
    await db.update(users).set({ passwordHash: hash }).where(eq(users.username, USERNAME))
    console.log(`✓ Senha de "${USERNAME}" atualizada.`)
  } else {
    const hash = await hashPassword(PASSWORD)
    await db.insert(users).values({
      id:           `user_${randomBytes(8).toString('hex')}`,
      username:     USERNAME,
      name:         NAME,
      passwordHash: hash,
      role:         'admin',
      createdAt:    Date.now(),
    })
    console.log(`✓ Admin criado: usuário="${USERNAME}" senha="${PASSWORD}"`)
    console.log('  Troque a senha após o primeiro login!')
  }

  await sql.end()
}

main().catch((e) => { console.error(e); process.exit(1) })
