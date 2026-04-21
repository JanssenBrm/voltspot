'use client'

import { useEffect, useState } from 'react'
import { X, MapPin, Star, Zap, Navigation, CheckCircle, AlertCircle, XCircle, ExternalLink, Edit, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PLUG_COLORS, PLUG_ICONS } from '@/lib/plugTypes'
import CheckInModal from '@/components/stations/CheckInModal'
import ClaimButton from '@/components/stations/ClaimButton'
import type { Session } from 'next-auth'
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
  plugTypes: string[] | null
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
  session: Session | null
}

const STATUS_CONFIG = {
  verified: { icon: CheckCircle, color: 'text-green-500', label: 'Verified' },
  unverified: { icon: AlertCircle, color: 'text-yellow-500', label: 'Unverified' },
  offline: { icon: XCircle, color: 'text-red-500', label: 'Offline' },
}

export default function StationPanel({ stationId, onClose, session }: StationPanelProps) {
  const [station, setStation] = useState<StationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [photoIdx, setPhotoIdx] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stations/${stationId}`)
      .then((r) => r.json())
      .then(setStation)
      .finally(() => setLoading(false))
  }, [stationId])

  const statusCfg = STATUS_CONFIG[(station?.status as keyof typeof STATUS_CONFIG) ?? 'unverified'] ?? STATUS_CONFIG.unverified
  const StatusIcon = statusCfg.icon

  const refresh = () => {
    fetch(`/api/stations/${stationId}`)
      .then((r) => r.json())
      .then(setStation)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b">
        <div className="flex-1 pr-2">
          {loading ? (
            <Skeleton className="h-6 w-48 mb-1" />
          ) : (
            <h2 className="font-semibold text-base leading-tight">{station?.name}</h2>
          )}
          {loading ? (
            <Skeleton className="h-4 w-32 mt-1" />
          ) : (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {[station?.city, station?.country].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : station ? (
            <>
              {/* Status + badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`flex items-center gap-1 text-sm font-medium ${statusCfg.color}`}>
                  <StatusIcon className="h-4 w-4" />
                  {statusCfg.label}
                </span>
                {station.isFree != null && (
                  <Badge variant={station.isFree ? 'default' : 'secondary'}>
                    {station.isFree ? '🆓 Free' : '💳 Paid'}
                  </Badge>
                )}
                {station.isIndoor != null && (
                  <Badge variant="outline">{station.isIndoor ? '🏠 Indoor' : '🌤 Outdoor'}</Badge>
                )}
              </div>

              {/* Plug types */}
              {station.plugTypes?.length ? (
                <div className="flex flex-wrap gap-1">
                  {station.plugTypes.map((pt) => (
                    <span key={pt} className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLUG_COLORS[pt] ?? PLUG_COLORS.Other}`}>
                      {PLUG_ICONS[pt] ?? '🔌'} {pt}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Access notes */}
              {station.accessNotes && (
                <p className="text-sm text-muted-foreground border-l-2 border-border pl-2">{station.accessNotes}</p>
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
                <Button className="w-full" onClick={() => setCheckInOpen(true)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Check In
                </Button>

                {!station.claimedBy && session?.user && (
                  <ClaimButton stationId={station.id} onClaimed={refresh} />
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Directions
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/stations/${station.id}`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Full Page
                    </Link>
                  </Button>
                </div>

                {session?.user?.id === station.claimedBy && (
                  <Button variant="ghost" size="sm" asChild>
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
                    <div key={ci.id} className="rounded-lg bg-muted/50 p-3 space-y-1">
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

              <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" asChild>
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
          session={session}
        />
      )}
    </div>
  )
}
