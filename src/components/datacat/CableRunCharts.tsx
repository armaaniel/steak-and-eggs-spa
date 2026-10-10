import { useMemo, useState } from 'react'
import { curveLinear } from 'd3-shape'
import TimeSeriesChart, { type ChartLine } from './TimeSeriesChart'
import { findNearestPoint } from './timeSeries'
import { Y_LABEL_GAP } from './bucketChart'
import { RUN_STROKE_WIDTH, SERIES_ONE, SERIES_TWO, formatMs, formatPercent, toCpuLines, toResourceLines, toTime } from './runCharts'
import type { CableCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  rows: CableCompareRow[]
  cpu?: RunMetricPoint[]
  memory?: RunMetricPoint[]
  statsOpen?: boolean
}

type Panel = 'fanout' | 'lag' | 'resources'

const DEFAULT_BUCKET_MS = 5000
const NO_POINTS: RunMetricPoint[] = []

function formatRate(value: number) {
  return `${Math.round(value).toLocaleString()}/s`
}

function perSecond(count: number | null, bucketSeconds: number) {
  if (count === null) {
    return null
  }

  return count / bucketSeconds
}

function toFanoutLines(rows: CableCompareRow[], bucketSeconds: number): ChartLine[] {
  return [
    { key: 'expected', label: 'expected', color: SERIES_TWO, points: rows.map((row) => ({ time: toTime(row.at), value: perSecond(row.expected, bucketSeconds) })), formatValue: formatRate },
    { key: 'received', label: 'received', color: SERIES_ONE, points: rows.map((row) => ({ time: toTime(row.at), value: perSecond(row.received, bucketSeconds) })), formatValue: formatRate },
  ]
}

function toLagLines(rows: CableCompareRow[]): ChartLine[] {
  return [
    { key: 'p99', label: 'p99', color: SERIES_TWO, points: rows.map((row) => ({ time: toTime(row.at), value: row.p99LagMs })) },
    { key: 'p50', label: 'p50', color: SERIES_ONE, points: rows.map((row) => ({ time: toTime(row.at), value: row.p50LagMs })) },
  ]
}

function toLagTooltipLines(rows: CableCompareRow[], bucketSeconds: number, cpu: RunMetricPoint[]): ChartLine[] {
  const receivedLines = toFanoutLines(rows, bucketSeconds).filter((chartLine) => chartLine.key === 'received')

  return [...receivedLines, ...toCpuLines(cpu)]
}

function describeFanout(row: CableCompareRow, bucketSeconds: number) {
  const published = perSecond(row.published, bucketSeconds)
  const publishedText = `${published === null ? '-' : formatRate(published)} published`

  if (row.expected === null || row.received === null) {
    return publishedText
  }

  return `${publishedText} · ${(row.expected - row.received).toLocaleString()} dropped`
}

