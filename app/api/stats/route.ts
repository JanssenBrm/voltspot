import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stations, checkIns, users, routes } from '@/lib/db/schema'
import { count, countDistinct, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [stationCount] = await db.select({ total: count() }).from(stations)
  const [checkInCount] = await db.select({ total: count() }).from(checkIns)
  const [userCount] = await db.select({ total: count() }).from(users)
  const [routeCount] = await db.select({ total: count() }).from(routes)
  const [countryCount] = await db
    .select({ total: countDistinct(stations.countryCode) })
    .from(stations)

  return NextResponse.json({
    stations: stationCount?.total ?? 0,
    checkIns: checkInCount?.total ?? 0,
    users: userCount?.total ?? 0,
    routes: routeCount?.total ?? 0,
    countries: countryCount?.total ?? 0,
  })
}
