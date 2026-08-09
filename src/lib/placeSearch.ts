import type { Position } from 'geojson'
import type { SearchPlace } from '../types'

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/'
const SEARCH_TIMEOUT_MS = 15_000

interface PhotonFeature {
  geometry?: {
    type?: unknown
    coordinates?: unknown
  }
  properties?: Record<string, unknown>
}

interface PhotonResponse {
  features?: unknown
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function identifier(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function unique(parts: string[]): string[] {
  return parts.filter((part, index) => part && parts.indexOf(part) === index)
}

function placeFromFeature(feature: PhotonFeature, index: number): SearchPlace | undefined {
  const coordinates = feature.geometry?.coordinates
  if (
    feature.geometry?.type !== 'Point'
    || !Array.isArray(coordinates)
    || coordinates.length < 2
  ) return undefined

  const longitude = number(coordinates[0])
  const latitude = number(coordinates[1])
  if (
    longitude === undefined
    || latitude === undefined
    || longitude < -180
    || longitude > 180
    || latitude < -90
    || latitude > 90
  ) return undefined

  const properties = feature.properties ?? {}
  const houseNumber = text(properties.housenumber)
  const street = text(properties.street)
  const locality = text(properties.city)
    || text(properties.town)
    || text(properties.village)
    || text(properties.district)
    || text(properties.county)
  const state = text(properties.state)
  const postcode = text(properties.postcode)
  const country = text(properties.country)
  const streetLine = unique([houseNumber, street]).join(' ')
  const name = text(properties.name)
    || streetLine
    || locality
    || state
    || country
    || 'Search result'
  const address = unique([
    streetLine && streetLine !== name ? streetLine : '',
    locality && locality !== name ? locality : '',
    state && state !== name ? state : '',
    postcode,
    country && country !== name ? country : ''
  ]).join(', ')

  const osmType = text(properties.osm_type) || 'place'
  const osmId = identifier(properties.osm_id) || `${longitude},${latitude},${index}`

  return {
    id: `photon:${osmType}:${osmId}`,
    name,
    address,
    position: [longitude, latitude],
    kind: text(properties.osm_value) || text(properties.type) || text(properties.osm_key) || undefined
  }
}

export async function searchPlaces(
  query: string,
  bias?: Position,
  fetcher: typeof fetch = fetch
): Promise<SearchPlace[]> {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const url = new URL(PHOTON_ENDPOINT)
  url.searchParams.set('q', normalizedQuery)
  url.searchParams.set('limit', '10')

  if (
    bias
    && Number.isFinite(bias[0])
    && Number.isFinite(bias[1])
  ) {
    url.searchParams.set('lon', String(bias[0]))
    url.searchParams.set('lat', String(bias[1]))
  }

  const language = typeof navigator === 'undefined'
    ? 'en'
    : navigator.language.split('-')[0]
  if (/^[a-z]{2}$/i.test(language)) url.searchParams.set('lang', language.toLowerCase())

  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS)

  try {
    const response = await fetcher(url, {
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`Place search returned ${response.status}.`)

    const payload = await response.json() as PhotonResponse
    const features = Array.isArray(payload.features) ? payload.features as PhotonFeature[] : []
    return features
      .map(placeFromFeature)
      .filter((place): place is SearchPlace => Boolean(place))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Place search took too long. Check your connection and try again.')
    }
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : 'Place search is unavailable right now.'
    )
  } finally {
    globalThis.clearTimeout(timeout)
  }
}
