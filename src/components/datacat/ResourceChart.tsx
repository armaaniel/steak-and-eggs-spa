import { useCallback, useState, type MouseEvent } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import { MARGIN, Y_LABEL_GAP, findWidestYLabel, formatXAxisTime } from './bucketChart'
import { breakAtGaps, findNearestPoint, formatHoverTime, type TimePoint } from './timeSeries'
import '../../stylesheets/datacat/loadrun.css'
import '../../stylesheets/datacat/charts.css'

export interface ResourceLine {
  key: string
  label: string
  color: string
  points: TimePoint[]
}

interface Props {
  title: string
  lines: ResourceLine[]
  from: number
  to: number
  hoveredTime: number | null
  setHoveredTime: (time: number | null) => void
  showTimeLabels: boolean
  showHoverTime: boolean
  note?: string
}

const HEIGHT = 110
const MARGIN_TOP = 8
const MARGIN_BOTTOM = 6
const Y_LABEL_VALUES = [0, 50, 100]

function formatYAxisPercent(percent: number) {
  return `${percent}%`
}

const ResourceChart = ({ title, lines, from, to, hoveredTime, setHoveredTime, showTimeLabels, showHoverTime, note }: Props) => {
  const [width, setWidth] = useState(0)

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

  let marginBottom = MARGIN_BOTTOM

  if (showTimeLabels) {
    marginBottom = MARGIN.bottom
  }

  const chartTop = MARGIN_TOP
  const chartBottom = HEIGHT - marginBottom
  const chartLeft = findWidestYLabel(Y_LABEL_VALUES.map(formatYAxisPercent)) + Y_LABEL_GAP
  const chartRight = width - MARGIN.right
  const plotWidth = chartRight - chartLeft

  const xScale = scaleTime().domain([from, to]).range([chartLeft, chartRight])
  const yScale = scaleLinear().domain([0, 100]).range([chartBottom, chartTop])

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

  let xLabelDates: Date[] = []

  if (showTimeLabels) {
    xLabelDates = xScale.ticks(Math.max(2, Math.floor(plotWidth / 100)))
  }

  function renderGridline(percent: number) {
    const gridlineY = yScale(percent)

    return (
      <g key={percent}>
        <line className="dc-grid" x1={chartLeft} x2={chartRight} y1={gridlineY} y2={gridlineY} />
        <text x={chartLeft - Y_LABEL_GAP} y={gridlineY} dy="0.32em" textAnchor="end">
          {formatYAxisPercent(percent)}
        </text>
      </g>
    )
  }

  function renderXLabel(date: Date) {
    const labelX = xScale(date)
    const label = formatXAxisTime(date)
    const halfLabelWidth = label.length * 3.3

    if (labelX - halfLabelWidth < 0 || labelX + halfLabelWidth > width) {
      return null
    }

    return (
      <text key={labelX} x={labelX} y={chartBottom + 15} textAnchor="middle">
        {label}
      </text>
    )
  }

  function renderLine(resourceLine: ResourceLine) {
    const path = makePath(breakAtGaps(resourceLine.points)) ?? undefined

    return <path key={resourceLine.key} d={path} fill="none" stroke={resourceLine.color} strokeWidth={1.5} strokeLinejoin="round" />
  }

  function findHoveredPoint(resourceLine: ResourceLine) {
    if (hoveredTime === null) {
      return null
    }

    return findNearestPoint(resourceLine.points, hoveredTime)
  }

  function renderHoveredDot(resourceLine: ResourceLine) {
    const hoveredPoint = findHoveredPoint(resourceLine)

    if (hoveredPoint === null || hoveredPoint.value === null) {
      return null
    }

    return <circle key={resourceLine.key} cx={xScale(hoveredPoint.time)} cy={yScale(hoveredPoint.value)} r={3.5} fill={resourceLine.color} stroke="var(--dc-surface)" strokeWidth={2} />
  }

  function renderLegendEntry(resourceLine: ResourceLine) {
    const hoveredPoint = findHoveredPoint(resourceLine)

    return (
      <span key={resourceLine.key}>
        <span className="dc-swatch" style={{ backgroundColor: resourceLine.color }} />
        {resourceLine.label}
        {hoveredPoint !== null && hoveredPoint.value !== null && <strong>{hoveredPoint.value.toFixed(1)}%</strong>}
      </span>
    )
  }

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - svgBox.left

    if (mouseX < chartLeft || mouseX > chartRight) {
      setHoveredTime(null)
      return
    }

    setHoveredTime(xScale.invert(mouseX).getTime())
  }

  function handlePointerLeave() {
    setHoveredTime(null)
  }

  let cursorX: number | null = null

  if (hoveredTime !== null && hoveredTime >= from && hoveredTime <= to) {
    cursorX = xScale(hoveredTime)
  }

  return (
    <>
      <div className="dc-chart-header" style={{ paddingRight: MARGIN.right }}>
        <p className="lr-panel-label">{title}</p>
        <div className="dc-legend">
          {showHoverTime && hoveredTime !== null && <span className="dc-hover-time">{formatHoverTime(hoveredTime)}</span>}
          {lines.map(renderLegendEntry)}
        </div>
      </div>

      {note !== undefined && <p className="lr-message">{note}</p>}

      {note === undefined && (
        <div ref={measureResize} className="dc-chart">
          <svg width={width} height={HEIGHT} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
            {Y_LABEL_VALUES.map(renderGridline)}
            {xLabelDates.map(renderXLabel)}

            {cursorX !== null && <line x1={cursorX} x2={cursorX} y1={chartTop} y2={chartBottom} stroke="var(--dc-border-strong)" />}

            {lines.map(renderLine)}
            {lines.map(renderHoveredDot)}
          </svg>
        </div>
      )}
    </>
  )
}

export default ResourceChart
