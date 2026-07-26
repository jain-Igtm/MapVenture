import type { Position } from 'geojson'
import type {
  RouteEndpoint,
  RoutePlan,
  RouteStep,
  TravelMode
} from '../types'

const VALHALLA_ENDPOINT = 'https://valhalla1.openstreetmap.de/route'
const ROUTE_TIMEOUT_MS = 25_000

interface ValhallaManeuver {
  instruction?: unknown
  length?: unknown
  time?: unknown
}

interface ValhallaLeg {
  shape?: unknown
  maneuvers?: unknown
}

interface ValhallaTrip {
  summary?: {
    length?: unknown
    time?: unknown
  }
  legs?: unknown
  status_message?: unknown
}

interface ValhallaResponse {
  trip?: ValhallaTrip
  error?: unknown
  error_code?: unknown
}

function numeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function decodeValue(shape: string, state: { index: number }): number {
  let result = 0
  let shift = 0

  while (state.index < shape.length) {
    const byte = shape.charCodeAt(state.index++) - 63
    if (byte < 0 || byte > 63) throw new Error('The route shape was invalid.')
    result |= (byte & 0x1f) << shift
    shift += 5
    if (byte < 0x20) return (result & 1) ? ~(result >> 1) : result >> 1
    if (shift > 30) throw new Error('The route shape was invalid.')
  }

  throw new Error('The route shape ended unexpectedly.')
}

export function decodePolyline6(shape: string): Position[] {
  const state = { index: 0 }
  const coordinates: Position[] = []
  let latitude = 0
  let longitude = 0

  while (state.index < shape.length) {
    latitude += decodeValue(shape, state)
    longitude += decodeValue(shape, state)
    coordinates.push([longitude / 1e6, latitude / 1e6])
  }

  return coordinates
}

function routeError(payload: ValhallaResponse, status: number): string {
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error
  if (typeof payload.trip?.status_message === 'string' && payload.trip.status_message.trim()) {
    return payload.trip.status_message
  }
  if (status === 429) return 'The routing service is busy. Wait a moment and try again.'
  return 'No route could be found between those points.'
}

function parseSteps(legs: ValhallaLeg[]): RouteStep[] {
  return legs.flatMap((leg, legIndex) => {
    const maneuvers = Array.isArray(leg.maneuvers)
      ? leg.maneuvers as ValhallaManeuver[]
      : []
    return maneuvers.flatMap((maneuver, maneuverIndex) => {
      const instruction = typeof maneuver.instruction === 'string'
        ? maneuver.instruction.trim()
        : ''
      if (!instruction) return []
      return [{
        id: `${legIndex}:${maneuverIndex}`,
        instruction,
        distanceMeters: numeric(maneuver.length) * 1000,
        durationSeconds: numeric(maneuver.time)
      }]
    })
  })
}

function parseCoordinates(legs: ValhallaLeg[]): Position[] {
  return legs.reduce<Position[]>((coordinates, leg) => {
    if (typeof leg.shape !== 'string' || !leg.shape) return coordinates
    const decoded = decodePolyline6(leg.shape)
    if (
      coordinates.length > 0
      && decoded.length > 0
      && coordinates.at(-1)?.[0] === decoded[0][0]
      && coordinates.at(-1)?.[1] === decoded[0][1]
    ) {
      coordinates.push(...decoded.slice(1))
    } else {
      coordinates.push(...decoded)
    }
    return coordinates
  }, [])
}

export async function requestRoute(
  origin: RouteEndpoint,
  destination: RouteEndpoint,
  mode: TravelMode,
  fetcher: typeof fetch = fetch
): Promise<RoutePlan> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS)

  try {
    const response = await fetcher(VALHALLA_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Id': 'mapventure-personal'
      },
      body: JSON.stringify({
        locations: [
          { lon: origin.position[0], lat: origin.position[1] },
          { lon: destination.position[0], lat: destination.position[1] }
        ],
        costing: mode === 'driving' ? 'auto' : 'pedestrian',
        units: 'kilometers',
        language: 'en-US',
        directions_type: 'instructions',
        shape_format: 'polyline6'
      }),
      signal: controller.signal
    })

    let payload: ValhallaResponse
    try {
      payload = await response.json() as ValhallaResponse
    } catch {
      throw new Error('The routing service returned an unreadable response.')
    }

    if (!response.ok || !payload.trip) {
      throw new Error(routeError(payload, response.status))
    }

    const legs = Array.isArray(payload.trip.legs)
      ? payload.trip.legs as ValhallaLeg[]
      : []
    const coordinates = parseCoordinates(legs)
    if (coordinates.length < 2) throw new Error('The route did not include a usable path.')

    return {
      mode,
      origin,
      destination,
      coordinates,
      distanceMeters: numeric(payload.trip.summary?.length) * 1000,
      durationSeconds: numeric(payload.trip.summary?.time),
      steps: parseSteps(legs),
      createdAt: Date.now()
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Route calculation took too long. Check your connection and try again.')
    }
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : 'Route calculation is unavailable right now.'
    )
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export function formatRouteDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`
}
