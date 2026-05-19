import { useCallback, useEffect, useRef, useState } from 'react'

// Adaptive polling. schedule is a list of delays in seconds that the hook walks
// through one by one; once the end is hit it stays on the last value (so typical
// shape is aggressive→relaxed, e.g. [1, 2, 5, 10, 15, 60]). `reset()` jumps back
// to schedule[0] — call it whenever fresh data arrives so we poll aggressively
// again in case more is imminent, then back off when things go quiet.
export function usePolling(
  schedule: readonly number[],
  onTick: () => void,
  enabled = true,
) {
  const [step, setStep] = useState(0)
  const onTickRef = useRef(onTick)
  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  useEffect(() => {
    if (!enabled || schedule.length === 0) return
    const idx = Math.min(step, schedule.length - 1)
    const delayMs = Math.max(0, schedule[idx]) * 1000
    const handle = window.setTimeout(() => {
      onTickRef.current()
      setStep((s) => s + 1)
    }, delayMs)
    return () => window.clearTimeout(handle)
  }, [enabled, step, schedule])

  const reset = useCallback(() => setStep(0), [])
  return reset
}
