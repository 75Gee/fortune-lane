import type { TokenId } from '@fortune/game'
import { useState } from 'react'
import { TOKEN_META } from './tokenMeta.js'

interface TokenImageProps {
  token: TokenId
  alt?: string
  className?: string
}

export function TokenImage({ token, alt, className }: TokenImageProps) {
  const [failed, setFailed] = useState(false)
  const meta = TOKEN_META[token]
  if (failed) {
    return <span className={`token-fallback ${className ?? ''}`}>{meta.fallback}</span>
  }
  return (
    <img
      className={className}
      src={meta.image}
      alt={alt ?? `${meta.city} · ${meta.name}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
