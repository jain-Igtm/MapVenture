import { describe, expect, it } from 'vitest'
import {
  SYNODIC_MONTH_DAYS,
  moonPhaseAt,
  upcomingMoonPhases
} from './moon'

const REFERENCE_NEW_MOON = new Date('2000-01-06T18:14:00Z')
const DAY = 86_400_000

describe('moon phase calculations', () => {
  it('recognizes the reference new moon', () => {
    const moon = moonPhaseAt(REFERENCE_NEW_MOON)

    expect(moon.name).toBe('New Moon')
    expect(moon.illumination).toBeLessThan(0.001)
    expect(moon.ageDays).toBeLessThan(0.01)
  })

  it('tracks quarter and full phases through the lunar cycle', () => {
    const firstQuarter = moonPhaseAt(new Date(
      REFERENCE_NEW_MOON.getTime() + SYNODIC_MONTH_DAYS * DAY * 0.25
    ))
    const fullMoon = moonPhaseAt(new Date(
      REFERENCE_NEW_MOON.getTime() + SYNODIC_MONTH_DAYS * DAY * 0.5
    ))

    expect(firstQuarter.name).toBe('First Quarter')
    expect(firstQuarter.illumination).toBeCloseTo(0.5, 3)
    expect(fullMoon.name).toBe('Full Moon')
    expect(fullMoon.illumination).toBeCloseTo(1, 3)
  })

  it('returns future principal phases in chronological order', () => {
    const from = new Date('2026-07-26T12:00:00Z')
    const events = upcomingMoonPhases(from, 8)

    expect(events).toHaveLength(8)
    expect(events.every((event) => event.date.getTime() > from.getTime())).toBe(true)
    expect(events.every((event, index) =>
      index === 0 || event.date.getTime() > events[index - 1].date.getTime()
    )).toBe(true)
  })
})
