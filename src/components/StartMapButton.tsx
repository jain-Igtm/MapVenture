import { LoaderCircle, Plus } from 'lucide-react'

interface StartMapButtonProps {
  onStart: () => void
  busy: boolean
}

export function StartMapButton({ onStart, busy }: StartMapButtonProps) {
  return (
    <button
      type="button"
      className={`first-pin-hint${busy ? ' is-busy' : ''}`}
      onClick={onStart}
      disabled={busy}
      aria-busy={busy}
    >
      <span>
        {busy
          ? <LoaderCircle className="first-pin-hint__spinner" size={19} />
          : <Plus size={18} />}
      </span>
      <div>
        <strong>Start your map</strong>
        <small aria-live="polite">
          {busy
            ? 'Getting your location…'
            : 'Save where you are, or hold anywhere on the map.'}
        </small>
      </div>
    </button>
  )
}
