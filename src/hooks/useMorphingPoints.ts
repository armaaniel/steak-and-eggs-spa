import { useEffect, useRef, useState } from 'react'

export interface ScreenPoint {
  x: number
  y: number
}

interface Column {
  x: number
  startY: number
  targetY: number
}

const MORPH_MS = 500
const SAME_COLUMN_PX = 0.5

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

function findColumnXs(startPoints: ScreenPoint[], targetPoints: ScreenPoint[]) {
  const allXs = [...startPoints, ...targetPoints]
    .map(function (point) {
      return point.x
    })
    .sort(function (first, second) {
      return first - second
    })

  const columnXs: number[] = []

  for (const x of allXs) {
    const previousX = columnXs[columnXs.length - 1]

    if (previousX === undefined || x - previousX >= SAME_COLUMN_PX) {
      columnXs.push(x)
    }
  }

  return columnXs
}

function readHeightsAt(points: ScreenPoint[], columnXs: number[]) {
  const heights: number[] = []
  let index = 0

  for (const x of columnXs) {
    while (index < points.length - 2 && points[index + 1].x < x) {
      index++
    }

    const before = points[index]
    const after = points[Math.min(index + 1, points.length - 1)]

    if (x <= before.x || after.x === before.x) {
      heights.push(before.y)
    } else if (x >= after.x) {
      heights.push(after.y)
    } else {
      heights.push(before.y + ((after.y - before.y) * (x - before.x)) / (after.x - before.x))
    }
  }

  return heights
}

function lineUpColumns(startPoints: ScreenPoint[], targetPoints: ScreenPoint[]) {
  const columnXs = findColumnXs(startPoints, targetPoints)
  const startHeights = readHeightsAt(startPoints, columnXs)
  const targetHeights = readHeightsAt(targetPoints, columnXs)

  return columnXs.map(function (x, index): Column {
    return { x, startY: startHeights[index], targetY: targetHeights[index] }
  })
}

function blendColumns(columns: Column[], amount: number) {
  return columns.map(function (column) {
    return { x: column.x, y: column.startY + (column.targetY - column.startY) * amount }
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

    if (startPoints.length === 0 || targetPoints.length === 0 || prefersReducedMotion()) {
      duration = 0
    }

    let columns: Column[] = []

    if (duration > 0) {
      columns = lineUpColumns(startPoints, targetPoints)
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
        framePoints = blendColumns(columns, easeLikeCss(progress))
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
