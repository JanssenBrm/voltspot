'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'
import { MapPin, Navigation, Plus } from 'lucide-react'
import LocationPickerMap from '@/components/map/LocationPickerMap'

interface AddStationModalProps {
  open: boolean
  onClose: () => void
  onAdded: () => void
  initialLat?: number
  initialLng?: number
}

const BIKE_BRAND_OPTIONS = [
  'Bosch',
  'Shimano STEPS',
  'Yamaha',
  'Bafang',
  'Brose',
  'Mahle',
  'Specialized',
  'Giant',
]

const BYO_CHARGER_OPTION = 'Standard outlet (bring your own charger)'

export default function AddStationModal({ open, onClose, onAdded, initialLat, initialLng }: AddStationModalProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState(initialLat?.toString() ?? '')
  const [lng, setLng] = useState(initialLng?.toString() ?? '')
  const [supportsAllBrands, setSupportsAllBrands] = useState(false)
  const [supportedBrands, setSupportedBrands] = useState<string[]>([])
  const [customBrandInput, setCustomBrandInput] = useState('')
  const [customBrands, setCustomBrands] = useState<string[]>([])
  const [isFree, setIsFree] = useState(true)
  const [isIndoor, setIsIndoor] = useState(false)
  const [accessNotes, setAccessNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [mapViewLat, setMapViewLat] = useState<number | undefined>()
  const [mapViewLng, setMapViewLng] = useState<number | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)
  const brandOptions = useMemo(() => [...BIKE_BRAND_OPTIONS, ...customBrands], [customBrands])

  const reverseGeocode = useCallback(async (nextLat: string, nextLng: string) => {
    if (!nextLat || !nextLng) return
    setAddressLoading(true)
    try {
      const res = await fetch(`/api/geocode?lat=${encodeURIComponent(nextLat)}&lng=${encodeURIComponent(nextLng)}`)
      const data = await res.json()
      if (!res.ok || !data?.display_name) {
        toast.warning('Could not resolve an address for this location. You can enter it manually.')
      } else {
        setAddress(data.display_name)
      }
    } catch {
      toast.warning('Could not resolve an address for this location. You can enter it manually.')
    }
    setAddressLoading(false)
  }, [])

  const setCoordinates = useCallback((nextLat: string, nextLng: string) => {
    setLat(nextLat)
    setLng(nextLng)
    void reverseGeocode(nextLat, nextLng)
  }, [reverseGeocode])

  const getBrowserLocation = useCallback((): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('not-supported'))
        return
      }
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
      if (err?.message === 'not-supported') {
        toast.error('Geolocation is not supported on this device')
      } else {
        toast.error('Unable to access your current location')
      }
    } finally {
      setLocating(false)
    }
  }

  const openMapPicker = async () => {
    const isOpening = !showMapPicker
    setShowMapPicker(isOpening)
    if (!isOpening) return
    // Attempt to zoom map to user's location when opening
    try {
      const coords = await getBrowserLocation()
      setMapViewLat(coords.latitude)
      setMapViewLng(coords.longitude)
    } catch { /**/ }
  }

  const handleMapPick = useCallback((pickedLat: number, pickedLng: number) => {
    setCoordinates(String(pickedLat), String(pickedLng))
  }, [setCoordinates])

  const toggleBrand = (brand: string) => {
    setSupportedBrands((prev) => prev.includes(brand) ? prev.filter((p) => p !== brand) : [...prev, brand])
  }

  const addCustomBrand = () => {
    const newBrand = customBrandInput.trim()
    if (!newBrand) return
    if (!brandOptions.includes(newBrand)) {
      setCustomBrands((prev) => [...prev, newBrand])
    }
    if (!supportedBrands.includes(newBrand)) {
      setSupportedBrands((prev) => [...prev, newBrand])
    }
    setCustomBrandInput('')
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const compressed: File[] = []
    for (const f of Array.from(files).slice(0, 3)) {
      const c = await imageCompression(f, { maxSizeMB: 1, maxWidthOrHeight: 1920 })
      compressed.push(c)
    }
    setPhotos(compressed)
  }

  const submit = async () => {
    if (!name.trim() || !lat || !lng) {
      toast.error('Name and location are required')
      return
    }
    const compatibilityOptions = supportsAllBrands
      ? [BYO_CHARGER_OPTION, 'All e-bike brands']
      : supportedBrands

    setLoading(true)
    try {
      const res = await fetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          address: address || undefined,
          plugTypes: compatibilityOptions.length ? compatibilityOptions : undefined,
          isFree,
          isIndoor,
          accessNotes: accessNotes || undefined,
        }),
      })
      let data: { error?: string; station?: { id: string }; queued?: boolean } = {}
      try {
        data = await res.json()
      } catch {
        throw new Error('Failed to add station. Please try again.')
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed to add station. Please try again.')

      // Upload photos
      if (photos.length && data.station?.id) {
        const fd = new FormData()
        photos.forEach((p) => fd.append('photos', p))
        await fetch(`/api/stations/${data.station.id}/photos`, { method: 'POST', body: fd })
      }

      if (res.status === 202) {
        toast.success('Thanks! Your station request was submitted for review.')
      } else {
        toast.success('Station added! +30 points ⚡')
      }
      onAdded()
      onClose()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add station. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-screen h-[100dvh] max-w-none rounded-none border-0 p-5 pt-12 overflow-y-auto sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:p-7">
        <DialogHeader>
          <DialogTitle className="text-2xl sm:text-3xl">Add a Charging Station</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Station Name *</Label>
            <Input
              className="h-11 rounded-xl"
              placeholder="e.g. City Centre Charging Hub"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-border/70 p-4 bg-muted/20">
            <Label>Location *</Label>
            <p className="text-xs text-muted-foreground">
              Choose your location and we&apos;ll fill in the address automatically.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-11 px-5 rounded-xl" onClick={useCurrentLocation} disabled={locating}>
                <Navigation className="h-4 w-4 mr-1.5" />
                {locating ? 'Locating...' : 'Use my location'}
              </Button>
              <Button type="button" variant="outline" className="h-11 px-5 rounded-xl" onClick={openMapPicker}>
                <MapPin className="h-4 w-4 mr-1.5" />
                {showMapPicker ? 'Hide map picker' : 'Drop a pin on map'}
              </Button>
            </div>
            {showMapPicker && (
              <div className="rounded-xl border overflow-hidden">
                <p id="location-picker-map-help" className="sr-only">
                  Select a location on the map to set the station position.
                </p>
                <LocationPickerMap
                  lat={lat ? Number(lat) : undefined}
                  lng={lng ? Number(lng) : undefined}
                  viewLat={mapViewLat}
                  viewLng={mapViewLng}
                  onPick={handleMapPick}
                />
              </div>
            )}
            {(lat || lng) && (
              <p className="text-xs text-muted-foreground">
                Location selected ✓
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              className="h-11 rounded-xl px-4"
              placeholder={addressLoading ? 'Resolving address...' : 'Address is derived from selected location'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 p-4 bg-muted/20">
            <Label className="text-base">Bike charging compatibility</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="byo-charger"
                className="size-5 border-2 border-muted-foreground/40 bg-background"
                checked={supportsAllBrands}
                onCheckedChange={(checked) => setSupportsAllBrands(!!checked)}
              />
              <Label htmlFor="byo-charger" className="cursor-pointer">
                {BYO_CHARGER_OPTION} (supports all brands)
              </Label>
            </div>
            {!supportsAllBrands && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {brandOptions.map((brand) => (
                    <div key={brand} className="flex items-center gap-2">
                      <Checkbox
                        id={`brand-${brand}`}
                        className="size-5 border-2 border-muted-foreground/40 bg-background"
                        checked={supportedBrands.includes(brand)}
                        onCheckedChange={() => toggleBrand(brand)}
                      />
                      <Label htmlFor={`brand-${brand}`} className="text-sm cursor-pointer">{brand}</Label>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <Input
                    className="h-11 rounded-xl px-4"
                    placeholder="Add another supported brand"
                    value={customBrandInput}
                    onChange={(e) => setCustomBrandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustomBrand()
                      }
                    }}
                  />
                  <Button type="button" variant="outline" className="h-11 px-5 rounded-xl" onClick={addCustomBrand}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </>
            )}
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {supportsAllBrands ? 'Users should bring their own charger.' : `${supportedBrands.length} brand(s) selected.`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Station details</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 rounded-xl border p-3">
                <Checkbox
                  id="free-charging"
                  className="size-5 border-2 border-muted-foreground/40 bg-background"
                  checked={isFree}
                  onCheckedChange={(checked) => setIsFree(!!checked)}
                />
                <Label htmlFor="free-charging" className="cursor-pointer">Free charging</Label>
              </div>
              <div className="flex items-center gap-2 rounded-xl border p-3">
                <Checkbox
                  id="indoor-station"
                  className="size-5 border-2 border-muted-foreground/40 bg-background"
                  checked={isIndoor}
                  onCheckedChange={(checked) => setIsIndoor(!!checked)}
                />
                <Label htmlFor="indoor-station" className="cursor-pointer">Indoor</Label>
              </div>
            </div>
          </div>

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

          <div className="space-y-2">
            <Label>Photos (up to 3)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button variant="outline" className="w-full h-11 px-5 rounded-xl" onClick={() => fileRef.current?.click()}>
              {photos.length ? `${photos.length} photo(s) selected` : 'Choose photos'}
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1 h-11 px-5 rounded-xl">Cancel</Button>
            <Button onClick={submit} disabled={loading} className="flex-1 h-11 px-5 rounded-xl">
              {loading ? 'Adding...' : 'Add Station'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
