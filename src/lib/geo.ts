import turfArea from '@turf/area'
import bbox from '@turf/bbox'
import distance from '@turf/distance'
import turfLength from '@turf/length'
import { feature as turfFeature, lineString, point } from '@turf/helpers'
import type { Feature, Geometry, LineString, Point, Polygon, Position } from 'geojson'
import type { DistanceUnit, GeoFix, MapFeature } from '../types'

export function fixToPosition(fix: GeoFix): Position {
  return [fix.longitude, fix.latitude]
}

export function geometryAnchor(geometry: Geometry): Position {
  if (geometry.type === 'Point') return geometry.coordinates
  if (geometry.type === 'LineString') return geometry.coordinates[0] ?? [0, 0]
  if (geometry.type === 'Polygon') return geometry.coordinates[0]?.[0] ?? [0, 0]
  if (geometry.type === 'MultiPoint') return geometry.coordinates[0] ?? [0, 0]
  if (geometry.type === 'MultiLineString') return geometry.coordinates[0]?.[0] ?? [0, 0]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0]?.[0]?.[0] ?? [0, 0]
  return [0, 0]
}

export function closeRing(coordinates: Position[]): Position[] {
  if (coordinates.length === 0) return []
  const first = coordinates[0]
  const last = coordinates.at(-1)
  if (last?.[0] === first[0] && last?.[1] === first[1]) return coordinates
  return [...coordinates, [...first]]
}

export function surveyGeometry(
  mode: 'record-trail' | 'record-area' | 'draw-trail' | 'draw-area',
  coordinates: Position[]
): LineString | Polygon {
  if (mode.endsWith('area')) {
    return { type: 'Polygon', coordinates: [closeRing(coordinates)] }
  }
  return { type: 'LineString', coordinates }
}

export function featureToGeoJSON(feature: MapFeature, categoryColor?: string): Feature {
  return turfFeature(feature.geometry, {
    id: feature.id,
    kind: feature.kind,
    name: feature.name,
    description: feature.description,
    categoryId: feature.categoryId,
    tags: feature.tags,
    mapId: feature.mapId,
    isFieldMap: Boolean(feature.isFieldMap),
    color: categoryColor ?? '#87958f',
    createdAt: feature.createdAt,
    updatedAt: feature.updatedAt
  }, { id: feature.id })
}

export function geometryLengthMeters(geometry: Geometry): number {
  if (geometry.type !== 'LineString') return 0
  return turfLength(lineString(geometry.coordinates), { units: 'kilometers' }) * 1000
}

export function geometryAreaSquareMeters(geometry: Geometry): number {
  if (geometry.type !== 'Polygon') return 0
  return turfArea(turfFeature(geometry))
}

export function formatDistance(meters: number, units: DistanceUnit): string {
  if (units === 'metric') {
    if (meters < 1000) return `${Math.round(meters)} m`
    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`
  }

  const feet = meters * 3.28084
  if (feet < 1000) return `${Math.round(feet)} ft`
  const miles = meters / 1609.344
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`
}

export function formatArea(squareMeters: number, units: DistanceUnit): string {
  if (units === 'metric') {
    if (squareMeters < 10_000) return `${Math.round(squareMeters).toLocaleString()} m²`
    return `${(squareMeters / 10_000).toFixed(1)} ha`
  }

  const acres = squareMeters / 4046.8564224
  if (acres < 1) return `${Math.round(squareMeters * 10.7639).toLocaleString()} ft²`
  return `${acres.toFixed(acres < 10 ? 1 : 0)} acres`
}

export function positionDistanceMeters(a: Position, b: Position): number {
  return distance(point(a), point(b), { units: 'kilometers' }) * 1000
}

export function geometryBounds(geometry: Geometry): [[number, number], [number, number]] {
  const bounds = bbox(turfFeature(geometry))
  return [[bounds[0], bounds[1]], [bounds[2], bounds[3]]]
}

export function destinationForGeometry(geometry: Geometry): Position {
  if (geometry.type === 'Point') return geometry.coordinates
  return geometryAnchor(geometry)
}

export function pointGeometry(position: Position): Point {
  return { type: 'Point', coordinates: position }
}

export function canFinishSurvey(
  mode: 'record-trail' | 'record-area' | 'draw-trail' | 'draw-area',
  coordinates: Position[]
): boolean {
  return mode.endsWith('area') ? coordinates.length >= 3 : coordinates.length >= 2
}
