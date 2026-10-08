import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import useApi from '../hooks/useApi'
import '../stylesheets/chart.css'
import type { ChartData } from '../lib/types.ts'

interface Props {
  symbol: string
  price: number | null
  onHover?: (point: ChartData | null) => void
}

interface LivePoint {
  time: number
  value: number
  from?: number
}

interface LinePoint {
  time: number
  value: number
  price: number
}

interface Size {
  width: number
  height: number
}

const LIVE_DELAY_MS = 902_000
const WINDOW_MS = 60_000
const KEEP_MS = WINDOW_MS * 2
const HOLD_GAP_MS = 2000
const SECOND_MS = 1000
const GLIDE_MS = 400
const FRAMES_PER_SECOND = 30
const FRAME_TOLERANCE_MS = 4
const FRAME_GAP_MS = 1000 / FRAMES_PER_SECOND - FRAME_TOLERANCE_MS
const LABEL_STEPS_MS = [10_000, 20_000, 30_000, 60_000]
const MIN_LABEL_SPACING = 72
const EDGE_FADE = 24
const Y_EDGE_FADE = 12
const MARGIN = { top: 28, right: 5, bottom: 24, left: 5 }
const Y_LABEL_GAP = 12
const Y_LABEL_COUNT = 6
const MIN_SPAN_FRACTION = 0.0005
const PADDING_FRACTION = 0.1
const LINE_WIDTH = 2
const HEAD_RADIUS = 4
const DOT_RING_WIDTH = 2
const LABEL_FONT_SIZE = 12

const clockFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

let measuringContext: CanvasRenderingContext2D | null = null

function measureWidestLabel(labels: string[]) {
  if (measuringContext === null) {
    measuringContext = document.createElement('canvas').getContext('2d')
  }

  if (measuringContext === null) {
    return 0
  }

  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-body')
  measuringContext.font = `${LABEL_FONT_SIZE}px ${fontFamily}`

  let widest = 0

  for (const label of labels) {
    widest = Math.max(widest, measuringContext.measureText(label).width)
  }

  return Math.ceil(widest)
}

function easeOut(progress: number) {
  return 1 - Math.pow(1 - progress, 3)
}

function findShownValue(point: LivePoint, windowEnd: number) {
  if (point.from === undefined) {
    return point.value
  }

  const progress = Math.min(1, Math.max(0, (windowEnd - point.time) / GLIDE_MS))

  return point.from + (point.value - point.from) * easeOut(progress)
}

function findShownPoints(points: LivePoint[], windowStart: number, windowEnd: number, headValue: number, headPrice: number, startingValue: number | null) {
  const shownPoints: LinePoint[] = []
  let pointBeforeWindow: LinePoint | null = null

  for (const point of points) {
    const shownPoint = { time: point.time, value: findShownValue(point, windowEnd), price: point.value }

    if (point.time < windowStart) {
      pointBeforeWindow = shownPoint
    } else if (point.time <= windowEnd) {
      shownPoints.push(shownPoint)
    }
  }

  if (pointBeforeWindow !== null) {
    shownPoints.unshift(pointBeforeWindow)
  } else {
    const leftEdgeValue = startingValue ?? shownPoints[0]?.value ?? headValue
    shownPoints.unshift({ time: windowStart - WINDOW_MS, value: leftEdgeValue, price: leftEdgeValue })
  }

  shownPoints.push({ time: windowEnd, value: headValue, price: headPrice })

  return holdUntilNextTrade(shownPoints)
}

function holdUntilNextTrade(points: LinePoint[]) {
  const heldPoints: LinePoint[] = []

  for (const point of points) {
    const previous = heldPoints[heldPoints.length - 1]

    if (previous !== undefined && point.time - previous.time > HOLD_GAP_MS) {
      heldPoints.push({ time: point.time - SECOND_MS, value: previous.value, price: previous.price })
    }

    heldPoints.push(point)
  }

  return heldPoints
}

function findValueAt(linePoints: LinePoint[], time: number) {
  for (let index = 1; index < linePoints.length; index++) {
    const before = linePoints[index - 1]
    const after = linePoints[index]

    if (after.time >= time) {
      const fraction = Math.max(0, (time - before.time) / (after.time - before.time))

      return before.value + (after.value - before.value) * fraction
    }
  }

  return linePoints[linePoints.length - 1].value
}

function findPriceRange(linePoints: LinePoint[], windowStart: number) {
  let lowest = findValueAt(linePoints, windowStart)
  let highest = lowest

  for (const point of linePoints) {
    if (point.time >= windowStart) {
      lowest = Math.min(lowest, point.value)
      highest = Math.max(highest, point.value)
    }
  }

  const minimumSpan = Math.abs(highest) * MIN_SPAN_FRACTION

  if (highest - lowest < minimumSpan) {
    const middle = (highest + lowest) / 2
    lowest = middle - minimumSpan / 2
    highest = middle + minimumSpan / 2
  }

  const padding = (highest - lowest) * PADDING_FRACTION

  return [lowest - padding, highest + padding]
}

