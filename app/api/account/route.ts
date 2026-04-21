export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await req.json()

  const [updated] = await db
    .update(users)
    .set({ name })
    .where(eq(users.id, userId))
    .returning()

  return NextResponse.json(updated)
}

export async function DELETE() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO: For full account deletion, also call Clerk's backend SDK to delete the Clerk user
  await db.delete(users).where(eq(users.id, userId))
  return NextResponse.json({ success: true })
}
