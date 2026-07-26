import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

export interface ToastMessage {
  id: string
  tone: 'success' | 'info' | 'warning'
  message: string
}

interface ToastProps {
  toast: ToastMessage
  onDismiss: () => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = toast.tone === 'success'
    ? CheckCircle2
    : toast.tone === 'warning'
      ? TriangleAlert
      : Info

  return (
    <div className={`toast toast--${toast.tone}`} role="status">
      <Icon size={19} />
      <span>{toast.message}</span>
      <button onClick={onDismiss} aria-label="Dismiss message">
        <X size={17} />
      </button>
    </div>
  )
}
