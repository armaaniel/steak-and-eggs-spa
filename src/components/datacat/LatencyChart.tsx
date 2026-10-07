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

const Y_LABEL_COUNT = 4

const P99_COLOR = 'var(--dc-latency-p99)'
const P50_COLOR = 'var(--dc-latency-p50)'

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

function findHighestLatency(chartBuckets: ChartBucket[], includeP99: boolean, includeP50: boolean) {
	// for yAxis height
  let highestLatency = 0

  for (const chartBucket of chartBuckets) {
    if (includeP99) {
      highestLatency = Math.max(highestLatency, chartBucket.p99 ?? 0)
    }

    if (includeP50) {
      highestLatency = Math.max(highestLatency, chartBucket.p50 ?? 0)
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

  const showP99 = isolated === null || isolated === 'p99'
  const showP50 = isolated === null || isolated === 'p50'

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

  const highestLatency = findHighestLatency(chartBuckets, showP99, showP50)

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

  const makeP99Path = line<ChartBucket>()
    .defined(function (chartBucket) {
      return chartBucket.p99 !== null
    })
    .x(function (chartBucket) {
      return xScale(chartBucket.start)
    })
    .y(function (chartBucket) {
      return yScale(chartBucket.p99 ?? 0)
    })

  const makeP50Path = line<ChartBucket>()
    .defined(function (chartBucket) {
      return chartBucket.p50 !== null
    })
    .x(function (chartBucket) {
      return xScale(chartBucket.start)
    })
    .y(function (chartBucket) {
      return yScale(chartBucket.p50 ?? 0)
    })

  const firstBucket = chartBuckets[0]
  const lastBucket = chartBuckets[chartBuckets.length - 1]
  const [axisStart, axisEnd] = xScale.domain()
  const edgeToEdgeBuckets = [{ ...firstBucket, start: axisStart.getTime() }, ...chartBuckets, { ...lastBucket, start: axisEnd.getTime() }]

  const p99Path = makeP99Path(edgeToEdgeBuckets) ?? undefined
  const p50Path = makeP50Path(edgeToEdgeBuckets) ?? undefined

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

  function handleP99Click() {
    if (isolated === 'p99') {
      setIsolated(null)
    } else {
      setIsolated('p99')
    }
  }

  function handleP50Click() {
    if (isolated === 'p50') {
      setIsolated(null)
    } else {
      setIsolated('p50')
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

  let tooltipLine: Percentile | null = null

  if (focused) {
    let p99Distance = Infinity
    let p50Distance = Infinity

    if (showP99 && activeChartBucket.p99 !== null) {
      p99Distance = Math.abs(yScale(activeChartBucket.p99) - mouseY)
    }

    if (showP50 && activeChartBucket.p50 !== null) {
      p50Distance = Math.abs(yScale(activeChartBucket.p50) - mouseY)
    }

    if (p99Distance !== Infinity && p99Distance <= p50Distance) {
      tooltipLine = 'p99'
    } else if (p50Distance !== Infinity) {
      tooltipLine = 'p50'
    }
  }

  let p99Opacity = 1
  let p50Opacity = 1

  if (tooltipLine === 'p99') {
    p50Opacity = DIMMED_OPACITY
  }

  if (tooltipLine === 'p50') {
    p99Opacity = DIMMED_OPACITY
  }

  let tooltipColor = P99_COLOR
  let tooltipValue: number | null = null

  if (activeChartBucket !== null && tooltipLine === 'p99') {
    tooltipColor = P99_COLOR
    tooltipValue = activeChartBucket.p99
  }

  if (activeChartBucket !== null && tooltipLine === 'p50') {
    tooltipColor = P50_COLOR
    tooltipValue = activeChartBucket.p50
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
          {activeChartBucket !== null && <span className="dc-hover-time">{hoverTime}</span>}
          <span className={showP99 ? '' : 'off'}>
            <span className="dc-swatch" style={{ backgroundColor: P99_COLOR }} />
            p99
            {activeChartBucket !== null && <strong>{formatLegendDuration(activeChartBucket.p99)}</strong>}
          </span>
          <span className={showP50 ? '' : 'off'}>
            <span className="dc-swatch" style={{ backgroundColor: P50_COLOR }} />
            p50
            {activeChartBucket !== null && <strong>{formatLegendDuration(activeChartBucket.p50)}</strong>}
          </span>
        </div>
      </div>
      <div ref={measureResize} className="dc-chart">
        <svg width={width} height={HEIGHT} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
          {yLabelValues.map(renderGridline)}
          {xLabels.map(renderXLabel)}

          {activeChartBucket !== null && (
            <line x1={activeX} x2={activeX} y1={chartTop} y2={chartBottom} stroke="var(--dc-border-strong)" />
          )}

          {showP99 && <path d={p99Path} fill="none" stroke={P99_COLOR} strokeWidth={1.5} strokeLinejoin="round" opacity={p99Opacity} />}

          {showP50 && <path d={p50Path} fill="none" stroke={P50_COLOR} strokeWidth={1.5} strokeLinejoin="round" opacity={p50Opacity} />}

          {focused && showP99 && activeChartBucket.p99 !== null && <circle cx={activeX} cy={yScale(activeChartBucket.p99)} r={3.5} fill={P99_COLOR} stroke="var(--dc-surface)" strokeWidth={2} opacity={p99Opacity} />}

          {focused && showP50 && activeChartBucket.p50 !== null && <circle cx={activeX} cy={yScale(activeChartBucket.p50)} r={3.5} fill={P50_COLOR} stroke="var(--dc-surface)" strokeWidth={2} opacity={p50Opacity} />}

          {showP99 && <path d={p99Path} fill="none" stroke="transparent" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" pointerEvents="stroke" cursor="pointer" onClick={handleP99Click} />}

          {showP50 && <path d={p50Path} fill="none" stroke="transparent" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" pointerEvents="stroke" cursor="pointer" onClick={handleP50Click} />}
        </svg>

        {tooltipLine !== null && (
          <div className="dc-tooltip" style={tooltipStyle}>
            <p className="dc-tooltip-name">
              <span className="dc-swatch" style={{ backgroundColor: tooltipColor }} />
              {tooltipLine}
            </p>
            <strong>{formatLegendDuration(tooltipValue)}</strong>
          </div>
        )}
      </div>
    </>
  )
}

export default LatencyChart
