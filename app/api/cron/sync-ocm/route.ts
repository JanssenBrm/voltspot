export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { fetchOCMStations, mapOCMToStation } from '@/lib/ocm'
import { db } from '@/lib/db'
import { stations } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const modifiedSince = twoDaysAgo.toISOString().split('T')[0]

  const ocmStations = await fetchOCMStations({ modifiedsince: modifiedSince, maxresults: '5000' })

  let inserted = 0
  let updated = 0

  for (let i = 0; i < ocmStations.length; i++) {
    const mapped = mapOCMToStation(ocmStations[i])
    const result = await db
      .insert(stations)
      .values(mapped)
      .onConflictDoUpdate({
        target: stations.ocmId,
        set: {
          name: mapped.name,
          latitude: mapped.latitude,
          longitude: mapped.longitude,
          address: mapped.address,
          city: mapped.city,
          country: mapped.country,
          countryCode: mapped.countryCode,
          plugTypes: mapped.plugTypes,
          isFree: mapped.isFree,
          updatedAt: new Date(),
        },
      })
      .returning()

    if (i % 500 === 0) console.log(`Synced ${i}/${ocmStations.length}`)
  }

  return NextResponse.json({ synced: ocmStations.length })
}
