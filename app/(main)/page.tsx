'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useUser } from '@clerk/nextjs'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import SearchBar from '@/components/map/SearchBar'
import MapFilters, { type Filters } from '@/components/map/MapFilters'
import StationDrawer from '@/components/map/StationDrawer'
import AddStationModal from '@/components/stations/AddStationModal'
import StationPanel from '@/components/map/StationPanel'
import type { StationMarkerData } from '@/components/map/VoltMap'
import { toast } from 'sonner'

const VoltMap = dynamic(() => import('@/components/map/VoltMap'), { ssr: false })

const DEFAULT_FILTERS: Filters = {
  plugType: 'all',
  freeOnly: false,
  verifiedOnly: false,
  indoorOnly: false,
}

export default function HomePage() {
  const { user } = useUser()
  const [stations, setStations] = useState<StationMarkerData[]>([])
  const [selectedStation, setSelectedStation] = useState<StationMarkerData | null>(null)
  const [bbox, setBbox] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const updateIsMobile = () => setIsMobile(mediaQuery.matches)

    updateIsMobile()
    mediaQuery.addEventListener('change', updateIsMobile)

    return () => mediaQuery.removeEventListener('change', updateIsMobile)
  }, [])

  const fetchStations = useCallback(async (currentBbox: string, currentFilters: Filters) => {
    const params = new URLSearchParams({ bbox: currentBbox })
    if (currentFilters.plugType !== 'all') params.set('plugType', currentFilters.plugType)
    if (currentFilters.freeOnly) params.set('freeOnly', 'true')
    if (currentFilters.verifiedOnly) params.set('verifiedOnly', 'true')
    if (currentFilters.indoorOnly) params.set('indoorOnly', 'true')
    const res = await fetch(`/api/stations?${params}`)
    if (res.ok) setStations(await res.json())
  }, [])

  useEffect(() => {
    if (bbox) fetchStations(bbox, filters)
  }, [bbox, filters, fetchStations])

  const handleBboxChange = useCallback((newBbox: string) => {
    setBbox(newBbox)
  }, [])

  const handleLocationFound = useCallback(({ lat, lng }: { lat: number; lng: number; name: string }) => {
    setFlyTo([lng, lat])
  }, [])

  const handleAddClick = () => {
    toast.info('Station submissions are reviewed before publishing.')
    setAddOpen(true)
  }

  return (
    <div className="relative w-full h-[calc(100dvh-4rem)] md:h-[calc(100dvh-3.5rem)]">
      {/* Map */}
      <div className="absolute inset-0">
        <VoltMap
          stations={stations}
          selectedStationId={selectedStation?.id}
          onStationSelect={setSelectedStation}
          onBboxChange={handleBboxChange}
          flyTo={flyTo}
        />
      </div>

      {/* Top controls */}
      <div className="absolute top-3 left-3 right-3 md:right-auto md:left-4 md:top-4 md:w-80 z-10 flex flex-col gap-2.5">
        <SearchBar onLocationFound={handleLocationFound} />
        <MapFilters filters={filters} onFiltersChange={setFilters} />
      </div>

      {/* Station panel — desktop right sidebar */}
      {selectedStation && (
        <div className="hidden md:flex absolute top-0 right-0 bottom-0 w-96 bg-background border-l z-10 flex-col">
          <StationPanel
            stationId={selectedStation.id}
            onClose={() => setSelectedStation(null)}
            userId={user?.id ?? null}
          />
        </div>
      )}

      {/* Station drawer — mobile bottom sheet */}
      {isMobile && (
        <StationDrawer
          stationId={selectedStation?.id ?? null}
          onClose={() => setSelectedStation(null)}
          userId={user?.id ?? null}
        />
      )}

      {/* Add Station FAB */}
      <Button
        size="lg"
        className="absolute bottom-[5.25rem] right-2.5 md:bottom-6 md:right-4 rounded-full shadow-lg z-20 gap-2 h-14 w-14 md:h-10 md:w-auto p-0 md:px-3"
        onClick={handleAddClick}
      >
        <Plus className="h-6 w-6 md:h-5 md:w-5" />
        <span className="hidden sm:inline">Add Station</span>
      </Button>

      {/* Add Station Modal */}
      <AddStationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => bbox && fetchStations(bbox, filters)}
      />
    </div>
  )
}
