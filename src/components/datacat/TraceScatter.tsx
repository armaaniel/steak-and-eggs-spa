import { memo, useCallback, useLayoutEffect, useMemo, useState, type MouseEvent } from 'react'
import { scaleLinear, scaleLog } from 'd3-scale'
import { HEIGHT, MARGIN, Y_LABEL_GAP, findWidestYLabel, findXLabels, timeScale, toChartBuckets, type Hover, type XLabel } from './bucketChart'
import type { ScatterPoint, ServiceBucket } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'
import '../../stylesheets/datacat/charts.css'

interface Props {
  points: ScatterPoint[]
  buckets: ServiceBucket[]
  hover: Hover | null
  chartLeft: number
  setYLabelWidth: (width: number) => void
  selectedId: string | null
  selectPoint: (point: ScatterPoint) => void
}

interface ChartPoint {
  time: number
  duration: number
  point: ScatterPoint
}

interface Dot {
  x: number
  y: number
  point: ScatterPoint
}

interface Position {
  x: number
  y: number
}

const DOT_RADIUS = 4.5
const ACTIVE_DOT_RADIUS = 5
const FEW_DOTS = 600
const MANY_DOTS = 2800
const FEW_DOTS_OPACITY = 0.6
const MANY_DOTS_OPACITY = 0.4
const HOVER_DISTANCE = 8

const OK_COLOR = 'var(--dc-latency-p99)'
const ERROR_COLOR = 'var(--dc-status-critical)'

const chartTop = MARGIN.top
const chartBottom = HEIGHT - MARGIN.bottom

function toChartPoint(point: ScatterPoint): ChartPoint {
  return {
    time: new Date(point.at).getTime(),
    duration: Math.max(point.duration, 1),
    point
  }
}

function findSlowestDuration(chartPoints: ChartPoint[]) {
  let slowestDuration = 1

  for (const chartPoint of chartPoints) {
    slowestDuration = Math.max(slowestDuration, chartPoint.duration)
  }

  return slowestDuration
}

function findNextPowerOfTen(value: number) {
  let power = 10

  while (power < value) {
    power = power * 10
  }

  return power
}

function findPowersOfTen(maxValue: number) {
  const powersOfTen = []
  let power = 1

  while (power <= maxValue) {
    powersOfTen.push(power)
    power = power * 10
  }

  return powersOfTen
}

function findDistance(pointA: Position, pointB: Position) {
  const across = pointA.x - pointB.x
  const down = pointA.y - pointB.y

  return Math.sqrt(across * across + down * down)
}

function findDotColor(point: ScatterPoint) {
  if (point.status !== null && point.status >= 500) {
    return ERROR_COLOR
  }

  return OK_COLOR
}

function findBaseOpacity(dotCount: number) {
  return scaleLinear().domain([FEW_DOTS, MANY_DOTS]).range([FEW_DOTS_OPACITY, MANY_DOTS_OPACITY]).clamp(true)(dotCount)
}

function formatYAxisDuration(ms: number) {
  return ms.toLocaleString('en-us')
}

function formatTooltipDuration(ms: number) {
  if (ms < 1) {
    return '<1 ms'
  }

  return `${ms.toLocaleString('en-us', { maximumFractionDigits: 0 })} ms`
}

function formatHoverTime(date: Date) {
  return date.toLocaleString('en-us', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })
}

