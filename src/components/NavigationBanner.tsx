import { CircleAlert, LocateFixed, Navigation, Route, X } from 'lucide-react'
import type { DistanceUnit, NavigationProgress, RoutePlan } from '../types'
import { formatDistance } from '../lib/geo'

interface NavigationBannerProps {
  route: RoutePlan
  progress?: NavigationProgress
  units: DistanceUnit
  following: boolean
  onOpen: () => void
  onRecenter: () => void
  onEnd: () => void
}

export function NavigationBanner({
  route,
  progress,
  units,
  following,
  onOpen,
  onRecenter,
  onEnd
}: NavigationBannerProps) {
  const step = progress ? route.steps[progress.stepIndex] : undefined
  const offRoute = Boolean(progress && progress.distanceOffRouteMeters > 65)
  const instruction = !progress
    ? 'Finding your live GPS position…'
    : progress.arrived
    ? `You have arrived at ${route.destination.label}`
    : offRoute
      ? route.direct ? 'Continue toward the destination' : 'Return to the highlighted route'
      : step?.instruction ?? `Continue to ${route.destination.label}`

  return (
    <section className={`navigation-banner ${offRoute ? 'navigation-banner--warning' : ''}`}>
      <button className="navigation-banner__main" onClick={onOpen}>
        <span className="navigation-banner__maneuver">
          {offRoute ? <CircleAlert size={27} /> : <Navigation size={28} />}
        </span>
        <span className="navigation-banner__copy">
          <small>
            {!progress
              ? 'Acquiring GPS'
              : progress.arrived
              ? 'Arrived'
              : offRoute
                ? `${Math.round(progress.distanceOffRouteMeters)} m off route`
                : formatDistance(progress.distanceToStepMeters, units)}
          </small>
          <strong>{instruction}</strong>
          <em>
            {route.direct
              ? 'Direct offline bearing · not a road route'
              : progress
                ? `${formatDistance(progress.distanceRemainingMeters, units)} remaining`
                : `Route to ${route.destination.label}`}
          </em>
        </span>
        <Route size={19} />
      </button>
      {!following && (
        <button className="navigation-banner__recenter" onClick={onRecenter}>
          <LocateFixed size={18} />
          Recenter
        </button>
      )}
      <button className="navigation-banner__end" onClick={onEnd} aria-label="End navigation">
        <X size={20} />
      </button>
    </section>
  )
}
