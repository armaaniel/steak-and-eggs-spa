import { useEffect, useRef, useState } from 'react'

export interface ScreenPoint {
  x: number
  y: number
}

export interface Column {
  x: number
  startY: number
  targetY: number
}

export const MORPH_MS = 500
const SAME_COLUMN_PX = 0.5
const COLUMN_SPACING_PX = 3

function bezierAt(t: number, firstControl: number, secondControl: number) {
  const rest = 1 - t

  return 3 * rest * rest * t * firstControl + 3 * rest * t * t * secondControl + t * t * t
}

export function easeLikeCss(progress: number) {
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

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function findColumnXs(startPoints: ScreenPoint[], targetPoints: ScreenPoint[]) {
  const pointXs = [...startPoints, ...targetPoints]
    .map(function (point) {
      return point.x
    })
    .sort(function (first, second) {
      return first - second
    })

  const columnXs: number[] = []

  for (const x of pointXs) {
    const previousX = columnXs[columnXs.length - 1]

    if (previousX === undefined) {
      columnXs.push(x)
      continue
    }

    const gap = x - previousX

    if (gap < SAME_COLUMN_PX) {
      continue
    }

    const gapParts = Math.ceil(gap / COLUMN_SPACING_PX)

    for (let part = 1; part < gapParts; part++) {
      columnXs.push(previousX + (gap * part) / gapParts)
    }

    columnXs.push(x)
  }

  return columnXs
}

function findSign(value: number) {
  if (value < 0) {
    return -1
  }

  return 1
}

function findDivisor(width: number, otherWidth: number) {
  if (width !== 0) {
    return width
  }

  if (otherWidth < 0) {
    return -0
  }

  return 0
}

function findInnerSlope(before: ScreenPoint, point: ScreenPoint, after: ScreenPoint) {
  const widthBefore = point.x - before.x
  const widthAfter = after.x - point.x
  const slopeBefore = (point.y - before.y) / findDivisor(widthBefore, widthAfter)
  const slopeAfter = (after.y - point.y) / findDivisor(widthAfter, widthBefore)
  const weightedSlope = (slopeBefore * widthAfter + slopeAfter * widthBefore) / (widthBefore + widthAfter)
  const smallestSlope = Math.min(Math.abs(slopeBefore), Math.abs(slopeAfter), 0.5 * Math.abs(weightedSlope))

  return (findSign(slopeBefore) + findSign(slopeAfter)) * smallestSlope || 0
}

function findEndSlope(from: ScreenPoint, to: ScreenPoint, innerSlope: number) {
  const width = to.x - from.x

  if (width === 0) {
    return innerSlope
  }

  return ((3 * (to.y - from.y)) / width - innerSlope) / 2
}

function findCurveSlopes(points: ScreenPoint[]) {
  const slopes = points.map(function () {
    return 0
  })

  if (points.length < 3) {
    return slopes
  }

  for (let index = 1; index < points.length - 1; index++) {
    slopes[index] = findInnerSlope(points[index - 1], points[index], points[index + 1])
  }

  const lastIndex = points.length - 1
  slopes[0] = findEndSlope(points[0], points[1], slopes[1])
  slopes[lastIndex] = findEndSlope(points[lastIndex - 1], points[lastIndex], slopes[lastIndex - 1])

  return slopes
}

function dropRepeatedPoints(points: ScreenPoint[]) {
  return points.filter(function (point, index) {
    const previousPoint = points[index - 1]

    return previousPoint === undefined || previousPoint.x !== point.x || previousPoint.y !== point.y
  })
}

function readCurveHeight(before: ScreenPoint, after: ScreenPoint, beforeSlope: number, afterSlope: number, x: number) {
  const third = (after.x - before.x) / 3
  const firstControl = before.y + third * beforeSlope
  const secondControl = after.y - third * afterSlope
  const t = (x - before.x) / (after.x - before.x)
  const rest = 1 - t

  return rest * rest * rest * before.y + 3 * rest * rest * t * firstControl + 3 * rest * t * t * secondControl + t * t * t * after.y
}

function readHeightsAt(linePoints: ScreenPoint[], columnXs: number[]) {
  const points = dropRepeatedPoints(linePoints)
  const slopes = findCurveSlopes(points)
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
    } else if (points.length === 2) {
      heights.push(before.y + ((after.y - before.y) * (x - before.x)) / (after.x - before.x))
    } else {
      heights.push(readCurveHeight(before, after, slopes[index], slopes[Math.min(index + 1, points.length - 1)], x))
    }
  }

  return heights
}

export function lineUpColumns(startPoints: ScreenPoint[], targetPoints: ScreenPoint[]) {
  const columnXs = findColumnXs(startPoints, targetPoints)
  const startHeights = readHeightsAt(startPoints, columnXs)
  const targetHeights = readHeightsAt(targetPoints, columnXs)

  return columnXs.map(function (x, index): Column {
    return { x, startY: startHeights[index], targetY: targetHeights[index] }
  })
}

export function blendColumns(columns: Column[], amount: number) {
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
