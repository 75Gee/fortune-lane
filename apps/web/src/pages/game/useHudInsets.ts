import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { ViewInsets } from '../../board/boardCameraRig.js'

/** How far the top and bottom HUD reach into the board, so the camera can centre on what is left. */
export function useHudInsets(
  shell: RefObject<HTMLElement | null>,
  top: RefObject<HTMLElement | null>,
  bottom: RefObject<HTMLElement | null>,
): ViewInsets | undefined {
  const [insets, setInsets] = useState<ViewInsets>()
  const frame = useRef(0)
  useLayoutEffect(() => {
    const measure = () => {
      frame.current = 0
      const box = shell.current?.getBoundingClientRect()
      if (!box || !top.current || !bottom.current) return
      const next = {
        top: Math.max(0, Math.round(top.current.getBoundingClientRect().bottom - box.top)),
        right: 0,
        bottom: Math.max(0, Math.round(box.bottom - bottom.current.getBoundingClientRect().top)),
        left: 0,
      }
      setInsets((current) => (current && current.top === next.top && current.bottom === next.bottom ? current : next))
    }
    const schedule = () => {
      frame.current ||= requestAnimationFrame(measure)
    }
    measure()
    const observer = new ResizeObserver(schedule)
    for (const element of [shell.current, top.current, bottom.current]) if (element) observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame.current)
    }
  }, [shell, top, bottom])
  return insets
}
