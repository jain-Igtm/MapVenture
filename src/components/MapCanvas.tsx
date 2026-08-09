import { useEffect, useMemo, useRef } from 'react'
import L, {
  type LatLngTuple,
  type LayerGroup,
  type Map as LeafletMap,
  type Marker as LeafletMarker
} from 'leaflet'
import type { Feature, Geometry, Position } from 'geojson'
import type {
  AppSettings,
  Category,
  GeoFix,
  MapFeature,
  RoutePlan,
  SearchPlace,
  SurveyState
} from '../types'
import {
  geometryBounds,
  pointGeometry,
  surveyGeometry
} from '../lib/geo'

interface MapCanvasProps {
  features: MapFeature[]
  categories: Category[]
  selectedFeature?: MapFeature
  searchPlace?: SearchPlace
  route?: RoutePlan
  survey: SurveyState | null
  geoFix: GeoFix | null
  settings: AppSettings
  editableGeometry?: Geometry
  editingGeometry: boolean
  focusToken: number
  searchFocusToken: number
  routeFocusToken: number
  locationFocusToken: number
  onSelect: (id: string) => void
  onLongPress: (position: Position) => void
  onDrawVertex: (position: Position) => void
  onEditableGeometryChange: (geometry: Geometry) => void
  onMapMoved: (center: Position, zoom: number) => void
}

const DEFAULT_FEATURE_COLOR = '#87958f'

function toLatLng(position: Position): LatLngTuple {
  return [position[1], position[0]]
}

function toPosition(latitude: number, longitude: number): Position {
  return [longitude, latitude]
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
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((coordinate, coordinateIndex) =>
        coordinateIndex === index ? position : coordinate
      )
    }
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

function geoJsonFeature(geometry: Geometry): Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry
  }
}

function stopLayerClick(event: L.LeafletMouseEvent) {
  L.DomEvent.stopPropagation(event.originalEvent)
}

