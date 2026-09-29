import { useEffect, useState } from 'react'

/** Boolean preference kept in localStorage; defaults to on and survives storage being unavailable. */
export function usePersistentToggle(key: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(key) !== 'false'
    } catch {
      return true
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, String(value))
    } catch {}
  }, [key, value])
  return [value, setValue] as const
}
