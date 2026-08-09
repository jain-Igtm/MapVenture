import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type PropsWithChildren, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface BottomSheetProps extends PropsWithChildren {
  title?: string
  eyebrow?: string
  onClose: () => void
  actions?: ReactNode
  roomy?: boolean
}

export function BottomSheet({
  title,
  eyebrow,
  onClose,
  actions,
  roomy = false,
  children
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const transitionTimerRef = useRef<number | undefined>(undefined)
  const touchRef = useRef({
    eligible: false,
    active: false,
    startX: 0,
    startY: 0,
    startTime: 0,
    offset: 0
  })
  const pointerRef = useRef({
    active: false,
    dragging: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startTime: 0,
    offset: 0
  })

  closeRef.current = onClose

  const applyOffset = (offset: number) => {
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.classList.add('is-dragging')
    sheet.style.transform = `translateY(${Math.max(0, offset)}px)`
    sheet.style.opacity = String(Math.max(0.68, 1 - offset / 720))
  }

  const resetSheet = () => {
    const sheet = sheetRef.current
    if (!sheet) return
    sheet.classList.remove('is-dragging')
    sheet.classList.add('is-snapping')
    sheet.style.transform = 'translateY(0)'
    sheet.style.opacity = '1'
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = window.setTimeout(() => {
      sheet.classList.remove('is-snapping')
      sheet.style.removeProperty('transform')
      sheet.style.removeProperty('opacity')
    }, 210)
  }

  const dismissSheet = () => {
    const sheet = sheetRef.current
    if (!sheet) {
      closeRef.current()
      return
    }
    sheet.classList.remove('is-dragging')
    sheet.classList.add('is-dismissing')
    sheet.style.transform = 'translateY(105%)'
    sheet.style.opacity = '0.72'
    navigator.vibrate?.(6)
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = window.setTimeout(() => closeRef.current(), 160)
  }

  const finishDrag = (offset: number, startedAt: number) => {
    const elapsed = Math.max(1, performance.now() - startedAt)
    const velocity = offset / elapsed
    if (offset > 96 || (offset > 38 && velocity > 0.5)) dismissSheet()
    else resetSheet()
  }

  useEffect(() => {
    const sheet = sheetRef.current
    if (!sheet) return

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      const target = event.target instanceof Element ? event.target : undefined
      const inDragZone = Boolean(target?.closest('.sheet-drag-zone'))
      const contentAtTop = (contentRef.current?.scrollTop ?? 0) <= 0
      touchRef.current = {
        eligible: inDragZone || contentAtTop,
        active: false,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: performance.now(),
        offset: 0
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      const drag = touchRef.current
      if (!drag.eligible || event.touches.length !== 1) return
      const touch = event.touches[0]
      const deltaX = touch.clientX - drag.startX
      const deltaY = touch.clientY - drag.startY

      if (!drag.active) {
        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 7) return
        if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
          drag.eligible = false
          return
        }
        drag.active = true
      }

      event.preventDefault()
      drag.offset = Math.max(0, deltaY)
      applyOffset(drag.offset)
    }

    const handleTouchEnd = () => {
      const drag = touchRef.current
      if (drag.active) finishDrag(drag.offset, drag.startTime)
      touchRef.current.eligible = false
      touchRef.current.active = false
    }

    const handleTouchCancel = () => {
      if (touchRef.current.active) resetSheet()
      touchRef.current.eligible = false
      touchRef.current.active = false
    }

    sheet.addEventListener('touchstart', handleTouchStart, { passive: true })
    sheet.addEventListener('touchmove', handleTouchMove, { passive: false })
    sheet.addEventListener('touchend', handleTouchEnd)
    sheet.addEventListener('touchcancel', handleTouchCancel)

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart)
      sheet.removeEventListener('touchmove', handleTouchMove)
      sheet.removeEventListener('touchend', handleTouchEnd)
      sheet.removeEventListener('touchcancel', handleTouchCancel)
      if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
    }
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    const inDragZone = Boolean((event.target as Element).closest('.sheet-drag-zone'))
    const contentAtTop = (contentRef.current?.scrollTop ?? 0) <= 0
    if (!inDragZone && !contentAtTop) return
    pointerRef.current = {
      active: true,
      dragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: performance.now(),
      offset: 0
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = pointerRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY

    if (!drag.dragging) {
      if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 6) return
      if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
        drag.active = false
        return
      }
      drag.dragging = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }

    drag.offset = deltaY
    applyOffset(deltaY)
  }

  const handlePointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = pointerRef.current
    if (!drag.active || drag.pointerId !== event.pointerId) return
    drag.active = false
    if (drag.dragging) finishDrag(drag.offset, drag.startTime)
  }

  return (
    <section
      ref={sheetRef}
      className={`bottom-sheet ${roomy ? 'bottom-sheet--roomy' : ''}`}
      aria-label={title}
      role="dialog"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div className="sheet-drag-zone" aria-label="Swipe down to close">
        <div className="sheet-handle" />
        <header className="sheet-header">
          <div className="sheet-title-wrap">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          <div className="sheet-actions">
            {actions}
            <button className="icon-button icon-button--quiet" onClick={onClose} aria-label="Close">
              <X size={21} />
            </button>
          </div>
        </header>
      </div>
      <div ref={contentRef} className="sheet-content">{children}</div>
    </section>
  )
}
