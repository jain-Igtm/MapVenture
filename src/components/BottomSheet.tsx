import type { PropsWithChildren, ReactNode } from 'react'
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
  return (
    <section className={`bottom-sheet ${roomy ? 'bottom-sheet--roomy' : ''}`} aria-label={title}>
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
      <div className="sheet-content">{children}</div>
    </section>
  )
}
