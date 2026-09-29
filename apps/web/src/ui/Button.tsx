import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  icon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block && styles.block, className]
    .filter(Boolean)
    .join(' ')
  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  )
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name; also shown as the tooltip. */
  label: string
  icon: ReactNode
  variant?: 'outline' | 'ghost'
  size?: 'sm' | 'md'
}

export function IconButton({
  label,
  icon,
  variant = 'outline',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const classes = [styles.icon, styles[variant], styles[size], className].filter(Boolean).join(' ')
  return (
    <button type={type} className={classes} aria-label={label} title={label} {...rest}>
      {icon}
    </button>
  )
}
