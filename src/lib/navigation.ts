import type { Position } from 'geojson'
import type { GeoFix, NavigationProgress, RoutePlan } from '../types'

const EARTH_RADIUS_METERS = 6_371_008.8

function radians(value: number): number {
  return value * Math.PI / 180
}

function degrees(value: number): number {
  return value * 180 / Math.PI
}

export function normalizeHeading(value: number): number {
  return ((value % 360) + 360) % 360
}

export function bearingBetween(from: Position, to: Position): number {
  const lat1 = radians(from[1])
  const lat2 = radians(to[1])
  const longitudeDelta = radians(to[0] - from[0])
  const y = Math.sin(longitudeDelta) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(longitudeDelta)
  return normalizeHeading(degrees(Math.atan2(y, x)))
}

export function smoothHeading(previous: number | undefined, next: number, amount = 0.32): number {
  if (previous === undefined || !Number.isFinite(previous)) return normalizeHeading(next)
  const delta = ((normalizeHeading(next) - normalizeHeading(previous) + 540) % 360) - 180
  return normalizeHeading(previous + delta * amount)
}

function distanceMeters(a: Position, b: Position): number {
  const latitudeDelta = radians(b[1] - a[1])
  const longitudeDelta = radians(b[0] - a[0])
  const lat1 = radians(a[1])
  const lat2 = radians(b[1])
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)))
}

function projectToSegment(point: Position, start: Position, end: Position) {
  const referenceLatitude = radians((start[1] + end[1] + point[1]) / 3)
  const scaleX = Math.cos(referenceLatitude)
  const px = point[0] * scaleX
  const py = point[1]
  const ax = start[0] * scaleX
  const ay = start[1]
  const bx = end[0] * scaleX
  const by = end[1]
  const dx = bx - ax
  const dy = by - ay
  const denominator = dx * dx + dy * dy
  const fraction = denominator === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denominator))
  const projected: Position = [
    start[0] + (end[0] - start[0]) * fraction,
    start[1] + (end[1] - start[1]) * fraction
  ]
  return { fraction, projected, distance: distanceMeters(point, projected) }
}

export function navigationHeading(
  fix: GeoFix,
  previousFix: GeoFix | null,
  route: RoutePlan,
  segmentIndex: number
): number {
  if (
    fix.heading !== null
    && Number.isFinite(fix.heading)
    && (fix.speed === null || fix.speed >= 1.2)
  ) return normalizeHeading(fix.heading)

  if (previousFix) {
    const moved = distanceMeters(
      [previousFix.longitude, previousFix.latitude],
      [fix.longitude, fix.latitude]
    )
    if (moved >= 2.5) {
      return bearingBetween(
        [previousFix.longitude, previousFix.latitude],
        [fix.longitude, fix.latitude]
      )
    }
  }

  const start = route.coordinates[Math.min(segmentIndex, route.coordinates.length - 2)]
  const end = route.coordinates[Math.min(segmentIndex + 1, route.coordinates.length - 1)]
  return start && end ? bearingBetween(start, end) : 0
}

export function navigationProgress(route: RoutePlan, fix: GeoFix): NavigationProgress {
  const point: Position = [fix.longitude, fix.latitude]
  const segmentLengths: number[] = []
  let totalRouteMeters = 0
  let nearest = { segmentIndex: 0, fraction: 0, distance: Infinity }

  for (let index = 0; index < route.coordinates.length - 1; index += 1) {
    const start = route.coordinates[index]
    const end = route.coordinates[index + 1]
    const segmentLength = distanceMeters(start, end)
    segmentLengths.push(segmentLength)
    totalRouteMeters += segmentLength
    const projection = projectToSegment(point, start, end)
    if (projection.distance < nearest.distance) {
      nearest = {
        segmentIndex: index,
        fraction: projection.fraction,
        distance: projection.distance
      }
    }
  }

  let traveledMeters = segmentLengths
    .slice(0, nearest.segmentIndex)
    .reduce((sum, length) => sum + length, 0)
  traveledMeters += (segmentLengths[nearest.segmentIndex] ?? 0) * nearest.fraction
  const ratio = totalRouteMeters > 0 ? traveledMeters / totalRouteMeters : 0
  const stepDistanceTotal = route.steps.reduce((sum, step) => sum + step.distanceMeters, 0)
    || route.distanceMeters
    || totalRouteMeters
  const stepDistanceTraveled = ratio * stepDistanceTotal

  let cumulative = 0
  let stepIndex = Math.max(0, route.steps.length - 1)
  let distanceToStepMeters = 0
  for (let index = 0; index < route.steps.length; index += 1) {
    cumulative += route.steps[index].distanceMeters
    if (stepDistanceTraveled <= cumulative) {
      stepIndex = index
      distanceToStepMeters = Math.max(0, cumulative - stepDistanceTraveled)
      break
    }
  }

  const destinationDistance = distanceMeters(point, route.destination.position)
  return {
    segmentIndex: nearest.segmentIndex,
    routeRatio: Math.max(0, Math.min(1, ratio)),
    distanceRemainingMeters: Math.max(0, route.distanceMeters * (1 - ratio)),
    distanceOffRouteMeters: nearest.distance,
    stepIndex,
    distanceToStepMeters,
    arrived: destinationDistance <= 35
  }
}