function formatBucketTime(date: Date) {
  return date.toLocaleString('en-us', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
}

const AllDots = ({ dots, baseOpacity }: { dots: Dot[]; baseOpacity: number }) => {
  function renderDot(dot: Dot) {
    return <circle key={dot.point.id} cx={dot.x} cy={dot.y} r={DOT_RADIUS} fill={findDotColor(dot.point)} 
		fillOpacity={baseOpacity} />
  }

  return <g pointerEvents="none">{dots.map(renderDot)}</g>
}

const AllDotsDrawnOnce = memo(AllDots)

const TraceScatter = ({ points, buckets, hover, chartLeft, setYLabelWidth, selectedId, selectPoint }: Props) => {
  const [width, setWidth] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const measureResize = useCallback((chartDiv: HTMLDivElement | null) => {
    if (chartDiv === null) {
      return
    }

    function handleResize(entries: ResizeObserverEntry[]) {
      const newWidth = Math.floor(entries[0].contentRect.width)
      setWidth(newWidth)
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(chartDiv)

    return function stopMeasuring() {
      observer.disconnect()
    }
  }, [])

  const chartRight = width - MARGIN.right

  const chartPoints = useMemo(() => points.map(toChartPoint), [points])
  const chartBuckets = useMemo(() => toChartBuckets(buckets), [buckets])

  const yMax = findNextPowerOfTen(findSlowestDuration(chartPoints))

  const yScale = useMemo(() => {
    return scaleLog().domain([1, yMax]).range([chartBottom, chartTop])
  }, [yMax])

  const yLabelValues = findPowersOfTen(yMax)
  const yLabelWidth = findWidestYLabel(yLabelValues.map(formatYAxisDuration))

  useLayoutEffect(() => {
    setYLabelWidth(yLabelWidth)
  }, [yLabelWidth, setYLabelWidth])

  const xScale = useMemo(() => {
    if (chartBuckets.length === 0) {
      return null
    }

    return timeScale(chartBuckets, chartLeft, chartRight)
  }, [chartBuckets, chartLeft, chartRight])

  const dots = useMemo(() => {
    if (xScale === null) {
      return []
    }

    const firstBucket = chartBuckets[0]
    const halfBucket = (firstBucket.end - firstBucket.start) / 2

    const newDots: Dot[] = []

    for (const chartPoint of chartPoints) {
      newDots.push({ x: xScale(chartPoint.time - halfBucket), y: yScale(chartPoint.duration), point: chartPoint.point })
    }

    return newDots
  }, [chartPoints, chartBuckets, xScale, yScale])

  if (xScale === null || dots.length === 0) {
    return <p className="lr-message">No traces in this range.</p>
  }

  const plotWidth = chartRight - chartLeft
  const xLabels = findXLabels(chartBuckets, xScale, plotWidth)

  function renderGridline(ms: number) {
    const gridlineY = yScale(ms)

    return (
      <g key={ms}>
        <line className="dc-grid" x1={chartLeft} x2={chartRight} y1={gridlineY} y2={gridlineY} />
        <text x={chartLeft - Y_LABEL_GAP} y={gridlineY} dy="0.32em" textAnchor="end">
          {formatYAxisDuration(ms)}
        </text>
      </g>
    )
  }

  function renderXLabel(xLabel: XLabel) {
    const halfLabelWidth = xLabel.text.length * 3.3

    if (xLabel.x - halfLabelWidth < 0 || xLabel.x + halfLabelWidth > width) {
      return null
    }

    return (
      <text key={xLabel.x} x={xLabel.x} y={chartBottom + 15} textAnchor="middle">
        {xLabel.text}
      </text>
    )
  }

  function findNearestDotIndex(event: MouseEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()

    const mouse = {
      x: event.clientX - svgBox.left,
      y: event.clientY - svgBox.top
    }

    let nearestIndex: number | null = null
    let nearestDistance = HOVER_DISTANCE

    for (let index = 0; index < dots.length; index += 1) {
      const distance = findDistance(dots[index], mouse)

      if (distance <= nearestDistance) {
        nearestIndex = index
        nearestDistance = distance
      }
    }

    return nearestIndex
  }

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    const index = findNearestDotIndex(event)

    if (index !== hoveredIndex) {
      setHoveredIndex(index)
    }
  }

  function handlePointerLeave() {
    setHoveredIndex(null)
  }

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    const index = findNearestDotIndex(event)

    if (index === null) {
      return
    }

    selectPoint(dots[index].point)
  }

  let hoveredDot: Dot | null = null

  if (hoveredIndex !== null) {
    hoveredDot = dots[hoveredIndex] ?? null
  }

  function isSelectedDot(dot: Dot) {
    return dot.point.id === selectedId
  }

  let selectedDot: Dot | null = null

  if (selectedId !== null) {
    selectedDot = dots.find(isSelectedDot) ?? null
  }

  let hoverTime = ''

  if (hoveredDot !== null) {
    hoverTime = formatHoverTime(new Date(hoveredDot.point.at))
  } else if (hover !== null && chartBuckets[hover.index] !== undefined) {
    hoverTime = formatBucketTime(new Date(chartBuckets[hover.index].start))
  }

  let cursor = 'default'

  if (hoveredDot !== null) {
    cursor = 'pointer'
  }

  return (
    <>
      <div className="dc-chart-header" style={{ paddingRight: MARGIN.right }}>
        <p className="lr-panel-label">Latency (ms, log scale)</p>
        {hoverTime !== '' && <span className="dc-hover-time">{hoverTime}</span>}
      </div>
      <div ref={measureResize} className="dc-chart">
        <svg width={width} height={HEIGHT} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} onClick={handleClick} style={{ cursor }}>
          {yLabelValues.map(renderGridline)}
          {xLabels.map(renderXLabel)}

          <AllDotsDrawnOnce dots={dots} baseOpacity={findBaseOpacity(dots.length)} />

          {selectedDot !== null && (
            <circle cx={selectedDot.x} cy={selectedDot.y} r={ACTIVE_DOT_RADIUS} fill={findDotColor(selectedDot.point)} stroke="var(--dc-text)" strokeWidth={1.5} />
          )}

          {hoveredDot !== null && (
            <circle cx={hoveredDot.x} cy={hoveredDot.y} r={ACTIVE_DOT_RADIUS} fill={findDotColor(hoveredDot.point)} stroke="white" strokeWidth={1} />
          )}
        </svg>

        {hoveredDot !== null && (
          <div className="dc-tooltip" style={{ left: hoveredDot.x, top: hoveredDot.y, transform: 'translate(-50%, calc(-100% - 10px))' }}>
            <strong>
              {formatTooltipDuration(hoveredDot.point.duration)} · {hoveredDot.point.status ?? '–'}
            </strong>
          </div>
        )}
      </div>
    </>
  )
}

export default TraceScatter
