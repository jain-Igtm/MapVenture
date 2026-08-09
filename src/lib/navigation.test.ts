import { describe, expect, it } from 'vitest'
import type { GeoFix, RoutePlan } from '../types'
import { navigationProgress, smoothHeading } from './navigation'

const route: RoutePlan = {
  mode: 'driving',
  origin: { id: 'a', label: 'A', position: [-78.9, 42.9], source: 'current' },
  destination: { id: 'b', label: 'B', position: [-78.88, 42.9], source: 'search' },
  coordinates: [[-78.9, 42.9], [-78.89, 42.9], [-78.88, 42.9]],
  distanceMeters: 1630,
  durationSeconds: 180,
  steps: [
    { id: '1', instruction: 'Head east', distanceMeters: 815, durationSeconds: 90 },
    { id: '2', instruction: 'Continue east', distanceMeters: 815, durationSeconds: 90 }
  ],
  createdAt: 1
}

function fix(longitude: number, latitude = 42.9): GeoFix {
  return { longitude, latitude, accuracy: 5, altitude: null, speed: 10, heading: 90, timestamp: 1 }
}

describe('navigationProgress', () => {
  it('tracks progress, remaining distance, and the current step', () => {
    const progress = navigationProgress(route, fix(-78.885))
    expect(progress.routeRatio).toBeGreaterThan(0.7)
    expect(progress.stepIndex).toBe(1)
    expect(progress.distanceRemainingMeters).toBeLessThan(500)
  })

  it('reports off-route distance', () => {
    expect(navigationProgress(route, fix(-78.89, 42.91)).distanceOffRouteMeters).toBeGreaterThan(1000)
  })
})

describe('smoothHeading', () => {
  it('takes the short path across north', () => {
    expect(smoothHeading(350, 10, 0.5)).toBeCloseTo(0)
  })
})