export function MapCanvas({
  features,
  categories,
  selectedFeature,
  searchPlace,
  route,
  survey,
  geoFix,
  settings,
  editableGeometry,
  editingGeometry,
  focusToken,
  searchFocusToken,
  routeFocusToken,
  locationFocusToken,
  onSelect,
  onLongPress,
  onDrawVertex,
  onEditableGeometryChange,
  onMapMoved
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const featureLayersRef = useRef<LayerGroup | null>(null)
  const routeLayersRef = useRef<LayerGroup | null>(null)
  const selectedLayersRef = useRef<LayerGroup | null>(null)
  const searchLayersRef = useRef<LayerGroup | null>(null)
  const surveyLayersRef = useRef<LayerGroup | null>(null)
  const editLayersRef = useRef<LayerGroup | null>(null)
  const locationLayersRef = useRef<LayerGroup | null>(null)
  const editMarkersRef = useRef<LeafletMarker[]>([])
  const locationMarkerRef = useRef<LeafletMarker | null>(null)
  const callbacksRef = useRef({
    onSelect,
    onLongPress,
    onDrawVertex,
    onEditableGeometryChange,
    onMapMoved
  })
  const drawModeRef = useRef(Boolean(survey?.mode.startsWith('draw')))

  callbacksRef.current = {
    onSelect,
    onLongPress,
    onDrawVertex,
    onEditableGeometryChange,
    onMapMoved
  }
  drawModeRef.current = Boolean(survey?.mode.startsWith('draw'))

  const initialCenter = useMemo<Position>(
    () => settings.lastCenter ?? [-78.8784, 42.8864],
    []
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      attributionControl: false,
      zoomControl: false,
      preferCanvas: true,
      minZoom: 2,
      maxZoom: 20,
      worldCopyJump: true
    })
    map.setView(toLatLng(initialCenter), settings.lastZoom ?? 11)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom: 2,
      maxZoom: 20,
      maxNativeZoom: 19,
      tileSize: 256,
      updateWhenIdle: false,
      keepBuffer: 4,
      crossOrigin: true,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)
    L.control.attribution({ position: 'topright', prefix: false }).addTo(map)

    featureLayersRef.current = L.layerGroup().addTo(map)
    routeLayersRef.current = L.layerGroup().addTo(map)
    selectedLayersRef.current = L.layerGroup().addTo(map)
    searchLayersRef.current = L.layerGroup().addTo(map)
    surveyLayersRef.current = L.layerGroup().addTo(map)
    editLayersRef.current = L.layerGroup().addTo(map)
    locationLayersRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const handleMapClick = (event: L.LeafletMouseEvent) => {
      if (drawModeRef.current) {
        callbacksRef.current.onDrawVertex(toPosition(event.latlng.lat, event.latlng.lng))
      }
    }
    const handleContextMenu = (event: L.LeafletMouseEvent) => {
      if (drawModeRef.current) return
      callbacksRef.current.onLongPress(toPosition(event.latlng.lat, event.latlng.lng))
    }
    const handleMoveEnd = () => {
      const center = map.getCenter()
      callbacksRef.current.onMapMoved(
        toPosition(center.lat, center.lng),
        map.getZoom()
      )
    }

    map.on('click', handleMapClick)
    map.on('contextmenu', handleContextMenu)
    map.on('moveend', handleMoveEnd)

    const container = map.getContainer()
    let pressTimer: number | undefined
    let pointerStart: { x: number; y: number } | undefined

    const clearPress = () => {
      if (pressTimer) window.clearTimeout(pressTimer)
      pressTimer = undefined
      pointerStart = undefined
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || drawModeRef.current) return
      pointerStart = { x: event.clientX, y: event.clientY }
      pressTimer = window.setTimeout(() => {
        if (!pointerStart) return
        const rect = container.getBoundingClientRect()
        const latLng = map.containerPointToLatLng(
          L.point(pointerStart.x - rect.left, pointerStart.y - rect.top)
        )
        navigator.vibrate?.(18)
        callbacksRef.current.onLongPress(toPosition(latLng.lat, latLng.lng))
        clearPress()
      }, 570)
    }
    const handlePointerMove = (event: PointerEvent) => {
      if (!pointerStart) return
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 10) {
        clearPress()
      }
    }

    container.addEventListener('pointerdown', handlePointerDown)
    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerup', clearPress)
    container.addEventListener('pointercancel', clearPress)

    window.requestAnimationFrame(() => map.invalidateSize())

    return () => {
      clearPress()
      container.removeEventListener('pointerdown', handlePointerDown)
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerup', clearPress)
      container.removeEventListener('pointercancel', clearPress)
      map.remove()
      mapRef.current = null
      featureLayersRef.current = null
      routeLayersRef.current = null
      selectedLayersRef.current = null
      searchLayersRef.current = null
      surveyLayersRef.current = null
      editLayersRef.current = null
      locationLayersRef.current = null
      editMarkersRef.current = []
      locationMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    const group = featureLayersRef.current
    if (!group) return
    group.clearLayers()

    const colorByCategory = new Map(
      categories.map((category) => [category.id, category.color])
    )

    features.forEach((feature) => {
      const color = colorByCategory.get(feature.categoryId) ?? DEFAULT_FEATURE_COLOR
      const rendered = L.geoJSON(geoJsonFeature(feature.geometry), {
        pointToLayer: (_geoFeature, latLng) => L.circleMarker(latLng, {
          radius: 8,
          color: '#fffaf0',
          weight: 3,
          fillColor: color,
          fillOpacity: 0.98,
          bubblingMouseEvents: false
        }),
        style: () => ({
          color,
          weight: feature.geometry.type === 'LineString' ? 5 : 3,
          opacity: 0.96,
          fillColor: color,
          fillOpacity: feature.isFieldMap ? 0.13 : 0.22
        }),
        onEachFeature: (_geoFeature, layer) => {
          layer.on('click', (event: L.LeafletMouseEvent) => {
            stopLayerClick(event)
            callbacksRef.current.onSelect(feature.id)
          })
        }
      })
      rendered.addTo(group)
    })
  }, [features, categories])

  useEffect(() => {
    const group = routeLayersRef.current
    if (!group) return
    group.clearLayers()
    if (!route || route.coordinates.length < 2) return

    const latLngs = route.coordinates.map(toLatLng)
    L.polyline(latLngs, {
      color: '#09251f',
      weight: 10,
      opacity: 0.62,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false
    }).addTo(group)
    L.polyline(latLngs, {
      color: '#67d2b4',
      weight: 6,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
      interactive: false
    }).addTo(group)

    L.circleMarker(latLngs[0], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#1d9a77',
      fillOpacity: 1,
      interactive: false
    }).addTo(group)
    L.circleMarker(latLngs.at(-1)!, {
      radius: 9,
      color: '#ffffff',
      weight: 3,
      fillColor: '#e06c5f',
      fillOpacity: 1,
      interactive: false
    }).addTo(group)
  }, [route])

  useEffect(() => {
    const group = selectedLayersRef.current
    if (!group) return
    group.clearLayers()

    const geometry = editableGeometry ?? selectedFeature?.geometry
    if (!geometry) return

    L.geoJSON(geoJsonFeature(geometry), {
      pointToLayer: (_feature, latLng) => L.circleMarker(latLng, {
        radius: 13,
        color: '#ffffff',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 0.3,
        bubblingMouseEvents: false
      }),
      style: () => ({
        color: '#fffdf6',
        weight: 7,
        opacity: 0.9,
        fillColor: '#ffffff',
        fillOpacity: geometry.type === 'Polygon' ? 0.12 : 0
      })
    }).addTo(group)
  }, [editableGeometry, selectedFeature])

  useEffect(() => {
    const group = searchLayersRef.current
    if (!group) return
    group.clearLayers()
    if (!searchPlace) return

    const latLng = toLatLng(searchPlace.position)
    L.circleMarker(latLng, {
      radius: 15,
      color: 'rgba(255, 255, 255, 0.82)',
      weight: 3,
      fillColor: '#67d2b4',
      fillOpacity: 0.2,
      interactive: false
    }).addTo(group)
    L.circleMarker(latLng, {
      radius: 7,
      color: '#ffffff',
      weight: 3,
      fillColor: '#1d9a77',
      fillOpacity: 1,
      interactive: false
    }).addTo(group)
  }, [searchPlace])

  useEffect(() => {
    const group = surveyLayersRef.current
    if (!group) return
    group.clearLayers()
    if (!survey || survey.coordinates.length === 0) return

    let geometry: Geometry
    if (survey.mode.endsWith('area') && survey.coordinates.length < 3) {
      geometry = {
        type: 'LineString',
        coordinates: survey.coordinates
      }
    } else if (survey.coordinates.length === 1) {
      geometry = {
        type: 'Point',
        coordinates: survey.coordinates[0]
      }
    } else {
      geometry = surveyGeometry(survey.mode, survey.coordinates)
    }

    L.geoJSON(geoJsonFeature(geometry), {
      pointToLayer: (_feature, latLng) => L.circleMarker(latLng, {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#f0b964',
        fillOpacity: 1,
        bubblingMouseEvents: false
      }),
      style: () => ({
        color: '#f0b964',
        weight: 5,
        opacity: 1,
        dashArray: '8 5',
        fillColor: '#f0b964',
        fillOpacity: geometry.type === 'Polygon' ? 0.2 : 0
      })
    }).addTo(group)
  }, [survey])

  useEffect(() => {
    const group = editLayersRef.current
    if (!group) return
    group.clearLayers()
    editMarkersRef.current = []
    if (!editingGeometry || !editableGeometry) return

    coordinatesForEditing(editableGeometry).forEach((position, index) => {
      const marker = L.marker(toLatLng(position), {
        draggable: true,
        keyboard: false,
        icon: L.divIcon({
          className: 'vertex-marker-shell',
          html: '<span class="vertex-marker"></span>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      })
      marker.on('dragend', () => {
        const latLng = marker.getLatLng()
        callbacksRef.current.onEditableGeometryChange(
          geometryWithEditedPosition(
            editableGeometry,
            index,
            toPosition(latLng.lat, latLng.lng)
          )
        )
      })
      marker.addTo(group)
      editMarkersRef.current.push(marker)
    })
  }, [editableGeometry, editingGeometry])

  useEffect(() => {
    const group = locationLayersRef.current
    if (!group || !geoFix) return

    const latLng = toLatLng([geoFix.longitude, geoFix.latitude])
    if (!locationMarkerRef.current) {
      const marker = L.marker(latLng, {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({
          className: 'location-marker-shell',
          html: '<div class="location-marker"><span></span></div>',
          iconSize: [25, 25],
          iconAnchor: [12, 12]
        })
      }).addTo(group)
      locationMarkerRef.current = marker
    } else {
      locationMarkerRef.current.setLatLng(latLng)
    }
  }, [geoFix])

  useEffect(() => {
    const map = mapRef.current
    const geometry = editableGeometry ?? selectedFeature?.geometry
    if (!map || !geometry || focusToken === 0) return

    if (geometry.type === 'Point') {
      map.flyTo(
        toLatLng(geometry.coordinates),
        Math.max(map.getZoom(), 15),
        { animate: true, duration: 0.6 }
      )
      return
    }

    const [[west, south], [east, north]] = geometryBounds(geometry)
    map.flyToBounds(
      L.latLngBounds([south, west], [north, east]),
      {
        paddingTopLeft: [45, 110],
        paddingBottomRight: [45, 280],
        maxZoom: 17,
        animate: true,
        duration: 0.65
      }
    )
  }, [focusToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !searchPlace || searchFocusToken === 0) return
    map.flyTo(
      toLatLng(searchPlace.position),
      Math.max(map.getZoom(), 16),
      { animate: true, duration: 0.65 }
    )
  }, [searchFocusToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !route || route.coordinates.length < 2 || routeFocusToken === 0) return
    const bounds = L.latLngBounds(route.coordinates.map(toLatLng))
    map.flyToBounds(bounds, {
      paddingTopLeft: [34, 105],
      paddingBottomRight: [34, 250],
      maxZoom: 17,
      animate: true,
      duration: 0.75
    })
  }, [routeFocusToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !geoFix || locationFocusToken === 0) return
    map.flyTo(
      [geoFix.latitude, geoFix.longitude],
      Math.max(map.getZoom(), 16),
      { animate: true, duration: 0.65 }
    )
  }, [locationFocusToken])

  return <div ref={containerRef} className="map-canvas" aria-label="Interactive map" />
}
