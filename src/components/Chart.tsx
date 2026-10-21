import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type AnimationEvent, type PointerEvent, type RefObject } from 'react'
import { scaleLinear, scalePoint } from 'd3-scale'
import { area, curveMonotoneX, line } from 'd3-shape'
import useMorphingPoints, { prefersReducedMotion, type ScreenPoint } from '../hooks/useMorphingPoints'
import LiveAxis from './LiveAxis'
import type { LiveSnapshot } from './LiveChart'
import '../stylesheets/chart.css'
import type { ChartData } from '../lib/types.ts'

interface Props {
  chartData: ChartData[] | null
  onHover?: (point: ChartData | null) => void
  shownLineRef?: RefObject<ScreenPoint[]>
  liveSnapshot?: LiveSnapshot | null
}

interface Size {
  width: number
  height: number
}

interface DateLabel {
  key: number
  text: string
  x: number
  textAnchor: 'start' | 'middle' | 'end'
}

const MARGIN = { top: 28, right: 5, bottom: 24, left: 5 }
const X_LABEL_SPACING = 100
const RANGE_PADDING = 0.1
const FLAT_PADDING = 1
const LINE_WIDTH = 2
const DOT_RADIUS = 4
const DOT_RING_WIDTH = 2
const FILL_DOT_SPACING = 4
const FILL_DOT_RADIUS = 0.75
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MARKET_DATE = /^\d{4}-\d{2}-\d{2}/

