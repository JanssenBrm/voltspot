export const dynamic = 'force-dynamic'

import { EUROPE_COUNTRIES } from '@/lib/countries'
import { fetchRecentStationsForCountry, mapOverpassToStation } from '@/lib/overpass'
import { db } from '@/lib/db'
import { stations } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dayOfMonth = new Date().getDate()
  const COUNTRIES_PER_RUN = 4
  const SYNC_LOOKBACK_HOURS = 48
  const startIndex = ((dayOfMonth - 1) * COUNTRIES_PER_RUN) % EUROPE_COUNTRIES.length
  const todaysCountries = Array.from({ length: COUNTRIES_PER_RUN }, (_, index) => {
    const countryIndex = (startIndex + index) % EUROPE_COUNTRIES.length
    return EUROPE_COUNTRIES[countryIndex]
  })

  const since = new Date(Date.now() - SYNC_LOOKBACK_HOURS * 60 * 60 * 1000)
  const results: { country: string; updated: number }[] = []

  for (const { code, name } of todaysCountries) {
    const elements = await fetchRecentStationsForCountry(code, since)
    if (elements.length > 0) {
      const mapped = elements.map(mapOverpassToStation)
      await db
        .insert(stations)
        .values(mapped)
        .onConflictDoUpdate({
          target: stations.ocmId,
          set: {
            name: sql`excluded.name`,
            latitude: sql`excluded.latitude`,
            longitude: sql`excluded.longitude`,
            plugTypes: sql`excluded.plug_types`,
            isFree: sql`excluded.is_free`,
            updatedAt: sql`now()`,
          },
        })
      results.push({ country: name, updated: mapped.length })
    }
    await new Promise((r) => setTimeout(r, 1000))
  }

  return NextResponse.json({ synced: todaysCountries.map((c) => c.name), results })
}
