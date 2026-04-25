export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stations, userBadges, badges } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { awardPoints } from '@/lib/points'
import { calculateDistanceMeters } from '@/lib/geo'

const MAX_CLAIM_DISTANCE_METERS = 100

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { userLatitude, userLongitude } = body

  if (typeof userLatitude !== 'number' || typeof userLongitude !== 'number') {
    return NextResponse.json(
      { error: 'Location is required to claim a station. Please enable location permissions and try again.' },
      { status: 400 },
    )
  }

  const [station] = await db
    .select()
    .from(stations)
    .where(and(eq(stations.id, params.id), isNull(stations.claimedBy)))
    .limit(1)

  if (!station) {
    return NextResponse.json({ error: 'Station not found or already claimed' }, { status: 400 })
  }

  const distanceMeters = calculateDistanceMeters(
    userLatitude,
    userLongitude,
    station.latitude,
    station.longitude,
  )

  if (distanceMeters > MAX_CLAIM_DISTANCE_METERS) {
    return NextResponse.json(
      {
        error: `You need to be within ${MAX_CLAIM_DISTANCE_METERS}m to claim this station. You are currently ${Math.round(distanceMeters)}m away.`,
      },
      { status: 403 },
    )
  }

  const [updated] = await db
    .update(stations)
    .set({ claimedBy: userId, claimedAt: new Date() })
    .where(and(eq(stations.id, params.id), isNull(stations.claimedBy)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Station already claimed' }, { status: 409 })
  }

  await awardPoints(userId, 50)

  try {
    await db.insert(userBadges).values({ userId, badgeSlug: 'pioneer' })
    const [badge] = await db.select().from(badges).where(eq(badges.slug, 'pioneer')).limit(1)
    if (badge) await awardPoints(userId, badge.pointsValue ?? 0)
  } catch { /* already earned */ }

  return NextResponse.json({ success: true, station: updated })
}
