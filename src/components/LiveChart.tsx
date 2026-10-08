import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import useApi from '../hooks/useApi'
import '../stylesheets/chart.css'

interface Props {
  symbol: string
  price: number | null
}

interface LivePoint {
  time: number
  value: number
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
const LABEL_STEPS_MS = [10_000, 20_000, 30_000, 60_000]
const MIN_LABEL_SPACING = 72
const EDGE_FADE = 24
const MARGIN = { top: 28, right: 5, bottom: 24, left: 5 }
const Y_LABEL_GAP = 12
const Y_LABEL_COUNT = 4
const MIN_SPAN_FRACTION = 0.0005
const PADDING_FRACTION = 0.1
const LINE_WIDTH = 2
const HEAD_RADIUS = 4
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

function findShownPoints(points: LivePoint[], windowStart: number, windowEnd: number, headValue: number, startingValue: number | null) {
  const shownPoints: LivePoint[] = []
  let pointBeforeWindow: LivePoint | null = null

  for (const point of points) {
    if (point.time < windowStart) {
      pointBeforeWindow = point
    } else if (point.time <= windowEnd) {
      shownPoints.push(point)
    }
  }

  if (pointBeforeWindow !== null) {
    shownPoints.unshift(pointBeforeWindow)
  } else {
    const leftEdgeValue = startingValue ?? shownPoints[0]?.value ?? headValue
    shownPoints.unshift({ time: windowStart, value: leftEdgeValue })
  }

  shownPoints.push({ time: windowEnd, value: headValue })

  return holdUntilNextTrade(shownPoints)
}

function holdUntilNextTrade(points: LivePoint[]) {
  const heldPoints: LivePoint[] = []

  for (const point of points) {
    const previous = heldPoints[heldPoints.length - 1]

    if (previous !== undefined && point.time - previous.time > HOLD_GAP_MS) {
      heldPoints.push({ time: point.time - SECOND_MS, value: previous.value })
    }

    heldPoints.push(point)
  }

  return heldPoints
}

function findPriceRange(shownPoints: LivePoint[]) {
  let lowest = Infinity
  let highest = -Infinity

  for (const point of shownPoints) {
    lowest = Math.min(lowest, point.value)
    highest = Math.max(highest, point.value)
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

function pickLabelStep(plotWidth: number) {
  for (const labelStep of LABEL_STEPS_MS) {
    if ((plotWidth * labelStep) / WINDOW_MS >= MIN_LABEL_SPACING) {
      return labelStep
    }
  }

  return LABEL_STEPS_MS[LABEL_STEPS_MS.length - 1]
}

const LiveChart = ({ symbol, price }: Props) => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [now, setNow] = useState(() => Date.now())
  const [livePoints, setLivePoints] = useState<LivePoint[]>([])
  const [startingPrice, setStartingPrice] = useState(price)
  const lastPrice = useRef(price)
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

    function moveForward() {
      setNow(Date.now())
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

    lastPrice.current = price

    if (startingPrice === null) {
      setStartingPrice(price)
      return
    }
    const arrivedAt = Date.now() - LIVE_DELAY_MS

    setLivePoints(function (oldPoints) {
      const keptPoints = oldPoints.filter(function (point, index) {
        return point.time >= arrivedAt - KEEP_MS || index === oldPoints.length - 1
      })

      return [...keptPoints, { time: arrivedAt, value: price }]
    })
  }, [price, startingPrice])

  const allPoints = useMemo(() => {
    const firstLivePoint = livePoints[0]
    const earlierSeedPoints = (seedPoints ?? []).filter(function (point) {
      return firstLivePoint === undefined || point.time < firstLivePoint.time
    })

    return [...earlierSeedPoints, ...livePoints]
  }, [seedPoints, livePoints])

  let headValue = price

  if (allPoints.length > 0) {
    headValue = allPoints[allPoints.length - 1].value
  }

  const windowEnd = now - LIVE_DELAY_MS
  const windowStart = windowEnd - WINDOW_MS

  let startingValue = startingPrice

  if (seedPoints !== null && seedPoints.length > 0) {
    startingValue = null
  }

  let shownPoints: LivePoint[] = []
  let priceRange = [0, 1]

  if (headValue !== null) {
    shownPoints = findShownPoints(allPoints, windowStart, windowEnd, headValue, startingValue)
    priceRange = findPriceRange(shownPoints)
  }

  const yLabelValues = scaleLinear().domain(priceRange).ticks(Y_LABEL_COUNT)
  const decimals = findDecimals(yLabelValues)

  function formatPrice(value: number) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  const yLabels = yLabelValues.map(formatPrice)
  const yLabelKey = yLabels.join('|')
  const yLabelWidth = useMemo(() => measureWidestLabel(yLabelKey.split('|')), [yLabelKey])

  const plotLeft = MARGIN.left
  const plotRight = size.width - MARGIN.right - yLabelWidth - Y_LABEL_GAP
  const plotTop = MARGIN.top
  const plotBottom = size.height - MARGIN.bottom
  const plotWidth = Math.max(0, plotRight - plotLeft)

  const xScale = scaleTime().domain([windowStart, windowEnd]).range([plotLeft, plotRight])
  const yScale = scaleLinear().domain(priceRange).range([plotBottom, plotTop])

  const makePath = line<LivePoint>()
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
    const distanceFromEdge = Math.min(labelX - plotLeft, plotRight - labelX)
    const opacity = Math.min(1, Math.max(0, distanceFromEdge / EDGE_FADE))

    return (
      <text key={labelTime} className="live-label" x={labelX} y={plotBottom + 17} textAnchor="middle" opacity={opacity}>
        {clockFormat.format(labelTime)}
      </text>
    )
  }

  function renderYLabel(value: number, index: number) {
    const labelY = yScale(value)

    return (
      <g key={value}>
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

  return (
    <div ref={measureResize} className="chart-area">
      {size.width > 0 && (
        <svg width={size.width} height={size.height}>
          <defs>
            <clipPath id={clipId}>
              <rect x={plotLeft} y={0} width={plotWidth} height={size.height} />
            </clipPath>
          </defs>

          {yLabelValues.map(renderYLabel)}
          {xLabelTimes.map(renderXLabel)}

          <path className="live-line" d={path} clipPath={`url(#${clipId})`} fill="none" strokeWidth={LINE_WIDTH} />

          {headY !== null && <circle className="live-pulse" cx={plotRight} cy={headY} r={HEAD_RADIUS} />}
          {headY !== null && <circle className="chart-dot" cx={plotRight} cy={headY} r={HEAD_RADIUS} />}
        </svg>
      )}
    </div>
  )
}

export default LiveChart
