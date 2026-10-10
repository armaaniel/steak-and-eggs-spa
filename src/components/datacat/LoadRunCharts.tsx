import { useState } from 'react'
import { curveStepAfter } from 'd3-shape'
import TimeSeriesChart, { type ChartLine } from './TimeSeriesChart'
import { findNearestPoint } from './timeSeries'
import { HEIGHT, Y_LABEL_GAP } from './bucketChart'
import { RUN_STROKE_WIDTH, SERIES_ONE, SERIES_TWO, formatMs, formatPercent, formatWhole, toResourceLines, toTime } from './runCharts'
import type { LoadCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  rows: LoadCompareRow[]
  route: string
  cpu?: RunMetricPoint[]
  memory?: RunMetricPoint[]
  statsOpen?: boolean
}

function toRpsLines(rows: LoadCompareRow[]): ChartLine[] {
  return [{ key: 'rps', label: 'rps', color: SERIES_ONE, points: rows.map((row) => ({ time: toTime(row.bucket), value: row.rps })), fill: true, formatValue: formatWhole }]
}

function toLatencyLines(rows: LoadCompareRow[]): ChartLine[] {
  return [
    { key: 'client', label: 'client p99', color: SERIES_TWO, points: rows.map((row) => ({ time: toTime(row.bucket), value: row.clientP99 })), fill: true },
    { key: 'server', label: 'server p99', color: SERIES_ONE, points: rows.map((row) => ({ time: toTime(row.bucket), value: row.serverP99 })) },
  ]
}

function describeRps(row: LoadCompareRow) {
  const sent = `${row.sent.toLocaleString()} sent`

  if (row.gap > 0 || row.errors > 0) {
    return `${sent} · ${row.gap.toLocaleString()} untraced · ${row.errors.toLocaleString()} errors`
  }

  return sent
}

function describeLatency(row: LoadCompareRow) {
  return `client p50 ${formatMs(row.clientP50)} · server p50 ${formatMs(row.serverP50)}`
}

const LoadRunCharts = ({ rows, route, cpu = [], memory = [], statsOpen = false }: Props) => {
  const [hoveredTime, setHoveredTime] = useState<number | null>(null)
  const [pinnedTime, setPinnedTime] = useState<number | null>(null)
  const pinKey = rows.length > 0 ? `${rows[0].bucket}|${rows[rows.length - 1].bucket}` : ''
  const [pinnedKey, setPinnedKey] = useState(pinKey)

  if (pinKey !== pinnedKey) {
    setPinnedKey(pinKey)
    setPinnedTime(null)
  }
  const [rpsYLabelWidth, setRpsYLabelWidth] = useState(0)
  const [latencyYLabelWidth, setLatencyYLabelWidth] = useState(0)
  const [resourcesYLabelWidth, setResourcesYLabelWidth] = useState(0)

  if (!rows.length) return <p className="lr-message">No samples for this route yet.</p>

  const chartLeft = Math.max(rpsYLabelWidth, latencyYLabelWidth, resourcesYLabelWidth) + Y_LABEL_GAP
  const resourceLines = toResourceLines(cpu, memory)
  const hasResources = resourceLines.length > 0
  const from = toTime(rows[0].bucket)
  const to = toTime(rows[rows.length - 1].bucket)

  const detailTime = pinnedTime ?? hoveredTime
  let detailRow: LoadCompareRow | null = null

  if (detailTime !== null) {
    detailRow = findNearestPoint(rows.map((row) => ({ time: toTime(row.bucket), row })), detailTime)?.row ?? null
  }

  const totals = rows.reduce(
    (sum, row) => ({
      sent: sum.sent + row.sent,
      traced: sum.traced + row.traced,
      gap: sum.gap + row.gap,
      errors: sum.errors + row.errors
    }),
    { sent: 0, traced: 0, gap: 0, errors: 0 }
  )

  return (
    <div className="lr-panels">
      <h3 className="lr-title">{route}</h3>

      <TimeSeriesChart
        title="Throughput (rps)"
        lines={toRpsLines(rows)}
        from={from}
        to={to}
        yAxis="auto"
        formatValue={formatWhole}
        hoveredTime={hoveredTime}
        setHoveredTime={setHoveredTime}
        pinnedTime={pinnedTime}
        setPinnedTime={setPinnedTime}
        showTimeLabels={false}
        showHoverTime
        hoverDetail={detailRow ? describeRps(detailRow) : undefined}
        chartLeft={chartLeft}
        setYLabelWidth={setRpsYLabelWidth}
        height={HEIGHT}
        strokeWidth={RUN_STROKE_WIDTH}
        tooltip
        pinTooltip
      />

      <TimeSeriesChart
        title="p99 latency (ms)"
        lines={toLatencyLines(rows)}
        from={from}
        to={to}
        yAxis="auto"
        formatValue={formatMs}
        hoveredTime={hoveredTime}
        setHoveredTime={setHoveredTime}
        pinnedTime={pinnedTime}
        setPinnedTime={setPinnedTime}
        showTimeLabels={!hasResources}
        showHoverTime={false}
        hoverDetail={detailRow ? describeLatency(detailRow) : undefined}
        chartLeft={chartLeft}
        setYLabelWidth={setLatencyYLabelWidth}
        height={HEIGHT}
        strokeWidth={RUN_STROKE_WIDTH}
        tooltip
        pinTooltip
        tooltipKeys={['rps', 'client', 'server']}
        tooltipExtraLines={toRpsLines(rows)}
      />

      {hasResources && (
        <TimeSeriesChart
          title="CPU and memory (%)"
          lines={resourceLines}
          from={from}
          to={to}
          yAxis="percent"
          curve={curveStepAfter}
          formatValue={formatPercent}
          hoveredTime={hoveredTime}
          setHoveredTime={setHoveredTime}
          pinnedTime={pinnedTime}
          setPinnedTime={setPinnedTime}
          showTimeLabels
          showHoverTime={false}
          chartLeft={chartLeft}
          setYLabelWidth={setResourcesYLabelWidth}
          height={HEIGHT}
          strokeWidth={RUN_STROKE_WIDTH}
          tooltip
          pinTooltip
          tooltipKeys={['cpu', 'memory']}
          toggleLines
          defaultHiddenKeys={['memory']}
        />
      )}

      <div className={`lr-stats ${statsOpen ? 'open' : ''}`}>
        <div className="lr-stat">
          <p className="lr-stat-label">Sent</p>
          <p className="lr-stat-value">{totals.sent.toLocaleString()}</p>
        </div>
        <div className="lr-stat">
          <p className="lr-stat-label">Traced</p>
          <p className="lr-stat-value">{totals.traced.toLocaleString()}</p>
        </div>
        <div className="lr-stat">
          <p className="lr-stat-label">Untraced</p>
          <p className={`lr-stat-value ${totals.gap > 0 ? 'warn' : ''}`}>{totals.gap.toLocaleString()}</p>
        </div>
        <div className="lr-stat">
          <p className="lr-stat-label">Errors</p>
          <p className={`lr-stat-value ${totals.errors > 0 ? 'critical' : ''}`}>{totals.errors.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

export default LoadRunCharts
