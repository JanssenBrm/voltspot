'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import LeaderboardTable from '@/components/gamification/LeaderboardTable'
import BadgeGrid from '@/components/gamification/BadgeGrid'
import { useUser } from '@clerk/nextjs'
import { Skeleton } from '@/components/ui/skeleton'

const COUNTRIES = [
  { code: '', name: 'Global' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AU', name: 'Australia' },
]

export default function ExplorePage() {
  const { user } = useUser()
  const [period, setPeriod] = useState<'alltime' | 'weekly'>('alltime')
  const [countryCode, setCountryCode] = useState('')
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [allBadges, setAllBadges] = useState<any[]>([])
  const [userBadgeSlugs, setUserBadgeSlugs] = useState<Set<string>>(new Set())
  const [earnedDates, setEarnedDates] = useState<Record<string, string>>({})
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const qs = new URLSearchParams({ period })
    if (countryCode) qs.set('country_code', countryCode)
    fetch(`/api/leaderboard?${qs}`)
      .then((r) => r.json())
      .then(setLeaderboard)
  }, [period, countryCode])

  useEffect(() => {
    fetch('/api/badges').then((r) => r.json()).then(setAllBadges).catch(() => {})
    fetch('/api/stats').then((r) => r.json()).then(setStats).catch(() => {})
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/users/${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        const slugs = new Set<string>((data.badges ?? []).map((b: any) => b.badge?.slug).filter(Boolean))
        setUserBadgeSlugs(slugs)
        const dates: Record<string, string> = {}
        for (const b of data.badges ?? []) {
          if (b.badge?.slug) dates[b.badge.slug] = b.earnedAt
        }
        setEarnedDates(dates)
      })
  }, [user])

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">⚡ Explore</h1>

      <Tabs defaultValue="leaderboard">
        <TabsList className="w-full">
          <TabsTrigger value="leaderboard" className="flex-1">🏆 Leaderboard</TabsTrigger>
          <TabsTrigger value="badges" className="flex-1">🎖 Badges</TabsTrigger>
          <TabsTrigger value="stats" className="flex-1">📊 Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4 mt-4">
          <div className="flex gap-2">
            <div className="flex rounded-lg border overflow-hidden">
              {(['alltime', 'weekly'] as const).map((p) => (
                <button
                  key={p}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${period === p ? 'bg-green-500 text-white' : 'hover:bg-muted'}`}
                  onClick={() => setPeriod(p)}
                >
                  {p === 'alltime' ? 'All Time' : 'Weekly'}
                </button>
              ))}
            </div>
            <Select value={countryCode} onValueChange={(v) => setCountryCode(v ?? '')}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <LeaderboardTable entries={leaderboard} />
        </TabsContent>

        <TabsContent value="badges" className="mt-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : (
            <BadgeGrid badges={allBadges} earnedSlugs={userBadgeSlugs} earnedDates={earnedDates} />
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          {stats ? (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Charging Stations', value: stats.stations.toLocaleString(), emoji: '⚡' },
                { label: 'Check-ins', value: stats.checkIns.toLocaleString(), emoji: '✅' },
                { label: 'Explorers', value: stats.users.toLocaleString(), emoji: '👥' },
                { label: 'Routes', value: stats.routes.toLocaleString(), emoji: '🛣️' },
                { label: 'Countries', value: stats.countries.toLocaleString(), emoji: '🌍' },
              ].map(({ label, value, emoji }) => (
                <div key={label} className="rounded-xl border bg-card p-4 text-center">
                  <div className="text-3xl mb-1">{emoji}</div>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
