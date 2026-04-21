export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, leaderboardSnapshots } from '@/lib/db/schema'
import { desc, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date()

  // Compute weekly leaderboard (last 7 days points — using overall points as proxy for now)
  const topUsers = await db
    .select({
      id: users.id,
      points: users.points,
    })
    .from(users)
    .orderBy(desc(users.points))
    .limit(100)

  // Insert global alltime snapshot
  for (let i = 0; i < topUsers.length; i++) {
    await db
      .insert(leaderboardSnapshots)
      .values({
        userId: topUsers[i].id,
        period: 'alltime',
        countryCode: null,
        rank: i + 1,
        points: topUsers[i].points ?? 0,
        snapshotAt: now,
      })
  }

  // Award top-weekly badge to #1
  if (topUsers[0]) {
    const { db: drizzleDb } = await import('@/lib/db')
    const { userBadges, badges } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    const { awardPoints } = await import('@/lib/points')
    try {
      await drizzleDb.insert(userBadges).values({ userId: topUsers[0].id, badgeSlug: 'top-weekly' })
      const [badge] = await drizzleDb.select().from(badges).where(eq(badges.slug, 'top-weekly')).limit(1)
      if (badge) await awardPoints(topUsers[0].id, badge.pointsValue ?? 0)
    } catch { /* already earned */ }
  }

  return NextResponse.json({ updated: topUsers.length })
}