const CableRunCharts = ({ rows, cpu = NO_POINTS, memory = NO_POINTS, statsOpen = false }: Props) => {
  const [hoveredTime, setHoveredTime] = useState<number | null>(null)
  const [pinnedTime, setPinnedTime] = useState<number | null>(null)
  const pinKey = rows.length > 0 ? `${rows[0].at}|${rows[rows.length - 1].at}` : ''
  const [pinnedKey, setPinnedKey] = useState(pinKey)

  if (pinKey !== pinnedKey) {
    setPinnedKey(pinKey)
    setPinnedTime(null)
  }
  const [fanoutYLabelWidth, setFanoutYLabelWidth] = useState(0)
  const [lagYLabelWidth, setLagYLabelWidth] = useState(0)
  const [resourcesYLabelWidth, setResourcesYLabelWidth] = useState(0)

  const times = useMemo(() => rows.map((row) => toTime(row.at)), [rows])

  const bucketSeconds = useMemo(() => {
    const deltas = times
      .slice(1)
      .map((time, index) => time - times[index])
      .filter((delta) => delta > 0)
    const bucketMs = deltas.length ? Math.min(...deltas) : DEFAULT_BUCKET_MS
    return bucketMs / 1000
  }, [times])

  const fanoutLines = useMemo(() => toFanoutLines(rows, bucketSeconds), [rows, bucketSeconds])
  const lagLines = useMemo(() => toLagLines(rows), [rows])
  const lagTooltipLines = useMemo(() => toLagTooltipLines(rows, bucketSeconds, cpu), [rows, bucketSeconds, cpu])
  const resourceLines = useMemo(() => toResourceLines(cpu, memory), [cpu, memory])
  const rowMarks = useMemo(() => rows.map((row) => ({ time: toTime(row.at), row })), [rows])

  if (!rows.length) return <p className="lr-message">No samples for this run yet.</p>

  const chartLeft = Math.max(fanoutYLabelWidth, lagYLabelWidth, resourcesYLabelWidth) + Y_LABEL_GAP
  const hasResources = resourceLines.length > 0
  const hasLag = rows.some((row) => row.p50LagMs !== null || row.p99LagMs !== null)
  const from = times[0]
  const to = times[times.length - 1]

  let axisPanel: Panel = 'fanout'

  if (hasLag) {
    axisPanel = 'lag'
  }

  if (hasResources) {
    axisPanel = 'resources'
  }

  const detailTime = pinnedTime ?? hoveredTime
  let detailRow: CableCompareRow | null = null

  if (detailTime !== null) {
    detailRow = findNearestPoint(rowMarks, detailTime)?.row ?? null
  }

  const totals = rows.reduce(
    (sum, row) => {
      const comparable = row.expected !== null

      return {
        published: sum.published + (row.published ?? 0),
        expected: sum.expected + (comparable ? row.expected! : 0),
        delivered: sum.delivered + (comparable ? row.received ?? 0 : 0)
      }
    },
    { published: 0, expected: 0, delivered: 0 }
  )

  const peakClients = rows.find((row) => row.peakClients !== null)?.peakClients ?? 0

  const dropped = totals.expected - totals.delivered
  const deliveryRate = totals.expected > 0 ? (totals.delivered / totals.expected) * 100 : null

  return (
    <div className="lr-panels">
      <h3 className="lr-title">PriceChannel broadcast</h3>

      <TimeSeriesChart
        title="Fan-out (frames/s)"
        lines={fanoutLines}
        from={from}
        to={to}
        yAxis="auto"
        formatValue={formatRate}
        hoveredTime={hoveredTime}
        setHoveredTime={setHoveredTime}
        pinnedTime={pinnedTime}
        setPinnedTime={setPinnedTime}
        showTimeLabels={axisPanel === 'fanout'}
        showHoverTime
        hoverDetail={detailRow ? describeFanout(detailRow, bucketSeconds) : undefined}
        chartLeft={chartLeft}
        setYLabelWidth={setFanoutYLabelWidth}
        strokeWidth={RUN_STROKE_WIDTH}
        tooltip
        pinTooltip
        tooltipKeys={['received']}
      />

      {hasLag && (
        <TimeSeriesChart
          title="Delivery lag (ms)"
          lines={lagLines}
          from={from}
          to={to}
          yAxis="auto"
          formatValue={formatMs}
          hoveredTime={hoveredTime}
          setHoveredTime={setHoveredTime}
          pinnedTime={pinnedTime}
          setPinnedTime={setPinnedTime}
          showTimeLabels={axisPanel === 'lag'}
          showHoverTime={false}
          chartLeft={chartLeft}
          setYLabelWidth={setLagYLabelWidth}
            strokeWidth={RUN_STROKE_WIDTH}
          tooltip
          pinTooltip
          tooltipExtraLines={lagTooltipLines}
        />
      )}

      {hasResources && (
        <TimeSeriesChart
          title="CPU and memory (%)"
          lines={resourceLines}
          from={from}
          to={to}
          yAxis="percent"
          curve={curveLinear}
          formatValue={formatPercent}
          hoveredTime={hoveredTime}
          setHoveredTime={setHoveredTime}
          pinnedTime={pinnedTime}
          setPinnedTime={setPinnedTime}
          showTimeLabels={axisPanel === 'resources'}
          showHoverTime={false}
          chartLeft={chartLeft}
          setYLabelWidth={setResourcesYLabelWidth}
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
          <p className="lr-stat-label">Published</p>
          <p className="lr-stat-value">{totals.published.toLocaleString()}</p>
        </div>
        <div className="lr-stat">
          <p className="lr-stat-label">Peak clients</p>
          <p className="lr-stat-value">{peakClients.toLocaleString()}</p>
        </div>
        <div className="lr-stat">
          <p className="lr-stat-label">Expected</p>
          <p className="lr-stat-value">{totals.expected.toLocaleString()}</p>
        </div>
        <div className="lr-stat">
          <p className="lr-stat-label">Received</p>
          <p className="lr-stat-value">{totals.delivered.toLocaleString()}</p>
        </div>
        <div className="lr-stat">
          <p className="lr-stat-label">Dropped</p>
          <p className={`lr-stat-value ${dropped > 0 ? 'warn' : ''}`}>{dropped.toLocaleString()}</p>
        </div>
        <div className="lr-stat">
          <p className="lr-stat-label">Delivery</p>
          <p className="lr-stat-value">{deliveryRate === null ? '-' : `${deliveryRate.toFixed(1)}%`}</p>
        </div>
      </div>
    </div>
  )
}

export default CableRunCharts
