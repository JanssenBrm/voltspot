import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// During `next build`, DATABASE_URL may not be set. We use a placeholder so
// the module can be imported without throwing. Actual queries will fail at
// runtime unless a real DATABASE_URL is configured (correct behaviour).
const dbUrl = process.env.DATABASE_URL || 'postgresql://build:build@localhost/build'
const sql = neon(dbUrl)
export const db = drizzle(sql, { schema })
