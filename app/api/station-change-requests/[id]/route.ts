export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { checkIns, stationChangeRequests, stations, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { canModerate, definedOnly, sanitizeStationPayload, type SanitizedStationPayload } from '@/lib/stationChangeRequests'

function asPayload(payload: unknown) {
  return (payload ?? {}) as SanitizedStationPayload
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!canModerate(user?.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const action = body?.action === 'reject' ? 'reject' : body?.action === 'approve' ? 'approve' : null
  const reviewNote = typeof body?.reviewNote === 'string' ? body.reviewNote.trim().slice(0, 1000) : null
  if (!action) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const [changeRequest] = await db
    .select()
    .from(stationChangeRequests)
    .where(eq(stationChangeRequests.id, params.id))
    .limit(1)
  if (!changeRequest) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (changeRequest.status !== 'pending') {
    return NextResponse.json({ error: 'Request already reviewed' }, { status: 409 })
  }

  if (action === 'approve') {
    if (changeRequest.requestType === 'create') {
      const { payload, error } = sanitizeStationPayload(asPayload(changeRequest.payload), 'create')
      if (error) return NextResponse.json({ error }, { status: 400 })
      await db.insert(stations).values({
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
        photos: payload.photos,
        source: 'user',
        status: 'unverified',
      })
    }

    if (changeRequest.requestType === 'edit') {
      if (!changeRequest.stationId) return NextResponse.json({ error: 'Missing station' }, { status: 400 })
      const { payload, error } = sanitizeStationPayload(asPayload(changeRequest.payload), 'edit')
      if (error) return NextResponse.json({ error }, { status: 400 })
      await db
        .update(stations)
        .set({ ...definedOnly(payload), updatedAt: new Date() })
        .where(eq(stations.id, changeRequest.stationId))
    }

    if (changeRequest.requestType === 'delete') {
      if (!changeRequest.stationId) return NextResponse.json({ error: 'Missing station' }, { status: 400 })
      await db
        .update(stationChangeRequests)
        .set({ stationId: null, updatedAt: new Date() })
        .where(eq(stationChangeRequests.stationId, changeRequest.stationId))
      await db.delete(checkIns).where(eq(checkIns.stationId, changeRequest.stationId))
      await db.delete(stations).where(eq(stations.id, changeRequest.stationId))
    }
  }

  const [updatedRequest] = await db
    .update(stationChangeRequests)
    .set({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedBy: userId,
      reviewedAt: new Date(),
      reviewNote,
      updatedAt: new Date(),
    })
    .where(eq(stationChangeRequests.id, params.id))
    .returning()

  return NextResponse.json(updatedRequest)
}
