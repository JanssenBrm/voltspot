export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { routes, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [route] = await db
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
    .where(eq(routes.id, params.id))
    .limit(1)

  if (!route) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(route)
}
