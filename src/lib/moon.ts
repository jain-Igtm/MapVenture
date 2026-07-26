const MILLISECONDS_PER_DAY = 86_400_000
const JULIAN_UNIX_EPOCH = 2_440_587.5
const REFERENCE_NEW_MOON_JULIAN_DAY = 2_451_550.25972

export const SYNODIC_MONTH_DAYS = 29.530588853

export type MoonPhaseName =
  | 'New Moon'
  | 'Waxing Crescent'
  | 'First Quarter'
  | 'Waxing Gibbous'
  | 'Full Moon'
  | 'Waning Gibbous'
  | 'Last Quarter'
  | 'Waning Crescent'

export interface MoonPhase {
  name: MoonPhaseName
  emoji: string
  phaseFraction: number
  illumination: number
  ageDays: number
  waxing: boolean
}

export interface MoonPhaseEvent {
  name: 'New Moon' | 'First Quarter' | 'Full Moon' | 'Last Quarter'
  emoji: string
  date: Date
}

const PHASES: Array<Pick<MoonPhase, 'name' | 'emoji'>> = [
  { name: 'New Moon', emoji: '🌑' },
  { name: 'Waxing Crescent', emoji: '🌒' },
  { name: 'First Quarter', emoji: '🌓' },
  { name: 'Waxing Gibbous', emoji: '🌔' },
  { name: 'Full Moon', emoji: '🌕' },
  { name: 'Waning Gibbous', emoji: '🌖' },
  { name: 'Last Quarter', emoji: '🌗' },
  { name: 'Waning Crescent', emoji: '🌘' }
]

const PRINCIPAL_PHASES: Array<{
  fraction: number
  name: MoonPhaseEvent['name']
  emoji: string
}> = [
  { fraction: 0, name: 'New Moon', emoji: '🌑' },
  { fraction: 0.25, name: 'First Quarter', emoji: '🌓' },
  { fraction: 0.5, name: 'Full Moon', emoji: '🌕' },
  { fraction: 0.75, name: 'Last Quarter', emoji: '🌗' }
]

function julianDay(date: Date) {
  return date.getTime() / MILLISECONDS_PER_DAY + JULIAN_UNIX_EPOCH
}

function dateFromJulianDay(day: number) {
  return new Date((day - JULIAN_UNIX_EPOCH) * MILLISECONDS_PER_DAY)
}

function normalizeCycle(value: number) {
  return ((value % 1) + 1) % 1
}

function cycleAt(date: Date) {
  return (julianDay(date) - REFERENCE_NEW_MOON_JULIAN_DAY) / SYNODIC_MONTH_DAYS
}

export function moonPhaseAt(date: Date): MoonPhase {
  const phaseFraction = normalizeCycle(cycleAt(date))
  const phaseIndex = Math.floor((phaseFraction + 1 / 16) * 8) % 8
  const phase = PHASES[phaseIndex]

  return {
    ...phase,
    phaseFraction,
    illumination: (1 - Math.cos(phaseFraction * Math.PI * 2)) / 2,
    ageDays: phaseFraction * SYNODIC_MONTH_DAYS,
    waxing: phaseFraction < 0.5
  }
}

export function upcomingMoonPhases(from: Date, count = 6): MoonPhaseEvent[] {
  const currentCycle = cycleAt(from)
  const firstLunation = Math.floor(currentCycle) - 1
  const events: MoonPhaseEvent[] = []

  for (let lunation = firstLunation; lunation < firstLunation + 5; lunation += 1) {
    for (const phase of PRINCIPAL_PHASES) {
      const eventJulianDay = REFERENCE_NEW_MOON_JULIAN_DAY
        + (lunation + phase.fraction) * SYNODIC_MONTH_DAYS
      const date = dateFromJulianDay(eventJulianDay)
      if (date.getTime() <= from.getTime()) continue
      events.push({ name: phase.name, emoji: phase.emoji, date })
    }
  }

  return events
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .slice(0, count)
}
