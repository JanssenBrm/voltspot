export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, leaderboardSnapshots } from '@/lib/db/schema'
import { eq, desc, and, isNull } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const period = searchParams.get('period') ?? 'alltime'
  const countryCode = searchParams.get('country_code')

  const conditions = [eq(leaderboardSnapshots.period, period)]
  if (countryCode) {
    conditions.push(eq(leaderboardSnapshots.countryCode, countryCode))
  } else {
    conditions.push(isNull(leaderboardSnapshots.countryCode))
  }

  const rows = await db
    .select({
      rank: leaderboardSnapshots.rank,
      points: leaderboardSnapshots.points,
      userId: leaderboardSnapshots.userId,
      userName: users.name,
      userAvatar: users.avatarUrl,
    })
    .from(leaderboardSnapshots)
    .leftJoin(users, eq(leaderboardSnapshots.userId, users.id))
    .where(and(...conditions))
    .orderBy(leaderboardSnapshots.rank)
    .limit(100)

  return NextResponse.json(rows)
}
