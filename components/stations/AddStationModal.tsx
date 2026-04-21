'use client'

import { useState, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { ALL_PLUG_TYPES } from '@/lib/plugTypes'
import imageCompression from 'browser-image-compression'

interface AddStationModalProps {
  open: boolean
  onClose: () => void
  onAdded: () => void
  initialLat?: number
  initialLng?: number
}

export default function AddStationModal({ open, onClose, onAdded, initialLat, initialLng }: AddStationModalProps) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState(initialLat?.toString() ?? '')
  const [lng, setLng] = useState(initialLng?.toString() ?? '')
  const [plugTypes, setPlugTypes] = useState<string[]>([])
  const [isFree, setIsFree] = useState(true)
  const [isIndoor, setIsIndoor] = useState(false)
  const [accessNotes, setAccessNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const geocodeAddress = useCallback(async () => {
    if (!address.trim()) return
    setAddressLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      )
      const data = await res.json()
      if (data[0]) {
        setLat(data[0].lat)
        setLng(data[0].lon)
      }
    } catch { /**/ }
    setAddressLoading(false)
  }, [address])

  const togglePlug = (plug: string) => {
    setPlugTypes((prev) => prev.includes(plug) ? prev.filter((p) => p !== plug) : [...prev, plug])
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
          plugTypes: plugTypes.length ? plugTypes : undefined,
          isFree,
          isIndoor,
          accessNotes: accessNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      // Upload photos
      if (photos.length && data.station?.id) {
        const fd = new FormData()
        photos.forEach((p) => fd.append('photos', p))
        await fetch(`/api/stations/${data.station.id}/photos`, { method: 'POST', body: fd })
      }

      toast.success('Station added! +30 points ⚡')
      onAdded()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a Charging Station</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Station Name *</Label>
            <Input placeholder="e.g. City Centre Charging Hub" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Address</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Street address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={geocodeAddress}
              />
              <Button variant="outline" size="sm" onClick={geocodeAddress} disabled={addressLoading}>
                {addressLoading ? '...' : '📍'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Latitude *</Label>
              <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Longitude *</Label>
              <Input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Plug Types</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PLUG_TYPES.map((p) => (
                <div key={p} className="flex items-center gap-2">
                  <Checkbox
                    id={`plug-${p}`}
                    checked={plugTypes.includes(p)}
                    onCheckedChange={() => togglePlug(p)}
                  />
                  <Label htmlFor={`plug-${p}`} className="text-sm cursor-pointer">{p}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label>Free charging</Label>
            <Switch checked={isFree} onCheckedChange={setIsFree} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Indoor</Label>
            <Switch checked={isIndoor} onCheckedChange={setIsIndoor} />
          </div>

          <div className="space-y-1">
            <Label>Access Notes</Label>
            <Textarea placeholder="Any special access info..." value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} rows={2} />
          </div>

          <div className="space-y-1">
            <Label>Photos (up to 3)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
              {photos.length ? `${photos.length} photo(s) selected` : 'Choose photos'}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={submit} disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Station'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
