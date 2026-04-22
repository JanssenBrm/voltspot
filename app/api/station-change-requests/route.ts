export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { stationChangeRequests, stations, users } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { canModerate, sanitizeStationPayload, STATION_CHANGE_TYPES, type StationChangeType } from '@/lib/stationChangeRequests'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!canModerate(user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = await db
    .select({
      id: stationChangeRequests.id,
      stationId: stationChangeRequests.stationId,
      requestType: stationChangeRequests.requestType,
      status: stationChangeRequests.status,
      payload: stationChangeRequests.payload,
      createdAt: stationChangeRequests.createdAt,
      requestedBy: stationChangeRequests.requestedBy,
      stationName: stations.name,
    })
    .from(stationChangeRequests)
    .leftJoin(stations, eq(stationChangeRequests.stationId, stations.id))
    .where(eq(stationChangeRequests.status, 'pending'))
    .orderBy(desc(stationChangeRequests.createdAt))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  const body = await req.json()
  const requestType = body?.requestType as StationChangeType | undefined
  const stationId = typeof body?.stationId === 'string' ? body.stationId : undefined

  if (!requestType || !STATION_CHANGE_TYPES.includes(requestType)) {
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  }

  if (requestType !== 'create') {
    if (!stationId) return NextResponse.json({ error: 'Station id is required' }, { status: 400 })
    const [station] = await db.select({ id: stations.id }).from(stations).where(eq(stations.id, stationId)).limit(1)
    if (!station) return NextResponse.json({ error: 'Station not found' }, { status: 404 })
  }

  const { payload, error } = sanitizeStationPayload(body?.payload ?? {}, requestType)
  if (requestType !== 'delete' && error) return NextResponse.json({ error }, { status: 400 })

  const [created] = await db
    .insert(stationChangeRequests)
    .values({
      stationId: stationId ?? null,
      requestType,
      status: 'pending',
      payload: requestType === 'delete' ? {} : (payload as Record<string, unknown>),
      requestedBy: userId ?? null,
    })
    .returning({ id: stationChangeRequests.id, status: stationChangeRequests.status })

  return NextResponse.json({ request: created }, { status: 201 })
}
