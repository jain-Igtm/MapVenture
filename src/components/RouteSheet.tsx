import { useEffect, useMemo, useState } from 'react'
import {
  Car,
  CircleAlert,
  Footprints,
  LoaderCircle,
  MapPin,
  Navigation,
  Route,
  Trash2
} from 'lucide-react'
import type {
  DistanceUnit,
  RouteEndpoint,
  RoutePlan,
  TravelMode
} from '../types'
import { formatDistance } from '../lib/geo'
import { formatRouteDuration } from '../lib/routing'

interface RouteSheetProps {
  points: RouteEndpoint[]
  destination?: RouteEndpoint
  mode: TravelMode
  route?: RoutePlan
  loading: boolean
  error?: string
  units: DistanceUnit
  navigationActive: boolean
  onModeChange: (mode: TravelMode) => void
  onDestinationChange: (destination: RouteEndpoint) => void
  onBuild: (originId: string, destination: RouteEndpoint, mode: TravelMode) => void
  onStart: () => void
  onClear: () => void
}

export function RouteSheet({
  points,
  destination,
  mode,
  route,
  loading,
  error,
  units,
  navigationActive,
  onModeChange,
  onDestinationChange,
  onBuild,
  onStart,
  onClear
}: RouteSheetProps) {
  const [originId, setOriginId] = useState('current')
  const [destinationId, setDestinationId] = useState(destination?.id ?? '')

  useEffect(() => {
    setDestinationId(destination?.id ?? '')
  }, [destination?.id])

  useEffect(() => {
    if (!route) return
    setOriginId(route.origin.source === 'current' ? 'current' : route.origin.id)
  }, [route?.createdAt])

  const selectedDestination = useMemo(
    () => points.find((point) => point.id === destinationId) ?? destination,
    [destination, destinationId, points]
  )

  const canBuild = Boolean(selectedDestination) && originId !== destinationId && !loading

  return (
    <div className="route-sheet">
      <div className="route-mode-picker" aria-label="Travel mode">
        <button
          className={mode === 'driving' ? 'is-selected' : ''}
          onClick={() => onModeChange('driving')}
        >
          <Car size={19} />
          Drive
        </button>
        <button
          className={mode === 'walking' ? 'is-selected' : ''}
          onClick={() => onModeChange('walking')}
        >
          <Footprints size={19} />
          Walk
        </button>
      </div>

      <div className="route-endpoints">
        <label>
          <span className="route-endpoint-dot route-endpoint-dot--start" />
          <div>
            <small>From</small>
            <select value={originId} onChange={(event) => setOriginId(event.target.value)}>
              <option value="current">My current location</option>
              {points.map((point) => (
                <option key={point.id} value={point.id}>{point.label}</option>
              ))}
            </select>
          </div>
        </label>
        <span className="route-endpoint-line" />
        <label>
          <span className="route-endpoint-dot route-endpoint-dot--finish" />
          <div>
            <small>To</small>
            <select
              value={destinationId}
              onChange={(event) => {
                const next = points.find((point) => point.id === event.target.value)
                setDestinationId(event.target.value)
                if (next) onDestinationChange(next)
              }}
            >
              <option value="" disabled>Choose a saved or searched point</option>
              {points.map((point) => (
                <option key={point.id} value={point.id}>{point.label}</option>
              ))}
            </select>
          </div>
        </label>
      </div>

      <button
        className="primary-button primary-button--wide route-build-button"
        disabled={!canBuild}
        onClick={() => selectedDestination && onBuild(originId, selectedDestination, mode)}
      >
        {loading ? <LoaderCircle className="spin" size={20} /> : <Navigation size={20} />}
        {loading ? 'Building route…' : route ? 'Update route' : 'Get route'}
      </button>

      {error && (
        <div className="route-error">
          <CircleAlert size={20} />
          <span>{error}</span>
        </div>
      )}

      {route && (
        <>
          <section className="route-summary">
            <span className="route-summary-icon">
              {route.mode === 'driving' ? <Car size={23} /> : <Footprints size={23} />}
            </span>
            <div>
              <strong>{formatRouteDuration(route.durationSeconds)}</strong>
              <small>{formatDistance(route.distanceMeters, units)}</small>
            </div>
            <span className="route-summary-copy">
              <strong>{route.destination.label}</strong>
              <small>{route.direct ? 'Direct bearing only — this is not a road route.' : 'Saved on this device for use if your data drops.'}</small>
            </span>
          </section>

          {route.origin.source === 'current' && !navigationActive && (
            <button className="primary-button primary-button--wide" onClick={onStart}>
              <Navigation size={20} />
              Resume live navigation
            </button>
          )}

          <section className="route-directions">
            <div className="section-label-row">
              <span><Route size={16} /> Directions</span>
              <small>{route.steps.length} steps</small>
            </div>
            <ol>
              {route.steps.map((step, index) => (
                <li key={step.id}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{step.instruction}</strong>
                    {step.distanceMeters > 0 && <small>{formatDistance(step.distanceMeters, units)}</small>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <button className="route-clear-button" onClick={onClear}>
            <Trash2 size={17} />
            Clear route
          </button>
        </>
      )}

      {!route && !loading && !error && (
        <div className="route-empty">
          <MapPin size={24} />
          <span>Choose any two saved or searched points, or start from your current location.</span>
        </div>
      )}

      <p className="provider-note">
        {route?.direct
          ? 'Direct guidance uses only GPS and the entered coordinate. It is not a road route.'
          : 'Routing © OpenStreetMap contributors · Directions by Valhalla'}
      </p>
    </div>
  )
}