function findDecimals(labelValues: number[]) {
  if (labelValues.length < 2) {
    return 2
  }

  const step = labelValues[1] - labelValues[0]

  return Math.min(6, Math.max(2, Math.ceil(-Math.log10(step))))
}

function findNearestPoint(linePoints: LinePoint[], windowStart: number, pointerTime: number) {
  let nearestPoint: LinePoint | null = null

  for (const point of linePoints) {
    if (point.time < windowStart) {
      continue
    }

    if (nearestPoint === null || Math.abs(point.time - pointerTime) < Math.abs(nearestPoint.time - pointerTime)) {
      nearestPoint = point
    }
  }

  return nearestPoint
}

function pickLabelStep(plotWidth: number) {
  for (const labelStep of LABEL_STEPS_MS) {
    if ((plotWidth * labelStep) / WINDOW_MS >= MIN_LABEL_SPACING) {
      return labelStep
    }
  }

  return LABEL_STEPS_MS[LABEL_STEPS_MS.length - 1]
}

const LiveChart = ({ symbol, price, onHover }: Props) => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [now, setNow] = useState(() => Date.now())
  const [livePoints, setLivePoints] = useState<LivePoint[]>([])
  const [startingPrice, setStartingPrice] = useState(price)
  const [pointerX, setPointerX] = useState<number | null>(null)
  const [labelWidth, setLabelWidth] = useState(0)
  const lastPrice = useRef(price)
  const labelRef = useRef<HTMLDivElement>(null)
  const clipId = `live-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const { data: seedPoints } = useApi<LivePoint[]>(`/stocks/${symbol}/livedata`, [])

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

  useEffect(() => {
    let frameRequest = 0
    let lastDrawnAt = 0

    function moveForward(frameTime: number) {
      if (frameTime - lastDrawnAt >= FRAME_GAP_MS) {
        lastDrawnAt = frameTime
        setNow(Date.now())
      }

      frameRequest = requestAnimationFrame(moveForward)
    }

    frameRequest = requestAnimationFrame(moveForward)

    return function stopMoving() {
      cancelAnimationFrame(frameRequest)
    }
  }, [])

  useEffect(() => {
    if (price === null || price === lastPrice.current) {
      return
    }

    const previousPrice = lastPrice.current
    lastPrice.current = price

    if (startingPrice === null) {
      setStartingPrice(price)
      return
    }

    const arrivedAt = Date.now() - LIVE_DELAY_MS
    const lastSeedPoint = seedPoints?.[seedPoints.length - 1]
    let startValue = previousPrice ?? price

    if (lastSeedPoint !== undefined) {
      startValue = lastSeedPoint.value
    }

    setLivePoints(function (oldPoints) {
      const lastLivePoint = oldPoints[oldPoints.length - 1]
      let from = startValue

      if (lastLivePoint !== undefined) {
        from = findShownValue(lastLivePoint, arrivedAt)
      }

      const keptPoints = oldPoints.filter(function (point, index) {
        return point.time >= arrivedAt - KEEP_MS || index === oldPoints.length - 1
      })

      return [...keptPoints, { time: arrivedAt, value: price, from }]
    })
  }, [price, startingPrice, seedPoints])

  const allPoints = useMemo(() => {
    const firstLivePoint = livePoints[0]
    const earlierSeedPoints = (seedPoints ?? []).filter(function (point) {
      return firstLivePoint === undefined || point.time < firstLivePoint.time
    })

    return [...earlierSeedPoints, ...livePoints]
  }, [seedPoints, livePoints])

  const windowEnd = now - LIVE_DELAY_MS
  const windowStart = windowEnd - WINDOW_MS

  let headValue = price
  let headPrice = price

  if (allPoints.length > 0) {
    const lastPoint = allPoints[allPoints.length - 1]
    headValue = findShownValue(lastPoint, windowEnd)
    headPrice = lastPoint.value
  }

  let startingValue = startingPrice

  if (seedPoints !== null && seedPoints.length > 0) {
    startingValue = null
  }

  let shownPoints: LinePoint[] = []
  let priceRange = [0, 1]

  if (headValue !== null && headPrice !== null) {
    shownPoints = findShownPoints(allPoints, windowStart, windowEnd, headValue, headPrice, startingValue)
    priceRange = findPriceRange(shownPoints, windowStart)
  }

  const yLabelValues = scaleLinear().domain(priceRange).ticks(Y_LABEL_COUNT)
  const decimals = findDecimals(yLabelValues)

  function formatPrice(value: number) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  const yLabels = yLabelValues.map(formatPrice)
  const yLabelKey = yLabels.join('|')
  const yLabelWidth = useMemo(() => measureWidestLabel(yLabelKey.split('|')), [yLabelKey])
  const halfXLabelWidth = useMemo(() => measureWidestLabel([clockFormat.format(0)]) / 2, [])

  const plotLeft = MARGIN.left
  const plotRight = size.width - MARGIN.right - yLabelWidth - Y_LABEL_GAP
  const plotTop = MARGIN.top
  const plotBottom = size.height - MARGIN.bottom
  const plotWidth = Math.max(0, plotRight - plotLeft)

  const xScale = scaleTime().domain([windowStart, windowEnd]).range([plotLeft, plotRight])
  const yScale = scaleLinear().domain(priceRange).range([plotBottom, plotTop])

  const makePath = line<LinePoint>()
    .x(function (point) {
      return xScale(point.time)
    })
    .y(function (point) {
      return yScale(point.value)
    })
    .curve(curveMonotoneX)

  const path = makePath(shownPoints) ?? undefined

  const labelStep = pickLabelStep(plotWidth)
  const xLabelTimes: number[] = []

  for (let labelTime = Math.ceil(windowStart / labelStep) * labelStep; labelTime <= windowEnd; labelTime += labelStep) {
    xLabelTimes.push(labelTime)
  }

  function renderXLabel(labelTime: number) {
    const labelX = xScale(labelTime)
    const distanceFromEdge = Math.min(labelX - plotLeft, plotRight - labelX) - halfXLabelWidth
    const opacity = Math.min(1, Math.max(0, distanceFromEdge / EDGE_FADE))

    return (
      <text key={labelTime} className="live-label" x={labelX} y={plotBottom + 17} textAnchor="middle" opacity={opacity}>
        {clockFormat.format(labelTime)}
      </text>
    )
  }

  function renderYLabel(value: number, index: number) {
    const labelY = yScale(value)
    const distanceFromEdge = Math.min(labelY - plotTop, plotBottom - labelY)
    const opacity = Math.min(1, Math.max(0, distanceFromEdge / Y_EDGE_FADE))

    return (
      <g key={value} opacity={opacity}>
        <line className="live-grid" x1={plotLeft} x2={plotRight} y1={labelY} y2={labelY} />
        <text className="live-label" x={plotRight + Y_LABEL_GAP} y={labelY} dy="0.32em">
          {yLabels[index]}
        </text>
      </g>
    )
  }

  let headY: number | null = null

  if (headValue !== null) {
    headY = yScale(headValue)
  }

  let hoveredPoint: LinePoint | null = null

  if (pointerX !== null) {
    hoveredPoint = findNearestPoint(shownPoints, windowStart, xScale.invert(pointerX).getTime())
  }

  let hoveredLabel: string | null = null
  let hoveredPrice: number | null = null
  let hoveredX = 0
  let hoveredY = 0
  let labelX = 0

  if (hoveredPoint !== null) {
    hoveredLabel = clockFormat.format(hoveredPoint.time)
    hoveredPrice = hoveredPoint.price
    hoveredX = xScale(hoveredPoint.time)
    hoveredY = yScale(hoveredPoint.value)

    const halfLabel = labelWidth / 2
    labelX = Math.min(Math.max(hoveredX, plotLeft + halfLabel), plotRight - halfLabel)
  }

  useEffect(() => {
    if (onHover === undefined) {
      return
    }

    if (hoveredLabel === null || hoveredPrice === null) {
      onHover(null)
      return
    }

    onHover({ date: hoveredLabel, value: hoveredPrice })
  }, [hoveredLabel, hoveredPrice, onHover])

  useLayoutEffect(() => {
    if (labelRef.current !== null) {
      setLabelWidth(labelRef.current.offsetWidth)
    }
  }, [hoveredLabel])

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - svgBox.left
    const mouseY = event.clientY - svgBox.top
    const insidePlot = mouseX >= plotLeft && mouseX <= plotRight && mouseY >= plotTop && mouseY <= plotBottom

    if (!insidePlot) {
      setPointerX(null)
      return
    }

    setPointerX(mouseX)
  }

  function clearPointer() {
    setPointerX(null)
  }

  return (
    <div ref={measureResize} className="chart-area">
      {size.width > 0 && headY !== null && <div className="live-pulse" style={{ left: plotRight, top: headY }} />}

      {size.width > 0 && (
        <svg width={size.width} height={size.height} onPointerDown={handlePointerMove} onPointerMove={handlePointerMove} onPointerLeave={clearPointer}>
          <defs>
            <clipPath id={clipId}>
              <rect x={plotLeft} y={0} width={plotWidth} height={size.height} />
            </clipPath>
          </defs>

          {yLabelValues.map(renderYLabel)}
          {xLabelTimes.map(renderXLabel)}

          <path className="live-line" d={path} clipPath={`url(#${clipId})`} fill="none" strokeWidth={LINE_WIDTH} />

          {hoveredPoint !== null && <line className="chart-cursor" x1={hoveredX} x2={hoveredX} y1={plotTop} y2={plotBottom} />}

          {headY !== null && <circle className="chart-dot" cx={plotRight} cy={headY} r={HEAD_RADIUS} />}

          {hoveredPoint !== null && <circle className="chart-dot" cx={hoveredX} cy={hoveredY} r={HEAD_RADIUS} strokeWidth={DOT_RING_WIDTH} />}
        </svg>
      )}

      {hoveredLabel !== null && (
        <div ref={labelRef} className="chart-label" style={{ left: labelX }}>
          {hoveredLabel}
        </div>
      )}
    </div>
  )
}

export default LiveChart
