import { describe, expect, it, vi } from 'vitest'
import type { MouseEvent, PointerEvent, ReactElement } from 'react'
import { StartMapButton } from './StartMapButton'

interface StartMapButtonHandlers {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

function handlersFor(onStart: () => void) {
  const element = StartMapButton({ onStart }) as ReactElement<StartMapButtonHandlers>
  return element.props
}

describe('StartMapButton', () => {
  it('starts on the initial primary pointer contact', () => {
    const onStart = vi.fn()
    const preventDefault = vi.fn()
    const stopPropagation = vi.fn()
    const handlers = handlersFor(onStart)

    handlers.onPointerDown({
      isPrimary: true,
      button: 0,
      preventDefault,
      stopPropagation
    } as unknown as PointerEvent<HTMLButtonElement>)

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(stopPropagation).toHaveBeenCalledTimes(1)
  })

  it('ignores the compatibility click after a pointer press', () => {
    const onStart = vi.fn()
    const handlers = handlersFor(onStart)

    handlers.onClick({ detail: 1 } as MouseEvent<HTMLButtonElement>)

    expect(onStart).not.toHaveBeenCalled()
  })

  it('still starts from a keyboard-generated click', () => {
    const onStart = vi.fn()
    const handlers = handlersFor(onStart)

    handlers.onClick({ detail: 0 } as MouseEvent<HTMLButtonElement>)

    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
