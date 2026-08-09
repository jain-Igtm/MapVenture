import { describe, expect, it } from 'vitest'
import { parseCoordinateQuery } from './coordinates'

describe('parseCoordinateQuery', () => {
  it('parses conventional latitude, longitude decimal coordinates', () => {
    expect(parseCoordinateQuery('42.8864, -78.8784')).toMatchObject({
      position: [-78.8784, 42.8864],
      offline: true,
      kind: 'coordinate'
    })
  })

  it('parses geo URIs and hemisphere coordinates', () => {
    expect(parseCoordinateQuery('geo:42.9N 78.8W')?.position).toEqual([-78.8, 42.9])
    expect(parseCoordinateQuery('lat 42.9, lon -78.8')?.position).toEqual([-78.8, 42.9])
  })

  it('rejects invalid and ambiguous non-coordinate text', () => {
    expect(parseCoordinateQuery('91, -78')).toBeUndefined()
    expect(parseCoordinateQuery('Buffalo 42 -78')).toBeUndefined()
  })
})
