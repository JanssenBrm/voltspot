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

export default function VoltMap({
  stations,
  selectedStationId,
  onStationSelect,
  onBboxChange,
  flyTo,
}: VoltMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)
  const stationSourceRef = useRef<VectorSource>(new VectorSource())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [zoom, setZoom] = useState(5)

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

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const tileLayer = new TileLayer({
      source: new XYZ({
        url: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
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
      layers: [tileLayer, clusterLayer],
      view: new View({
        center: fromLonLat([4.4699, 50.5039]),
        zoom: 5,
      }),
    })

    mapInstance.current = map

    // Try geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.getView().animate({
            center: fromLonLat([pos.coords.longitude, pos.coords.latitude]),
            zoom: 12,
            duration: 800,
          })
        },
        () => {/* permission denied, keep fallback */},
      )
    }

    map.on('moveend', () => emitBbox(map))
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
      map.setTarget(undefined)
      mapInstance.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return <div ref={mapRef} className="w-full h-full" />
}
