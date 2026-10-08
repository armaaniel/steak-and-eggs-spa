import { useCallback, useLayoutEffect, useState, type MouseEvent } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import { MARGIN, Y_LABEL_GAP, findWidestYLabel, formatXAxisTime } from './bucketChart'
import { breakAtGaps, findNearestPoint, formatHoverTime, type TimePoint } from './timeSeries'
import '../../stylesheets/datacat/loadrun.css'
import '../../stylesheets/datacat/charts.css'

export interface ChartLine {
  key: string
  label: string
  color: string
  points: TimePoint[]
  fill?: boolean
}

interface Props {
  title: string
  lines: ChartLine[]
  from: number
  to: number
  yAxis: 'percent' | 'auto'
  formatValue: (value: number) => string
  hoveredTime: number | null
  setHoveredTime: (time: number | null) => void
  showTimeLabels: boolean
  showHoverTime: boolean
  hoverDetail?: string
  zeroLine?: boolean
  chartLeft?: number
  setYLabelWidth?: (width: number) => void
  note?: string
  height?: number
  tooltip?: boolean
  strokeWidth?: number
}

const DEFAULT_HEIGHT = 110
const MARGIN_TOP = 8
const MARGIN_BOTTOM = 6
const TOOLTIP_STYLE_TRANSFORM = 'translate(-50%, calc(-100% - 10px))'
const PERCENT_LABEL_VALUES = [0, 50, 100]
const AUTO_LABEL_COUNT = 4
const FILL_OPACITY = 0.1
const DEFAULT_STROKE_WIDTH = 1.5

function formatPercentLabel(value: number) {
  return `${value}%`
}

function formatAutoLabel(value: number) {
  return value.toLocaleString('en-us', { maximumFractionDigits: 1 })
}

function findValueRange(lines: ChartLine[]) {
  let lowest = 0
  let highest = 0

  for (const chartLine of lines) {
    for (const timePoint of chartLine.points) {
      if (timePoint.value !== null) {
        lowest = Math.min(lowest, timePoint.value)
        highest = Math.max(highest, timePoint.value)
      }
    }
  }

  if (highest === lowest) {
    highest = lowest + 1
  }

  return [lowest, highest]
}

