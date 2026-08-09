import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import type { GeoFix, NavigationProgress, RoutePlan } from '../types'
import { navigationHeading, smoothHeading } from '../lib/navigation'

const TILE_CACHE = 'mapventure-driving-tiles-v1'
const MAX_CACHED_TILES = 1200
const protocolState = globalThis as typeof globalThis & { __mapventureTileProtocol?: boolean }

async function trimTileCache(cache: Cache) {
  const keys = await cache.keys()
  if (keys.length <= MAX_CACHED_TILES) return
  await Promise.all(keys.slice(0, keys.length - MAX_CACHED_TILES).map((key) => cache.delete(key)))
}

if (!protocolState.__mapventureTileProtocol) {
  maplibregl.addProtocol('mapventure-tile', async (parameters, controller) => {
    const path = parameters.url.split('://')[1]?.replace(/^tiles\//, '')
    if (!path) throw new Error('Invalid map tile URL.')
    const networkUrl = `https://tile.openstreetmap.org/${path}.png`
    const cache = 'caches' in globalThis ? await caches.open(TILE_CACHE) : undefined
    const cached = await cache?.match(networkUrl)
    if (cached) return { data: await cached.arrayBuffer() }

    const response = await fetch(networkUrl, { signal: controller.signal })
    if (!response.ok) throw new Error(`Map tile request failed with ${response.status}.`)
    if (cache) {
      await cache.put(networkUrl, response.clone())
      void trimTileCache(cache)
    }
    return { data: await response.arrayBuffer() }
  })
  protocolState.__mapventureTileProtocol = true
}

interface DrivingMapProps {
  route: RoutePlan
  fix: GeoFix | null
  progress?: NavigationProgress
  follow: boolean
  onFollowChange: (follow: boolean) => void
  onBearingChange: (bearing: number) => void
}

const rasterStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'driving-basemap': {
      type: 'raster',
      tiles: ['mapventure-tile://tiles/{z}/{x}/{y}'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'driving-background',
      type: 'background',
      paint: { 'background-color': '#dce5dd' }
    },
    {
      id: 'driving-basemap',
      type: 'raster',
      source: 'driving-basemap',
      paint: {
        'raster-fade-duration': 0,
        'raster-saturation': -0.22,
        'raster-contrast': 0.08
      }
    }
  ]
}

function routeData(route: RoutePlan): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: route.coordinates }
    }]
  }
}

function destinationData(route: RoutePlan): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: route.destination.position }
    }]
  }
}

export function DrivingMap({
  route,
  fix,
  progress,
  follow,
  onFollowChange,
  onBearingChange
}: DrivingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const previousFixRef = useRef<GeoFix | null>(null)
  const headingRef = useRef<number | undefined>(undefined)
  const loadedRef = useRef(false)
  const callbacksRef = useRef({ onFollowChange, onBearingChange })

  callbacksRef.current = { onFollowChange, onBearingChange }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const initial = fix
      ? [fix.longitude, fix.latitude] as [number, number]
      : route.origin.position as [number, number]
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterStyle,
      center: initial,
      zoom: 16.4,
      pitch: route.mode === 'driving' ? 58 : 45,
      bearing: 0,
      maxPitch: 68,
      attributionControl: false,
      cooperativeGestures: false
    })
    mapRef.current = map
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')

    map.on('load', () => {
      loadedRef.current = true
      map.addSource('active-route', { type: 'geojson', data: routeData(route) })
      map.addLayer({
        id: 'active-route-casing',
        type: 'line',
        source: 'active-route',
        paint: {
          'line-color': '#09251f',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 7, 18, 14],
          'line-opacity': 0.72
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' }
      })
      map.addLayer({
        id: 'active-route-line',
        type: 'line',
        source: 'active-route',
        paint: {
          'line-color': route.direct ? '#e6aa4f' : '#57d5af',
          'line-width': ['interpolate', ['linear'], ['zoom'], 12, 4, 18, 8],
          'line-opacity': 1,
          'line-dasharray': route.direct ? [1.2, 1.4] : [1, 0]
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' }
      })
      map.addSource('route-destination', { type: 'geojson', data: destinationData(route) })
      map.addLayer({
        id: 'route-destination-ring',
        type: 'circle',
        source: 'route-destination',
        paint: {
          'circle-radius': 12,
          'circle-color': '#e06c5f',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 4
        }
      })

      const markerElement = document.createElement('div')
      markerElement.className = 'driving-location-marker'
      markerElement.innerHTML = '<span></span>'
      markerRef.current = new maplibregl.Marker({ element: markerElement, anchor: 'center' })
        .setLngLat(initial)
        .addTo(map)
    })

    const suspendFollow = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent) callbacksRef.current.onFollowChange(false)
    }
    map.on('dragstart', suspendFollow)
    map.on('rotatestart', suspendFollow)
    map.on('pitchstart', suspendFollow)
    map.on('zoomstart', suspendFollow)
    map.on('rotate', () => callbacksRef.current.onBearingChange(map.getBearing()))

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
      loadedRef.current = false
      previousFixRef.current = null
      headingRef.current = undefined
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    const source = map.getSource('active-route') as maplibregl.GeoJSONSource | undefined
    source?.setData(routeData(route))
    const destinationSource = map.getSource('route-destination') as maplibregl.GeoJSONSource | undefined
    destinationSource?.setData(destinationData(route))
    map.setPaintProperty('active-route-line', 'line-color', route.direct ? '#e6aa4f' : '#57d5af')
    map.setPaintProperty('active-route-line', 'line-dasharray', route.direct ? [1.2, 1.4] : [1, 0])
  }, [route])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !fix) return
    const position: [number, number] = [fix.longitude, fix.latitude]
    markerRef.current?.setLngLat(position)
    const rawHeading = navigationHeading(fix, previousFixRef.current, route, progress?.segmentIndex ?? 0)
    const heading = smoothHeading(headingRef.current, rawHeading)
    headingRef.current = heading
    previousFixRef.current = fix

    if (follow) {
      map.easeTo({
        center: position,
        zoom: route.mode === 'driving' ? 16.8 : 17.2,
        pitch: route.mode === 'driving' ? 58 : 45,
        bearing: heading,
        offset: [0, Math.round(map.getContainer().clientHeight * 0.19)],
        duration: 850,
        easing: (value) => value,
        essential: true
      })
      callbacksRef.current.onBearingChange(heading)
    }
  }, [fix, follow, progress?.segmentIndex, route])

  return <div ref={containerRef} className="driving-map" aria-label="Live turn-by-turn navigation map" />
}