function findValueRange(chartData: ChartData[]) {
  let lowest = Infinity
  let highest = -Infinity

  for (const point of chartData) {
    lowest = Math.min(lowest, point.value)
    highest = Math.max(highest, point.value)
  }

  const padding = (highest - lowest) * RANGE_PADDING || FLAT_PADDING

  return [lowest - padding, highest + padding]
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

function formatHoverDate(date: string) {
  if (!MARKET_DATE.test(date)) {
    return date
  }

  const [day, time] = date.split(' ')
  const [year, month, dayOfMonth] = day.split('-')
  const monthDay = `${MONTHS[Number(month) - 1]} ${Number(dayOfMonth)}`

  if (time === undefined) {
    return `${monthDay}, ${year}`
  }

  return `${monthDay}, ${formatClock(time)}`
}

function formatClock(time: string) {
  const [hour, minute] = time.split(':')
  const period = Number(hour) < 12 ? 'AM' : 'PM'

  return `${Number(hour) % 12 || 12}:${minute} ${period}`
}

function formatXLabel(date: string, firstDate: string, lastDate: string) {
  if (!MARKET_DATE.test(date)) {
    return date
  }

  const [day, time] = date.split(' ')
  const [year, month, dayOfMonth] = day.split('-')
  const monthName = MONTHS[Number(month) - 1]

  if (time !== undefined && firstDate.slice(0, 10) === lastDate.slice(0, 10)) {
    return formatClock(time)
  }

  if (firstDate.slice(0, 4) !== lastDate.slice(0, 4)) {
    return `${monthName} ${year}`
  }

  return `${monthName} ${Number(dayOfMonth)}`
}

function findXLabelIndexes(pointCount: number, plotWidth: number) {
  const labelCount = Math.min(pointCount, Math.max(2, Math.floor(plotWidth / X_LABEL_SPACING)))
  const indexes: number[] = []

  for (let label = 0; label < labelCount; label++) {
    indexes.push(Math.round((label * (pointCount - 1)) / Math.max(1, labelCount - 1)))
  }

  return [...new Set(indexes)]
}

function makeDateLabels(chartData: ChartData[], placedPoints: ScreenPoint[], plotWidth: number) {
  const indexes = findXLabelIndexes(chartData.length, plotWidth)
  const dateLabels: DateLabel[] = []

  for (let position = 0; position < indexes.length; position++) {
    const index = indexes[position]
    const spot = placedPoints[index]

    if (spot === undefined) {
      continue
    }

    let textAnchor: DateLabel['textAnchor'] = 'middle'

    if (position === 0) {
      textAnchor = 'start'
    } else if (position === indexes.length - 1) {
      textAnchor = 'end'
    }

    const text = formatXLabel(chartData[index].date, chartData[0].date, chartData[chartData.length - 1].date)
    dateLabels.push({ key: index, text, x: spot.x, textAnchor })
  }

  return dateLabels
}

function hasSameLabels(oldLabels: DateLabel[], newLabels: DateLabel[]) {
  if (oldLabels.length !== newLabels.length) {
    return false
  }

  for (let index = 0; index < oldLabels.length; index++) {
    const oldLabel = oldLabels[index]
    const newLabel = newLabels[index]

    if (oldLabel.text !== newLabel.text || Math.round(oldLabel.x) !== Math.round(newLabel.x)) {
      return false
    }
  }

  return true
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

function makeAreaPath(screenPoints: ScreenPoint[], bottom: number) {
  const makeArea = area<ScreenPoint>()
    .x(function (screenPoint) {
      return screenPoint.x
    })
    .y0(bottom)
    .y1(function (screenPoint) {
      return screenPoint.y
    })
    .curve(curveMonotoneX)

  return makeArea(screenPoints) ?? undefined
}

const LABEL_SWAP_MS = 120

const Chart = React.memo(({ chartData: loadedData, onHover, shownLineRef, liveSnapshot = null }: Props) => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [heldSnapshot] = useState(liveSnapshot)
  const [continuesLive] = useState(liveSnapshot !== null && liveSnapshot.line.length > 0)
  const [heldLabelsGone, setHeldLabelsGone] = useState(false)
  const [xLabelsArriving, setXLabelsArriving] = useState(continuesLive)
  const [labelsData, setLabelsData] = useState(loadedData ?? [])
  const [leavingLabels, setLeavingLabels] = useState<DateLabel[] | null>(null)
  const [labelSwap, setLabelSwap] = useState(0)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [labelWidth, setLabelWidth] = useState(0)
  const labelRef = useRef<HTMLDivElement>(null)
  const clipId = useId()
  const fillId = useId()

  const measureResize = useCallback((chartDiv: HTMLDivElement | null) => {
    if (chartDiv === null) {
      return
    }

    function updateSize(width: number, height: number) {
      const newSize = { width: Math.floor(width), height: Math.floor(height) }

      setSize(function (oldSize) {
        if (oldSize.width === newSize.width && oldSize.height === newSize.height) {
          return oldSize
        }

        return newSize
      })
    }

    function handleResize(entries: ResizeObserverEntry[]) {
      const box = entries[0].contentRect
      updateSize(box.width, box.height)
    }

    updateSize(chartDiv.clientWidth, chartDiv.clientHeight)

    const observer = new ResizeObserver(handleResize)
    observer.observe(chartDiv)

    return function stopMeasuring() {
      observer.disconnect()
    }
  }, [])

  const waitingForData = loadedData === null
  const chartData = useMemo(() => loadedData ?? [], [loadedData])
  const placedPoints = useMemo(() => placePoints(chartData, size), [chartData, size])

  let targetPoints = placedPoints

  if (heldSnapshot !== null && (waitingForData || placedPoints.length === 0)) {
    targetPoints = heldSnapshot.line
  }

  const shownPoints = useMorphingPoints(targetPoints)

  useEffect(() => {
    if (shownLineRef === undefined) {
      return
    }

    shownLineRef.current = shownPoints
  }, [shownLineRef, shownPoints])

  useEffect(() => {
    if (shownLineRef === undefined) {
      return
    }

    return function forgetShownLine() {
      shownLineRef.current = []
    }
  }, [shownLineRef])

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
  const areaPath = makeAreaPath(shownPoints, chartBottom)
  const plotWidth = chartRight - chartLeft
  const dateLabels = makeDateLabels(chartData, placedPoints, plotWidth)

  if (chartData !== labelsData) {
    const oldLabels = makeDateLabels(labelsData, placePoints(labelsData, size), plotWidth)
    setLabelsData(chartData)

    if (oldLabels.length > 0 && !hasSameLabels(oldLabels, dateLabels) && !prefersReducedMotion()) {
      if (leavingLabels === null && !xLabelsArriving) {
        setLeavingLabels(oldLabels)
      }

      setLabelSwap(labelSwap + 1)
      setXLabelsArriving(true)
    }
  }

  function renderDateLabel(label: DateLabel) {
    return (
      <text key={label.key} className="chart-axis" x={label.x} y={chartBottom + 17} textAnchor={label.textAnchor}>
        {label.text}
      </text>
    )
  }

  let solidRight = size.width
  let svgClassName: string | undefined = undefined

  if (continuesLive) {
    svgClassName = 'chart-continued'
  }

  let heldLabelsClassName = 'chart-held-labels'

  if (!waitingForData) {
    heldLabelsClassName = 'chart-held-labels chart-labels-leaving'
  }

  let xLabelsClassName: string | undefined = undefined

  if (xLabelsArriving) {
    xLabelsClassName = 'chart-labels-arriving'
  }

  function forgetHeldLabels(event: AnimationEvent<SVGGElement>) {
    if (event.target === event.currentTarget) {
      setHeldLabelsGone(true)
    }
  }

  function forgetLeavingLabels(event: AnimationEvent<SVGGElement>) {
    if (event.target === event.currentTarget) {
      setLeavingLabels(null)
    }
  }

  function settleXLabels(event: AnimationEvent<SVGGElement>) {
    if (event.target === event.currentTarget) {
      setXLabelsArriving(false)
    }
  }

  if (hoveredSpot !== null) {
    solidRight = hoveredSpot.x
  }

  return (
    <div ref={measureResize} className="chart-area">
      {size.width > 0 && (
        <svg className={svgClassName} width={size.width} height={size.height} onPointerDown={handlePointerMove} onPointerMove={handlePointerMove} onPointerLeave={clearHover}>
          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={solidRight} height={size.height} />
            </clipPath>

            <clipPath id={`${clipId}-after`}>
              <rect x={solidRight} y={0} width={size.width - solidRight} height={size.height} />
            </clipPath>

            <pattern id={`${fillId}-dots`} width={FILL_DOT_SPACING} height={FILL_DOT_SPACING} patternUnits="userSpaceOnUse">
              <circle className="chart-fill-dot" cx={FILL_DOT_SPACING / 2} cy={FILL_DOT_SPACING / 2} r={FILL_DOT_RADIUS} />
            </pattern>

            <linearGradient id={`${fillId}-fade`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" className="chart-fill-top" />
              <stop offset="100%" className="chart-fill-bottom" />
            </linearGradient>

            <mask id={`${fillId}-mask`}>
              <rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${fillId}-fade)`} />
            </mask>
          </defs>

          {continuesLive && heldSnapshot !== null && !heldLabelsGone && (
            <g className={heldLabelsClassName} style={{ animationDuration: `${LABEL_SWAP_MS}ms` }} onAnimationEnd={forgetHeldLabels}>
              <LiveAxis xLabels={heldSnapshot.xLabels} yLabels={heldSnapshot.yLabels} plotLeft={heldSnapshot.plotLeft} plotRight={heldSnapshot.plotRight} />
            </g>
          )}

          <g className="chart-faded" clipPath={`url(#${clipId}-after)`}>
            {!waitingForData && (
              <g className="chart-faded-fill">
                <path className="chart-fill" d={areaPath} fill={`url(#${fillId}-dots)`} mask={`url(#${fillId}-mask)`} />
              </g>
            )}
            <path className="chart-line" d={path} pathLength={1} fill="none" strokeWidth={LINE_WIDTH} />
          </g>

          <g clipPath={`url(#${clipId})`}>
            {!waitingForData && <path className="chart-fill" d={areaPath} fill={`url(#${fillId}-dots)`} mask={`url(#${fillId}-mask)`} />}
            <path className="chart-line" d={path} pathLength={1} fill="none" strokeWidth={LINE_WIDTH} />
          </g>

          {leavingLabels !== null && (
            <g className="chart-labels-leaving" style={{ animationDuration: `${LABEL_SWAP_MS}ms` }} onAnimationEnd={forgetLeavingLabels}>
              {leavingLabels.map(renderDateLabel)}
            </g>
          )}

          {!waitingForData && (
            <g key={labelSwap} className={xLabelsClassName} style={{ animationDuration: `${LABEL_SWAP_MS}ms`, animationDelay: `${LABEL_SWAP_MS}ms` }} onAnimationEnd={settleXLabels}>
              {dateLabels.map(renderDateLabel)}
            </g>
          )}

          {hoveredSpot !== null && <line className="chart-cursor" x1={hoveredSpot.x} x2={hoveredSpot.x} y1={chartTop} y2={chartBottom} />}
          {hoveredSpot !== null && <circle className="chart-dot" cx={hoveredSpot.x} cy={hoveredSpot.y} r={DOT_RADIUS} strokeWidth={DOT_RING_WIDTH} />}
        </svg>
      )}

      {hoveredPoint !== null && hoveredSpot !== null && (
        <div ref={labelRef} className="chart-label" style={{ left: labelX }}>
          {formatHoverDate(hoveredPoint.date)}
        </div>
      )}
    </div>
  )
})

export default Chart
