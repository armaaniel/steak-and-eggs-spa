import { useCallback, useLayoutEffect, useState, type MouseEvent } from 'react'
import { scaleLinear } from 'd3-scale'
import { HEIGHT, MARGIN, Y_LABEL_GAP, bucketAt, findWidestYLabel, findXLabels, timeScale, type BarSeries, type ChartBar, type Hover, type XLabel } from './bucketChart'
import '../../stylesheets/datacat/loadrun.css'
import '../../stylesheets/datacat/charts.css'

interface Props {
  title: string
  emptyMessage: string
  bars: ChartBar[]
  series: BarSeries[]
  chartName: Hover['chart']
  hover: Hover | null
  setHover: (hover: Hover | null) => void
  chartLeft: number
  setYLabelWidth: (width: number) => void
  selectedIndex: number | null
  selectBar: (index: number) => void
  showTimeLabels?: boolean
}

const Y_LABEL_COUNT = 4
const MARGIN_BOTTOM = 6

const FEW_BARS = 13
const MANY_BARS = 26
const FEW_BARS_PADDING = 0.77
const MANY_BARS_PADDING = 0.55

function formatYAxisCount(count: number) {
  return count.toLocaleString('en-us')
}

function findBarPadding(barCount: number) {
  return scaleLinear().domain([FEW_BARS, MANY_BARS]).range([FEW_BARS_PADDING, MANY_BARS_PADDING]).clamp(true)(barCount)
}

function findBarTotal(bar: ChartBar, series: BarSeries[]) {
  let total = 0

  for (const barSeries of series) {
    total += bar.segments[barSeries.key] ?? 0
  }

  return total
}

function findTallestBar(bars: ChartBar[], series: BarSeries[]) {
  let tallestBar = 0

  for (const bar of bars) {
    tallestBar = Math.max(tallestBar, findBarTotal(bar, series))
  }

  return tallestBar
}

function findActiveBar(bars: ChartBar[], hover: Hover | null) {
  if (hover === null) {
    return null
  }

  return bars[hover.index] ?? null
}

const BucketBarChart = ({ title, emptyMessage, bars, series, chartName, hover, setHover, chartLeft, setYLabelWidth, selectedIndex, selectBar, showTimeLabels = false }: Props) => {
  const [width, setWidth] = useState(0)

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

  const chartTop = MARGIN.top
  const chartBottom = HEIGHT - marginBottom

  const tallestBar = findTallestBar(bars, series)

  let yMax = tallestBar

  if (tallestBar === 0) {
    yMax = 1
  }

  const yScale = scaleLinear().domain([0, yMax]).nice(Y_LABEL_COUNT).range([chartBottom, chartTop])

  const yLabelValues = yScale.ticks(Y_LABEL_COUNT).filter(Number.isInteger)
  const yLabelWidth = findWidestYLabel(yLabelValues.map(formatYAxisCount))

  useLayoutEffect(() => {
    setYLabelWidth(yLabelWidth)
  }, [yLabelWidth, setYLabelWidth])

  if (bars.length === 0) {
    return <p className="lr-message">{emptyMessage}</p>
  }

  const chartRight = width - MARGIN.right
  const plotWidth = chartRight - chartLeft

  const xScale = timeScale(bars, chartLeft, chartRight)

  let xLabels: XLabel[] = []

  if (showTimeLabels) {
    xLabels = findXLabels(bars, xScale, plotWidth)
  }

  const firstBar = bars[0]
  const firstBucketWidth = xScale(firstBar.end) - xScale(firstBar.start)
  const barGap = (firstBucketWidth * findBarPadding(bars.length)) / 2
  const fullBarWidth = firstBucketWidth - 2 * barGap

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

  function renderBar(bar: ChartBar, index: number) {
    const barX = xScale(bar.start) - fullBarWidth / 2
    const barWidth = fullBarWidth

    let opacity = 1

    if (selectedIndex !== null && selectedIndex !== index) {
      opacity = 0.35
    }

    const segments = []
    let segmentBottom = 0

    for (const barSeries of series) {
      const segmentTop = segmentBottom + (bar.segments[barSeries.key] ?? 0)
      const topY = yScale(segmentTop)
      const bottomY = yScale(segmentBottom)

      let color = barSeries.color

      if (barSeries.hoverColor !== undefined && hover !== null && hover.index === index) {
        color = barSeries.hoverColor
      }

      segments.push(<rect key={barSeries.key} x={barX} y={topY} width={barWidth} height={bottomY - topY} fill={color} />)
      segmentBottom = segmentTop
    }

    return (
      <g key={bar.start} opacity={opacity}>
        {segments}
      </g>
    )
  }

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    const hoveredIndex = bucketAt(event, bars, xScale)
    const hoveringThisChart = hover !== null && hover.chart === chartName

    if (hoveredIndex === null) {
      if (hoveringThisChart) {
        setHover(null)
      }

      return
    }

    if (!hoveringThisChart || hover.index !== hoveredIndex) {
      setHover({ chart: chartName, index: hoveredIndex })
    }
  }

  function handlePointerLeave() {
    if (hover !== null && hover.chart === chartName) {
      setHover(null)
    }
  }

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    const clickedIndex = bucketAt(event, bars, xScale)

    if (clickedIndex === null) {
      return
    }

    selectBar(clickedIndex)
  }

  const activeBar = findActiveBar(bars, hover)
  const showLegendValues = activeBar !== null && activeBar.hoverText === undefined

  function renderLegendEntry(barSeries: BarSeries) {
    return (
      <span key={barSeries.key}>
        <span className="dc-swatch" style={{ backgroundColor: barSeries.color }} />
        {barSeries.label}
        {showLegendValues && <strong>{(activeBar.segments[barSeries.key] ?? 0).toLocaleString('en-us')}</strong>}
      </span>
    )
  }

  return (
    <>
      <div className="dc-chart-header" style={{ paddingRight: MARGIN.right }}>
        <p className="lr-panel-label">{title}</p>
        <div className="dc-legend">
          {series.map(renderLegendEntry)}
          {activeBar !== null && activeBar.hoverText !== undefined && <span className="dc-hover-time">{activeBar.hoverText}</span>}
        </div>
      </div>
      <div ref={measureResize} className="dc-chart">
        <svg width={width} height={HEIGHT} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} onClick={handleClick} style={{ cursor: 'pointer' }}>
          {yLabelValues.map(renderGridline)}
          {xLabels.map(renderXLabel)}
          {bars.map(renderBar)}
        </svg>
      </div>
    </>
  )
}

export default BucketBarChart
