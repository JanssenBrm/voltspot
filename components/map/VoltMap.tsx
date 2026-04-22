'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Cluster from 'ol/source/Cluster'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import type { Coordinate } from 'ol/coordinate'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import 'ol/ol.css'

export interface StationMarkerData {
  id: string
  name: string
  latitude: number
  longitude: number
  status: string | null
  isFree: boolean | null
  plugTypes: string[] | null
  claimedBy: string | null
}

interface VoltMapProps {
  stations: StationMarkerData[]
  selectedStationId?: string | null
  onStationSelect: (station: StationMarkerData) => void
  onBboxChange: (bbox: string) => void
  flyTo?: [number, number] | null
}

function getStationColor(station: StationMarkerData): string {
  if (station.claimedBy) return '#3b82f6'
  if (station.status === 'verified') return '#22c55e'
  if (station.status === 'offline') return '#ef4444'
  return '#eab308'
}

function makeStationStyle(station: StationMarkerData, selected: boolean, zoom: number): Style {
  const color = getStationColor(station)
  const radius = selected ? 12 : zoom >= 13 ? 8 : 6
  return new Style({
    image: new CircleStyle({
      radius,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: '#fff', width: selected ? 3 : 1.5 }),
    }),
  })
}

function makeClusterStyle(count: number): Style {
  const radius = Math.min(8 + Math.sqrt(count) * 2, 28)
  return new Style({
    image: new CircleStyle({
      radius,
      fill: new Fill({ color: '#22c55e' }),
      stroke: new Stroke({ color: '#fff', width: 2 }),
    }),
    text: new Text({
      text: String(count),
      fill: new Fill({ color: '#fff' }),
      font: `bold ${radius > 18 ? 13 : 11}px sans-serif`,
    }),
  })
}

const locationDotStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: '#3B82F6' }),
    stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }),
  }),
})

const locationAccuracyStyle = new Style({
  image: new CircleStyle({
    radius: 24,
    fill: new Fill({ color: 'rgba(59, 130, 246, 0.15)' }),
    stroke: new Stroke({ color: 'rgba(59, 130, 246, 0.4)', width: 1 }),
  }),
})

