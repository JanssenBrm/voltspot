import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { awardPoints } from '@/lib/points'
import { checkAndAwardBadges } from '@/lib/badges'

export async function getAuthUser() {
  const { userId } = await auth()
  if (!userId) return null

  const [existing] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (existing) return existing

  // User is authenticated in Clerk but not yet in our DB (e.g. first request on a
  // Vercel preview branch that has no webhook registered). Fetch the profile from
  // the Clerk SDK and provision the row on-demand.
  try {
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.getUser(userId)
    const email = clerkUser.emailAddresses?.[0]?.emailAddress
    if (!email) return null

    const [created] = await db
      .insert(users)
      .values({
        id: userId,
        email,
        name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
        avatarUrl: clerkUser.imageUrl || null,
      })
      .onConflictDoNothing()
      .returning()

    if (created) {
      await awardPoints(userId, 10)
      await checkAndAwardBadges(userId)
    }

    // Re-fetch so the returned object always reflects the DB row (including defaults).
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    return user ?? null
  } catch {
    return null
  }
}

export async function requireAuthUser() {
  const user = await getAuthUser()
  if (!user) throw new Error('Unauthorized')
  return user
}
