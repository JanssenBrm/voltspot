'use client'

import { useState } from 'react'
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
import { useRouter } from 'next/navigation'

interface StationStop {
  id: string
  name: string
  latitude: number
  longitude: number
  city: string | null
  country: string | null
  status: string | null
  isFree: boolean | null
  plugTypes: string[] | null
  claimedBy: string | null
}

function SortableStop({ station, onRemove }: { station: StationStop; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: station.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start">
      <button {...attributes} {...listeners} className="mt-3 text-muted-foreground cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <StationCard station={station} />
      </div>
      <button onClick={onRemove} className="mt-3 text-muted-foreground hover:text-destructive transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface RoutePlannerProps {
  initialStationId?: string | null
}

export default function RoutePlanner({ initialStationId }: RoutePlannerProps = {}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [stops, setStops] = useState<StationStop[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<StationStop[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const doSearch = async () => {
    if (!search.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/stations?bbox=-180,-90,180,90`)
      const all: StationStop[] = await res.json()
      const q = search.toLowerCase()
      setSearchResults(all.filter((s) => s.name?.toLowerCase().includes(q)).slice(0, 8))
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const addStop = (station: StationStop) => {
    if (stops.find((s) => s.id === station.id)) {
      toast.info('Station already added')
      return
    }
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
    if (stops.length < 2) { toast.error('Add at least 2 charging stops'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          stationIds: stops.map((s) => s.id),
          isPublic,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save route')
      toast.success('Route saved! 🛣️ +20 points')
      router.push(`/routes/${data.route.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save route')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="route-name">Route Name *</Label>
        <Input
          id="route-name"
          placeholder="e.g. City Centre Loop"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="route-desc">Description</Label>
        <Textarea
          id="route-desc"
          placeholder="Describe your route..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Search & Add Charging Stations</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search by station name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <Button variant="outline" onClick={doSearch} disabled={searching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="border rounded-lg overflow-hidden divide-y">
            {searchResults.map((s) => (
              <button
                key={s.id}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                onClick={() => addStop(s)}
              >
                <span className="font-medium">{s.name}</span>
                {s.status && (
                  <span className={`ml-2 text-xs ${s.status === 'verified' ? 'text-green-500' : s.status === 'offline' ? 'text-red-500' : 'text-yellow-500'}`}>
                    ● {s.status}
                  </span>
                )}
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

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label className="cursor-pointer">Make route public</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Public routes appear in the Routes directory</p>
        </div>
        <Switch checked={isPublic} onCheckedChange={setIsPublic} />
      </div>

      <Button onClick={save} disabled={loading || stops.length < 2} className="w-full" size="lg">
        {loading ? 'Saving...' : `Save Route${stops.length >= 2 ? ` (${stops.length} stops)` : ''}`}
      </Button>

      {stops.length < 2 && stops.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">Add at least one more stop to save</p>
      )}
    </div>
  )
}
