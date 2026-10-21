import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from 'react'
import { scaleLinear, scaleTime } from 'd3-scale'
import { curveMonotoneX, line } from 'd3-shape'
import useApi from '../hooks/useApi'
import LiveAxis, { type AxisLabel } from './LiveAxis'
import { blendColumns, easeLikeCss, lineUpColumns, prefersReducedMotion, type ScreenPoint } from '../hooks/useMorphingPoints'
import '../stylesheets/chart.css'
import type { ChartData } from '../lib/types.ts'

interface Props {
  seriesKey: string
  seedPath: string | null
  price: number | null
  onHover?: (point: ChartData | null) => void
  startingLine?: ScreenPoint[] | null
  shownSnapshotRef?: RefObject<LiveSnapshot | null>
}

export interface LiveSnapshot {
  line: ScreenPoint[]
  xLabels: AxisLabel[]
  yLabels: AxisLabel[]
  plotLeft: number
  plotRight: number
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

interface Series {
  seedPoints: LivePoint[]
  livePoints: LivePoint[]
  startingPrice: number | null
}

interface Morph {
  fromSeries: Series | null
  fromLine: ScreenPoint[] | null
  startedAt: number | null
}

interface Drawing {
  drawnPoints: LinePoint[]
  priceRange: number[]
  yLabelValues: number[]
  yLabels: string[]
}

const LIVE_DELAY_MS = 902_000
const CHART_WINDOW = 60_000
const CHART_HISTORY = CHART_WINDOW * 2
const HOLD_GAP_MS = 1500
const SECOND_MS = 1000
const MORPH_MS = 300
const LABEL_SWAP_POINT = 0.5
const GLIDE_MS = 400
const FRAMES_PER_SECOND = 30
const ANIMATING_FRAMES_PER_SECOND = 60
const FRAME_TOLERANCE_MS = 4
const DRAW_COOLDOWN_MS = (1000 / FRAMES_PER_SECOND) - FRAME_TOLERANCE_MS
const ANIMATING_DRAW_COOLDOWN_MS = (1000 / ANIMATING_FRAMES_PER_SECOND) - FRAME_TOLERANCE_MS
const LABEL_INTERVALS = [10_000, 20_000, 30_000, 60_000]
const MIN_LABEL_SPACING = 72
const EDGE_FADE = 20
const Y_EDGE_FADE = 12
const MARGIN = { top: 28, right: 5, bottom: 24, left: 5 }
const Y_LABEL_GAP = 12
const Y_LABEL_COUNT = 5
const MIN_RANGE_FRACTION = 0.0005
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
  const overshoot = 1.55
  const shifted = progress - 1

  return 1 + (overshoot + 1) * Math.pow(shifted, 3) + overshoot * Math.pow(shifted, 2)
}

function findShownValue(point: LivePoint, windowEnd: number) {
  if (point.from === undefined) {
    return point.value
  }

  const progress = Math.min(1, Math.max(0, (windowEnd - point.time) / GLIDE_MS))

  return point.from + (point.value - point.from) * easeOut(progress)
}

