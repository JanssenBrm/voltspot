export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkIns, stations, userBadges } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'
import { calculateDistanceMeters } from '@/lib/geo'

const MAX_CHECKIN_DISTANCE_METERS = 100

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  const body = await req.json()
  const { rating, comment, statusReported, userLatitude, userLongitude } = body

  if (typeof userLatitude !== 'number' || typeof userLongitude !== 'number') {
    return NextResponse.json(
      { error: 'Location is required to check in. Please enable location permissions and try again.' },
      { status: 400 },
    )
  }

  const [station] = await db
    .select({ latitude: stations.latitude, longitude: stations.longitude })
    .from(stations)
    .where(eq(stations.id, params.id))
    .limit(1)

  if (!station) {
    return NextResponse.json({ error: 'Station not found.' }, { status: 404 })
  }

  const distanceMeters = calculateDistanceMeters(
    userLatitude,
    userLongitude,
    station.latitude,
    station.longitude,
  )

  if (distanceMeters > MAX_CHECKIN_DISTANCE_METERS) {
    return NextResponse.json(
      {
        error: `You need to be within ${MAX_CHECKIN_DISTANCE_METERS}m to check in. You are currently ${Math.round(distanceMeters)}m away.`,
      },
      { status: 403 },
    )
  }

  const [checkIn] = await db
    .insert(checkIns)
    .values({
      stationId: params.id,
      userId: userId ?? null,
      rating,
      comment: userId ? comment : undefined,
      statusReported,
    })
    .returning()

  if (userId) {
    const [existing] = await db
      .select({ total: count() })
      .from(checkIns)
      .where(eq(checkIns.userId, userId))

    const isFirst = (existing?.total ?? 0) === 1
    await awardPoints(userId, isFirst ? 25 : 10)

    if (isFirst) {
      try {
        await db.insert(userBadges).values({ userId, badgeSlug: 'first-checkin' })
      } catch { /* ignore */ }
    }

    const newBadges = await checkAndAwardBadges(userId)
    return NextResponse.json({ checkIn, newBadges, anonymous: false })
  }

  return NextResponse.json({ checkIn, newBadges: [], anonymous: true })
}
