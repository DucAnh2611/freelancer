import { useCallback, useRef } from 'react'

type Options = {
  minDistance?: number
  maxOffAxis?: number
  onLeft?: () => void
  onRight?: () => void
}

// Returns touch handlers to spread on a container. Fires onLeft when the user
// swipes right-to-left past `minDistance` (and stays within `maxOffAxis` of
// horizontal), onRight for the opposite direction. Vertical scrolls pass
// through untouched because we only act on `touchend` after a meaningful
// horizontal move.
export function useSwipe({
  minDistance = 60,
  maxOffAxis = 50,
  onLeft,
  onRight,
}: Options) {
  const start = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const t = e.changedTouches[0]
      const dx = t.clientX - s.x
      const dy = t.clientY - s.y
      if (Math.abs(dy) > maxOffAxis) return
      if (dx <= -minDistance) onLeft?.()
      else if (dx >= minDistance) onRight?.()
    },
    [minDistance, maxOffAxis, onLeft, onRight],
  )

  return { onTouchStart, onTouchEnd }
}
