export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, userBadges, badges, stations, checkIns, routes } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      points: users.points,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, params.id))
    .limit(1)

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const earnedBadges = await db
    .select({ badge: badges, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .leftJoin(badges, eq(userBadges.badgeSlug, badges.slug))
    .where(eq(userBadges.userId, params.id))

  const claimedStations = await db
    .select({ id: stations.id, name: stations.name, city: stations.city, country: stations.country })
    .from(stations)
    .where(eq(stations.claimedBy, params.id))

  const userRoutes = await db
    .select({ id: routes.id, name: routes.name, distanceKm: routes.distanceKm })
    .from(routes)
    .where(eq(routes.userId, params.id))

  const [checkInCount] = await db
    .select({ total: count() })
    .from(checkIns)
    .where(eq(checkIns.userId, params.id))

  return NextResponse.json({
    ...user,
    badges: earnedBadges,
    claimedStations,
    routes: userRoutes,
    checkInCount: checkInCount?.total ?? 0,
  })
}
