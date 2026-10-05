import { useCallback, useLayoutEffect, useState, type MouseEvent } from 'react'
import { scaleLinear } from 'd3-scale'
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
  selectedBucket: ServiceBucket | null
  selectBucket: (bucket: ServiceBucket) => void
}

interface TooltipRow {
  name: string
  color: string
  value: number
}

const Y_LABEL_COUNT = 4

const FEW_BARS = 13
const MANY_BARS = 26
const FEW_BARS_PADDING = 0.77
const MANY_BARS_PADDING = 0.55

const OK_COLOR = '#8E87C2'
const ERROR_COLOR = 'var(--dc-status-critical)'
const HOVER_COLOR = 'var(--dc-latency-p99)'

function formatYAxisCount(count: number) {
  return count.toLocaleString('en-us')
}

function findBarPadding(barCount: number) {
  return scaleLinear().domain([FEW_BARS, MANY_BARS]).range([FEW_BARS_PADDING, MANY_BARS_PADDING]).clamp(true)(barCount)
}

function findMostRequests(chartBuckets: ChartBucket[]) {
  let mostRequests = 0

  for (const chartBucket of chartBuckets) {
    mostRequests = Math.max(mostRequests, chartBucket.requests)
  }

  return mostRequests
}

function findActiveChartBucket(chartBuckets: ChartBucket[], hover: Hover | null) {
  if (hover === null) {
    return null
  }

  return chartBuckets[hover.index] ?? null
}

const RequestsChart = ({ buckets, hover, setHover, chartLeft, setYLabelWidth, selectedBucket, selectBucket }: Props) => {
  const [width, setWidth] = useState(0)
  const [mouseY, setMouseY] = useState(0)

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

  const mostRequests = findMostRequests(chartBuckets)

  let yMax = mostRequests

  if (mostRequests === 0) {
    yMax = 1
  }

  const yScale = scaleLinear().domain([0, yMax]).nice(Y_LABEL_COUNT).range([chartBottom, chartTop])

  const yLabelValues = yScale.ticks(Y_LABEL_COUNT).filter(Number.isInteger)
  const yLabelWidth = findWidestYLabel(yLabelValues.map(formatYAxisCount))

  useLayoutEffect(() => {
    setYLabelWidth(yLabelWidth)
  }, [yLabelWidth, setYLabelWidth])

  if (chartBuckets.length === 0) {
    return <p className="lr-message">No requests in this range.</p>
  }

  const chartRight = width - MARGIN.right
  const plotWidth = chartRight - chartLeft

  const xScale = timeScale(chartBuckets, chartLeft, chartRight)

  const firstBucket = chartBuckets[0]
  const firstBucketWidth = xScale(firstBucket.end) - xScale(firstBucket.start)
  const barGap = (firstBucketWidth * findBarPadding(chartBuckets.length)) / 2
  const fullBarWidth = firstBucketWidth - 2 * barGap

  const xLabels = findXLabels(chartBuckets, xScale, plotWidth)

  function renderGridline(count: number) {
    const gridlineY = yScale(count)

    return (
      <g key={count}>
        <line className="dc-grid" x1={chartLeft} x2={chartRight} y1={gridlineY} y2={gridlineY} />
        <text x={chartLeft - Y_LABEL_GAP} y={gridlineY} dy="0.32em" textAnchor="end">
          {formatYAxisCount(count)}
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

  function renderBar(chartBucket: ChartBucket, index: number) {
    const barX = xScale(chartBucket.start) - fullBarWidth / 2
    const barWidth = fullBarWidth

    const barTop = yScale(chartBucket.requests)
    const okTop = yScale(chartBucket.ok)

    let opacity = 1

    if (selectedBucket !== null && selectedBucket.bucket !== chartBucket.bucket.bucket) {
      opacity = 0.35
    }

    let okColor = OK_COLOR

    if (hover !== null && hover.index === index) {
      okColor = HOVER_COLOR
    }

    return (
      <g key={chartBucket.start} opacity={opacity}>
        <rect x={barX} y={okTop} width={barWidth} height={chartBottom - okTop} fill={okColor} />
        <rect x={barX} y={barTop} width={barWidth} height={okTop - barTop} fill={ERROR_COLOR} />
      </g>
    )
  }

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    const svgBox = event.currentTarget.getBoundingClientRect()
    setMouseY(event.clientY - svgBox.top)

    const hoveredIndex = bucketAt(event, chartBuckets, xScale)
    const hoveringThisChart = hover !== null && hover.chart === 'requests'

    if (hoveredIndex === null) {
      if (hoveringThisChart) {
        setHover(null)
      }

      return
    }

    if (!hoveringThisChart || hover.index !== hoveredIndex) {
      setHover({ chart: 'requests', index: hoveredIndex })
    }
  }

  function handlePointerLeave() {
    if (hover !== null && hover.chart === 'requests') {
      setHover(null)
    }
  }

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    const clickedIndex = bucketAt(event, chartBuckets, xScale)

    if (clickedIndex === null) {
      return
    }

    selectBucket(chartBuckets[clickedIndex].bucket)
  }

  const activeChartBucket = findActiveChartBucket(chartBuckets, hover)
  const focused = activeChartBucket !== null && hover !== null && hover.chart === 'requests'

  let activeX = 0

  if (activeChartBucket !== null) {
    activeX = xScale(activeChartBucket.start)
  }

  const tooltipRows: TooltipRow[] = []
  let tooltipTime = ''

  if (activeChartBucket !== null) {
    tooltipRows.push({ name: 'requests', color: OK_COLOR, value: activeChartBucket.requests })
    tooltipRows.push({ name: 'errors', color: ERROR_COLOR, value: activeChartBucket.errors })

    tooltipTime = new Date(activeChartBucket.start).toLocaleString('en-us', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  let tooltipShiftX = '12px'

  if (activeX > width / 2) {
    tooltipShiftX = 'calc(-100% - 12px)'
  }

  let tooltipShiftY = '8px'

  if (mouseY > HEIGHT / 2) {
    tooltipShiftY = 'calc(-100% - 8px)'
  }

  const tooltipStyle = {
    left: activeX,
    top: mouseY,
    transform: `translate(${tooltipShiftX}, ${tooltipShiftY})`
  }

  function renderTooltipRow(row: TooltipRow) {
    return (
      <p key={row.name} className="dc-tooltip-row">
        <span className="dc-swatch" style={{ backgroundColor: row.color }} />
        <span>{row.name}</span>
        <strong>{row.value.toLocaleString('en-us')}</strong>
      </p>
    )
  }

  return (
    <>
      <p className="lr-panel-label">Requests</p>
      <div ref={measureResize} className="dc-chart">
        <svg width={width} height={HEIGHT} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} onClick={handleClick} style={{ cursor: 'pointer' }}>
          {yLabelValues.map(renderGridline)}
          {xLabels.map(renderXLabel)}
          {chartBuckets.map(renderBar)}
        </svg>

        {focused && (
          <div className="dc-tooltip" style={tooltipStyle}>
            <p className="dc-tooltip-time">{tooltipTime}</p>
            {tooltipRows.map(renderTooltipRow)}
          </div>
        )}
      </div>
    </>
  )
}

export default RequestsChart
