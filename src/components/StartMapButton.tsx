import type { MouseEvent, PointerEvent } from 'react'
import { Plus } from 'lucide-react'

interface StartMapButtonProps {
  onStart: () => void
}

export function StartMapButton({ onStart }: StartMapButtonProps) {
  const startFromPointer = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onStart()
  }

  const startFromKeyboard = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0) onStart()
  }

  return (
    <button
      type="button"
      className="first-pin-hint"
      onPointerDown={startFromPointer}
      onClick={startFromKeyboard}
    >
      <span><Plus size={18} /></span>
      <div>
        <strong>Start your map</strong>
        <small>Save where you are, or hold anywhere on the map.</small>
      </div>
    </button>
  )
}
