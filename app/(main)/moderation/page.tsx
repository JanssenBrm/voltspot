import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { canModerate } from '@/lib/stationChangeRequests'
import ModerationQueue from '@/components/moderation/ModerationQueue'

export default async function ModerationPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId)).limit(1)
  if (!canModerate(user?.role)) redirect('/')

  return <ModerationQueue />
}
