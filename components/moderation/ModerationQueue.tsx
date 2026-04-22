'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { CheckCircle, MapPin, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { PLUG_COLORS, PLUG_ICONS } from '@/lib/plugTypes'

const StationPreviewMap = dynamic(() => import('@/components/map/StationPreviewMap'), { ssr: false })

type ChangeRequest = {
  id: string
  stationId: string | null
  requestType: 'create' | 'edit' | 'delete'
  status: string
  payload: Record<string, unknown> | null
  createdAt: string
  stationName: string | null
}

const REQUEST_TYPE_STYLES: Record<string, string> = {
  create: 'border-transparent bg-emerald-600 text-white',
  edit: 'border-transparent bg-blue-600 text-white',
  delete: 'border-transparent bg-red-600 text-white',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  address: 'Address',
  city: 'City',
  country: 'Country',
  countryCode: 'Country code',
  latitude: 'Latitude',
  longitude: 'Longitude',
  isFree: 'Free to use',
  isIndoor: 'Indoor',
  accessNotes: 'Access notes',
  plugTypes: 'Plug types',
  photos: 'Photos',
}

function PayloadField({ label, value }: { label: string; value: unknown }) {
  if (label === 'plugTypes' && Array.isArray(value)) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground">{FIELD_LABELS.plugTypes}</span>
        <div className="flex flex-wrap gap-1">
          {(value as string[]).map((pt) => (
            <span key={pt} className={`text-xs px-2 py-0.5 rounded-full ${PLUG_COLORS[pt] ?? PLUG_COLORS.Other}`}>
              {PLUG_ICONS[pt] ?? '🔌'} {pt}
            </span>
          ))}
        </div>
      </div>
    )
  }

  if (label === 'photos' && Array.isArray(value)) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{FIELD_LABELS.photos}</span>
        <span className="text-sm">{value.length} photo{value.length !== 1 ? 's' : ''} attached</span>
      </div>
    )
  }

  if (label === 'isFree' || label === 'isIndoor') {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-muted-foreground">{FIELD_LABELS[label]}</span>
        <span className="text-sm">{value ? 'Yes' : 'No'}</span>
      </div>
    )
  }

  if (label === 'latitude' || label === 'longitude') {
    return null // rendered together as coordinates
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{FIELD_LABELS[label] ?? label}</span>
      <span className="text-sm break-words">{String(value)}</span>
    </div>
  )
}

function PayloadDisplay({ payload }: { payload: Record<string, unknown> }) {
  const lat = payload.latitude as number | undefined
  const lng = payload.longitude as number | undefined
  const hasCoords = lat != null && lng != null

  const entries = Object.entries(payload).filter(
    ([, v]) => v !== null && v !== undefined && v !== '',
  )

  if (entries.length === 0) return null

  return (
    <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
      {hasCoords && (
        <>
          <StationPreviewMap lat={lat} lng={lng} />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">Coordinates</span>
            <span className="text-sm flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </span>
          </div>
        </>
      )}
      {entries
        .filter(([k]) => k !== 'latitude' && k !== 'longitude')
        .map(([key, val]) => (
          <PayloadField key={key} label={key} value={val} />
        ))}
    </div>
  )
}

export default function ModerationQueue() {
  const [items, setItems] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/station-change-requests')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to load requests')
      setItems(data)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to load requests. Please check your permissions and network connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const review = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id)
    try {
      const res = await fetch(`/api/station-change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to review request')
      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success(action === 'approve' ? 'Request approved' : 'Request rejected')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to review request')
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <h1 className="text-2xl font-bold">Moderation queue</h1>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending requests — all caught up! 🎉</p>
      ) : (
        items.map((item) => (
          <Card key={item.id} className="rounded-xl p-4 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold truncate">{item.stationName ?? 'New station'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`h-7 rounded-full px-3 text-xs font-medium shrink-0 ${REQUEST_TYPE_STYLES[item.requestType] ?? ''}`}
              >
                {item.requestType}
              </Badge>
            </div>

            {item.payload && Object.keys(item.payload).length > 0 && (
              <>
                <Separator />
                <PayloadDisplay payload={item.payload} />
              </>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                className="rounded-full px-4 gap-1.5"
                onClick={() => review(item.id, 'approve')}
                disabled={processing === item.id}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full px-4 gap-1.5"
                onClick={() => review(item.id, 'reject')}
                disabled={processing === item.id}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
