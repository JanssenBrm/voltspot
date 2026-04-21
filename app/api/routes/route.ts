export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { routes, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const countryCode = searchParams.get('countryCode')

  const rows = await db
    .select({
      id: routes.id,
      name: routes.name,
      description: routes.description,
      stationIds: routes.stationIds,
      distanceKm: routes.distanceKm,
      isPublic: routes.isPublic,
      createdAt: routes.createdAt,
      userId: routes.userId,
      creatorName: users.name,
      creatorAvatar: users.avatarUrl,
    })
    .from(routes)
    .leftJoin(users, eq(routes.userId, users.id))
    .where(eq(routes.isPublic, true))
    .orderBy(desc(routes.createdAt))
    .limit(50)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, description, stationIds, distanceKm, isPublic } = body

  if (!name || !stationIds?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [route] = await db
    .insert(routes)
    .values({
      name,
      description,
      stationIds,
      distanceKm,
      isPublic: isPublic ?? true,
      userId,
    })
    .returning()

  if (isPublic) {
    await awardPoints(userId, 20)
    const { db: drizzleDb } = await import('@/lib/db')
    const { userBadges, badges } = await import('@/lib/db/schema')
    const { eq: eqFn } = await import('drizzle-orm')
    try {
      await drizzleDb.insert(userBadges).values({ userId, badgeSlug: 'route-maker' })
      const [badge] = await drizzleDb.select().from(badges).where(eqFn(badges.slug, 'route-maker')).limit(1)
      if (badge) await awardPoints(userId, badge.pointsValue ?? 0)
    } catch { /* already earned */ }
  }

  const newBadges = await checkAndAwardBadges(userId)
  return NextResponse.json({ route, newBadges }, { status: 201 })
}
