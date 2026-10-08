import { useCallback, useState, type MouseEvent } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
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

interface SparkPoint {
  time: number
  value: number | null
}

const HEIGHT = 36
const INSET = 2
const GAP_STEPS = 2
const TOOLTIP_OFFSET = 8

function toSparkPoint(point: Point): SparkPoint {
  return { time: new Date(point.at).getTime(), value: point.value }
}

function findTypicalStep(sparkPoints: SparkPoint[]) {
  const steps = []

  for (let index = 1; index < sparkPoints.length; index += 1) {
    steps.push(sparkPoints[index].time - sparkPoints[index - 1].time)
  }

  steps.sort(function (a, b) {
    return a - b
  })

  return steps[Math.floor(steps.length / 2)] ?? 0
}

function breakAtGaps(sparkPoints: SparkPoint[]) {
  const typicalStep = findTypicalStep(sparkPoints)
  const withGaps: SparkPoint[] = []

  for (let index = 0; index < sparkPoints.length; index += 1) {
    const previous = sparkPoints[index - 1]
    const current = sparkPoints[index]

    if (previous !== undefined && current.time - previous.time > typicalStep * GAP_STEPS) {
      withGaps.push({ time: previous.time + typicalStep, value: null })
    }

    withGaps.push(current)
  }

  return withGaps
}

function formatHoverTime(time: number) {
  return new Date(time).toLocaleString('en-us', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
}

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

  const sparkPoints = points.map(toSparkPoint)

  if (sparkPoints.length === 0) {
    return null
  }

  const firstPoint = sparkPoints[0]
  const lastPoint = sparkPoints[sparkPoints.length - 1]

  const xScale = scaleTime().domain([firstPoint.time, lastPoint.time]).range([INSET, width - INSET])
  const yScale = scaleLinear().domain([0, 100]).range([HEIGHT - INSET, INSET])

  const makePath = line<SparkPoint>()
    .defined(function (sparkPoint) {
      return sparkPoint.value !== null
    })
    .x(function (sparkPoint) {
      return xScale(sparkPoint.time)
    })
    .y(function (sparkPoint) {
      return yScale(sparkPoint.value ?? 0)
    })
    .curve(curveMonotoneX)

  const path = makePath(breakAtGaps(sparkPoints)) ?? undefined

  function findNearestIndex(event: MouseEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - svgBox.left

    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let index = 0; index < sparkPoints.length; index += 1) {
      const distance = Math.abs(xScale(sparkPoints[index].time) - mouseX)

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

  let hoveredPoint: SparkPoint | null = null

  if (hoveredIndex !== null) {
    hoveredPoint = sparkPoints[hoveredIndex] ?? null
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
