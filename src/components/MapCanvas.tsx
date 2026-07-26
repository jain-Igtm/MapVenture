import { useEffect, useMemo, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type MapLayerMouseEvent,
  type Marker,
  type StyleSpecification
} from 'maplibre-gl'
import type { Feature, FeatureCollection, Geometry, Point, Position } from 'geojson'
import type {
  AppSettings,
  Category,
  GeoFix,
  MapFeature,
  SurveyState
} from '../types'
import {
  featureToGeoJSON,
  geometryBounds,
  pointGeometry,
  surveyGeometry
} from '../lib/geo'

interface MapCanvasProps {
  features: MapFeature[]
  categories: Category[]
  selectedFeature?: MapFeature
  survey: SurveyState | null
  geoFix: GeoFix | null
  settings: AppSettings
  editableGeometry?: Geometry
  editingGeometry: boolean
  focusToken: number
  locationFocusToken: number
  onSelect: (id: string) => void
  onLongPress: (position: Position) => void
  onDrawVertex: (position: Position) => void
  onEditableGeometryChange: (geometry: Geometry) => void
  onMapMoved: (center: Position, zoom: number) => void
}

const styleUrls = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  positron: 'https://tiles.openfreemap.org/styles/positron'
}

const emptyCollection: FeatureCollection = { type: 'FeatureCollection', features: [] }
const fallbackStyle: StyleSpecification = {
  version: 8,
  sources: {
    'openstreetmap-fallback': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'fallback-background',
      type: 'background',
      paint: { 'background-color': '#dfe8df' }
    },
    {
      id: 'openstreetmap-fallback',
      type: 'raster',
      source: 'openstreetmap-fallback'
    }
  ]
}

function coordinatesForEditing(geometry: Geometry): Position[] {
  if (geometry.type === 'Point') return [geometry.coordinates]
  if (geometry.type === 'LineString') return geometry.coordinates
  if (geometry.type === 'Polygon') return geometry.coordinates[0]?.slice(0, -1) ?? []
  return []
}

function geometryWithEditedPosition(geometry: Geometry, index: number, position: Position): Geometry {
  if (geometry.type === 'Point') return pointGeometry(position)
  if (geometry.type === 'LineString') {
    const coordinates = geometry.coordinates.map((coordinate, coordinateIndex) =>
      coordinateIndex === index ? position : coordinate
    )
    return { ...geometry, coordinates }
  }
  if (geometry.type === 'Polygon') {
    const openRing = geometry.coordinates[0]?.slice(0, -1) ?? []
    const edited = openRing.map((coordinate, coordinateIndex) =>
      coordinateIndex === index ? position : coordinate
    )
    return {
      ...geometry,
      coordinates: [[...edited, edited[0]]]
    }
  }
  return geometry
}

