import { db } from '@/lib/db'
import { users, badges, userBadges, checkIns, stations } from '@/lib/db/schema'
import { eq, count, countDistinct, and, sql } from 'drizzle-orm'
import { awardPoints } from '@/lib/points'

export async function checkAndAwardBadges(userId: string) {
  const newBadges: Array<{ slug: string; name: string; icon: string | null; pointsValue: number | null }> = []

  // Get user stats
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return newBadges

  const [existingBadges] = await db
    .select({ badges: sql<string[]>`array_agg(badge_slug)` })
    .from(userBadges)
    .where(eq(userBadges.userId, userId))
  const earned = new Set(existingBadges?.badges ?? [])

  const [checkInStats] = await db
    .select({ distinctStations: countDistinct(checkIns.stationId) })
    .from(checkIns)
    .where(eq(checkIns.userId, userId))

  const [photoCount] = await db
    .select({ total: sql<number>`count(*)` })
    .from(stations)
    .where(
      and(
        eq(stations.claimedBy, userId),
        sql`array_length(photos, 1) > 0`,
      ),
    )

  const [reportCount] = await db
    .select({ total: count() })
    .from(checkIns)
    .where(and(eq(checkIns.userId, userId), eq(checkIns.statusReported, 'broken')))

  const [stationCount] = await db
    .select({ total: count() })
    .from(stations)
    .where(and(eq(stations.source, 'user'), eq(stations.claimedBy, userId)))

  const [routeCount] = await db
    .select({ total: count() })
    .from(sql`routes`)
    .where(sql`user_id = ${userId} AND is_public = true`)

  const [userCount] = await db.select({ total: count() }).from(users)

  const distinctStations = checkInStats?.distinctStations ?? 0
  const photos = Number(photoCount?.total ?? 0)
  const reports = reportCount?.total ?? 0
  const userTotal = userCount?.total ?? 0

  const allBadges = await db.select().from(badges)
  const badgeMap = new Map(allBadges.map((b) => [b.slug, b]))

  async function maybeAward(slug: string, condition: boolean) {
    if (condition && !earned.has(slug)) {
      const badge = badgeMap.get(slug)
      if (!badge) return
      try {
        await db.insert(userBadges).values({ userId, badgeSlug: slug })
        await awardPoints(userId, badge.pointsValue ?? 0)
        newBadges.push({ slug, name: badge.name, icon: badge.icon, pointsValue: badge.pointsValue })
        earned.add(slug)
      } catch {
        // already earned (race condition)
      }
    }
  }

  await maybeAward('explorer-10', distinctStations >= 10)
  await maybeAward('explorer-50', distinctStations >= 50)
  await maybeAward('explorer-100', distinctStations >= 100)
  await maybeAward('photographer', photos >= 10)
  await maybeAward('reporter', reports >= 5)
  await maybeAward('early-adopter', userTotal <= 1000)

  return newBadges
}
