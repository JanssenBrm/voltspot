export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stations, userBadges, badges } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { awardPoints } from '@/lib/points'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [station] = await db
    .select()
    .from(stations)
    .where(and(eq(stations.id, params.id), isNull(stations.claimedBy)))
    .limit(1)

  if (!station) {
    return NextResponse.json({ error: 'Station not found or already claimed' }, { status: 400 })
  }

  const [updated] = await db
    .update(stations)
    .set({ claimedBy: session.user.id, claimedAt: new Date() })
    .where(and(eq(stations.id, params.id), isNull(stations.claimedBy)))
    .returning()

  if (!updated) {
    return NextResponse.json({ error: 'Station already claimed' }, { status: 409 })
  }

  await awardPoints(session.user.id, 50)

  try {
    await db.insert(userBadges).values({ userId: session.user.id, badgeSlug: 'pioneer' })
    const [badge] = await db.select().from(badges).where(eq(badges.slug, 'pioneer')).limit(1)
    if (badge) await awardPoints(session.user.id, badge.pointsValue ?? 0)
  } catch { /* already earned */ }

  return NextResponse.json({ success: true, station: updated })
}
