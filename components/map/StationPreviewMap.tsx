'use client'

import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import { fromLonLat } from 'ol/proj'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import 'ol/ol.css'

interface StationPreviewMapProps {
  lat: number
  lng: number
}

const pinStyle = new Style({
  image: new CircleStyle({
    radius: 9,
    fill: new Fill({ color: '#2563eb' }),
    stroke: new Stroke({ color: '#ffffff', width: 2.5 }),
  }),
})

export default function StationPreviewMap({ lat, lng }: StationPreviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const center = fromLonLat([lng, lat])

    const markerSource = new VectorSource()
    const marker = new Feature(new Point(center))
    marker.setStyle(pinStyle)
    markerSource.addFeature(marker)

    const map = new Map({
      target: mapRef.current,
      controls: [],
      interactions: [],
      layers: [
        new TileLayer({
          source: new XYZ({
            url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`,
            tileSize: 512,
            maxZoom: 20,
          }),
        }),
        new VectorLayer({ source: markerSource }),
      ],
      view: new View({
        center,
        zoom: 16,
      }),
    })

    mapInstance.current = map

    return () => {
      map.setTarget(undefined)
      mapInstance.current = null
    }
  }, [lat, lng])

  return (
    <div
      ref={mapRef}
      className="w-full h-48 rounded-xl overflow-hidden"
      aria-label="Station location on satellite map"
    />
  )
}
