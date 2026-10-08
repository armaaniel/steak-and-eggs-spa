import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { scaleLinear, scalePoint } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import useMorphingPoints, { type ScreenPoint } from '../hooks/useMorphingPoints'
import '../stylesheets/chart.css'
import type { ChartData } from '../lib/types.ts'

interface Props {
  chartData: ChartData[]
  onHover?: (point: ChartData | null) => void
}

interface Size {
  width: number
  height: number
}

const MARGIN = { top: 28, right: 5, bottom: 5, left: 5 }
const LOW_PADDING = 0.95
const HIGH_PADDING = 1.05
const LINE_WIDTH = 2
const DOT_RADIUS = 4
const DOT_RING_WIDTH = 2

function findValueRange(chartData: ChartData[]) {
  let lowest = Infinity
  let highest = -Infinity

  for (const point of chartData) {
    lowest = Math.min(lowest, point.value)
    highest = Math.max(highest, point.value)
  }

  return [lowest * LOW_PADDING, highest * HIGH_PADDING]
}

function placePoints(chartData: ChartData[], size: Size) {
  if (size.width === 0 || chartData.length === 0) {
    return []
  }

  const indexes = chartData.map(function (_point, index) {
    return index
  })

  const xScale = scalePoint<number>().domain(indexes).range([MARGIN.left, size.width - MARGIN.right])
  const yScale = scaleLinear().domain(findValueRange(chartData)).range([size.height - MARGIN.bottom, MARGIN.top])

  return chartData.map(function (point, index) {
    return { x: xScale(index) ?? MARGIN.left, y: yScale(point.value) }
  })
}

function findNearestIndex(placedPoints: ScreenPoint[], mouseX: number) {
  let nearestIndex = 0

  for (let index = 1; index < placedPoints.length; index++) {
    if (Math.abs(placedPoints[index].x - mouseX) < Math.abs(placedPoints[nearestIndex].x - mouseX)) {
      nearestIndex = index
    }
  }

  return nearestIndex
}

const makePath = line<ScreenPoint>()
  .x(function (screenPoint) {
    return screenPoint.x
  })
  .y(function (screenPoint) {
    return screenPoint.y
  })
  .curve(curveMonotoneX)

const Chart = React.memo(({ chartData, onHover }: Props) => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [labelWidth, setLabelWidth] = useState(0)
  const labelRef = useRef<HTMLDivElement>(null)

  const measureResize = useCallback((chartDiv: HTMLDivElement | null) => {
    if (chartDiv === null) {
      return
    }

    function handleResize(entries: ResizeObserverEntry[]) {
      const box = entries[0].contentRect
      const newSize = { width: Math.floor(box.width), height: Math.floor(box.height) }

      setSize(function (oldSize) {
        if (oldSize.width === newSize.width && oldSize.height === newSize.height) {
          return oldSize
        }

        return newSize
      })
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(chartDiv)

    return function stopMeasuring() {
      observer.disconnect()
    }
  }, [])

  const placedPoints = useMemo(() => placePoints(chartData, size), [chartData, size])
  const shownPoints = useMorphingPoints(placedPoints)

  const chartLeft = MARGIN.left
  const chartRight = size.width - MARGIN.right
  const chartTop = MARGIN.top
  const chartBottom = size.height - MARGIN.bottom

  let hoveredPoint: ChartData | null = null
  let hoveredSpot: ScreenPoint | null = null

  if (hoveredIndex !== null) {
    hoveredPoint = chartData[hoveredIndex] ?? null
    hoveredSpot = placedPoints[hoveredIndex] ?? null
  }

  useLayoutEffect(() => {
    if (labelRef.current !== null) {
      setLabelWidth(labelRef.current.offsetWidth)
    }
  }, [hoveredPoint?.date])

  function clearHover() {
    if (hoveredIndex !== null) {
      setHoveredIndex(null)
      onHover?.(null)
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - svgBox.left
    const mouseY = event.clientY - svgBox.top
    const insidePlot = mouseX >= chartLeft && mouseX <= chartRight && mouseY >= chartTop && mouseY <= chartBottom

    if (!insidePlot || placedPoints.length === 0) {
      clearHover()
      return
    }

    const nearestIndex = findNearestIndex(placedPoints, mouseX)

    if (nearestIndex !== hoveredIndex) {
      setHoveredIndex(nearestIndex)
      onHover?.(chartData[nearestIndex] ?? null)
    }
  }

  let labelX = 0

  if (hoveredSpot !== null) {
    const halfLabel = labelWidth / 2
    labelX = Math.min(Math.max(hoveredSpot.x, chartLeft + halfLabel), chartRight - halfLabel)
  }

  const path = makePath(shownPoints) ?? undefined

  return (
    <div ref={measureResize} className="chart-area">
      {size.width > 0 && (
        <svg width={size.width} height={size.height} onPointerDown={handlePointerMove} onPointerMove={handlePointerMove} onPointerLeave={clearHover}>
          <path className="chart-line" d={path} pathLength={1} fill="none" strokeWidth={LINE_WIDTH} />

          {hoveredSpot !== null && <line className="chart-cursor" x1={hoveredSpot.x} x2={hoveredSpot.x} y1={chartTop} y2={chartBottom} />}
          {hoveredSpot !== null && <circle className="chart-dot" cx={hoveredSpot.x} cy={hoveredSpot.y} r={DOT_RADIUS} strokeWidth={DOT_RING_WIDTH} />}
        </svg>
      )}

      {hoveredPoint !== null && hoveredSpot !== null && (
        <div ref={labelRef} className="chart-label" style={{ left: labelX }}>
          {hoveredPoint.date}
        </div>
      )}
    </div>
  )
})

export default Chart
