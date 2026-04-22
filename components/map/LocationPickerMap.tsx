'use client'

import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import { unByKey } from 'ol/Observable'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
import type { Coordinate } from 'ol/coordinate'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import type MapBrowserEvent from 'ol/MapBrowserEvent'
import 'ol/ol.css'

interface LocationPickerMapProps {
  lat?: number
  lng?: number
  onPick: (lat: number, lng: number) => void
}

const pinStyle = new Style({
  image: new CircleStyle({
    radius: 8,
    fill: new Fill({ color: '#2563eb' }),
    stroke: new Stroke({ color: '#ffffff', width: 2 }),
  }),
})

function isMapBrowserPointerEvent(event: unknown): event is MapBrowserEvent<PointerEvent> {
  return typeof event === 'object'
    && event !== null
    && 'coordinate' in event
}

export default function LocationPickerMap({ lat, lng, onPick }: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)
  const markerSourceRef = useRef(new VectorSource())
  const markerFeatureRef = useRef<Feature<Point> | null>(null)
  const onPickRef = useRef(onPick)

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  const setMarkerAtCoordinate = (coordinate: Coordinate) => {
    const point = new Point(coordinate)
    if (!markerFeatureRef.current) {
      markerFeatureRef.current = new Feature(point)
      markerFeatureRef.current.setStyle(pinStyle)
      markerSourceRef.current.addFeature(markerFeatureRef.current)
      return
    }
    markerFeatureRef.current.setGeometry(point)
  }

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source: markerSourceRef.current,
        }),
      ],
      controls: [],
      view: new View({
        center: fromLonLat([lng ?? 4.4699, lat ?? 50.5039]),
        zoom: lat != null && lng != null ? 14 : 5,
      }),
    })

    const clickKey = map.on('click', (event) => {
      if (!isMapBrowserPointerEvent(event)) return
      const [pickedLng, pickedLat] = toLonLat(event.coordinate)
      setMarkerAtCoordinate(event.coordinate)
      onPickRef.current(pickedLat, pickedLng)
    })
    mapInstance.current = map

    return () => {
      unByKey(clickKey)
      map.setTarget(undefined)
      mapInstance.current = null
    }
  }, [])

  useEffect(() => {
    if (lat == null || lng == null || !mapInstance.current) return
    const nextCoordinate = fromLonLat([lng, lat])
    setMarkerAtCoordinate(nextCoordinate)
    mapInstance.current.getView().animate({
      center: nextCoordinate,
      duration: 250,
    })
  }, [lat, lng])

  return (
    <div
      ref={mapRef}
      className="h-56 w-full"
      role="application"
      aria-label="Interactive map for selecting charging station location"
      aria-describedby="location-picker-map-help"
    />
  )
}
