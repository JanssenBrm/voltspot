export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkIns, users, userBadges, badges } from '@/lib/db/schema'
import { eq, count, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  const body = await req.json()
  const { rating, comment, statusReported } = body

  const userId = session?.user?.id ?? null

  const [checkIn] = await db
    .insert(checkIns)
    .values({
      stationId: params.id,
      userId,
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
