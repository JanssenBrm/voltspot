import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Navigation,
  Star,
  CheckCircle,
  AlertCircle,
  XCircle,
  Flag,
  Home,
  Trees,
  CircleDollarSign,
  Wallet,
} from 'lucide-react'
import { PLUG_COLORS, PLUG_FRIENDLY_NAMES, PLUG_ICONS, PlugType } from '@/lib/plugTypes'
import Image from 'next/image'

async function getStation(id: string) {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const res = await fetch(`${base}/api/stations/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const station = await getStation(params.id)
  if (!station) return { title: 'Station Not Found — VoltSpot' }
  return {
    title: `${station.name} — VoltSpot`,
    description: `E-bike charging station in ${[station.city, station.country].filter(Boolean).join(', ')}. ${station.plugTypes?.join(', ') ?? ''} ${station.isFree ? 'Free charging.' : ''}`.trim(),
  }
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  verified: {
    icon: CheckCircle,
    label: 'Verified',
    badgeClass: 'border-transparent bg-emerald-600 text-white',
  },
  unverified: {
    icon: AlertCircle,
    label: 'Unverified',
    badgeClass: 'border-transparent bg-amber-500 text-white',
  },
  offline: {
    icon: XCircle,
    label: 'Offline',
    badgeClass: 'border-transparent bg-red-600 text-white',
  },
}

export default async function StationDetailPage({ params }: { params: { id: string } }) {
  const station = await getStation(params.id)
  if (!station) notFound()

  const statusCfg = STATUS_CONFIG[station.status ?? 'unverified'] ?? STATUS_CONFIG.unverified
  const StatusIcon = statusCfg.icon
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapImageUrl = mapboxToken
    ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+22c55e(${station.longitude},${station.latitude})/${station.longitude},${station.latitude},14,0/600x300?access_token=${mapboxToken}`
    : null
  const locationLabel =
    [station.address, station.city, station.country].filter(Boolean).join(', ') ||
    `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: station.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: station.address,
      addressLocality: station.city,
      addressCountry: station.countryCode,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: station.latitude,
      longitude: station.longitude,
    },
    url: `${process.env.NEXTAUTH_URL}/stations/${station.id}`,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
        {/* Map thumbnail */}
        {mapImageUrl && (
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/70 bg-muted shadow-sm">
            <Image src={mapImageUrl} alt="Station map" fill className="object-cover" />
          </div>
        )}

        <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-5">
          <h1 className="text-2xl font-semibold tracking-tight">{station.name}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {locationLabel}
          </p>
        </div>

        {/* Status + badges */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/30 p-3">
          <Badge
            variant="outline"
            className={`h-7 rounded-full gap-1.5 px-3 text-xs font-medium ${statusCfg.badgeClass}`}
          >
            <StatusIcon className="h-4 w-4" />
            {statusCfg.label}
          </Badge>
          {station.isFree != null && (
            <Badge
              variant={station.isFree ? 'default' : 'secondary'}
              className={station.isFree
                ? 'h-7 rounded-full gap-1.5 px-3 text-xs font-medium border-transparent bg-emerald-600 text-white'
                : 'h-7 rounded-full gap-1.5 px-3 text-xs font-medium border border-border/70 bg-secondary text-secondary-foreground'}
            >
              {station.isFree ? <CircleDollarSign className="h-3 w-3" /> : <Wallet className="h-3 w-3" />}
              {station.isFree ? 'Free to use' : 'Paid'}
            </Badge>
          )}
          {station.isIndoor != null && (
            <Badge
              variant="outline"
              className="h-7 rounded-full gap-1.5 px-3 text-xs font-medium border border-border/70 bg-background/80"
            >
              {station.isIndoor ? <Home className="h-3 w-3" /> : <Trees className="h-3 w-3" />}
              {station.isIndoor ? 'Indoor' : 'Outdoor'}
            </Badge>
          )}
        </div>

        {/* Plug types */}
        {station.plugTypes?.length ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">Plug Types</p>
            <div className="flex flex-wrap gap-1.5">
              {station.plugTypes.map((pt: string) => (
                <span
                  key={pt}
                  className={`text-xs px-2.5 py-1 rounded-xl border border-border/60 font-medium ${PLUG_COLORS[pt] ?? PLUG_COLORS.Other}`}
                >
                  {PLUG_ICONS[pt] ?? '🔌'} {PLUG_FRIENDLY_NAMES[pt as PlugType] ?? pt}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {station.accessNotes && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">Access Notes</p>
            <p className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
              {station.accessNotes}
            </p>
          </div>
        )}

        {/* Owner */}
        {station.owner && (
          <p className="text-sm flex items-center gap-2">
            <Flag className="h-4 w-4 text-blue-500" />
            Owned by <span className="font-medium">{station.owner.name}</span>
          </p>
        )}

        {/* Actions */}
        <div>
          <Button className="h-10 rounded-xl px-4 shadow-sm hover:shadow" asChild>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation className="h-4 w-4 mr-2" />
              Get Directions
            </a>
          </Button>
        </div>

        {/* Photos */}
        {station.photos?.length ? (
          <div className="grid grid-cols-2 gap-2">
            {station.photos.map((url: string, i: number) => (
              <div key={i} className="relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted">
                <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}

        {/* Check-in history */}
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Check-ins</h2>
          {station.recentCheckIns?.length ? (
            station.recentCheckIns.map((ci: any) => (
              <div key={ci.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{ci.userName ?? 'Anonymous'}</span>
                  {ci.rating && (
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < ci.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {ci.comment && <p className="text-sm">{ci.comment}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(ci.createdAt).toLocaleDateString()}
                  {ci.statusReported && ` · ${ci.statusReported}`}
                </p>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No check-ins yet. Be the first! ⚡</p>
          )}
        </div>
      </div>
    </>
  )
}
