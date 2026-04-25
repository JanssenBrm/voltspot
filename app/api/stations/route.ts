export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stations, stationChangeRequests, users } from '@/lib/db/schema'
import { sql, and, gte, lte, eq } from 'drizzle-orm'
import { auth, currentUser } from '@clerk/nextjs/server'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'
import { canModerate, sanitizeStationPayload } from '@/lib/stationChangeRequests'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const bbox = searchParams.get('bbox')
  const plugType = searchParams.get('plugType')
  const freeOnly = searchParams.get('freeOnly') === 'true'
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
  if (indoorOnly) conditions.push(eq(stations.isIndoor, true))
  if (plugType) conditions.push(sql`${plugType} = ANY(${stations.plugTypes})`)

  const rows = await db
    .select({
      id: stations.id,
      name: stations.name,
      latitude: stations.latitude,
      longitude: stations.longitude,
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
  const { userId } = await auth()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { payload, error } = sanitizeStationPayload(body, 'create')
  if (error) return NextResponse.json({ error }, { status: 400 })

  let role: string | null = null
  let dbUserId: string | null = null
  if (userId) {
    try {
      const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
      if (user) {
        role = user.role ?? null
        dbUserId = userId
      } else {
        // User authenticated in Clerk but not yet in DB (webhook may have failed/been delayed).
        // Proactively create the record so the change request can be linked to them.
        try {
          const clerkUser = await currentUser()
          const email = clerkUser?.emailAddresses?.[0]?.emailAddress
          if (clerkUser && email) {
            await db
              .insert(users)
              .values({
                id: userId,
                email,
                name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
                avatarUrl: clerkUser.imageUrl || null,
              })
              .onConflictDoNothing()
            dbUserId = userId
          }
        } catch {
          // Non-fatal: proceed with null requestedBy
        }
      }
    } catch {
      // Non-fatal: proceed without role (treat as unprivileged)
    }
  }
  const privileged = canModerate(role)

  if (!privileged) {
    try {
      const [request] = await db
        .insert(stationChangeRequests)
        .values({
          requestType: 'create',
          status: 'pending',
          payload: payload as Record<string, unknown>,
          requestedBy: dbUserId,
        })
        .returning({ id: stationChangeRequests.id, status: stationChangeRequests.status })
      return NextResponse.json({ request, queued: true }, { status: 202 })
    } catch (err) {
      console.error('[POST /api/stations] failed to queue change request', err)
      return NextResponse.json({ error: 'Failed to submit your station request. Please try again.' }, { status: 500 })
    }
  }

  let station: (typeof stations.$inferSelect) | undefined
  try {
    const [inserted] = await db
      .insert(stations)
      .values({
        name: payload.name!,
        latitude: payload.latitude!,
        longitude: payload.longitude!,
        address: payload.address,
        city: payload.city,
        country: payload.country,
        countryCode: payload.countryCode,
        plugTypes: payload.plugTypes,
        isFree: payload.isFree,
        isIndoor: payload.isIndoor,
        accessNotes: payload.accessNotes,
        source: 'user',
      })
      .returning()
    station = inserted
  } catch (err) {
    console.error('[POST /api/stations] failed to insert station', err)
    return NextResponse.json({ error: 'Failed to add station. Please try again.' }, { status: 500 })
  }

  if (userId) {
    await awardPoints(userId, 30)
  }
  const newBadges = userId ? await checkAndAwardBadges(userId) : []

  // Award trail-blazer badge on first submission
  const { db: drizzleDb } = await import('@/lib/db')
  const { userBadges, badges } = await import('@/lib/db/schema')
  const { eq: eqFn, and: andFn } = await import('drizzle-orm')
  if (userId) {
    const existing = await drizzleDb
      .select({ badgeSlug: userBadges.badgeSlug })
      .from(userBadges)
      .where(andFn(eqFn(userBadges.userId, userId), eqFn(userBadges.badgeSlug, 'trail-blazer')))
      .limit(1)

    const hasTrailBlazer = existing.length > 0
    if (!hasTrailBlazer) {
      try {
        await drizzleDb.insert(userBadges).values({ userId, badgeSlug: 'trail-blazer' })
        const [trailBadge] = await drizzleDb.select().from(badges).where(eqFn(badges.slug, 'trail-blazer')).limit(1)
        if (trailBadge) await awardPoints(userId, trailBadge.pointsValue ?? 0)
      } catch { /* already has it */ }
    }
  }

  return NextResponse.json({ station, newBadges }, { status: 201 })
}
