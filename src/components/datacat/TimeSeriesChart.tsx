import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState, type MouseEvent } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { area, curveMonotoneX, line, type CurveFactory } from 'd3-shape'
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
  formatValue?: (value: number) => string
}

interface PinnedPointer {
  time: number
  y: number
}

interface DrawnLine {
  chartLine: ChartLine
  path: string | undefined
  areaPath: string | undefined
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
  pinnedTime?: number | null
  setPinnedTime?: (time: number | null) => void
  showTimeLabels: boolean
  showHoverTime: boolean
  hoverDetail?: string
  zeroLine?: boolean
  chartLeft?: number
  setYLabelWidth?: (width: number) => void
  note?: string
  height?: number
  tooltip?: boolean
  tooltipKeys?: string[]
  tooltipExtraLines?: ChartLine[]
  pinTooltip?: boolean
  toggleLines?: boolean
  strokeWidth?: number
  curve?: CurveFactory
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

function findVisibleLines(lines: ChartLine[], hiddenKeys: string[]) {
  const visibleLines: ChartLine[] = []

  for (const chartLine of lines) {
    if (!hiddenKeys.includes(chartLine.key)) {
      visibleLines.push(chartLine)
    }
  }

  return visibleLines
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

const TimeSeriesChart = ({ title, lines, from, to, yAxis, formatValue, hoveredTime, setHoveredTime, pinnedTime = null, setPinnedTime, showTimeLabels, showHoverTime, hoverDetail, zeroLine = false, chartLeft, setYLabelWidth, note, height = DEFAULT_HEIGHT, tooltip = false, tooltipKeys, tooltipExtraLines = [], pinTooltip = false, toggleLines = false, strokeWidth = DEFAULT_STROKE_WIDTH, curve = curveMonotoneX }: Props) => {
  const [width, setWidth] = useState(0)
  const [pointerY, setPointerY] = useState<number | null>(null)
  const [pinnedPointer, setPinnedPointer] = useState<PinnedPointer | null>(null)
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([])

  if (pinnedTime === null && pinnedPointer !== null) {
    setPinnedPointer(null)
  }

  const clipId = useId()

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

  const visibleLines = useMemo(() => findVisibleLines(lines, hiddenKeys), [lines, hiddenKeys])
  const valueRange = useMemo(() => findValueRange(visibleLines), [visibleLines])

  const yScale = useMemo(() => {
    if (yAxis === 'auto') {
      return scaleLinear().domain(valueRange).nice(AUTO_LABEL_COUNT).range([chartBottom, chartTop])
    }

    return scaleLinear().domain([0, Math.max(100, valueRange[1])]).range([chartBottom, chartTop])
  }, [yAxis, valueRange, chartBottom, chartTop])

  let yLabelValues = PERCENT_LABEL_VALUES
  let formatYLabel = formatPercentLabel

  if (yAxis === 'auto') {
    yLabelValues = yScale.ticks(AUTO_LABEL_COUNT)
    formatYLabel = formatAutoLabel
  }

  const yLabelKey = yLabelValues.map(formatYLabel).join('|')
  const yLabelWidth = useMemo(() => findWidestYLabel(yLabelKey.split('|')), [yLabelKey])

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

  const xScale = useMemo(() => scaleTime().domain([from, to]).range([plotLeft, plotRight]), [from, to, plotLeft, plotRight])
  const [lowestValue, highestValue] = yScale.domain()

  const drawnLines = useMemo(() => {
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
      .curve(curve)

    const [lowest, highest] = yScale.domain()
    const baselineY = yScale(Math.min(Math.max(0, lowest), highest))

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
      .curve(curve)

    return visibleLines.map(function (chartLine): DrawnLine {
      const gappedPoints = breakAtGaps(chartLine.points)
      let areaPath: string | undefined

      if (chartLine.fill) {
        areaPath = makeArea(gappedPoints) ?? undefined
      }

      return { chartLine, path: makePath(gappedPoints) ?? undefined, areaPath }
    })
  }, [visibleLines, xScale, yScale, curve])

  let xLabelDates: Date[] = []

  if (showTimeLabels) {
    xLabelDates = xScale.ticks(Math.max(2, Math.floor(plotWidth / 100)))
  }

  function formatLineValue(chartLine: ChartLine, value: number) {
    let format = formatValue

    if (chartLine.formatValue !== undefined) {
      format = chartLine.formatValue
    }

    return format(value)
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

  function renderArea(drawnLine: DrawnLine) {
    if (drawnLine.areaPath === undefined) {
      return null
    }

    return <path key={`${drawnLine.chartLine.key}-fill`} d={drawnLine.areaPath} fill={drawnLine.chartLine.color} fillOpacity={FILL_OPACITY} stroke="none" />
  }

  function renderLine(drawnLine: DrawnLine) {
    return <path key={drawnLine.chartLine.key} d={drawnLine.path} fill="none" stroke={drawnLine.chartLine.color} strokeWidth={strokeWidth} strokeLinejoin="round" />
  }

  function findPointAt(chartLine: ChartLine, time: number | null) {
    if (time === null) {
      return null
    }

    return findNearestPoint(chartLine.points, time)
  }

  function findTooltipPoint(chartLine: ChartLine) {
    return findPointAt(chartLine, tooltipTime)
  }

  let legendTime = hoveredTime

  if (pinnedTime !== null) {
    legendTime = pinnedTime
  }

  function renderDot(chartLine: ChartLine, time: number | null, keyPrefix: string) {
    const point = findPointAt(chartLine, time)

    if (point === null || point.value === null) {
      return null
    }

    return <circle key={`${keyPrefix}-${chartLine.key}`} cx={xScale(point.time)} cy={yScale(point.value)} r={3.5} fill={chartLine.color} stroke="var(--dc-surface)" strokeWidth={2} />
  }

  function renderHoveredDot(chartLine: ChartLine) {
    return renderDot(chartLine, hoveredTime, 'hovered')
  }

  function renderPinnedDot(chartLine: ChartLine) {
    return renderDot(chartLine, pinnedTime, 'pinned')
  }

  function toggleLine(key: string) {
    if (hiddenKeys.includes(key)) {
      setHiddenKeys(hiddenKeys.filter((hiddenKey) => hiddenKey !== key))
      return
    }

    setHiddenKeys([...hiddenKeys, key])
  }

  function renderLegendEntry(chartLine: ChartLine) {
    const legendPoint = findPointAt(chartLine, legendTime)
    const hidden = hiddenKeys.includes(chartLine.key)

    const contents = (
      <>
        <span className="dc-swatch" style={{ backgroundColor: chartLine.color }} />
        {chartLine.label}
        {!hidden && legendPoint !== null && legendPoint.value !== null && <strong>{formatLineValue(chartLine, legendPoint.value)}</strong>}
      </>
    )

    if (!toggleLines) {
      return <span key={chartLine.key}>{contents}</span>
    }

    return (
      <button key={chartLine.key} type="button" className={hidden ? 'off' : ''} aria-pressed={!hidden} onClick={() => toggleLine(chartLine.key)}>
        {contents}
      </button>
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

  let pinnedX: number | null = null

  if (pinnedTime !== null && pinnedTime >= from && pinnedTime <= to) {
    pinnedX = xScale(pinnedTime)
  }

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    if (setPinnedTime === undefined) {
      return
    }

    if (pinnedTime !== null) {
      setPinnedTime(null)
      return
    }

    const svgBox = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - svgBox.left

    if (mouseX < plotLeft || mouseX > plotRight) {
      return
    }

    const pointerTime = xScale.invert(mouseX).getTime()
    let clickedTime = pointerTime

    if (lines.length > 0) {
      const nearestPoint = findNearestPoint(lines[0].points, clickedTime)

      if (nearestPoint !== null) {
        clickedTime = nearestPoint.time
      }
    }

    setPinnedPointer({ time: pointerTime, y: event.clientY - svgBox.top })
    setPinnedTime(clickedTime)
  }

  useEffect(() => {
    if (pinnedTime === null || setPinnedTime === undefined) {
      return
    }

    const unpin = setPinnedTime

    function unpinOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        unpin(null)
      }
    }

    window.addEventListener('keydown', unpinOnEscape)

    return function stopListening() {
      window.removeEventListener('keydown', unpinOnEscape)
    }
  }, [pinnedTime, setPinnedTime])

  let svgCursor: string | undefined = undefined

  if (setPinnedTime !== undefined) {
    svgCursor = 'pointer'
  }

  function renderTooltipRow(chartLine: ChartLine) {
    const tooltipPoint = findTooltipPoint(chartLine)

    if (tooltipPoint === null || tooltipPoint.value === null) {
      return null
    }

    return (
      <>
        <p className="dc-tooltip-name">
          <span className="dc-swatch" style={{ backgroundColor: chartLine.color }} />
          {chartLine.label}
        </p>
        <strong className="dc-tooltip-value">{formatLineValue(chartLine, tooltipPoint.value)}</strong>
      </>
    )
  }

  function renderTooltipLineRow(chartLine: ChartLine) {
    const tooltipPoint = findTooltipPoint(chartLine)

    if (tooltipPoint === null || tooltipPoint.value === null) {
      return null
    }

    return (
      <div key={chartLine.key} className="dc-tooltip-row">
        <span className="dc-swatch" style={{ backgroundColor: chartLine.color }} />
        <span className="dc-tooltip-name">{chartLine.label}</span>
        <strong>{formatLineValue(chartLine, tooltipPoint.value)}</strong>
      </div>
    )
  }

  function findLineNearestPointer() {
    if (tooltipY === null) {
      return null
    }

    let nearestLine: ChartLine | null = null
    let nearestDistance = Infinity

    for (const chartLine of visibleLines) {
      const tooltipPoint = findTooltipPoint(chartLine)

      if (tooltipPoint === null || tooltipPoint.value === null) {
        continue
      }

      const distance = Math.abs(yScale(tooltipPoint.value) - tooltipY)

      if (distance < nearestDistance) {
        nearestLine = chartLine
        nearestDistance = distance
      }
    }

    return nearestLine
  }

  function hasTooltipValue(chartLine: ChartLine) {
    const tooltipPoint = findTooltipPoint(chartLine)

    return tooltipPoint !== null && tooltipPoint.value !== null
  }

  function findTooltipLines() {
    const extraLines = tooltipExtraLines.filter(hasTooltipValue)

    if (tooltipKeys !== undefined) {
      const candidates = [...visibleLines.filter(hasTooltipValue), ...extraLines]
      const keyedLines: ChartLine[] = []

      for (const key of tooltipKeys) {
        for (const chartLine of candidates) {
          if (chartLine.key === key) {
            keyedLines.push(chartLine)
          }
        }
      }

      return keyedLines
    }

    const nearestLine = findLineNearestPointer()

    if (nearestLine === null) {
      return extraLines
    }

    return [nearestLine, ...extraLines]
  }

  let cursorX: number | null = null

  if (hoveredTime !== null && hoveredTime >= from && hoveredTime <= to) {
    cursorX = xScale(hoveredTime)
  }

  let tooltipTime = hoveredTime
  let tooltipX = cursorX
  let tooltipY = pointerY

  if (pinnedTime !== null) {
    tooltipTime = pinnedTime
    tooltipX = null
    tooltipY = null

    if (pinTooltip && pinnedPointer !== null) {
      tooltipX = xScale(pinnedPointer.time)
      tooltipY = pinnedPointer.y
    }
  }

  const tooltipLines = findTooltipLines()

  let zeroY: number | null = null

  if (zeroLine && lowestValue < 0 && highestValue > 0) {
    zeroY = yScale(0)
  }

  return (
    <>
      <div className="dc-chart-header" style={{ paddingRight: MARGIN.right }}>
        <p className="lr-panel-label">{title}</p>
        <div className="dc-legend">
          {showHoverTime && legendTime !== null && <span className="dc-hover-time">{formatHoverTime(legendTime)}</span>}
          {lines.map(renderLegendEntry)}
          {hoverDetail !== undefined && <span className="dc-hover-time">{hoverDetail}</span>}
        </div>
      </div>

      {note !== undefined && <p className="lr-message">{note}</p>}

      {note === undefined && (
        <div ref={measureResize} className="dc-chart">
          <svg width={width} height={height} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} onClick={handleClick} style={{ cursor: svgCursor }}>
            <defs>
              <clipPath id={clipId}>
                <rect x={plotLeft} y={0} width={Math.max(0, plotWidth)} height={height} />
              </clipPath>
            </defs>

            {yLabelValues.map(renderGridline)}
            {xLabelDates.map(renderXLabel)}

            {zeroY !== null && <line x1={plotLeft} x2={plotRight} y1={zeroY} y2={zeroY} stroke="var(--dc-border-strong)" />}
            {pinnedX !== null && <line x1={pinnedX} x2={pinnedX} y1={chartTop} y2={chartBottom} stroke="var(--dc-border-strong)" />}
            {cursorX !== null && <line x1={cursorX} x2={cursorX} y1={chartTop} y2={chartBottom} stroke="var(--dc-border-strong)" />}

            <g clipPath={`url(#${clipId})`}>
              {drawnLines.map(renderArea)}
              {drawnLines.map(renderLine)}
            </g>
            {visibleLines.map(renderPinnedDot)}
            {visibleLines.map(renderHoveredDot)}
          </svg>

          {tooltip && tooltipX !== null && tooltipY !== null && tooltipLines.length > 0 && (
            <div className="dc-tooltip" style={{ left: tooltipX, top: tooltipY, transform: TOOLTIP_STYLE_TRANSFORM }}>
              {tooltipLines.length === 1 ? renderTooltipRow(tooltipLines[0]) : tooltipLines.map(renderTooltipLineRow)}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default TimeSeriesChart
