import { Compass, LocateFixed } from 'lucide-react'

interface CompassControlProps {
  bearing: number
  navigationActive: boolean
  following: boolean
  onRecenter: () => void
}

export function CompassControl({
  bearing,
  navigationActive,
  following,
  onRecenter
}: CompassControlProps) {
  return (
    <button
      className={`compass-control ${navigationActive ? 'compass-control--driving' : ''} ${following ? 'is-following' : ''}`}
      onClick={onRecenter}
      aria-label={navigationActive ? 'Recenter and follow my direction' : 'Compass: map is north up'}
    >
      <span className="compass-control__dial" style={{ transform: `rotate(${-bearing}deg)` }}>
        <strong>N</strong>
        <Compass size={25} />
      </span>
      {navigationActive && !following && <LocateFixed className="compass-control__recenter" size={15} />}
    </button>
  )
}