export function MapCanvas({
  features,
  categories,
  selectedFeature,
  survey,
  geoFix,
  settings,
  editableGeometry,
  editingGeometry,
  focusToken,
  locationFocusToken,
  onSelect,
  onLongPress,
  onDrawVertex,
  onEditableGeometryChange,
  onMapMoved
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const loadedRef = useRef(false)
  const styleKeyRef = useRef(settings.mapStyle)
  const editMarkersRef = useRef<Marker[]>([])
  const locationMarkerRef = useRef<Marker | null>(null)
  const callbacksRef = useRef({
    onSelect,
    onLongPress,
    onDrawVertex,
    onEditableGeometryChange,
    onMapMoved
  })
  const drawModeRef = useRef(Boolean(survey?.mode.startsWith('draw')))
  const featureDataRef = useRef({
    features,
    categories,
    selectedFeature,
    survey,
    editableGeometry
  })

  callbacksRef.current = {
    onSelect,
    onLongPress,
    onDrawVertex,
    onEditableGeometryChange,
    onMapMoved
  }
  drawModeRef.current = Boolean(survey?.mode.startsWith('draw'))
  featureDataRef.current = { features, categories, selectedFeature, survey, editableGeometry }

  const initialCenter = useMemo<Position>(
    () => settings.lastCenter ?? [-78.8784, 42.8864],
    []
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrls[settings.mapStyle],
      center: initialCenter as [number, number],
      zoom: settings.lastZoom ?? 11,
      attributionControl: false,
      cooperativeGestures: false,
      maxPitch: 60
    })
    mapRef.current = map
    const fallbackTimer = window.setTimeout(() => {
      if (!loadedRef.current) map.setStyle(fallbackStyle)
    }, 8_000)

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right')

    function collectionFor(type: 'Point' | 'LineString' | 'Polygon'): FeatureCollection {
      const data = featureDataRef.current
      const colors = new Map(data.categories.map((category) => [category.id, category.color]))
      return {
        type: 'FeatureCollection',
        features: data.features
          .filter((feature) => feature.geometry.type === type)
          .map((feature) => featureToGeoJSON(feature, colors.get(feature.categoryId)))
      }
    }

    function selectedCollection(): FeatureCollection {
      const data = featureDataRef.current
      const geometry = data.editableGeometry ?? data.selectedFeature?.geometry
      if (!geometry) return emptyCollection
      return {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry,
          properties: {}
        }]
      }
    }

    function surveyCollection(): FeatureCollection {
      const active = featureDataRef.current.survey
      if (!active || active.coordinates.length === 0) return emptyCollection

      let geometry: Geometry
      if (active.mode.endsWith('area') && active.coordinates.length < 3) {
        geometry = {
          type: 'LineString',
          coordinates: active.coordinates
        }
      } else if (active.coordinates.length === 1) {
        geometry = {
          type: 'Point',
          coordinates: active.coordinates[0]
        }
      } else {
        geometry = surveyGeometry(active.mode, active.coordinates)
      }

      return {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry, properties: {} }]
      }
    }

    function refreshSources() {
      if (!loadedRef.current) return
      ;(map.getSource('mv-points') as GeoJSONSource | undefined)?.setData(collectionFor('Point'))
      ;(map.getSource('mv-lines') as GeoJSONSource | undefined)?.setData(collectionFor('LineString'))
      ;(map.getSource('mv-areas') as GeoJSONSource | undefined)?.setData(collectionFor('Polygon'))
      ;(map.getSource('mv-selected') as GeoJSONSource | undefined)?.setData(selectedCollection())
      ;(map.getSource('mv-survey') as GeoJSONSource | undefined)?.setData(surveyCollection())
    }

    function setupStyle() {
      loadedRef.current = true
      window.clearTimeout(fallbackTimer)
      if (!map.getSource('mv-areas')) {
        map.addSource('mv-areas', { type: 'geojson', data: emptyCollection })
        map.addLayer({
          id: 'mv-area-fill',
          type: 'fill',
          source: 'mv-areas',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['case', ['boolean', ['get', 'isFieldMap'], false], 0.13, 0.22]
          }
        })
        map.addLayer({
          id: 'mv-area-outline',
          type: 'line',
          source: 'mv-areas',
          paint: {
            'line-color': ['get', 'color'],
            'line-opacity': 0.95,
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 16, 4],
            'line-dasharray': ['case', ['boolean', ['get', 'isFieldMap'], false], ['literal', [2, 1.5]], ['literal', [1, 0]]]
          }
        })
      }
      if (!map.getSource('mv-lines')) {
        map.addSource('mv-lines', { type: 'geojson', data: emptyCollection })
        map.addLayer({
          id: 'mv-trails-shadow',
          type: 'line',
          source: 'mv-lines',
          paint: {
            'line-color': '#f8f3e8',
            'line-opacity': 0.9,
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 5, 17, 10]
          }
        })
        map.addLayer({
          id: 'mv-trails',
          type: 'line',
          source: 'mv-lines',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2.5, 17, 6],
            'line-opacity': 0.96
          }
        })
      }
      if (!map.getSource('mv-points')) {
        map.addSource('mv-points', {
          type: 'geojson',
          data: emptyCollection,
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 13
        })
        map.addLayer({
          id: 'mv-clusters',
          type: 'circle',
          source: 'mv-points',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#183f37',
            'circle-radius': ['step', ['get', 'point_count'], 18, 20, 23, 100, 28],
            'circle-stroke-color': '#f7f1e5',
            'circle-stroke-width': 3,
            'circle-opacity': 0.96
          }
        })
        map.addLayer({
          id: 'mv-cluster-count',
          type: 'symbol',
          source: 'mv-points',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-size': 12
          },
          paint: { 'text-color': '#f7f1e5' }
        })
        map.addLayer({
          id: 'mv-places',
          type: 'circle',
          source: 'mv-points',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 5.5, 16, 9],
            'circle-stroke-color': '#fffaf0',
            'circle-stroke-width': 2.5,
            'circle-opacity': 0.98
          }
        })
      }
      if (!map.getSource('mv-selected')) {
        map.addSource('mv-selected', { type: 'geojson', data: emptyCollection })
        map.addLayer({
          id: 'mv-selected-fill',
          type: 'fill',
          source: 'mv-selected',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: { 'fill-color': '#ffffff', 'fill-opacity': 0.12 }
        })
        map.addLayer({
          id: 'mv-selected-line',
          type: 'line',
          source: 'mv-selected',
          filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
          paint: {
            'line-color': '#fffdf6',
            'line-width': 7,
            'line-opacity': 0.9,
            'line-blur': 1
          }
        })
        map.addLayer({
          id: 'mv-selected-point',
          type: 'circle',
          source: 'mv-selected',
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-color': '#ffffff',
            'circle-radius': 13,
            'circle-opacity': 0.3,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
          }
        })
      }
      if (!map.getSource('mv-survey')) {
        map.addSource('mv-survey', { type: 'geojson', data: emptyCollection })
        map.addLayer({
          id: 'mv-survey-fill',
          type: 'fill',
          source: 'mv-survey',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: { 'fill-color': '#f0b964', 'fill-opacity': 0.2 }
        })
        map.addLayer({
          id: 'mv-survey-line',
          type: 'line',
          source: 'mv-survey',
          filter: ['in', ['geometry-type'], ['literal', ['LineString', 'Polygon']]],
          paint: {
            'line-color': '#f0b964',
            'line-width': 5,
            'line-opacity': 1,
            'line-dasharray': [1.6, 1]
          }
        })
        map.addLayer({
          id: 'mv-survey-point',
          type: 'circle',
          source: 'mv-survey',
          filter: ['==', ['geometry-type'], 'Point'],
          paint: {
            'circle-color': '#f0b964',
            'circle-radius': 8,
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 2
          }
        })
      }
      refreshSources()
    }

    function identifyFeature(event: MapLayerMouseEvent) {
      const hit = event.features?.[0]
      const id = hit?.properties?.id
      if (typeof id === 'string') callbacksRef.current.onSelect(id)
    }

    function handleMapClick(event: MapLayerMouseEvent) {
      if (drawModeRef.current) {
        callbacksRef.current.onDrawVertex([event.lngLat.lng, event.lngLat.lat])
      }
    }

    function handleMoveEnd() {
      const center = map.getCenter()
      callbacksRef.current.onMapMoved([center.lng, center.lat], map.getZoom())
    }

    map.on('load', setupStyle)
    map.on('style.load', setupStyle)
    map.on('click', 'mv-places', identifyFeature)
    map.on('click', 'mv-trails', identifyFeature)
    map.on('click', 'mv-area-fill', identifyFeature)
    map.on('click', handleMapClick)
    map.on('moveend', handleMoveEnd)

    map.on('click', 'mv-clusters', async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0]
      const clusterId = Number(feature?.properties?.cluster_id)
      const source = map.getSource('mv-points') as GeoJSONSource
      const coordinates = (feature?.geometry as Point | undefined)?.coordinates
      if (!coordinates || Number.isNaN(clusterId)) return
      const zoom = await source.getClusterExpansionZoom(clusterId)
      map.easeTo({ center: coordinates as [number, number], zoom, duration: 500 })
    })

    const canvas = map.getCanvas()
    let pressTimer: number | undefined
    let pointerStart: { x: number; y: number } | undefined
    let longPressTriggered = false

    const clearPress = () => {
      if (pressTimer) window.clearTimeout(pressTimer)
      pressTimer = undefined
      pointerStart = undefined
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || drawModeRef.current) return
      pointerStart = { x: event.clientX, y: event.clientY }
      longPressTriggered = false
      pressTimer = window.setTimeout(() => {
        if (!pointerStart) return
        longPressTriggered = true
        const rect = canvas.getBoundingClientRect()
        const lngLat = map.unproject([pointerStart.x - rect.left, pointerStart.y - rect.top])
        navigator.vibrate?.(18)
        callbacksRef.current.onLongPress([lngLat.lng, lngLat.lat])
        clearPress()
      }, 570)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerStart) return
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 10) {
        clearPress()
      }
    }

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      if (longPressTriggered || drawModeRef.current) return
      const rect = canvas.getBoundingClientRect()
      const lngLat = map.unproject([event.clientX - rect.left, event.clientY - rect.top])
      callbacksRef.current.onLongPress([lngLat.lng, lngLat.lat])
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', clearPress)
    canvas.addEventListener('pointercancel', clearPress)
    canvas.addEventListener('contextmenu', onContextMenu)

    const originalRefresh = refreshSources
    ;(map as MapLibreMap & { __mapventureRefresh?: () => void }).__mapventureRefresh = originalRefresh

    return () => {
      window.clearTimeout(fallbackTimer)
      editMarkersRef.current.forEach((marker) => marker.remove())
      locationMarkerRef.current?.remove()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', clearPress)
      canvas.removeEventListener('pointercancel', clearPress)
      canvas.removeEventListener('contextmenu', onContextMenu)
      map.remove()
      mapRef.current = null
      loadedRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || styleKeyRef.current === settings.mapStyle) return
    styleKeyRef.current = settings.mapStyle
    loadedRef.current = false
    map.setStyle(styleUrls[settings.mapStyle])
  }, [settings.mapStyle])

  useEffect(() => {
    const map = mapRef.current as (MapLibreMap & { __mapventureRefresh?: () => void }) | null
    map?.__mapventureRefresh?.()
  }, [features, categories, selectedFeature, survey, editableGeometry])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !geoFix) return
    const element = document.createElement('div')
    element.className = 'location-marker'
    element.innerHTML = '<span></span>'

    if (!locationMarkerRef.current) {
      locationMarkerRef.current = new maplibregl.Marker({ element })
        .setLngLat([geoFix.longitude, geoFix.latitude])
        .addTo(map)
    } else {
      locationMarkerRef.current.setLngLat([geoFix.longitude, geoFix.latitude])
    }
  }, [geoFix])

  useEffect(() => {
    editMarkersRef.current.forEach((marker) => marker.remove())
    editMarkersRef.current = []
    const map = mapRef.current
    if (!map || !editingGeometry || !editableGeometry) return

    coordinatesForEditing(editableGeometry).forEach((position, index) => {
      const element = document.createElement('button')
      element.className = 'vertex-marker'
      element.type = 'button'
      element.ariaLabel = `Move vertex ${index + 1}`
      const marker = new maplibregl.Marker({ element, draggable: true })
        .setLngLat(position as [number, number])
        .addTo(map)
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        callbacksRef.current.onEditableGeometryChange(
          geometryWithEditedPosition(editableGeometry, index, [lngLat.lng, lngLat.lat])
        )
      })
      editMarkersRef.current.push(marker)
    })
  }, [editableGeometry, editingGeometry])

  useEffect(() => {
    const map = mapRef.current
    const geometry = editableGeometry ?? selectedFeature?.geometry
    if (!map || !geometry || focusToken === 0) return
    if (geometry.type === 'Point') {
      map.easeTo({
        center: geometry.coordinates as [number, number],
        zoom: Math.max(map.getZoom(), 15),
        duration: 600,
        padding: { top: 90, bottom: 250, left: 30, right: 30 }
      })
      return
    }
    const bounds = geometryBounds(geometry)
    map.fitBounds(bounds, {
      padding: { top: 110, bottom: 280, left: 45, right: 45 },
      maxZoom: 17,
      duration: 650
    })
  }, [focusToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !geoFix || locationFocusToken === 0) return
    map.easeTo({
      center: [geoFix.longitude, geoFix.latitude],
      zoom: Math.max(map.getZoom(), 15.5),
      duration: 650,
      padding: { top: 80, bottom: 150, left: 30, right: 30 }
    })
  }, [locationFocusToken])

  return <div ref={containerRef} className="map-canvas" aria-label="Interactive map" />
}
