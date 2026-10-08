import { useCallback, useState, type MouseEvent } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import { breakAtGaps, formatHoverTime, toTimePoint, type TimePoint } from './timeSeries'
import '../../stylesheets/datacat/dependencies.css'
import '../../stylesheets/datacat/charts.css'

interface Point {
  at: string
  value: number
}

interface Props {
  points: Point[]
  color: string
}

const HEIGHT = 36
const INSET = 2
const TOOLTIP_OFFSET = 8

const Sparkline = ({ points, color }: Props) => {
  const [width, setWidth] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const measureResize = useCallback((sparkDiv: HTMLDivElement | null) => {
    if (sparkDiv === null) {
      return
    }

    function handleResize(entries: ResizeObserverEntry[]) {
      const newWidth = Math.floor(entries[0].contentRect.width)
      setWidth(newWidth)
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(sparkDiv)

    return function stopMeasuring() {
      observer.disconnect()
    }
  }, [])

  const timePoints = points.map(toTimePoint)

  if (timePoints.length === 0) {
    return null
  }

  const firstPoint = timePoints[0]
  const lastPoint = timePoints[timePoints.length - 1]

  const xScale = scaleTime().domain([firstPoint.time, lastPoint.time]).range([INSET, width - INSET])
  const yScale = scaleLinear().domain([0, 100]).range([HEIGHT - INSET, INSET])

  const makePath = line<TimePoint>()
    .defined(function (timePoint) {
      return timePoint.value !== null
    })
    .x(function (timePoint) {
      return xScale(timePoint.time)
    })
    .y(function (timePoint) {
      return yScale(timePoint.value ?? 0)
    })
    .curve(curveMonotoneX)

  const path = makePath(breakAtGaps(timePoints)) ?? undefined

  function findNearestIndex(event: MouseEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - svgBox.left

    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let index = 0; index < timePoints.length; index += 1) {
      const distance = Math.abs(xScale(timePoints[index].time) - mouseX)

      if (distance < nearestDistance) {
        nearestIndex = index
        nearestDistance = distance
      }
    }

    return nearestIndex
  }

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    const index = findNearestIndex(event)

    if (index !== hoveredIndex) {
      setHoveredIndex(index)
    }
  }

  function handlePointerLeave() {
    setHoveredIndex(null)
  }

  let hoveredPoint: TimePoint | null = null

  if (hoveredIndex !== null) {
    hoveredPoint = timePoints[hoveredIndex] ?? null
  }

  let hoveredX = 0
  let hoveredY = 0

  if (hoveredPoint !== null) {
    hoveredX = xScale(hoveredPoint.time)
    hoveredY = yScale(hoveredPoint.value ?? 0)
  }

  let tooltipTransform = `translate(${TOOLTIP_OFFSET}px, -50%)`

  if (hoveredX > width / 2) {
    tooltipTransform = `translate(calc(-100% - ${TOOLTIP_OFFSET}px), -50%)`
  }

  return (
    <div ref={measureResize} className="dep-spark">
      <svg width={width} height={HEIGHT} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
        {hoveredPoint !== null && <line x1={hoveredX} x2={hoveredX} y1={INSET} y2={HEIGHT - INSET} stroke="var(--dc-border-strong)" />}

        <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />

        {hoveredPoint !== null && <circle cx={hoveredX} cy={hoveredY} r={3} fill={color} />}
      </svg>

      {hoveredPoint !== null && (
        <div className="dc-tooltip" style={{ left: hoveredX, top: HEIGHT / 2, transform: tooltipTransform }}>
          <p className="dc-tooltip-time">{formatHoverTime(hoveredPoint.time)}</p>
          <strong>{(hoveredPoint.value ?? 0).toFixed(1)}%</strong>
        </div>
      )}
    </div>
  )
}

export default Sparkline
