export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { stations, checkIns, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

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
  const { auth } = await import('@clerk/nextjs/server')
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [station] = await db.select().from(stations).where(eq(stations.id, params.id)).limit(1)
  if (!station) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isOwner = station.claimedBy === userId
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  const isAdmin = user?.role === 'admin'

  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, accessNotes, plugTypes, photos, isIndoor, isFree } = body

  const [updated] = await db
    .update(stations)
    .set({ name, accessNotes, plugTypes, photos, isIndoor, isFree, updatedAt: new Date() })
    .where(eq(stations.id, params.id))
    .returning()

  return NextResponse.json(updated)
}
