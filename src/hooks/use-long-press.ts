import { useCallback, useRef } from 'react'

type Options = {
  delayMs?: number
  onLongPress: () => void
}

// Returns pointer handlers you can spread onto any element. Fires onLongPress
// after `delayMs` of sustained pressure; cancels on pointer up / leave / move
// past a small slop threshold. Works for mouse, touch, and stylus via the
// unified Pointer Events API.
export function useLongPress({ delayMs = 500, onLongPress }: Options) {
  const timerRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startRef.current = null
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      firedRef.current = false
      startRef.current = { x: e.clientX, y: e.clientY }
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true
        onLongPress()
      }, delayMs)
    },
    [delayMs, onLongPress],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = startRef.current
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (dx * dx + dy * dy > 100) clear() // ~10px slop
    },
    [clear],
  )

  const onPointerUp = useCallback(() => {
    clear()
  }, [clear])

  const onPointerLeave = useCallback(() => {
    clear()
  }, [clear])

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // Suppress the default long-press context menu on mobile when we've fired.
    if (firedRef.current) e.preventDefault()
  }, [])

  return { onPointerDown, onPointerMove, onPointerUp, onPointerLeave, onContextMenu }
}
