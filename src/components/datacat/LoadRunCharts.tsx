import { useMemo, useState } from 'react'
import { curveStepAfter } from 'd3-shape'
import TimeSeriesChart, { type ChartLine } from './TimeSeriesChart'
import { findNearestPoint } from './timeSeries'
import { Y_LABEL_GAP } from './bucketChart'
import { RUN_STROKE_WIDTH, SERIES_ONE, SERIES_TWO, describeMajorGcs, formatMs, formatMsPerSecond, formatPercent, formatWhole, toPressureLines, toResourceLines, toTime } from './runCharts'
import type { LoadCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  rows: LoadCompareRow[]
  route: string
  step: number
  cpu?: RunMetricPoint[]
  memory?: RunMetricPoint[]
  cpuUsed?: RunMetricPoint[]
  pressure?: RunMetricPoint[]
  gcTime?: RunMetricPoint[]
  gcMajor?: RunMetricPoint[]
  statsOpen?: boolean
}

const NO_POINTS: RunMetricPoint[] = []

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

const LoadRunCharts = ({ rows, route, step, cpu = NO_POINTS, memory = NO_POINTS, cpuUsed = NO_POINTS, pressure = NO_POINTS, gcTime = NO_POINTS, gcMajor = NO_POINTS, statsOpen = false }: Props) => {
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
  const [pressureYLabelWidth, setPressureYLabelWidth] = useState(0)

  const rpsLines = useMemo(() => toRpsLines(rows), [rows])
  const latencyLines = useMemo(() => toLatencyLines(rows), [rows])
  const resourceLines = useMemo(() => toResourceLines(cpu, memory, cpuUsed), [cpu, memory, cpuUsed])
  const pressureLines = useMemo(() => toPressureLines(pressure, gcTime), [pressure, gcTime])
  const rowMarks = useMemo(() => rows.map((row) => ({ time: toTime(row.bucket), row })), [rows])

  if (!rows.length) return <p className="lr-message">No samples for this route yet.</p>

  const chartLeft = Math.max(rpsYLabelWidth, latencyYLabelWidth, resourcesYLabelWidth, pressureYLabelWidth) + Y_LABEL_GAP
  const hasResources = resourceLines.length > 0
  const hasPressure = pressureLines.length > 0
  const from = toTime(rows[0].bucket)
  const to = toTime(rows[rows.length - 1].bucket)

  const detailTime = pinnedTime ?? hoveredTime
  let detailRow: LoadCompareRow | null = null

  if (detailTime !== null) {
    detailRow = findNearestPoint(rowMarks, detailTime)?.row ?? null
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
        lines={rpsLines}
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
        strokeWidth={RUN_STROKE_WIDTH}
        expandable
        tooltip
        pinTooltip
      />

      <TimeSeriesChart
        title="p99 latency (ms)"
        lines={latencyLines}
        from={from}
        to={to}
        yAxis="auto"
        formatValue={formatMs}
        hoveredTime={hoveredTime}
        setHoveredTime={setHoveredTime}
        pinnedTime={pinnedTime}
        setPinnedTime={setPinnedTime}
        showTimeLabels={!hasResources && !hasPressure}
        showHoverTime={false}
        hoverDetail={detailRow ? describeLatency(detailRow) : undefined}
        chartLeft={chartLeft}
        setYLabelWidth={setLatencyYLabelWidth}
        strokeWidth={RUN_STROKE_WIDTH}
        expandable
        tooltip
        pinTooltip
        tooltipKeys={['rps', 'client', 'server']}
        tooltipExtraLines={rpsLines}
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
          showTimeLabels={!hasPressure}
          showHoverTime={false}
          chartLeft={chartLeft}
          setYLabelWidth={setResourcesYLabelWidth}
            strokeWidth={RUN_STROKE_WIDTH}
          expandable
          tooltip
          pinTooltip
          tooltipKeys={['cpu', 'memory']}
          toggleLines
          defaultHiddenKeys={['memory']}
        />
      )}

      {hasPressure && (
        <TimeSeriesChart
          title="CPU pressure and GC (ms/s)"
          lines={pressureLines}
          from={from}
          to={to}
          yAxis="auto"
          formatValue={formatMsPerSecond}
          hoveredTime={hoveredTime}
          setHoveredTime={setHoveredTime}
          pinnedTime={pinnedTime}
          setPinnedTime={setPinnedTime}
          showTimeLabels
          showHoverTime={false}
          hoverDetail={detailRow ? describeMajorGcs(gcMajor, toTime(detailRow.bucket), step) : undefined}
          chartLeft={chartLeft}
          setYLabelWidth={setPressureYLabelWidth}
          strokeWidth={RUN_STROKE_WIDTH}
          expandable
          tooltip
          pinTooltip
          tooltipKeys={['pressure', 'gc']}
          toggleLines
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
