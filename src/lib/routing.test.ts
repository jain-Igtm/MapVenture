import { describe, expect, it, vi } from 'vitest'
import type { RouteEndpoint } from '../types'
import { decodePolyline6, requestRoute } from './routing'

const origin: RouteEndpoint = {
  id: 'origin',
  label: 'Origin',
  position: [-78.8, 42.9],
  source: 'saved'
}

const destination: RouteEndpoint = {
  id: 'destination',
  label: 'Destination',
  position: [-78.7, 42.95],
  source: 'saved'
}

describe('decodePolyline6', () => {
  it('decodes signed latitude and longitude deltas', () => {
    expect(decodePolyline6('??AC@B')).toEqual([
      [0, 0],
      [0.000002, 0.000001],
      [0, 0]
    ])
  })
})

describe('requestRoute', () => {
  it('parses route shape, summary, and maneuvers', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      trip: {
        summary: { length: 1.25, time: 420 },
        legs: [{
          shape: '??AC',
          maneuvers: [{
            instruction: 'Head north.',
            length: 1.25,
            time: 420
          }]
        }]
      }
    }), { status: 200 }))

    const route = await requestRoute(origin, destination, 'walking', fetcher as typeof fetch)

    expect(route.coordinates).toEqual([[0, 0], [0.000002, 0.000001]])
    expect(route.distanceMeters).toBe(1250)
    expect(route.durationSeconds).toBe(420)
    expect(route.steps[0]).toMatchObject({
      instruction: 'Head north.',
      distanceMeters: 1250,
      durationSeconds: 420
    })

    const request = fetcher.mock.calls[0]
    expect(request[1]?.headers).toMatchObject({ 'X-Client-Id': 'mapventure-personal' })
    expect(JSON.parse(String(request[1]?.body))).toMatchObject({
      costing: 'pedestrian',
      units: 'kilometers'
    })
  })
})
