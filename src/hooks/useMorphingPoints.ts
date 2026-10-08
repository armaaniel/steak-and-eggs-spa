import { useEffect, useRef, useState } from 'react'

export interface ScreenPoint {
  x: number
  y: number
}

const MORPH_MS = 1500

function bezierAt(t: number, firstControl: number, secondControl: number) {
  const rest = 1 - t

  return 3 * rest * rest * t * firstControl + 3 * rest * t * t * secondControl + t * t * t
}

function easeLikeCss(progress: number) {
  let low = 0
  let high = 1
  let t = progress

  for (let step = 0; step < 20; step++) {
    t = (low + high) / 2

    if (bezierAt(t, 0.25, 0.25) < progress) {
      low = t
    } else {
      high = t
    }
  }

  return bezierAt(t, 0.1, 1)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function blendPoints(startPoints: ScreenPoint[], targetPoints: ScreenPoint[], amount: number) {
  return targetPoints.map(function (targetPoint, index) {
    const startPoint = startPoints[Math.floor((index * startPoints.length) / targetPoints.length)]

    return {
      x: startPoint.x + (targetPoint.x - startPoint.x) * amount,
      y: startPoint.y + (targetPoint.y - startPoint.y) * amount,
    }
  })
}

const useMorphingPoints = (targetPoints: ScreenPoint[]) => {
  const [shownPoints, setShownPoints] = useState(targetPoints)
  const latestFrame = useRef(targetPoints)

  useEffect(() => {
    const startPoints = latestFrame.current

    if (startPoints === targetPoints) {
      return
    }

    let duration = MORPH_MS

    if (startPoints.length === 0 || prefersReducedMotion()) {
      duration = 0
    }

    const startTime = performance.now()
    let frameRequest = 0

    function drawFrame(now: number) {
      let progress = 1

      if (duration > 0) {
        progress = Math.min(1, (now - startTime) / duration)
      }

      let framePoints = targetPoints

      if (progress < 1) {
        framePoints = blendPoints(startPoints, targetPoints, easeLikeCss(progress))
      }

      latestFrame.current = framePoints
      setShownPoints(framePoints)

      if (progress < 1) {
        frameRequest = requestAnimationFrame(drawFrame)
      }
    }

    frameRequest = requestAnimationFrame(drawFrame)

    return function stopMorphing() {
      cancelAnimationFrame(frameRequest)
    }
  }, [targetPoints])

  return shownPoints
}

export default useMorphingPoints
