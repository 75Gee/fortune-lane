import { House } from 'lucide-react'
import { MAX_PROPERTY_LEVEL } from '@fortune/game'

interface BuildingIconsProps {
  level: number
  size?: number
  className?: string
}

export function BuildingIcons({ level, size = 18, className = '' }: BuildingIconsProps) {
  if (level <= 0) return null
  const count = Math.min(MAX_PROPERTY_LEVEL, level)
  const hotel = level >= MAX_PROPERTY_LEVEL
  return (
    <span className={`building-icons ${className}`.trim()} aria-label={`${count}级城市设施`}>
      {Array.from({ length: count }, (_, index) => (
        <House className={`building-icon ${hotel && index === MAX_PROPERTY_LEVEL - 1 ? 'is-hotel' : ''}`} key={index} size={size} strokeWidth={2.6} aria-hidden="true" />
      ))}
    </span>
  )
}
