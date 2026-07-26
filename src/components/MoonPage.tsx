import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { CalendarDays, Clock3, Sparkles } from 'lucide-react'
import {
  SYNODIC_MONTH_DAYS,
  moonPhaseAt,
  upcomingMoonPhases
} from '../lib/moon'

const DAY = 86_400_000

function useCurrentTime() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return now
}

function phaseDescription(phaseFraction: number, phaseName: string) {
  if (phaseName === 'New Moon') return 'The next lunar cycle is beginning.'
  if (phaseName === 'Full Moon') return 'The lunar face is almost fully illuminated.'
  return phaseFraction < 0.5
    ? 'The illuminated portion is growing each night.'
    : 'The illuminated portion is shrinking each night.'
}

function timeUntil(now: Date, then: Date) {
  const difference = Math.max(0, then.getTime() - now.getTime())
  if (difference < DAY) {
    const hours = Math.max(1, Math.round(difference / 3_600_000))
    return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  const days = Math.ceil(difference / DAY)
  return `in ${days} days`
}

export function MoonCorner({ onOpen }: { onOpen: () => void }) {
  const now = useCurrentTime()
  const moon = useMemo(() => moonPhaseAt(now), [now])

  return (
    <button
      type="button"
      className="moon-corner"
      onClick={onOpen}
      aria-label={`Open Moon page. Current phase: ${moon.name}`}
    >
      <span className="moon-corner__glyph" aria-hidden="true">{moon.emoji}</span>
      <span className="moon-corner__copy">
        <strong>{moon.name}</strong>
        <small>{Math.round(moon.illumination * 100)}% illuminated</small>
      </span>
    </button>
  )
}

export function MoonPage() {
  const now = useCurrentTime()
  const moon = useMemo(() => moonPhaseAt(now), [now])
  const upcoming = useMemo(() => upcomingMoonPhases(now, 8), [now])
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }), [])
  const eventFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }), [])
  const cycleProgress = `${moon.phaseFraction * 100}%`

  return (
    <div className="moon-page">
      <section className="moon-hero">
        <span className="moon-hero__orb" aria-hidden="true">{moon.emoji}</span>
        <div>
          <span className="moon-date">{dateFormatter.format(now)}</span>
          <h3>{moon.name}</h3>
          <p>{phaseDescription(moon.phaseFraction, moon.name)}</p>
        </div>
      </section>

      <div className="moon-stats">
        <article>
          <span><Sparkles size={17} /> Illumination</span>
          <strong>{Math.round(moon.illumination * 100)}%</strong>
        </article>
        <article>
          <span><Clock3 size={17} /> Lunar age</span>
          <strong>{moon.ageDays.toFixed(1)} days</strong>
        </article>
      </div>

      <section className="moon-cycle-card">
        <div className="moon-section-heading">
          <span>Current lunar cycle</span>
          <small>Day {moon.ageDays.toFixed(1)} of {SYNODIC_MONTH_DAYS.toFixed(1)}</small>
        </div>
        <div className="moon-cycle-track" aria-label={`${Math.round(moon.phaseFraction * 100)}% through the lunar cycle`}>
          <span style={{ '--moon-progress': cycleProgress } as CSSProperties} />
        </div>
        <div className="moon-cycle-labels" aria-hidden="true">
          <span>🌑</span>
          <span>🌓</span>
          <span>🌕</span>
          <span>🌗</span>
          <span>🌑</span>
        </div>
      </section>

      <section className="moon-upcoming">
        <div className="moon-section-heading">
          <span><CalendarDays size={17} /> Upcoming phases</span>
          <small>Local time</small>
        </div>
        <div className="moon-event-list">
          {upcoming.map((event) => (
            <article key={`${event.name}-${event.date.toISOString()}`}>
              <span className="moon-event__glyph" aria-hidden="true">{event.emoji}</span>
              <span className="moon-event__copy">
                <strong>{event.name}</strong>
                <time dateTime={event.date.toISOString()}>{eventFormatter.format(event.date)}</time>
              </span>
              <small>{timeUntil(now, event.date)}</small>
            </article>
          ))}
        </div>
      </section>

      <p className="moon-footnote">
        Calculated on this device from the mean lunar cycle. Phase times are estimates and use your device’s local time.
      </p>
    </div>
  )
}
