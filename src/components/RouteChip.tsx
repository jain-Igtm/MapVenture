import { Car, Footprints, X } from 'lucide-react'
import type { DistanceUnit, RoutePlan } from '../types'
import { formatDistance } from '../lib/geo'
import { formatRouteDuration } from '../lib/routing'

interface RouteChipProps {
  route: RoutePlan
  units: DistanceUnit
  onOpen: () => void
  onClear: () => void
}

export function RouteChip({ route, units, onOpen, onClear }: RouteChipProps) {
  return (
    <div className="route-chip">
      <button className="route-chip__main" onClick={onOpen}>
        <span className="route-chip__icon">
          {route.mode === 'driving' ? <Car size={20} /> : <Footprints size={20} />}
        </span>
        <span>
          <strong>{formatRouteDuration(route.durationSeconds)} · {formatDistance(route.distanceMeters, units)}</strong>
          <small>To {route.destination.label}</small>
        </span>
      </button>
      <button className="route-chip__close" onClick={onClear} aria-label="Clear route">
        <X size={18} />
      </button>
    </div>
  )
}
