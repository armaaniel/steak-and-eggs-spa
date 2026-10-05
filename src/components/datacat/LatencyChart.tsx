import { useCallback, useLayoutEffect, useState, type MouseEvent } from 'react'
import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { HEIGHT, MARGIN, Y_LABEL_GAP, bucketAt, findWidestYLabel, findXLabels, timeScale, toChartBuckets, type Hover, type ChartBucket, type XLabel } from './bucketChart'
import type { ServiceBucket } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'
import '../../stylesheets/datacat/charts.css'

interface Props {
  buckets: ServiceBucket[]
  hover: Hover | null
  setHover: (hover: Hover | null) => void
  chartLeft: number
  setYLabelWidth: (width: number) => void
}

type Percentile = 'p99' | 'p50'

interface LatencyLine {
  key: Percentile
  color: string
}

const Y_LABEL_COUNT = 4

const LATENCY_LINES: LatencyLine[] = [
  { key: 'p99', color: 'var(--dc-latency-p99)' },
  { key: 'p50', color: 'var(--dc-latency-p50)' }
]

const DIMMED_OPACITY = 0.25

function formatYAxisDuration(ms: number) {
  return ms.toLocaleString('en-us', { maximumFractionDigits: 2 })
}

function formatLegendDuration(ms: number | null) {
  if (ms === null) {
    return '–'
  }

  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`
  }

  return `${ms.toLocaleString('en-us', { maximumFractionDigits: 0 })} ms`
}

function formatHoverTime(date: Date) {
  return date.toLocaleString('en-us', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
}

function findHighestLatency(chartBuckets: ChartBucket[], latencyLines: LatencyLine[]) {
	// for yAxis height
  let highestLatency = 0

  for (const chartBucket of chartBuckets) {
    for (const latencyLine of latencyLines) {
      highestLatency = Math.max(highestLatency, chartBucket[latencyLine.key] ?? 0)
    }
  }

  return highestLatency
}

function findActiveChartBucket(chartBuckets: ChartBucket[], hover: Hover | null) {
  if (hover === null) {
    return null
  }

  return chartBuckets[hover.index] ?? null
}

const LatencyChart = ({ buckets, hover, setHover, chartLeft, setYLabelWidth }: Props) => {
  const [width, setWidth] = useState(0)
  const [isolated, setIsolated] = useState<Percentile | null>(null)
  const [mouseY, setMouseY] = useState(0)

  function isShown(latencyLine: LatencyLine) {
    return isolated === null || isolated === latencyLine.key
  }

  const visibleLines = LATENCY_LINES.filter(isShown)

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

  const chartBuckets = toChartBuckets(buckets)

  const chartTop = MARGIN.top
  const chartBottom = HEIGHT - MARGIN.bottom

  const highestLatency = findHighestLatency(chartBuckets, visibleLines)

  let yMax = highestLatency

  if (highestLatency === 0) {
    yMax = 1
  }
	// scales data values to pixel position
  const yScale = scaleLinear().domain([0, yMax]).nice(Y_LABEL_COUNT).range([chartBottom, chartTop])

  const yLabelValues = yScale.ticks(Y_LABEL_COUNT)
  const yLabelWidth = findWidestYLabel(yLabelValues.map(formatYAxisDuration))

  useLayoutEffect(() => {
    setYLabelWidth(yLabelWidth)
  }, [yLabelWidth, setYLabelWidth])

  if (chartBuckets.length === 0) {
    return null
  }

  const chartRight = width - MARGIN.right
  const plotWidth = chartRight - chartLeft

  const xScale = timeScale(chartBuckets, chartLeft, chartRight)

  const firstBucket = chartBuckets[0]
  const lastBucket = chartBuckets[chartBuckets.length - 1]
  const [axisStart, axisEnd] = xScale.domain()
  const edgeToEdgeBuckets = [{ ...firstBucket, start: axisStart.getTime() }, ...chartBuckets, { ...lastBucket, start: axisEnd.getTime() }]

  function findPath(latencyLine: LatencyLine) {
    const makePath = line<ChartBucket>()
      .defined(function (chartBucket) {
        return chartBucket[latencyLine.key] !== null
      })
      .x(function (chartBucket) {
        return xScale(chartBucket.start)
      })
      .y(function (chartBucket) {
        return yScale(chartBucket[latencyLine.key] ?? 0)
      })

    return makePath(edgeToEdgeBuckets) ?? undefined
  }

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

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    setMouseY(event.clientY - svgBox.top)

    const hoveredIndex = bucketAt(event, chartBuckets, xScale)
    const hoveringThisChart = hover !== null && hover.chart === 'latency'

    if (hoveredIndex === null) {
      if (hoveringThisChart) {
        setHover(null)
      }

      return
    }

    if (!hoveringThisChart || hover.index !== hoveredIndex) {
      setHover({ chart: 'latency', index: hoveredIndex })
    }
  }

  function handlePointerLeave() {
    if (hover !== null && hover.chart === 'latency') {
      setHover(null)
    }
  }

  const activeChartBucket = findActiveChartBucket(chartBuckets, hover)
  const focused = activeChartBucket !== null && hover !== null && hover.chart === 'latency'

  let activeX = 0

  if (activeChartBucket !== null) {
    activeX = xScale(activeChartBucket.start)
  }

  let hoverTime = ''

  if (activeChartBucket !== null) {
    hoverTime = formatHoverTime(new Date(activeChartBucket.start))
  }

  let tooltipLine: LatencyLine | null = null
  let tooltipValue: number | null = null

  if (focused) {
    let nearestDistance = Infinity

    for (const latencyLine of visibleLines) {
      const value = activeChartBucket[latencyLine.key]

      if (value === null) {
        continue
      }

      const distance = Math.abs(yScale(value) - mouseY)

      if (distance < nearestDistance) {
        nearestDistance = distance
        tooltipLine = latencyLine
        tooltipValue = value
      }
    }
  }

  function findOpacity(latencyLine: LatencyLine) {
    if (tooltipLine !== null && tooltipLine.key !== latencyLine.key) {
      return DIMMED_OPACITY
    }

    return 1
  }

  function renderLine(latencyLine: LatencyLine) {
    return <path key={latencyLine.key} d={findPath(latencyLine)} fill="none" stroke={latencyLine.color} strokeWidth={1.5} strokeLinejoin="round" opacity={findOpacity(latencyLine)} />
  }

  function renderHoverDot(latencyLine: LatencyLine) {
    if (!focused || activeChartBucket === null) {
      return null
    }

    const value = activeChartBucket[latencyLine.key]

    if (value === null) {
      return null
    }

    return <circle key={latencyLine.key} cx={activeX} cy={yScale(value)} r={3.5} fill={latencyLine.color} stroke="var(--dc-surface)" strokeWidth={2} opacity={findOpacity(latencyLine)} />
  }

  function renderClickArea(latencyLine: LatencyLine) {
    function handleClick() {
      if (isolated === latencyLine.key) {
        setIsolated(null)
      } else {
        setIsolated(latencyLine.key)
      }
    }

    return <path key={latencyLine.key} d={findPath(latencyLine)} fill="none" stroke="transparent" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" pointerEvents="stroke" cursor="pointer" onClick={handleClick} />
  }

  function renderLegendEntry(latencyLine: LatencyLine) {
    let className = ''

    if (!isShown(latencyLine)) {
      className = 'off'
    }

    return (
      <span key={latencyLine.key} className={className}>
        <span className="dc-swatch" style={{ backgroundColor: latencyLine.color }} />
        {latencyLine.key}
        {activeChartBucket !== null && <strong>{formatLegendDuration(activeChartBucket[latencyLine.key])}</strong>}
      </span>
    )
  }

  const tooltipStyle = {
    left: activeX,
    top: mouseY,
    transform: 'translate(-50%, calc(-100% - 10px))'
  }

  return (
    <>
      <div className="dc-chart-header" style={{ paddingRight: MARGIN.right }}>
        <p className="lr-panel-label">Latency (ms)</p>
        <div className="dc-legend">
          {LATENCY_LINES.map(renderLegendEntry)}
          {activeChartBucket !== null && <span className="dc-hover-time">{hoverTime}</span>}
        </div>
      </div>
      <div ref={measureResize} className="dc-chart">
        <svg width={width} height={HEIGHT} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
          {yLabelValues.map(renderGridline)}
          {xLabels.map(renderXLabel)}

          {activeChartBucket !== null && (
            <line x1={activeX} x2={activeX} y1={chartTop} y2={chartBottom} stroke="var(--dc-border-strong)" />
          )}

          {visibleLines.map(renderLine)}
          {visibleLines.map(renderHoverDot)}
          {visibleLines.map(renderClickArea)}
        </svg>

        {tooltipLine !== null && (
          <div className="dc-tooltip" style={tooltipStyle}>
            <p className="dc-tooltip-name">
              <span className="dc-swatch" style={{ backgroundColor: tooltipLine.color }} />
              {tooltipLine.key}
            </p>
            <strong>{formatLegendDuration(tooltipValue)}</strong>
          </div>
        )}
      </div>
    </>
  )
}

export default LatencyChart
