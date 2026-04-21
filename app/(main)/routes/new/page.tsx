'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import StationCard from '@/components/stations/StationCard'
import { Search, X, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function SortableStop({ station, onRemove }: { station: any; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: station.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
      <button {...attributes} {...listeners} className="mt-3 text-muted-foreground cursor-grab">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <StationCard station={station} />
      </div>
      <button onClick={onRemove} className="mt-3 text-muted-foreground hover:text-destructive">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function NewRoutePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [stops, setStops] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/signin')
  }, [status, router])

  const doSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    const res = await fetch(`/api/stations?bbox=-180,-90,180,90`)
    const all = await res.json()
    const q = search.toLowerCase()
    setSearchResults(all.filter((s: any) => s.name?.toLowerCase().includes(q)).slice(0, 5))
    setSearching(false)
  }

  const addStop = (station: any) => {
    if (stops.find((s) => s.id === station.id)) return
    setStops((prev) => [...prev, station])
    setSearchResults([])
    setSearch('')
  }

  const removeStop = (id: string) => setStops((prev) => prev.filter((s) => s.id !== id))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setStops((items) => {
        const oldIdx = items.findIndex((i) => i.id === active.id)
        const newIdx = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIdx, newIdx)
      })
    }
  }

  const save = async () => {
    if (!name.trim()) { toast.error('Route name is required'); return }
    if (stops.length < 2) { toast.error('Add at least 2 stops'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, stationIds: stops.map((s) => s.id), isPublic }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Route saved! 🛣️')
      router.push(`/routes/${data.route.id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">New Route</h1>

      <div className="space-y-2">
        <Label>Route Name *</Label>
        <Input placeholder="e.g. City Loop Ride" value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea placeholder="Describe your route..." value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>

      <div className="space-y-2">
        <Label>Search & Add Stations</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search station name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <Button variant="outline" onClick={doSearch} disabled={searching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            {searchResults.map((s) => (
              <button
                key={s.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b last:border-0"
                onClick={() => addStop(s)}
              >
                <span className="font-medium">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {stops.length > 0 && (
        <div className="space-y-2">
          <Label>Stops ({stops.length})</Label>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {stops.map((s) => (
                  <SortableStop key={s.id} station={s} onRemove={() => removeStop(s.id)} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label>Public route</Label>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
      </div>

      <Button onClick={save} disabled={loading} className="w-full">
        {loading ? 'Saving...' : 'Save Route'}
      </Button>
    </div>
  )
}
