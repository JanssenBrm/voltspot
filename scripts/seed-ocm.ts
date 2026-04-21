import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../lib/db/schema'
import { fetchOCMStations, mapOCMToStation } from '../lib/ocm'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

async function main() {
  console.log('Starting OCM seed...')

  const stations = await fetchOCMStations({ maxresults: '10000' })
  console.log(`Fetched ${stations.length} stations from OCM`)

  let inserted = 0
  let skipped = 0
  const batchSize = 100

  for (let i = 0; i < stations.length; i += batchSize) {
    const batch = stations.slice(i, i + batchSize)
    const mapped = batch.map(mapOCMToStation)

    for (const station of mapped) {
      try {
        const result = await db
          .insert(schema.stations)
          .values(station)
          .onConflictDoNothing({ target: schema.stations.ocmId })
        inserted++
      } catch (err) {
        skipped++
      }
    }

    if (i % 500 === 0 && i > 0) {
      console.log(`Progress: ${i}/${stations.length} (inserted: ${inserted}, skipped: ${skipped})`)
    }
  }

  console.log(`Done! Inserted: ${inserted}, Skipped: ${skipped}`)
}

main().catch(console.error)
