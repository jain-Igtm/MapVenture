import { describe, expect, it } from 'vitest'
import type { Position } from 'geojson'
import {
  canFinishSurvey,
  closeRing,
  formatArea,
  formatDistance,
  geometryAreaSquareMeters,
  geometryLengthMeters,
  positionDistanceMeters,
  surveyGeometry
} from './geo'

describe('survey geometry', () => {
  const points: Position[] = [
    [-78.8784, 42.8864],
    [-78.8774, 42.8864],
    [-78.8774, 42.8874]
  ]

  it('closes polygon rings exactly once', () => {
    expect(closeRing(points)).toEqual([...points, points[0]])
    expect(closeRing([...points, points[0]])).toEqual([...points, points[0]])
  })

  it('creates a line for a trail and polygon for an area', () => {
    expect(surveyGeometry('record-trail', points)).toEqual({
      type: 'LineString',
      coordinates: points
    })
    expect(surveyGeometry('draw-area', points)).toEqual({
      type: 'Polygon',
      coordinates: [[...points, points[0]]]
    })
  })

  it('requires enough points to produce valid geometry', () => {
    expect(canFinishSurvey('draw-trail', points.slice(0, 1))).toBe(false)
    expect(canFinishSurvey('draw-trail', points.slice(0, 2))).toBe(true)
    expect(canFinishSurvey('draw-area', points.slice(0, 2))).toBe(false)
    expect(canFinishSurvey('draw-area', points)).toBe(true)
  })
})

describe('map measurements', () => {
  it('measures position and path distance in meters', () => {
    const start: Position = [-78.8784, 42.8864]
    const end: Position = [-78.8774, 42.8864]
    const distance = positionDistanceMeters(start, end)
    expect(distance).toBeGreaterThan(75)
    expect(distance).toBeLessThan(90)
    expect(geometryLengthMeters({ type: 'LineString', coordinates: [start, end] })).toBeCloseTo(distance, 5)
  })

  it('measures a valid polygon area', () => {
    const area = geometryAreaSquareMeters({
      type: 'Polygon',
      coordinates: [[
        [-78.8784, 42.8864],
        [-78.8774, 42.8864],
        [-78.8774, 42.8874],
        [-78.8784, 42.8874],
        [-78.8784, 42.8864]
      ]]
    })
    expect(area).toBeGreaterThan(8_000)
    expect(area).toBeLessThan(10_000)
  })

  it('formats measurements in the selected unit system', () => {
    expect(formatDistance(1609.344, 'imperial')).toBe('1.0 mi')
    expect(formatDistance(1200, 'metric')).toBe('1.2 km')
    expect(formatArea(4046.8564224, 'imperial')).toBe('1.0 acres')
    expect(formatArea(20_000, 'metric')).toBe('2.0 ha')
  })
})
