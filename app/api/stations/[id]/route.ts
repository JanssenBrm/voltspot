export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stations, checkIns, users, stationChangeRequests } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@clerk/nextjs/server'
import { canModerate, definedOnly, sanitizeStationPayload } from '@/lib/stationChangeRequests'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [station] = await db
    .select()
    .from(stations)
    .where(eq(stations.id, params.id))
    .limit(1)

  if (!station) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const recentCheckIns = await db
    .select({
      id: checkIns.id,
      rating: checkIns.rating,
      comment: checkIns.comment,
      statusReported: checkIns.statusReported,
      createdAt: checkIns.createdAt,
      userName: users.name,
      userAvatar: users.avatarUrl,
    })
    .from(checkIns)
    .leftJoin(users, eq(checkIns.userId, users.id))
    .where(eq(checkIns.stationId, params.id))
    .orderBy(desc(checkIns.createdAt))
    .limit(5)

  let owner = null
  if (station.claimedBy) {
    const [ownerRow] = await db
      .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, station.claimedBy))
      .limit(1)
    owner = ownerRow ?? null
  }

  return NextResponse.json({ ...station, recentCheckIns, owner })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()

  const [station] = await db.select().from(stations).where(eq(stations.id, params.id)).limit(1)
  if (!station) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let role: string | null = null
  if (userId) {
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
    role = user?.role ?? null
  }
  const privileged = canModerate(role)

  const body = await req.json()
  const { payload, error } = sanitizeStationPayload(body, 'edit')
  if (error) return NextResponse.json({ error }, { status: 400 })

  if (!privileged) {
    const [request] = await db
      .insert(stationChangeRequests)
      .values({
        stationId: params.id,
        requestType: 'edit',
        status: 'pending',
        payload: payload as Record<string, unknown>,
        requestedBy: userId ?? null,
      })
      .returning({ id: stationChangeRequests.id, status: stationChangeRequests.status })
    return NextResponse.json({ request, queued: true }, { status: 202 })
  }

  const [updated] = await db
    .update(stations)
    .set({ ...definedOnly(payload), updatedAt: new Date() })
    .where(eq(stations.id, params.id))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  const [station] = await db.select().from(stations).where(eq(stations.id, params.id)).limit(1)
  if (!station) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let role: string | null = null
  if (userId) {
    const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
    role = user?.role ?? null
  }
  const privileged = canModerate(role)

  if (!privileged) {
    const [request] = await db
      .insert(stationChangeRequests)
      .values({
        stationId: params.id,
        requestType: 'delete',
        status: 'pending',
        payload: {},
        requestedBy: userId ?? null,
      })
      .returning({ id: stationChangeRequests.id, status: stationChangeRequests.status })
    return NextResponse.json({ request, queued: true }, { status: 202 })
  }

  // neon-http driver does not support transactions, so execute in FK-safe order.
  await db
    .update(stationChangeRequests)
    .set({ stationId: null, updatedAt: new Date() })
    .where(eq(stationChangeRequests.stationId, params.id))
  await db.delete(checkIns).where(eq(checkIns.stationId, params.id))
  await db.delete(stations).where(eq(stations.id, params.id))

  return NextResponse.json({ success: true })
}
