import { useEffect, useRef, useState } from 'react'

const useSteppedValue = (value: number | null, step: number, minGapMs: number, catchUpMs: number) => {
  const [shownValue, setShownValue] = useState(value)
  const shownAt = useRef(0)
  const latestValue = useRef(value)
  const pendingUpdate = useRef(0)
  const pendingAt = useRef(0)

  if (shownValue === null && value !== null) {
    setShownValue(value)
  }

  useEffect(() => {
    shownAt.current = Date.now()
  }, [shownValue])

  useEffect(() => {
    latestValue.current = value

    if (value === null || shownValue === null || value === shownValue) {
      return
    }

    const sinceShown = Date.now() - shownAt.current
    let wait = catchUpMs - sinceShown

    if (Math.abs(value - shownValue) >= step) {
      wait = minGapMs - sinceShown
    }

    if (wait <= 0) {
      window.clearTimeout(pendingUpdate.current)
      pendingUpdate.current = 0
      setShownValue(value)
      return
    }

    const updateAt = Date.now() + wait

    if (pendingUpdate.current !== 0 && pendingAt.current <= updateAt) {
      return
    }

    function showLatestValue() {
      pendingUpdate.current = 0
      setShownValue(latestValue.current)
    }

    window.clearTimeout(pendingUpdate.current)
    pendingUpdate.current = window.setTimeout(showLatestValue, wait)
    pendingAt.current = updateAt
  }, [value, shownValue, step, minGapMs, catchUpMs])

  useEffect(() => {
    return function cancelPendingUpdate() {
      window.clearTimeout(pendingUpdate.current)
    }
  }, [])

  return shownValue
}

export default useSteppedValue
