'use client'

import { useEffect, useState } from 'react'
import RouteCard from '@/components/routes/RouteCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

const COUNTRIES = [
  { code: '', name: 'All Countries' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AU', name: 'Australia' },
]

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [countryCode, setCountryCode] = useState('')

  useEffect(() => {
    const qs = countryCode ? `?countryCode=${countryCode}` : ''
    fetch(`/api/routes${qs}`)
      .then((r) => r.json())
      .then(setRoutes)
      .finally(() => setLoading(false))
  }, [countryCode])

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🛣️ Routes</h1>
        <Button asChild>
          <Link href="/routes/new"><Plus className="h-4 w-4 mr-2" />New Route</Link>
        </Button>
      </div>

      <Select value={countryCode} onValueChange={(v) => setCountryCode(v ?? '')}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter by country" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : routes.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((r) => <RouteCard key={r.id} route={r} />)}
        </div>
      ) : (
        <div className="text-center py-16 space-y-3">
          <p className="text-5xl">🛣️</p>
          <p className="text-lg font-semibold">No routes yet</p>
          <p className="text-muted-foreground">Be the first to plan a community route!</p>
          <Button asChild><Link href="/routes/new">Create a Route</Link></Button>
        </div>
      )}
    </div>
  )
}
