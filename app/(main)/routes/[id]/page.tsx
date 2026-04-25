import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation, Copy, User } from 'lucide-react'
import StationCard from '@/components/stations/StationCard'

const appBase = process.env.NEXTAUTH_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

async function getRoute(id: string) {
  const res = await fetch(`${appBase}/api/routes/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

async function getStations(ids: string[]) {
  const results = await Promise.all(
    ids.map((id) =>
      fetch(`${appBase}/api/stations/${id}`, { cache: 'no-store' })
        .then((r) => r.json())
        .catch(() => null),
    ),
  )
  return results.filter(Boolean)
}

export default async function RouteDetailPage({ params }: { params: { id: string } }) {
  const route = await getRoute(params.id)
  if (!route) notFound()

  const stations = route.stationIds?.length ? await getStations(route.stationIds) : []

  const mapsUrl = stations.length
    ? `https://www.google.com/maps/dir/${stations.map((s: any) => `${s.latitude},${s.longitude}`).join('/')}`
    : null

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{route.name}</h1>
        {route.description && <p className="text-muted-foreground mt-1">{route.description}</p>}
        {route.creatorName && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            Created by {route.creatorName}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {mapsUrl && (
          <Button asChild>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Navigation className="h-4 w-4 mr-2" />
              Start in Google Maps
            </a>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/routes/new?clone=${route.id}`}>
            Clone Route
          </Link>
        </Button>
      </div>

      {stations.length ? (
        <div className="space-y-3">
          <h2 className="font-semibold">
            {stations.length} Charging Stop{stations.length !== 1 ? 's' : ''}
            {route.distanceKm && <span className="text-muted-foreground font-normal ml-2">· {route.distanceKm.toFixed(1)} km</span>}
          </h2>
          {stations.map((s: any, i: number) => (
            <div key={s.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                {i < stations.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
              </div>
              <div className="flex-1 pb-4">
                <StationCard station={s} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-center py-8">No stops on this route.</p>
      )}
    </div>
  )
}
