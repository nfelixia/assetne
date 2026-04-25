import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { equipment } from './schema/equipment.schema'
import { collaborator } from './schema/collaborator.schema'
import { client } from './schema/client.schema'

const sql = postgres(process.env.DATABASE_URL!)
const db = drizzle(sql)

async function seed() {
  const now = Date.now()

  await db.insert(equipment).values([
    { id: '1', name: 'Canon EOS R5',     category: 'Câmera',        value: 'R$ 28.000', status: 'available',    condition: 'good',    createdAt: now },
    { id: '2', name: 'DJI Ronin 4D',     category: 'Estabilizador', value: 'R$ 15.000', status: 'available',    condition: 'good',    createdAt: now },
    { id: '3', name: 'Godox SL200W',     category: 'Iluminação',    value: 'R$ 3.200',  status: 'available',    condition: 'good',    createdAt: now },
    { id: '4', name: 'Sennheiser MKH50', category: 'Áudio',         value: 'R$ 9.800',  status: 'available',    condition: 'new',     createdAt: now },
    { id: '5', name: 'Ronin RS3 Pro',    category: 'Estabilizador', value: 'R$ 4.500',  status: 'maintenance',  condition: 'regular', createdAt: now },
    { id: '6', name: 'Aputure 600D',     category: 'Iluminação',    value: 'R$ 12.000', status: 'available',    condition: 'good',    createdAt: now },
    { id: '7', name: 'Sony FX6',         category: 'Câmera',        value: 'R$ 35.000', status: 'available',    condition: 'new',     createdAt: now },
    { id: '8', name: 'Zoom F8n Pro',     category: 'Áudio',         value: 'R$ 6.700',  status: 'available',    condition: 'good',    createdAt: now },
  ]).onConflictDoNothing()

  await db.insert(collaborator).values([
    { id: 'c1', name: 'Ana Souza',     role: 'Diretora de Fotografia', createdAt: now },
    { id: 'c2', name: 'Carlos Lima',   role: 'Operador de Câmera',     createdAt: now },
    { id: 'c3', name: 'Pedro Alves',   role: 'Iluminador',             createdAt: now },
    { id: 'c4', name: 'Mariana Costa', role: 'Produtora',              createdAt: now },
  ]).onConflictDoNothing()

  await db.insert(client).values([
    { id: 'cl1', name: 'Natura S/A',       createdAt: now },
    { id: 'cl2', name: 'SPFW',             createdAt: now },
    { id: 'cl3', name: 'Produtora Deriva', createdAt: now },
  ]).onConflictDoNothing()

  console.log('Seed concluído.')
  await sql.end()
}

seed().catch((e) => { console.error(e); process.exit(1) })
