import { TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { Modal } from '../components/Modal.js'
import { Button } from './Button.js'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  title: string
  description: ReactNode
  icon?: ReactNode
  confirmLabel: string
  cancelLabel: string
  /** `danger` for irreversible actions such as surrendering or bankruptcy. */
  tone?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
  confirmDisabled?: boolean
  /** Blocks cancelling, e.g. while a submitted request is still in flight. */
  locked?: boolean
}

export function ConfirmDialog({
  title,
  description,
  icon,
  confirmLabel,
  cancelLabel,
  tone = 'primary',
  onConfirm,
  onCancel,
  confirmDisabled,
  locked,
}: ConfirmDialogProps) {
  return (
    <Modal label={title} onDismiss={locked ? undefined : onCancel}>
      <div className={styles.overlay}>
        <section className={`${styles.panel} ${tone === 'danger' ? styles.danger : ''}`}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.description}>{description}</p>
          <div className={styles.actions}>
            <Button size="lg" variant="outline" autoFocus disabled={locked} onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              size="lg"
              variant={tone}
              icon={tone === 'danger' ? <TriangleAlert size={16} /> : undefined}
              disabled={confirmDisabled || locked}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </section>
      </div>
    </Modal>
  )
}
