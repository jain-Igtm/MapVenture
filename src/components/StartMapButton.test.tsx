import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { StartMapButton } from './StartMapButton'

interface StartMapButtonHandlers {
  onClick: () => void
  onPointerDown?: () => void
  disabled: boolean
  'aria-busy': boolean
}

function handlersFor(onStart: () => void, busy = false) {
  const element = StartMapButton({ onStart, busy }) as ReactElement<StartMapButtonHandlers>
  return element.props
}

describe('StartMapButton', () => {
  it('starts from one ordinary click', () => {
    const onStart = vi.fn()
    const handlers = handlersFor(onStart)

    handlers.onClick()

    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('does not use an early pointer-down handler', () => {
    const onStart = vi.fn()
    const handlers = handlersFor(onStart)

    expect(handlers.onPointerDown).toBeUndefined()
  })

  it('becomes busy and disabled while location is being resolved', () => {
    const onStart = vi.fn()
    const handlers = handlersFor(onStart, true)

    expect(handlers.disabled).toBe(true)
    expect(handlers['aria-busy']).toBe(true)
  })
})
