import { describe, expect, it, vi } from 'vitest'
import { searchPlaces } from './placeSearch'

describe('searchPlaces', () => {
  it('parses named places and addresses from Photon GeoJSON', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      features: [{
        geometry: {
          type: 'Point',
          coordinates: [-78.7512, 42.8984]
        },
        properties: {
          osm_type: 'W',
          osm_id: 123,
          name: 'Cheektowaga Central High School',
          street: 'Union Road',
          housenumber: '3600',
          city: 'Cheektowaga',
          state: 'New York',
          postcode: '14225',
          country: 'United States',
          osm_value: 'school',
          type: 'school'
        }
      }]
    }), { status: 200 }))

    const results = await searchPlaces(
      'Cheektowaga Central High School',
      [-78.8, 42.9],
      fetcher as typeof fetch
    )

    expect(results).toEqual([{
      id: 'photon:W:123',
      name: 'Cheektowaga Central High School',
      address: '3600 Union Road, Cheektowaga, New York, 14225, United States',
      position: [-78.7512, 42.8984],
      kind: 'school'
    }])
    expect(fetcher).toHaveBeenCalledOnce()
    expect(String(fetcher.mock.calls[0][0])).toContain('q=Cheektowaga+Central+High+School')
    expect(String(fetcher.mock.calls[0][0])).toContain('lon=-78.8')
    expect(String(fetcher.mock.calls[0][0])).toContain('lat=42.9')
  })

  it('ignores malformed features', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      features: [
        { geometry: { type: 'LineString', coordinates: [] }, properties: {} },
        { geometry: { type: 'Point', coordinates: ['bad', 42] }, properties: {} }
      ]
    }), { status: 200 }))

    await expect(searchPlaces('somewhere', undefined, fetcher as typeof fetch)).resolves.toEqual([])
  })
})