export default function VoltMap({
  stations,
  selectedStationId,
  onStationSelect,
  onBboxChange,
  flyTo,
}: VoltMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const pulseRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)
  const stationSourceRef = useRef<VectorSource>(new VectorSource())
  const locationSourceRef = useRef<VectorSource>(new VectorSource())
  const locationLayerRef = useRef(
    new VectorLayer({
      source: locationSourceRef.current,
      zIndex: 999,
    }),
  )
  const hasLocatedRef = useRef(false)
  const lastCoordsRef = useRef<Coordinate | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [zoom, setZoom] = useState(5)
  const [hasLocationFix, setHasLocationFix] = useState(false)

  const emitBbox = useCallback(
    (map: Map) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const extent = map.getView().calculateExtent(map.getSize())
        const [minX, minY, maxX, maxY] = extent
        const [minLng, minLat] = toLonLat([minX, minY])
        const [maxLng, maxLat] = toLonLat([maxX, maxY])
        onBboxChange(`${minLng},${minLat},${maxLng},${maxLat}`)
        setZoom(Math.round(map.getView().getZoom() ?? 5))
      }, 300)
    },
    [onBboxChange],
  )

  const updatePulsePosition = useCallback(() => {
    if (!mapInstance.current || !pulseRef.current || !lastCoordsRef.current) return
    const pixel = mapInstance.current.getPixelFromCoordinate(lastCoordsRef.current)
    if (!pixel) return
    pulseRef.current.style.left = `${pixel[0]}px`
    pulseRef.current.style.top = `${pixel[1]}px`
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const tileLayer = new TileLayer({
      source: new XYZ({
        url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
        tileSize: 512,
        maxZoom: 20,
      }),
    })

    const clusterSource = new Cluster({
      distance: 40,
      source: stationSourceRef.current,
    })

    const clusterLayer = new VectorLayer({
      source: clusterSource,
      style: (feature) => {
        const features = feature.get('features') as Feature[]
        if (!features?.length) return undefined
        if (features.length === 1) {
          const s = features[0].get('stationData') as StationMarkerData
          const selected = s?.id === selectedStationId
          return makeStationStyle(s, selected, zoom)
        }
        return makeClusterStyle(features.length)
      },
    })

    const map = new Map({
      target: mapRef.current,
      layers: [tileLayer, clusterLayer, locationLayerRef.current],
      controls: [], // disable default OL controls (zoom, attribution, rotate)
      view: new View({
        center: fromLonLat([4.4699, 50.5039]),
        zoom: 5,
      }),
    })

    mapInstance.current = map

    const handleMoveEnd = () => {
      emitBbox(map)
      updatePulsePosition()
    }
    map.on('moveend', handleMoveEnd)
    map.on('postrender', updatePulsePosition)
    emitBbox(map)

    map.on('click', (evt: any) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f)
      if (!feature) return
      const features = feature.get('features') as Feature[] | undefined
      if (features?.length === 1) {
        const s = features[0].get('stationData') as StationMarkerData
        if (s) onStationSelect(s)
      } else if (features && features.length > 1) {
        map.getView().animate({ zoom: (map.getView().getZoom() ?? 5) + 2, duration: 400 })
      }
    })

    map.on('pointermove', (evt) => {
      const hit = map.hasFeatureAtPixel(evt.pixel)
      map.getTargetElement().style.cursor = hit ? 'pointer' : ''
    })

    return () => {
      map.un('moveend', handleMoveEnd)
      map.un('postrender', updatePulsePosition)
      map.setTarget(undefined)
      mapInstance.current = null
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = fromLonLat([position.coords.longitude, position.coords.latitude])
        lastCoordsRef.current = coords

        const source = locationSourceRef.current
        source.clear()

        const accuracyFeature = new Feature(new Point(coords))
        accuracyFeature.setStyle(locationAccuracyStyle)
        source.addFeature(accuracyFeature)

        const dotFeature = new Feature(new Point(coords))
        dotFeature.setStyle(locationDotStyle)
        source.addFeature(dotFeature)

        updatePulsePosition()

        if (!hasLocatedRef.current && mapInstance.current) {
          mapInstance.current.getView().animate({
            center: coords,
            zoom: 14,
            duration: 800,
          })
          hasLocatedRef.current = true
          setHasLocationFix(true)
        } else {
          setHasLocationFix(true)
        }
      },
      (error) => {
        console.warn('Geolocation unavailable:', error.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      },
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [updatePulsePosition])

  // Update features when stations change
  useEffect(() => {
    const source = stationSourceRef.current
    source.clear()
    const features = stations.map((s) => {
      const f = new Feature({ geometry: new Point(fromLonLat([s.longitude, s.latitude])) })
      f.set('stationData', s)
      return f
    })
    source.addFeatures(features)
  }, [stations])

  // Fly to location
  useEffect(() => {
    if (flyTo && mapInstance.current) {
      mapInstance.current.getView().animate({
        center: fromLonLat([flyTo[0], flyTo[1]]),
        zoom: 14,
        duration: 800,
      })
    }
  }, [flyTo])

  const handleZoom = (delta: number) => {
    const map = mapInstance.current
    if (!map) return
    const view = map.getView()
    view.animate({ zoom: (view.getZoom() ?? 5) + delta, duration: 250 })
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <div
        ref={pulseRef}
        className="location-pulse"
        style={{ display: hasLocationFix ? 'block' : 'none' }}
        aria-hidden="true"
      />
      {/* Custom map controls — bottom-left, above bottom nav on mobile */}
      <div className="absolute left-4 bottom-24 md:bottom-5 flex flex-col gap-2 z-20">
        {hasLocationFix && (
          <button
            onClick={() => {
              if (lastCoordsRef.current && mapInstance.current) {
                mapInstance.current.getView().animate({
                  center: lastCoordsRef.current,
                  zoom: 15,
                  duration: 600,
                })
              }
            }}
            className="bg-card rounded-2xl shadow-md p-3 border border-border hover:bg-muted transition-colors"
            aria-label="Centre map on my location"
            title="My location"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-primary"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              <circle cx="12" cy="12" r="8" strokeOpacity="0.3" />
            </svg>
          </button>
        )}
        <button
          onClick={() => handleZoom(1)}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-background/95 backdrop-blur border border-border/70 shadow text-foreground text-xl font-bold hover:bg-accent transition-colors"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(-1)}
          className="w-11 h-11 flex items-center justify-center rounded-2xl bg-background/95 backdrop-blur border border-border/70 shadow text-foreground text-xl font-bold hover:bg-accent transition-colors"
          aria-label="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  )
}
