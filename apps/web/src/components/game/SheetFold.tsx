import { ChevronDown, ChevronUp } from 'lucide-react'
import { createContext, useContext, useRef } from 'react'
import styles from './ActionTicket.module.css'

/**
 * On phones the action sheet folds down to its title and commands so the board stays visible.
 * Only the in-game sheet provides this; tickets shown elsewhere (spectator dialogs) never fold.
 */
export const SheetFoldContext = createContext<{ folded: boolean; setFolded: (folded: boolean) => void } | null>(null)

export function useSheetFold(foldable = true) {
  const fold = useContext(SheetFoldContext)
  return foldable ? fold : null
}

/** Grab bar at the top of the sheet: tap to toggle, or swipe up / down. */
export function FoldHandle({ fold }: { fold: NonNullable<ReturnType<typeof useSheetFold>> }) {
  const start = useRef<number | null>(null)
  const swiped = useRef(false)
  return (
    <button
      className={styles.foldHandle}
      aria-expanded={!fold.folded}
      aria-label={fold.folded ? '展开详情' : '收起详情'}
      onPointerDown={(event) => {
        start.current = event.clientY
        swiped.current = false
      }}
      onPointerMove={(event) => {
        if (start.current === null || swiped.current) return
        const dy = event.clientY - start.current
        if (Math.abs(dy) < 18) return
        swiped.current = true
        fold.setFolded(dy > 0)
      }}
      onPointerUp={() => {
        start.current = null
      }}
      onClick={() => {
        if (!swiped.current) fold.setFolded(!fold.folded)
        swiped.current = false
      }}
    >
      <i aria-hidden="true" />
      {fold.folded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      {fold.folded ? '详情' : '收起'}
    </button>
  )
}
