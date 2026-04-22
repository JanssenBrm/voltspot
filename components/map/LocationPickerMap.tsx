'use client'

import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat, toLonLat } from 'ol/proj'
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

export default function LocationPickerMap({ lat, lng, onPick }: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)
  const markerSourceRef = useRef(new VectorSource())
  const markerFeatureRef = useRef<Feature<Point> | null>(null)

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

    const clickHandler = (event: MapBrowserEvent<MouseEvent>) => {
      const [pickedLng, pickedLat] = toLonLat(event.coordinate)
      const point = new Point(event.coordinate)
      if (!markerFeatureRef.current) {
        markerFeatureRef.current = new Feature(point)
        markerFeatureRef.current.setStyle(pinStyle)
        markerSourceRef.current.addFeature(markerFeatureRef.current)
      } else {
        markerFeatureRef.current.setGeometry(point)
      }
      onPick(pickedLat, pickedLng)
    }

    map.on('click', clickHandler)
    mapInstance.current = map

    return () => {
      map.un('click', clickHandler)
      map.setTarget(undefined)
      mapInstance.current = null
    }
  }, [lat, lng, onPick])

  useEffect(() => {
    if (lat == null || lng == null || !mapInstance.current) return
    const nextCoordinate = fromLonLat([lng, lat])
    const point = new Point(nextCoordinate)
    if (!markerFeatureRef.current) {
      markerFeatureRef.current = new Feature(point)
      markerFeatureRef.current.setStyle(pinStyle)
      markerSourceRef.current.addFeature(markerFeatureRef.current)
    } else {
      markerFeatureRef.current.setGeometry(point)
    }
    mapInstance.current.getView().animate({
      center: nextCoordinate,
      duration: 250,
    })
  }, [lat, lng])

  return <div ref={mapRef} className="h-56 w-full" />
}
