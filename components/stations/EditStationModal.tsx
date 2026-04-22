'use client'

import { useState, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { MapPin, Navigation } from 'lucide-react'
import dynamic from 'next/dynamic'
import { ALL_PLUG_TYPES } from '@/lib/plugTypes'

const LocationPickerMap = dynamic(() => import('@/components/map/LocationPickerMap'), { ssr: false })

export interface EditableStation {
  id: string
  name: string
  latitude: number
  longitude: number
  address: string | null
  city: string | null
  country: string | null
  countryCode: string | null
  plugTypes: string[] | null
  isFree: boolean | null
  isIndoor: boolean | null
  accessNotes: string | null
}

interface EditStationModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  station: EditableStation
}

export default function EditStationModal({ open, onClose, onSaved, station }: EditStationModalProps) {
  const [name, setName] = useState(station.name)
  const [lat, setLat] = useState(String(station.latitude))
  const [lng, setLng] = useState(String(station.longitude))
  const [address, setAddress] = useState(station.address ?? '')
  const [city, setCity] = useState(station.city ?? '')
  const [country, setCountry] = useState(station.country ?? '')
  const [countryCode, setCountryCode] = useState(station.countryCode ?? '')
  const [plugTypes, setPlugTypes] = useState<string[]>(station.plugTypes ?? [])
  const [isFree, setIsFree] = useState(station.isFree ?? true)
  const [isIndoor, setIsIndoor] = useState(station.isIndoor ?? false)
  const [accessNotes, setAccessNotes] = useState(station.accessNotes ?? '')
  const [loading, setLoading] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapViewLat, setMapViewLat] = useState<number | undefined>()
  const [mapViewLng, setMapViewLng] = useState<number | undefined>()
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; location?: string }>({})

  const reverseGeocode = useCallback(async (nextLat: string, nextLng: string) => {
    if (!nextLat || !nextLng) return
    setAddressLoading(true)
    try {
      const res = await fetch(`/api/geocode?lat=${encodeURIComponent(nextLat)}&lng=${encodeURIComponent(nextLng)}`)
      const data = await res.json()
      if (res.ok && data?.display_name) {
        setAddress(data.display_name)
      }
    } catch { /**/ }
    setAddressLoading(false)
  }, [])

  const setCoordinates = useCallback((nextLat: string, nextLng: string) => {
    setLat(nextLat)
    setLng(nextLng)
    setFieldErrors((prev) => ({ ...prev, location: undefined }))
    void reverseGeocode(nextLat, nextLng)
  }, [reverseGeocode])

  const getBrowserLocation = useCallback((): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('not-supported')); return }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { timeout: 15000 },
      )
    })
  }, [])

  const useCurrentLocation = async () => {
    setLocating(true)
    try {
      const coords = await getBrowserLocation()
      setCoordinates(String(coords.latitude), String(coords.longitude))
    } catch (err: any) {
      toast.error(err?.message === 'not-supported' ? 'Geolocation is not supported on this device' : 'Unable to access your current location')
    } finally {
      setLocating(false)
    }
  }

  const openMapPicker = async () => {
    const isOpening = !showMapPicker
    setShowMapPicker(isOpening)
    if (!isOpening) return
    try {
      const coords = await getBrowserLocation()
      setMapViewLat(coords.latitude)
      setMapViewLng(coords.longitude)
    } catch { /**/ }
  }

  const handleMapPick = useCallback((pickedLat: number, pickedLng: number) => {
    setCoordinates(String(pickedLat), String(pickedLng))
  }, [setCoordinates])

  const togglePlugType = (pt: string) => {
    setPlugTypes((prev) => prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt])
  }

  const submit = async () => {
    const newErrors: { name?: string; location?: string } = {}
    if (!name.trim()) newErrors.name = 'Please enter a station name'
    if (!lat || !lng) newErrors.location = 'Please select a location'
    if (Object.keys(newErrors).length) { setFieldErrors(newErrors); return }
    setFieldErrors({})

    setLoading(true)
    try {
      const res = await fetch(`/api/stations/${station.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          address: address || undefined,
          city: city || undefined,
          country: country || undefined,
          countryCode: countryCode || undefined,
          plugTypes: plugTypes.length ? plugTypes : undefined,
          isFree,
          isIndoor,
          accessNotes: accessNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save changes')
      toast.success(res.status === 202 ? 'Edit suggestion submitted for review' : 'Station updated!')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save changes')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-screen h-[100dvh] max-w-none rounded-none border-0 p-5 pt-12 overflow-y-auto sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl">Edit Station</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label>Station Name *</Label>
            <Input
              className={`h-11 rounded-xl ${fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              placeholder="e.g. City Centre Charging Hub"
              value={name}
              onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) setFieldErrors((p) => ({ ...p, name: undefined })) }}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          {/* Location */}
          <div className={`space-y-2 rounded-2xl border p-4 bg-muted/20 ${fieldErrors.location ? 'border-destructive' : 'border-border/70'}`}>
            <Label>Location *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-11 p-4 rounded-xl" onClick={useCurrentLocation} disabled={locating}>
                <Navigation className="h-4 w-4 mr-1.5" />
                {locating ? 'Locating...' : 'Use my location'}
              </Button>
              <Button type="button" variant="outline" className="h-11 p-4 rounded-xl" onClick={openMapPicker}>
                <MapPin className="h-4 w-4 mr-1.5" />
                {showMapPicker ? 'Hide map picker' : 'Drop a pin on map'}
              </Button>
            </div>
            {showMapPicker && (
              <div className="rounded-xl border overflow-hidden">
                <p id="edit-location-picker-map-help" className="sr-only">Select a location on the map to update the station position.</p>
                <LocationPickerMap
                  lat={lat ? Number(lat) : undefined}
                  lng={lng ? Number(lng) : undefined}
                  viewLat={mapViewLat}
                  viewLng={mapViewLng}
                  onPick={handleMapPick}
                />
              </div>
            )}
            {lat && lng ? (
              <p className="text-xs text-muted-foreground">
                <MapPin className="inline h-3 w-3 mr-0.5" />
                {parseFloat(lat).toFixed(6)}, {parseFloat(lng).toFixed(6)}
              </p>
            ) : fieldErrors.location ? (
              <p className="text-xs text-destructive">{fieldErrors.location}</p>
            ) : null}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              className="h-11 rounded-xl px-4"
              placeholder={addressLoading ? 'Resolving address...' : 'Street address or description'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* City / Country / Country Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>City <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input className="h-11 rounded-xl" placeholder="Brussels" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Country <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input className="h-11 rounded-xl" placeholder="Belgium" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Country Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input className="h-11 rounded-xl" placeholder="BE" maxLength={3} value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
            </div>
          </div>

          {/* Plug types */}
          <div className="space-y-3 rounded-2xl border border-border/70 p-4 bg-muted/20">
            <Label className="text-base">Plug types</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PLUG_TYPES.map((pt) => (
                <div key={pt} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-pt-${pt}`}
                    className="size-5 border-2 border-muted-foreground/40 bg-background"
                    checked={plugTypes.includes(pt)}
                    onCheckedChange={() => togglePlugType(pt)}
                  />
                  <Label htmlFor={`edit-pt-${pt}`} className="text-sm cursor-pointer">{pt}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Station details */}
          <div className="space-y-2">
            <Label>Station details</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl border p-3">
                <Checkbox
                  id="edit-free-charging"
                  className="size-5 border-2 border-muted-foreground/40 bg-background"
                  checked={isFree}
                  onCheckedChange={(checked) => setIsFree(!!checked)}
                />
                <Label htmlFor="edit-free-charging" className="cursor-pointer">Free charging</Label>
              </div>
              <div className="flex items-center gap-2 rounded-xl border p-3">
                <Checkbox
                  id="edit-indoor-station"
                  className="size-5 border-2 border-muted-foreground/40 bg-background"
                  checked={isIndoor}
                  onCheckedChange={(checked) => setIsIndoor(!!checked)}
                />
                <Label htmlFor="edit-indoor-station" className="cursor-pointer">Indoor</Label>
              </div>
            </div>
          </div>

          {/* Access notes */}
          <div className="space-y-2">
            <Label>Access Notes</Label>
            <Textarea
              className="rounded-xl"
              placeholder="Any special access info..."
              value={accessNotes}
              onChange={(e) => setAccessNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 p-4 rounded-xl">Cancel</Button>
            <Button onClick={submit} disabled={loading} className="flex-1 p-4 rounded-xl">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
