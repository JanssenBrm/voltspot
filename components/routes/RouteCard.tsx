import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Zap, Route } from 'lucide-react'
import { PLUG_COLORS, PLUG_ICONS } from '@/lib/plugTypes'

interface RouteCardProps {
  route: {
    id: string
    name: string
    description: string | null
    stationIds: string[] | null
    distanceKm: number | null
    creatorName: string | null
    creatorAvatar: string | null
    createdAt: string | null
  }
}

export default function RouteCard({ route }: RouteCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold leading-tight">{route.name}</h3>
          {route.description && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{route.description}</p>
          )}
        </div>
        <Route className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Zap className="h-3.5 w-3.5" />
          {route.stationIds?.length ?? 0} stops
        </span>
        {route.distanceKm && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {route.distanceKm.toFixed(1)} km
          </span>
        )}
      </div>

      {route.creatorName && (
        <p className="text-xs text-muted-foreground">by {route.creatorName}</p>
      )}

      <Button variant="outline" size="sm" className="w-full" asChild>
        <Link href={`/routes/${route.id}`}>View Route</Link>
      </Button>
    </div>
  )
}
