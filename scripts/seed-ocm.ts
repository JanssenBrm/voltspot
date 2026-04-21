import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../lib/db/schema'
import { fetchOCMStations, mapOCMToStation } from '../lib/ocm'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql, { schema })

// ISO 3166-1 alpha-2 codes for all European countries
const EUROPEAN_COUNTRIES = [
  'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CY', 'CZ',
  'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT',
  'XK', 'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL',
  'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI',
  'ES', 'SE', 'CH', 'UA', 'GB', 'VA',
]

const PAGE_SIZE = 10000
const DB_BATCH = 100

async function upsertBatch(stations: ReturnType<typeof mapOCMToStation>[]) {
  let inserted = 0
  let skipped = 0
  for (let i = 0; i < stations.length; i += DB_BATCH) {
    const batch = stations.slice(i, i + DB_BATCH)
    for (const station of batch) {
      try {
        await db
          .insert(schema.stations)
          .values(station)
          .onConflictDoNothing({ target: schema.stations.ocmId })
        inserted++
      } catch {
        skipped++
      }
    }
  }
  return { inserted, skipped }
}

async function seedCountry(countryCode: string): Promise<{ inserted: number; skipped: number; total: number }> {
  let startIndex = 0
  let inserted = 0
  let skipped = 0
  let total = 0

  while (true) {
    const raw = await fetchOCMStations({
      countrycode: countryCode,
      maxresults: String(PAGE_SIZE),
      startindex: String(startIndex),
    })

    if (raw.length === 0) break

    total += raw.length
    const mapped = raw.map(mapOCMToStation)
    const result = await upsertBatch(mapped)
    inserted += result.inserted
    skipped += result.skipped

    console.log(
      `  ${countryCode} offset ${startIndex}: fetched ${raw.length}, ` +
      `inserted ${result.inserted}, skipped ${result.skipped}`,
    )

    // If we got fewer than a full page, we've reached the end
    if (raw.length < PAGE_SIZE) break
    startIndex += PAGE_SIZE

    // Small delay to be polite to the OCM API
    await new Promise((r) => setTimeout(r, 500))
  }

  return { inserted, skipped, total }
}

async function main() {
  console.log(`Starting OCM Europe seed — ${EUROPEAN_COUNTRIES.length} countries\n`)

  let totalInserted = 0
  let totalSkipped = 0
  let totalFetched = 0

  for (const code of EUROPEAN_COUNTRIES) {
    process.stdout.write(`→ ${code} `)
    try {
      const { inserted, skipped, total } = await seedCountry(code)
      totalInserted += inserted
      totalSkipped += skipped
      totalFetched += total
      if (total === 0) console.log('(no stations)')
    } catch (err) {
      console.error(`\n  ERROR for ${code}:`, err)
    }
  }

  console.log('\n─────────────────────────────────────────')
  console.log(`Total fetched : ${totalFetched}`)
  console.log(`Total inserted: ${totalInserted}`)
  console.log(`Total skipped : ${totalSkipped}`)
  console.log('Done.')
}

main().catch(console.error)
