export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stations } from '@/lib/db/schema'
import { sql, and, gte, lte, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const bbox = searchParams.get('bbox')
  const plugType = searchParams.get('plugType')
  const freeOnly = searchParams.get('freeOnly') === 'true'
  const verifiedOnly = searchParams.get('verifiedOnly') === 'true'
  const indoorOnly = searchParams.get('indoorOnly') === 'true'

  const conditions = []

  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number)
    conditions.push(
      gte(stations.longitude, minLng),
      lte(stations.longitude, maxLng),
      gte(stations.latitude, minLat),
      lte(stations.latitude, maxLat),
    )
  }
  if (freeOnly) conditions.push(eq(stations.isFree, true))
  if (verifiedOnly) conditions.push(eq(stations.status, 'verified'))
  if (indoorOnly) conditions.push(eq(stations.isIndoor, true))
  if (plugType) conditions.push(sql`${plugType} = ANY(${stations.plugTypes})`)

  const rows = await db
    .select({
      id: stations.id,
      name: stations.name,
      latitude: stations.latitude,
      longitude: stations.longitude,
      status: stations.status,
      isFree: stations.isFree,
      plugTypes: stations.plugTypes,
      claimedBy: stations.claimedBy,
    })
    .from(stations)
    .where(conditions.length ? and(...conditions) : undefined)
    .limit(2000)

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, latitude, longitude, address, city, country, countryCode, plugTypes, isFree, isIndoor, accessNotes } = body

  if (!name || latitude == null || longitude == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const [station] = await db
    .insert(stations)
    .values({
      name,
      latitude,
      longitude,
      address,
      city,
      country,
      countryCode,
      plugTypes,
      isFree,
      isIndoor,
      accessNotes,
      source: 'user',
      status: 'unverified',
    })
    .returning()

  await awardPoints(session.user.id, 30)
  const newBadges = await checkAndAwardBadges(session.user.id)

  // Award trail-blazer badge on first submission
  const { db: drizzleDb } = await import('@/lib/db')
  const { userBadges, badges } = await import('@/lib/db/schema')
  const { eq: eqFn } = await import('drizzle-orm')
  const [existing] = await drizzleDb
    .select()
    .from(userBadges)
    .where(eqFn(userBadges.userId, session.user.id))
    .limit(50)

  const hasTrailBlazer = existing && (existing as any).badgeSlug === 'trail-blazer'
  if (!hasTrailBlazer) {
    try {
      await drizzleDb.insert(userBadges).values({ userId: session.user.id, badgeSlug: 'trail-blazer' })
      const [trailBadge] = await drizzleDb.select().from(badges).where(eqFn(badges.slug, 'trail-blazer')).limit(1)
      if (trailBadge) await awardPoints(session.user.id, trailBadge.pointsValue ?? 0)
    } catch { /* already has it */ }
  }

  return NextResponse.json({ station, newBadges }, { status: 201 })
}