const TimeSeriesChart = ({ title, lines, from, to, yAxis, formatValue, hoveredTime, setHoveredTime, showTimeLabels, showHoverTime, hoverDetail, zeroLine = false, chartLeft, setYLabelWidth, note, height = DEFAULT_HEIGHT, tooltip = false, strokeWidth = DEFAULT_STROKE_WIDTH }: Props) => {
  const [width, setWidth] = useState(0)
  const [pointerY, setPointerY] = useState<number | null>(null)

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
  const chartBottom = height - marginBottom

  let yScale = scaleLinear().domain([0, Math.max(100, findValueRange(lines)[1])]).range([chartBottom, chartTop])
  let yLabelValues = PERCENT_LABEL_VALUES
  let formatYLabel = formatPercentLabel

  if (yAxis === 'auto') {
    yScale = scaleLinear().domain(findValueRange(lines)).nice(AUTO_LABEL_COUNT).range([chartBottom, chartTop])
    yLabelValues = yScale.ticks(AUTO_LABEL_COUNT)
    formatYLabel = formatAutoLabel
  }

  const yLabelWidth = findWidestYLabel(yLabelValues.map(formatYLabel))

  useLayoutEffect(() => {
    if (setYLabelWidth === undefined) {
      return
    }

    if (note === undefined) {
      setYLabelWidth(yLabelWidth)
    } else {
      setYLabelWidth(0)
    }
  }, [yLabelWidth, note, setYLabelWidth])

  const plotLeft = chartLeft ?? yLabelWidth + Y_LABEL_GAP
  const plotRight = width - MARGIN.right
  const plotWidth = plotRight - plotLeft

  const xScale = scaleTime().domain([from, to]).range([plotLeft, plotRight])

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

  const [lowestValue, highestValue] = yScale.domain()
  const baselineY = yScale(Math.min(Math.max(0, lowestValue), highestValue))

  const makeArea = area<TimePoint>()
    .defined(function (timePoint) {
      return timePoint.value !== null
    })
    .x(function (timePoint) {
      return xScale(timePoint.time)
    })
    .y0(baselineY)
    .y1(function (timePoint) {
      return yScale(timePoint.value ?? 0)
    })
    .curve(curveMonotoneX)

  let xLabelDates: Date[] = []

  if (showTimeLabels) {
    xLabelDates = xScale.ticks(Math.max(2, Math.floor(plotWidth / 100)))
  }

  function renderGridline(value: number) {
    const gridlineY = yScale(value)

    return (
      <g key={value}>
        <line className="dc-grid" x1={plotLeft} x2={plotRight} y1={gridlineY} y2={gridlineY} />
        <text x={plotLeft - Y_LABEL_GAP} y={gridlineY} dy="0.32em" textAnchor="end">
          {formatYLabel(value)}
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

  function renderArea(chartLine: ChartLine) {
    if (!chartLine.fill) {
      return null
    }

    const areaPath = makeArea(breakAtGaps(chartLine.points)) ?? undefined

    return <path key={`${chartLine.key}-fill`} d={areaPath} fill={chartLine.color} fillOpacity={FILL_OPACITY} stroke="none" />
  }

  function renderLine(chartLine: ChartLine) {
    const path = makePath(breakAtGaps(chartLine.points)) ?? undefined

    return <path key={chartLine.key} d={path} fill="none" stroke={chartLine.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
  }

  function findHoveredPoint(chartLine: ChartLine) {
    if (hoveredTime === null) {
      return null
    }

    return findNearestPoint(chartLine.points, hoveredTime)
  }

  function renderHoveredDot(chartLine: ChartLine) {
    const hoveredPoint = findHoveredPoint(chartLine)

    if (hoveredPoint === null || hoveredPoint.value === null) {
      return null
    }

    return <circle key={chartLine.key} cx={xScale(hoveredPoint.time)} cy={yScale(hoveredPoint.value)} r={3.5} fill={chartLine.color} stroke="var(--dc-surface)" strokeWidth={2} />
  }

  function renderLegendEntry(chartLine: ChartLine) {
    const hoveredPoint = findHoveredPoint(chartLine)

    return (
      <span key={chartLine.key}>
        <span className="dc-swatch" style={{ backgroundColor: chartLine.color }} />
        {chartLine.label}
        {hoveredPoint !== null && hoveredPoint.value !== null && <strong>{formatValue(hoveredPoint.value)}</strong>}
      </span>
    )
  }

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - svgBox.left

    if (mouseX < plotLeft || mouseX > plotRight) {
      setHoveredTime(null)
      setPointerY(null)
      return
    }

    setHoveredTime(xScale.invert(mouseX).getTime())

    if (tooltip) {
      setPointerY(event.clientY - svgBox.top)
    }
  }

  function handlePointerLeave() {
    setHoveredTime(null)
    setPointerY(null)
  }

  function renderTooltipRow(chartLine: ChartLine) {
    const hoveredPoint = findHoveredPoint(chartLine)

    if (hoveredPoint === null || hoveredPoint.value === null) {
      return null
    }

    return (
      <p key={chartLine.key} className="dc-tooltip-name">
        <span className="dc-swatch" style={{ backgroundColor: chartLine.color }} />
        {chartLine.label}
        <strong>{formatValue(hoveredPoint.value)}</strong>
      </p>
    )
  }

  let cursorX: number | null = null

  if (hoveredTime !== null && hoveredTime >= from && hoveredTime <= to) {
    cursorX = xScale(hoveredTime)
  }

  let tooltipTime = hoveredTime

  if (lines.length > 0) {
    const firstHoveredPoint = findHoveredPoint(lines[0])

    if (firstHoveredPoint !== null) {
      tooltipTime = firstHoveredPoint.time
    }
  }

  let zeroY: number | null = null

  if (zeroLine && lowestValue < 0 && highestValue > 0) {
    zeroY = yScale(0)
  }

  return (
    <>
      <div className="dc-chart-header" style={{ paddingRight: MARGIN.right }}>
        <p className="lr-panel-label">{title}</p>
        <div className="dc-legend">
          {showHoverTime && hoveredTime !== null && <span className="dc-hover-time">{formatHoverTime(hoveredTime)}</span>}
          {lines.map(renderLegendEntry)}
          {hoverDetail !== undefined && <span className="dc-hover-time">{hoverDetail}</span>}
        </div>
      </div>

      {note !== undefined && <p className="lr-message">{note}</p>}

      {note === undefined && (
        <div ref={measureResize} className="dc-chart">
          <svg width={width} height={height} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
            {yLabelValues.map(renderGridline)}
            {xLabelDates.map(renderXLabel)}

            {zeroY !== null && <line x1={plotLeft} x2={plotRight} y1={zeroY} y2={zeroY} stroke="var(--dc-border-strong)" />}
            {cursorX !== null && <line x1={cursorX} x2={cursorX} y1={chartTop} y2={chartBottom} stroke="var(--dc-border-strong)" />}

            {lines.map(renderArea)}
            {lines.map(renderLine)}
            {lines.map(renderHoveredDot)}
          </svg>

          {tooltip && pointerY !== null && cursorX !== null && tooltipTime !== null && (
            <div className="dc-tooltip" style={{ left: cursorX, top: pointerY, transform: TOOLTIP_STYLE_TRANSFORM }}>
              <p className="dc-tooltip-time">{formatHoverTime(tooltipTime)}</p>
              {lines.map(renderTooltipRow)}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default TimeSeriesChart
