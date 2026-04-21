import 'dotenv/config'
import { EUROPE_COUNTRIES } from '../lib/countries'
import { fetchStationsForCountry, mapOverpassToStation } from '../lib/overpass'
import { db } from '../lib/db'
import { stations } from '../lib/db/schema'
import { sql } from 'drizzle-orm'

const targetCountry = process.argv[2]?.toUpperCase()
const countries = targetCountry ? EUROPE_COUNTRIES.filter((c) => c.code === targetCountry) : EUROPE_COUNTRIES

async function seedCountry(code: string, name: string) {
  console.log(`\n[${code}] Fetching ${name}...`)
  const elements = await fetchStationsForCountry(code)
  console.log(`[${code}] Found ${elements.length} stations`)

  if (elements.length === 0) return

  const BATCH_SIZE = 100
  const COUNTRY_DELAY_MS = 1500
  let count = 0

  for (let i = 0; i < elements.length; i += BATCH_SIZE) {
    const batch = elements.slice(i, i + BATCH_SIZE).map(mapOverpassToStation)

    await db
      .insert(stations)
      .values(batch)
      .onConflictDoUpdate({
        target: stations.ocmId,
        set: {
          name: sql`excluded.name`,
          latitude: sql`excluded.latitude`,
          longitude: sql`excluded.longitude`,
          address: sql`excluded.address`,
          city: sql`excluded.city`,
          country: sql`excluded.country`,
          countryCode: sql`excluded.country_code`,
          plugTypes: sql`excluded.plug_types`,
          isFree: sql`excluded.is_free`,
          isIndoor: sql`excluded.is_indoor`,
          accessNotes: sql`excluded.access_notes`,
          updatedAt: sql`now()`,
        },
      })

    count += batch.length
  }

  console.log(`[${code}] Done — inserted/updated ${count} stations`)
  await new Promise((r) => setTimeout(r, COUNTRY_DELAY_MS))
}

async function main() {
  console.log(`Seeding ${countries.length} countries from OpenStreetMap...`)

  for (const { code, name } of countries) {
    await seedCountry(code, name)
  }

  console.log('\nAll done.')
  process.exit(0)
}

main().catch(console.error)
