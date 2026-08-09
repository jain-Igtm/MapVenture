import type { SearchPlace } from '../types'

const DECIMAL = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)'

function parseNumber(value: string, hemisphere?: string): number {
  const parsed = Number(value)
  if (!hemisphere) return parsed
  const direction = hemisphere.toUpperCase()
  return (direction === 'S' || direction === 'W') ? -Math.abs(parsed) : Math.abs(parsed)
}

function valid(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90
    && Math.abs(longitude) <= 180
}

export function parseCoordinateQuery(query: string): SearchPlace | undefined {
  const normalized = query.trim().replace(/^geo:\s*/i, '')
  if (!normalized) return undefined

  const labeled = normalized.match(new RegExp(
    `^lat(?:itude)?\\s*[:=]?\\s*(${DECIMAL})\\s*([NS])?\\s*[,; ]+\\s*(?:lon|lng|longitude)\\s*[:=]?\\s*(${DECIMAL})\\s*([EW])?$`,
    'i'
  ))
  const plain = normalized.match(new RegExp(
    `^(${DECIMAL})\\s*([NS])?\\s*[,;\\s]+\\s*(${DECIMAL})\\s*([EW])?$`,
    'i'
  ))
  const match = labeled ?? plain
  if (!match) return undefined

  const latitude = parseNumber(match[1], match[2])
  const longitude = parseNumber(match[3], match[4])
  if (!valid(latitude, longitude)) return undefined

  const latitudeLabel = latitude.toFixed(6).replace(/\.?0+$/, '')
  const longitudeLabel = longitude.toFixed(6).replace(/\.?0+$/, '')
  const label = `${latitudeLabel}, ${longitudeLabel}`

  return {
    id: `coordinate:${latitudeLabel}:${longitudeLabel}`,
    name: label,
    address: 'Coordinate point',
    position: [longitude, latitude],
    kind: 'coordinate',
    offline: true
  }
}
