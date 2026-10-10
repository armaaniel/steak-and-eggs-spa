import { useCallback, useId, useMemo, useState, type MouseEvent } from 'react'
import { scaleTime } from 'd3-scale'
import { MARGIN } from './bucketChart'
import { formatHoverTime } from './timeSeries'
import { toDuration } from '../../lib/utils.ts'
import type { IngesterSpan } from '../../lib/types.ts'
import '../../stylesheets/datacat/charts.css'

interface Props {
  spans: IngesterSpan[]
  from: number
  to: number
  chartLeft: number
  hoveredTime: number | null
  setHoveredTime: (time: number | null) => void
  pinnedTime?: number | null
  setPinnedTime?: (time: number | null) => void
}

interface PlacedSpan {
  start: number
  end: number
  state: string
}

const HEIGHT = 28
const CORNER_RADIUS = 4
const TOOLTIP_TRANSFORM = 'translate(-50%, calc(-100% - 6px))'
const TOUCHING_MS = 1000

function spanState(state: string) {
  if (state === 'streaming') {
    return 'streaming'
  }

  if (state === 'idle') {
    return 'idle'
  }

  return 'down'
}

function formatStretch(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)

  if (minutes >= 1 && minutes < 60) {
    return `${minutes}m`
  }

  return toDuration(seconds)
}

function mergeSpans(spans: IngesterSpan[]) {
  const placedSpans: PlacedSpan[] = []

  for (const span of spans) {
    const start = new Date(span.at).getTime()
    const end = start + span.seconds * 1000
    const previous = placedSpans[placedSpans.length - 1]

    if (previous !== undefined && previous.state === span.state && Math.abs(start - previous.end) <= TOUCHING_MS) {
      previous.end = end
    } else {
      placedSpans.push({ start, end, state: span.state })
    }
  }

  return placedSpans
}

function findSpanAt(placedSpans: PlacedSpan[], time: number) {
  for (const placedSpan of placedSpans) {
    if (placedSpan.start <= time && time < placedSpan.end) {
      return placedSpan
    }
  }

  return null
}

const IngesterTimeline = ({ spans, from, to, chartLeft, hoveredTime, setHoveredTime, pinnedTime = null, setPinnedTime }: Props) => {
  const [width, setWidth] = useState(0)
  const [pointerOver, setPointerOver] = useState(false)

  const clipId = useId()

  const measureResize = useCallback((timelineDiv: HTMLDivElement | null) => {
    if (timelineDiv === null) {
      return
    }

    function handleResize(entries: ResizeObserverEntry[]) {
      const newWidth = Math.floor(entries[0].contentRect.width)
      setWidth(newWidth)
    }

    const observer = new ResizeObserver(handleResize)
    observer.observe(timelineDiv)

    return function stopMeasuring() {
      observer.disconnect()
    }
  }, [])

  const chartRight = width - MARGIN.right
  const plotWidth = Math.max(0, chartRight - chartLeft)

  const xScale = scaleTime().domain([from, to]).range([chartLeft, chartRight])
  const placedSpans = useMemo(() => mergeSpans(spans), [spans])

  function renderSpan(placedSpan: PlacedSpan) {
    const spanLeft = xScale(Math.max(placedSpan.start, from))
    const spanRight = xScale(Math.min(placedSpan.end, to))

    return (
      <rect
        key={placedSpan.start}
        className={`ing-span ${spanState(placedSpan.state)}`}
        x={spanLeft}
        y={0}
        width={Math.max(0, spanRight - spanLeft)}
        height={HEIGHT}
      />
    )
  }

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    const mouseX = event.clientX - svgBox.left

    if (mouseX < chartLeft || mouseX > chartRight) {
      setHoveredTime(null)
      setPointerOver(false)
      return
    }

    setHoveredTime(xScale.invert(mouseX).getTime())
    setPointerOver(true)
  }

  function handlePointerLeave() {
    setHoveredTime(null)
    setPointerOver(false)
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

    if (mouseX < chartLeft || mouseX > chartRight) {
      return
    }

    setPinnedTime(xScale.invert(mouseX).getTime())
  }

  let svgCursor: string | undefined = undefined

  if (setPinnedTime !== undefined) {
    svgCursor = 'pointer'
  }

  let cursorX: number | null = null

  if (hoveredTime !== null && hoveredTime >= from && hoveredTime <= to) {
    cursorX = xScale(hoveredTime)
  }

  let hoveredSpan: PlacedSpan | null = null

  if (pointerOver && hoveredTime !== null) {
    hoveredSpan = findSpanAt(placedSpans, hoveredTime)
  }

  return (
    <div ref={measureResize} className="ing-timeline">
      <svg width={width} height={HEIGHT} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} onClick={handleClick} style={{ cursor: svgCursor }} shapeRendering="crispEdges">
        <defs>
          <clipPath id={clipId}>
            <rect x={chartLeft} y={0} width={plotWidth} height={HEIGHT} rx={CORNER_RADIUS} />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect className="ing-span idle" x={chartLeft} y={0} width={plotWidth} height={HEIGHT} />
          {placedSpans.map(renderSpan)}
        </g>

        {pinnedX !== null && <line x1={pinnedX} x2={pinnedX} y1={0} y2={HEIGHT} stroke="var(--dc-border-strong)" />}
        {cursorX !== null && <line x1={cursorX} x2={cursorX} y1={0} y2={HEIGHT} stroke="var(--dc-border-strong)" />}
      </svg>

      {hoveredSpan !== null && hoveredTime !== null && cursorX !== null && (
        <div className="dc-tooltip" style={{ left: cursorX, top: 0, transform: TOOLTIP_TRANSFORM }}>
          <p className="dc-tooltip-time">{formatHoverTime(hoveredTime)}</p>
          <strong>
            {hoveredSpan.state} for {formatStretch(hoveredTime - hoveredSpan.start)} out of {formatStretch(hoveredSpan.end - hoveredSpan.start)}
          </strong>
        </div>
      )}
    </div>
  )
}

export default IngesterTimeline