function getDrawnPoints(points: LivePoint[], windowStart: number, windowEnd: number, headValue: number, headPrice: number, startingValue: number | null) {
  const drawnPoints: LinePoint[] = []
  let pointBeforeWindow: LinePoint | null = null

  for (const point of points) {
    const drawnPoint = { time: point.time, value: findShownValue(point, windowEnd), price: point.value }

    if (point.time < windowStart) {
      pointBeforeWindow = drawnPoint
    } else if (point.time <= windowEnd) {
      drawnPoints.push(drawnPoint)
    }
  }

  if (pointBeforeWindow !== null) {
    drawnPoints.unshift(pointBeforeWindow)
  } else {
    const leftEdgeValue = startingValue ?? drawnPoints[0]?.value ?? headValue
    drawnPoints.unshift({ time: windowStart - CHART_WINDOW, value: leftEdgeValue, price: leftEdgeValue })
  }

  drawnPoints.push({ time: windowEnd, value: headValue, price: headPrice })

  return holdUntilNextTrade(drawnPoints)
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

function getPriceAtLeftEdge(drawnPoints: LinePoint[], windowStart: number) {
  let firstVisibleIndex = 1

  while (drawnPoints[firstVisibleIndex].time < windowStart) {
    firstVisibleIndex += 1
  }

  const pointBefore = drawnPoints[firstVisibleIndex - 1]
  const firstVisiblePoint = drawnPoints[firstVisibleIndex]

  const timeSincePointBefore = windowStart - pointBefore.time
  const timeBetweenPoints = firstVisiblePoint.time - pointBefore.time
  const progress = Math.max(0, timeSincePointBefore / timeBetweenPoints)

  const priceChange = firstVisiblePoint.value - pointBefore.value

  return pointBefore.value + priceChange * progress
}

function findPriceRange(drawnPoints: LinePoint[], windowStart: number) {
  let lowest = getPriceAtLeftEdge(drawnPoints, windowStart)
  let highest = lowest

  for (const point of drawnPoints) {
    if (point.time >= windowStart) {
      lowest = Math.min(lowest, point.value)
      highest = Math.max(highest, point.value)
    }
  }

  const minimumRange = Math.abs(highest) * MIN_RANGE_FRACTION

  const currentRange = highest - lowest
  const rangeIsTooSmall = currentRange < minimumRange

  if (rangeIsTooSmall) {
    const middlePrice = (highest + lowest) / 2
    const halfOfMinimum = minimumRange / 2

    lowest = middlePrice - halfOfMinimum
    highest = middlePrice + halfOfMinimum
  }

  const padding = (highest - lowest) * PADDING_FRACTION

  return [lowest - padding, highest + padding]
}

function findDecimals(labelValues: number[]) {
  if (labelValues.length < 2) {
    return 2
  }

  const step = labelValues[1] - labelValues[0]

  const decimalsNeeded = Math.ceil(-Math.log10(step))
  const atLeastTwo = Math.max(2, decimalsNeeded)
  const atMostSix = Math.min(6, atLeastTwo)

  return atMostSix
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

function getLabelInterval(plotWidth: number) {
  for (const labelInterval of LABEL_INTERVALS) {
    if ((plotWidth * labelInterval) / CHART_WINDOW >= MIN_LABEL_SPACING) {
      return labelInterval
    }
  }

  return LABEL_INTERVALS[LABEL_INTERVALS.length - 1]
}

const NO_SEED: LivePoint[] = []

function findSeriesPoints(series: Series) {
  const firstLivePoint = series.livePoints[0]
  const earlierSeedPoints = series.seedPoints.filter(function (point) {
    return firstLivePoint === undefined || point.time < firstLivePoint.time
  })

  return [...earlierSeedPoints, ...series.livePoints]
}

function makeDrawing(series: Series, windowStart: number, windowEnd: number): Drawing | null {
  const allPoints = findSeriesPoints(series)
  const lastPoint = allPoints[allPoints.length - 1]

  let headValue = series.startingPrice
  let headPrice = series.startingPrice

  if (lastPoint !== undefined) {
    headValue = findShownValue(lastPoint, windowEnd)
    headPrice = lastPoint.value
  }

  if (headValue === null || headPrice === null) {
    return null
  }

  let startingValue = series.startingPrice

  if (series.seedPoints.length > 0) {
    startingValue = null
  }

  const drawnPoints = getDrawnPoints(allPoints, windowStart, windowEnd, headValue, headPrice, startingValue)
  const priceRange = findPriceRange(drawnPoints, windowStart)
  const yLabelValues = scaleLinear().domain(priceRange).ticks(Y_LABEL_COUNT)
  const decimals = findDecimals(yLabelValues)

  function formatPrice(value: number) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  return { drawnPoints, priceRange, yLabelValues, yLabels: yLabelValues.map(formatPrice) }
}

function findMorphProgress(morph: Morph, now: number) {
  if (morph.startedAt === null) {
    return 0
  }

  if (prefersReducedMotion()) {
    return 1
  }

  return Math.min(1, Math.max(0, (now - morph.startedAt) / MORPH_MS))
}

function findOldLabelOpacity(morphProgress: number) {
  const fadeOutProgress = Math.min(1, morphProgress / LABEL_SWAP_POINT)

  return 1 - fadeOutProgress
}

function findNewLabelOpacity(morphProgress: number) {
  const fadeInProgress = (morphProgress - LABEL_SWAP_POINT) / (1 - LABEL_SWAP_POINT)

  return Math.min(1, Math.max(0, fadeInProgress))
}

function makeStartingMorph(price: number | null, startingLine: ScreenPoint[] | null): Morph {
  if (startingLine !== null && startingLine.length > 0) {
    return { fromSeries: null, fromLine: startingLine, startedAt: null }
  }

  return { fromSeries: { seedPoints: [], livePoints: [], startingPrice: price }, fromLine: null, startedAt: null }
}

function findPointAtX(before: ScreenPoint, after: ScreenPoint, x: number) {
  const progress = (x - before.x) / (after.x - before.x)

  return { x, y: before.y + (after.y - before.y) * progress }
}

function trimToPlot(points: ScreenPoint[], plotLeft: number, plotRight: number) {
  const trimmedPoints: ScreenPoint[] = []

  for (let index = 0; index < points.length; index++) {
    const point = points[index]
    const previousPoint = points[index - 1]

    if (previousPoint !== undefined && previousPoint.x < plotLeft && point.x > plotLeft) {
      trimmedPoints.push(findPointAtX(previousPoint, point, plotLeft))
    }

    if (point.x >= plotLeft && point.x <= plotRight) {
      trimmedPoints.push(point)
    }

    if (previousPoint !== undefined && previousPoint.x < plotRight && point.x > plotRight) {
      trimmedPoints.push(findPointAtX(previousPoint, point, plotRight))
    }
  }

  return trimmedPoints
}

function findAnimationEnd(livePoints: LivePoint[], morph: Morph | null) {
  let animationEnd = 0
  const lastLivePoint = livePoints[livePoints.length - 1]

  if (lastLivePoint !== undefined && lastLivePoint.from !== undefined) {
    animationEnd = lastLivePoint.time + LIVE_DELAY_MS + GLIDE_MS
  }

  if (morph !== null && morph.startedAt !== null) {
    animationEnd = Math.max(animationEnd, morph.startedAt + MORPH_MS)
  }

  return animationEnd
}

function findBlend(morphProgress: number) {
  if (morphProgress <= 0) {
    return 0
  }

  if (morphProgress >= 1) {
    return 1
  }

  return easeLikeCss(morphProgress)
}

const makeScreenPath = line<ScreenPoint>()
  .x(function (point) {
    return point.x
  })
  .y(function (point) {
    return point.y
  })
  .curve(curveMonotoneX)

const LiveChart = ({ seriesKey, seedPath, price, onHover, startingLine = null, shownSnapshotRef }: Props) => {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [now, setNow] = useState(() => Date.now())
  const [shownSeriesKey, setShownSeriesKey] = useState(seriesKey)
  const [shownSeedPath, setShownSeedPath] = useState(seedPath)
  const [livePoints, setLivePoints] = useState<LivePoint[]>([])
  const [startingPrice, setStartingPrice] = useState(price)
  const [morph, setMorph] = useState<Morph | null>(() => makeStartingMorph(price, startingLine))
  const [pointerX, setPointerX] = useState<number | null>(null)
  const [labelWidth, setLabelWidth] = useState(0)
  const lastPrice = useRef(price)
  const animatingUntil = useRef(0)
  const labelRef = useRef<HTMLDivElement>(null)
  const clipId = `live-clip-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const { data: loadedSeed, loadedPath: loadedSeedPath } = useApi<LivePoint[]>(seedPath, [])

  let seedPoints: LivePoint[] | null = null

  if (shownSeedPath === null) {
    seedPoints = NO_SEED
  } else if (loadedSeed !== null && loadedSeedPath === shownSeedPath) {
    seedPoints = loadedSeed
  }

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

  useEffect(() => {
    let nextFrameRun = 0
    let lastDrawn = 0

    function findDrawCooldown() {
      if (Date.now() < animatingUntil.current) {
        return ANIMATING_DRAW_COOLDOWN_MS
      }

      return DRAW_COOLDOWN_MS
    }

    function rafLoop(timeSincePageLoad: number) {
      if (timeSincePageLoad - lastDrawn >= findDrawCooldown()) {
        lastDrawn = timeSincePageLoad
        setNow(Date.now())
      }

      nextFrameRun = requestAnimationFrame(rafLoop)
    }

    nextFrameRun = requestAnimationFrame(rafLoop)

    return function stopRafLoop() {
      cancelAnimationFrame(nextFrameRun)
    }
  }, [])

  useEffect(() => {
    if (seriesKey === shownSeriesKey) {
      return
    }

    let nextMorph: Morph = { fromSeries: { seedPoints: seedPoints ?? [], livePoints, startingPrice }, fromLine: null, startedAt: null }

    if (morph !== null && morph.startedAt === null) {
      nextMorph = morph
    }

    setMorph(nextMorph)
    setShownSeriesKey(seriesKey)
    setShownSeedPath(seedPath)
    setLivePoints([])
    setStartingPrice(price)
    lastPrice.current = price
  }, [seriesKey, shownSeriesKey, seedPath, seedPoints, livePoints, startingPrice, morph, price])

  useEffect(() => {
    if (seedPoints === null) {
      return
    }

    setMorph(function (oldMorph) {
      if (oldMorph === null || oldMorph.startedAt !== null) {
        return oldMorph
      }

      return { fromSeries: oldMorph.fromSeries, fromLine: oldMorph.fromLine, startedAt: Date.now() }
    })
  }, [seedPoints])

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
        return point.time >= arrivedAt - CHART_HISTORY || index === oldPoints.length - 1
      })

      return [...keptPoints, { time: arrivedAt, value: price, from }]
    })
  }, [price, startingPrice, seedPoints])

  const animationEnd = findAnimationEnd(livePoints, morph)

  useEffect(() => {
    animatingUntil.current = animationEnd
  }, [animationEnd])

  const windowEnd = now - LIVE_DELAY_MS
  const windowStart = windowEnd - CHART_WINDOW

  let morphProgress = 1

  if (morph !== null) {
    morphProgress = findMorphProgress(morph, now)
  }

  const morphFinished = morph !== null && morphProgress >= 1

  useEffect(() => {
    if (morphFinished) {
      setMorph(null)
    }
  }, [morphFinished])

  const blend = findBlend(morphProgress)
  const currentDrawing = makeDrawing({ seedPoints: seedPoints ?? [], livePoints, startingPrice }, windowStart, windowEnd)

  let fromDrawing: Drawing | null = null
  let fromLine: ScreenPoint[] | null = null

  if (morph !== null && morphProgress < 1) {
    fromLine = morph.fromLine

    if (morph.fromSeries !== null) {
      fromDrawing = makeDrawing(morph.fromSeries, windowStart, windowEnd)
    }
  }

  let currentOpacity = 1

  if (morph !== null) {
    currentOpacity = blend
  }

  let fromLabelOpacity = 1 - blend
  let currentLabelOpacity = currentOpacity

  if (fromDrawing !== null && currentDrawing !== null) {
    fromLabelOpacity = findOldLabelOpacity(morphProgress)
    currentLabelOpacity = findNewLabelOpacity(morphProgress)
  }

  let currentLabelKey = ''

  if (currentDrawing !== null) {
    currentLabelKey = currentDrawing.yLabels.join('|')
  }

  let fromLabelKey = ''

  if (fromDrawing !== null) {
    fromLabelKey = fromDrawing.yLabels.join('|')
  }

  const currentLabelWidth = useMemo(() => measureWidestLabel(currentLabelKey.split('|')), [currentLabelKey])
  const fromLabelWidth = useMemo(() => measureWidestLabel(fromLabelKey.split('|')), [fromLabelKey])
  const halfXLabelWidth = useMemo(() => measureWidestLabel([clockFormat.format(0)]) / 2, [])

  let yLabelWidth = currentLabelWidth
  let yLabelGap = Y_LABEL_GAP

  if (fromLine !== null) {
    yLabelWidth = currentLabelWidth * blend
    yLabelGap = Y_LABEL_GAP * blend
  } else if (fromDrawing !== null && currentDrawing !== null) {
    yLabelWidth = fromLabelWidth + (currentLabelWidth - fromLabelWidth) * blend
  } else if (fromDrawing !== null) {
    yLabelWidth = fromLabelWidth
  }

  const plotLeft = MARGIN.left
  const plotRight = size.width - MARGIN.right - yLabelWidth - yLabelGap
  const plotTop = MARGIN.top
  const plotBottom = size.height - MARGIN.bottom
  const plotWidth = Math.max(0, plotRight - plotLeft)

  const xScale = scaleTime().domain([windowStart, windowEnd]).range([plotLeft, plotRight])

  function makeYScale(drawing: Drawing) {
    return scaleLinear().domain(drawing.priceRange).range([plotBottom, plotTop])
  }

  function placeOnScreen(drawing: Drawing) {
    const yScale = makeYScale(drawing)

    return drawing.drawnPoints.map(function (point) {
      return { x: xScale(point.time), y: yScale(point.value) }
    })
  }

  let shownPoints: ScreenPoint[] = []
  let lineOpacity = 1

  if (fromLine !== null && currentDrawing !== null) {
    const columns = lineUpColumns(fromLine, placeOnScreen(currentDrawing))
    shownPoints = blendColumns(columns, blend)
  } else if (fromLine !== null) {
    shownPoints = fromLine
    lineOpacity = 1 - blend
  } else if (fromDrawing !== null && currentDrawing !== null) {
    const columns = lineUpColumns(placeOnScreen(fromDrawing), placeOnScreen(currentDrawing))
    shownPoints = blendColumns(columns, blend)
  } else if (fromDrawing !== null) {
    shownPoints = placeOnScreen(fromDrawing)
    lineOpacity = 1 - blend
  } else if (currentDrawing !== null) {
    shownPoints = placeOnScreen(currentDrawing)
    lineOpacity = currentOpacity
  }

  const path = makeScreenPath(shownPoints) ?? undefined


  let headOpacity = lineOpacity
  let xLabelOpacity = 1

  if (fromLine !== null) {
    headOpacity = blend
    xLabelOpacity = blend
  }

  let headY: number | null = null
  const headPoint = shownPoints[shownPoints.length - 1]

  if (headPoint !== undefined) {
    headY = headPoint.y
  }

  const labelInterval = getLabelInterval(plotWidth)
  const firstLabelTime = Math.ceil(windowStart / labelInterval) * labelInterval
  const xLabelTimes: number[] = []

  let labelTime = firstLabelTime

  while (labelTime <= windowEnd) {
    xLabelTimes.push(labelTime)
    labelTime += labelInterval
  }

  function makeXLabel(labelTime: number): AxisLabel {
    const labelX = xScale(labelTime)
    const distanceFromEdge = Math.min(labelX - plotLeft, plotRight - labelX) - halfXLabelWidth
    const edgeOpacity = Math.min(1, Math.max(0, distanceFromEdge / EDGE_FADE))

    return { key: String(labelTime), text: clockFormat.format(labelTime), x: labelX, y: plotBottom + 17, opacity: edgeOpacity * xLabelOpacity }
  }

  function makeYLabels(drawing: Drawing, opacity: number, keyPrefix: string) {
    const yScale = makeYScale(drawing)

    function makeYLabel(value: number, index: number): AxisLabel {
      const labelY = yScale(value)
      const distanceFromEdge = Math.min(labelY - plotTop, plotBottom - labelY)
      const edgeOpacity = Math.min(1, Math.max(0, distanceFromEdge / Y_EDGE_FADE))

      return { key: `${keyPrefix}-${value}`, text: drawing.yLabels[index], x: plotRight + yLabelGap, y: labelY, opacity: edgeOpacity * opacity }
    }

    return drawing.yLabelValues.map(makeYLabel)
  }

  const xLabels = xLabelTimes.map(makeXLabel)
  let yLabels: AxisLabel[] = []

  if (fromDrawing !== null && fromLabelOpacity > 0) {
    yLabels = [...yLabels, ...makeYLabels(fromDrawing, fromLabelOpacity, 'from')]
  }

  if (currentDrawing !== null && currentLabelOpacity > 0) {
    yLabels = [...yLabels, ...makeYLabels(currentDrawing, currentLabelOpacity, 'current')]
  }

  useEffect(() => {
    if (shownSnapshotRef === undefined) {
      return
    }

    shownSnapshotRef.current = { line: trimToPlot(shownPoints, plotLeft, plotRight), xLabels, yLabels, plotLeft, plotRight }
  })

  useEffect(() => {
    if (shownSnapshotRef === undefined) {
      return
    }

    return function forgetSnapshot() {
      shownSnapshotRef.current = null
    }
  }, [shownSnapshotRef])

  let hoveredPoint: LinePoint | null = null
  let hoveredY = 0

  if (pointerX !== null && morph === null && currentDrawing !== null) {
    hoveredPoint = findNearestPoint(currentDrawing.drawnPoints, windowStart, xScale.invert(pointerX).getTime())

    if (hoveredPoint !== null) {
      hoveredY = makeYScale(currentDrawing)(hoveredPoint.value)
    }
  }

  let hoveredLabel: string | null = null
  let hoveredPrice: number | null = null
  let hoveredX = 0
  let labelX = 0

  if (hoveredPoint !== null) {
    hoveredLabel = clockFormat.format(hoveredPoint.time)
    hoveredPrice = hoveredPoint.price
    hoveredX = xScale(hoveredPoint.time)

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
      {size.width > 0 && headY !== null && headOpacity === 1 && <div className="live-pulse" style={{ left: plotRight, top: headY }} />}

      {size.width > 0 && (
        <svg width={size.width} height={size.height} onPointerDown={handlePointerMove} onPointerMove={handlePointerMove} onPointerLeave={clearPointer}>
          <defs>
            <clipPath id={clipId}>
              <rect x={plotLeft} y={0} width={plotWidth} height={size.height} />
            </clipPath>
          </defs>

          <LiveAxis xLabels={xLabels} yLabels={yLabels} plotLeft={plotLeft} plotRight={plotRight} />

          <path className="live-line" d={path} clipPath={`url(#${clipId})`} fill="none" strokeWidth={LINE_WIDTH} opacity={lineOpacity} />

          {hoveredPoint !== null && <line className="chart-cursor" x1={hoveredX} x2={hoveredX} y1={plotTop} y2={plotBottom} />}

          {headY !== null && <circle className="chart-dot" cx={plotRight} cy={headY} r={HEAD_RADIUS} opacity={headOpacity} />}

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
