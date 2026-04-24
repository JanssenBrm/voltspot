'use client'

import { useEffect, useState } from 'react'
import {
  X,
  MapPin,
  Star,
  Zap,
  Navigation,
  CheckCircle,
  AlertCircle,
  XCircle,
  ExternalLink,
  Edit,
  Home,
  Trees,
  CircleDollarSign,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PLUG_COLORS, PLUG_FRIENDLY_NAMES, PLUG_ICONS, PlugType } from '@/lib/plugTypes'
import { calculateDistanceMeters } from '@/lib/geo'
import CheckInModal from '@/components/stations/CheckInModal'
import ClaimButton from '@/components/stations/ClaimButton'
import Image from 'next/image'
import Link from 'next/link'

interface StationDetail {
  id: string
  name: string
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  country: string | null
  status: string | null
  isFree: boolean | null
  isIndoor: boolean | null
  plugTypes: PlugType[] | null
  accessNotes: string | null
  claimedBy: string | null
  claimedAt: string | null
  photos: string[] | null
  recentCheckIns: Array<{
    id: string
    rating: number | null
    comment: string | null
    statusReported: string | null
    createdAt: string
    userName: string | null
    userAvatar: string | null
  }>
  owner: { id: string; name: string | null; avatarUrl: string | null } | null
}

interface StationPanelProps {
  stationId: string
  onClose: () => void
  userId: string | null
}

const STATUS_CONFIG = {
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

const MAX_CHECKIN_DISTANCE_METERS = 100

export default function StationPanel({ stationId, onClose, userId }: StationPanelProps) {
  const [station, setStation] = useState<StationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locating, setLocating] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stations/${stationId}`)
      .then((r) => r.json())
      .then(setStation)
      .finally(() => setLoading(false))
  }, [stationId])

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by your browser.')
      setLocating(false)
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationError(null)
        setLocating(false)
      },
      () => {
        setLocationError('Enable location access to check in within 100m of this station.')
        setLocating(false)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  const statusCfg = STATUS_CONFIG[(station?.status as keyof typeof STATUS_CONFIG) ?? 'unverified'] ?? STATUS_CONFIG.unverified
  const StatusIcon = statusCfg.icon
  const cityCountryLabel = [station?.city, station?.country].filter(Boolean).join(', ')
  const locationLabel =
    cityCountryLabel ||
    (station
      ? `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`
      : '')
  const distanceMeters =
    station && userCoords
      ? calculateDistanceMeters(userCoords.latitude, userCoords.longitude, station.latitude, station.longitude)
      : null
  const canCheckIn = distanceMeters != null && distanceMeters <= MAX_CHECKIN_DISTANCE_METERS
  const checkInDisabledReason = locating
    ? 'Checking your location...'
    : locationError
      ? locationError
      : distanceMeters == null
        ? `You need to be within ${MAX_CHECKIN_DISTANCE_METERS}m to check in.`
        : `Move closer to the station to check in. You are ${Math.round(distanceMeters)}m away (max ${MAX_CHECKIN_DISTANCE_METERS}m).`

  const refresh = () => {
    fetch(`/api/stations/${stationId}`)
      .then((r) => r.json())
      .then(setStation)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex-1 pr-3">
          {loading ? (
            <Skeleton className="h-6 w-48 mb-1" />
          ) : (
            <h2 className="font-semibold text-base leading-tight tracking-tight">{station?.name}</h2>
          )}
          {loading ? (
            <Skeleton className="h-4 w-32 mt-1" />
          ) : locationLabel ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              <span>{locationLabel}</span>
            </p>
          ) : null}
        </div>
        <button
          onClick={onClose}
          className="rounded-xl border border-border/70 bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Close station details"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : station ? (
            <>
              {/* Status + badges */}
              <div className="flex flex-wrap gap-2 bg-muted/30 py-3">
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
                    {station.plugTypes.map((pt) => (
                      <span
                        key={pt}
                        className={`text-xs px-2.5 py-1 rounded-xl font-medium border border-border/60 ${PLUG_COLORS[pt] ?? PLUG_COLORS.Other}`}
                      >
                        {PLUG_ICONS[pt] ?? '🔌'} {PLUG_FRIENDLY_NAMES[pt] ?? pt}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Access notes */}
              {station.accessNotes && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">Access Notes</p>
                  <p className="text-sm text-muted-foreground rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
                    {station.accessNotes}
                  </p>
                </div>
              )}

              {/* Owner */}
              {station.owner && (
                <div className="flex items-center gap-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={station.owner.avatarUrl ?? ''} />
                    <AvatarFallback>{station.owner.name?.[0] ?? 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">Owned by</span>
                  <span className="font-medium">{station.owner.name}</span>
                </div>
              )}

              {/* Photos */}
              {station.photos?.length ? (
                <div className="space-y-2">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={station.photos[photoIdx]}
                      alt={`Station photo ${photoIdx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  {station.photos.length > 1 && (
                    <div className="flex gap-1">
                      {station.photos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPhotoIdx(i)}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${i === photoIdx ? 'bg-green-500' : 'bg-muted'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  className="w-full h-10 rounded-xl shadow-sm hover:shadow"
                  onClick={() => setCheckInOpen(true)}
                  disabled={!canCheckIn}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Check In
                </Button>
                {!canCheckIn && (
                  <p className="text-xs text-muted-foreground rounded-xl border border-border/70 bg-muted/30 px-3 py-2">
                    {checkInDisabledReason}
                  </p>
                )}

                {!station.claimedBy && userId && (
                  <ClaimButton stationId={station.id} onClaimed={refresh} />
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl" asChild>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Directions
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-9 rounded-xl" asChild>
                    <Link href={`/stations/${station.id}`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Full Page
                    </Link>
                  </Button>
                </div>

                {userId === station.claimedBy && (
                  <Button variant="ghost" size="sm" className="rounded-xl p-4" asChild>
                    <Link href={`/stations/${station.id}?edit=1`}>
                      <Edit className="h-3 w-3 mr-1" />
                      Edit Station
                    </Link>
                  </Button>
                )}
              </div>

              {/* Check-ins */}
              {station.recentCheckIns.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Recent Check-ins</h3>
                  {station.recentCheckIns.map((ci) => (
                    <div key={ci.id} className="rounded-xl border border-border/60 bg-card p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={ci.userAvatar ?? ''} />
                            <AvatarFallback className="text-[10px]">{ci.userName?.[0] ?? '?'}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{ci.userName ?? 'Anonymous'}</span>
                        </div>
                        {ci.rating && (
                          <div className="flex">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < ci.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {ci.comment && <p className="text-xs text-muted-foreground">{ci.comment}</p>}
                      <p className="text-xs text-muted-foreground/60">
                        {new Date(ci.createdAt).toLocaleDateString()}
                        {ci.statusReported && ` · ${ci.statusReported}`}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive hover:bg-red-100 rounded-xl p-4" asChild>
                <Link href={`/stations/${station.id}?report=1`}>
                  Report an Issue
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Station not found.</p>
          )}
        </div>
      </ScrollArea>

      {station && (
        <CheckInModal
          open={checkInOpen}
          onClose={() => setCheckInOpen(false)}
          stationId={station.id}
          userId={userId}
          userLatitude={userCoords?.latitude ?? null}
          userLongitude={userCoords?.longitude ?? null}
        />
      )}
    </div>
  )
}
