import { notFound } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import PointsBadge from '@/components/gamification/PointsBadge'
import BadgeGrid from '@/components/gamification/BadgeGrid'
import StationCard from '@/components/stations/StationCard'
import RouteCard from '@/components/routes/RouteCard'
import { CalendarDays, CheckCircle } from 'lucide-react'

async function getUser(id: string) {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/users/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const user = await getUser(params.username)
  if (!user) notFound()

  const earnedSlugs = new Set<string>((user.badges ?? []).map((b: any) => b.badge?.slug).filter(Boolean))
  const earnedDates: Record<string, string> = {}
  for (const b of user.badges ?? []) {
    if (b.badge?.slug) earnedDates[b.badge.slug] = b.earnedAt
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      {/* Profile header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user.avatarUrl ?? ''} />
          <AvatarFallback className="text-2xl">{user.name?.[0] ?? '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.name ?? 'Explorer'}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              {user.checkInCount} check-ins
            </span>
          </div>
          <div className="mt-2">
            <PointsBadge points={user.points ?? 0} />
          </div>
        </div>
      </div>

      {/* Badges */}
      {user.badges?.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3">Badges</h2>
          <BadgeGrid
            badges={(user.badges ?? []).map((b: any) => b.badge).filter(Boolean)}
            earnedSlugs={earnedSlugs}
            earnedDates={earnedDates}
          />
        </section>
      )}

      {/* Claimed stations */}
      {user.claimedStations?.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3">Claimed Stations ({user.claimedStations.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.claimedStations.map((s: any) => (
              <StationCard key={s.id} station={s} />
            ))}
          </div>
        </section>
      )}

      {/* Routes */}
      {user.routes?.length > 0 && (
        <section>
          <h2 className="font-semibold text-lg mb-3">Routes ({user.routes.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.routes.map((r: any) => (
              <RouteCard key={r.id} route={r} />
            ))}
          </div>
        </section>
      )}

      {!user.badges?.length && !user.claimedStations?.length && !user.routes?.length && (
        <div className="text-center py-8">
          <p className="text-4xl mb-2">🌱</p>
          <p className="text-muted-foreground">Just getting started. Watch this space!</p>
        </div>
      )}
    </div>
  )
}
