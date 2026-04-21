export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { stations } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const files = formData.getAll('photos') as File[]

  if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 })

  const [station] = await db.select().from(stations).where(eq(stations.id, params.id)).limit(1)
  if (!station) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const existingPhotos = station.photos ?? []
  const maxUpload = Math.min(files.length, 3, 15 - existingPhotos.length)

  if (maxUpload <= 0) return NextResponse.json({ error: 'Photo limit reached' }, { status: 400 })

  const uploaded: string[] = []
  for (const file of files.slice(0, maxUpload)) {
    const blob = await put(`stations/${params.id}/${Date.now()}-${file.name}`, file, {
      access: 'public',
    })
    uploaded.push(blob.url)
  }

  await db
    .update(stations)
    .set({ photos: [...existingPhotos, ...uploaded], updatedAt: new Date() })
    .where(eq(stations.id, params.id))

  await awardPoints(session.user.id, 15 * uploaded.length)
  const newBadges = await checkAndAwardBadges(session.user.id)

  return NextResponse.json({ photos: uploaded, newBadges })
}
