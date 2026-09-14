import { AlertCircle, RotateCcw, X } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'

export const ModalErrorContext = createContext<{ error: string | null; clear: () => void; retry?: () => void }>({ error: null, clear: () => {} })
export const CommandAvailabilityContext = createContext(true)

interface ModalProps {
  label: string
  onDismiss?: (() => void) | undefined
  children: ReactNode
}

export function Modal({ label, onDismiss, children }: ModalProps) {
  const error = useContext(ModalErrorContext)
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className="modal-host"
      aria-label={label}
      onCancel={(event) => { event.preventDefault(); onDismiss?.() }}
    >
      {children}
      {(error.error || error.retry) && <div className="error-toast modal-error" role="alert"><AlertCircle size={19} /><span>{error.error ?? '上次操作尚未确认，请重试确认'}</span>{error.retry && <button onClick={error.retry} title="重试确认" aria-label="重试确认"><RotateCcw size={18} /></button>}<button onClick={error.clear} aria-label="关闭提示"><X size={17} /></button></div>}
    </dialog>
  )
}
