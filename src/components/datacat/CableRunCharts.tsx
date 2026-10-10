import { useState } from 'react'
import { curveLinear } from 'd3-shape'
import TimeSeriesChart, { type ChartLine } from './TimeSeriesChart'
import { findNearestPoint } from './timeSeries'
import { HEIGHT, Y_LABEL_GAP } from './bucketChart'
import { RUN_STROKE_WIDTH, SERIES_ONE, SERIES_TWO, describeCpu, formatMs, formatPercent, toCpuLines, toTime } from './runCharts'
import type { CableCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  rows: CableCompareRow[]
  cpu?: RunMetricPoint[]
  statsOpen?: boolean
}

type Panel = 'fanout' | 'lag' | 'cpu'

const DEFAULT_BUCKET_MS = 5000

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
    { key: 'expected', label: 'expected', color: SERIES_TWO, points: rows.map((row) => ({ time: toTime(row.at), value: perSecond(row.expected, bucketSeconds) })) },
    { key: 'received', label: 'received', color: SERIES_ONE, points: rows.map((row) => ({ time: toTime(row.at), value: perSecond(row.received, bucketSeconds) })) },
  ]
}

function toLagLines(rows: CableCompareRow[]): ChartLine[] {
  return [
    { key: 'p99', label: 'p99', color: SERIES_TWO, points: rows.map((row) => ({ time: toTime(row.at), value: row.p99LagMs })) },
    { key: 'p50', label: 'p50', color: SERIES_ONE, points: rows.map((row) => ({ time: toTime(row.at), value: row.p50LagMs })) },
  ]
}

function describeFanout(row: CableCompareRow, bucketSeconds: number) {
  const published = perSecond(row.published, bucketSeconds)
  const publishedText = `${published === null ? '-' : formatRate(published)} published`

  if (row.expected === null || row.received === null) {
    return publishedText
  }

  return `${publishedText} · ${(row.expected - row.received).toLocaleString()} dropped`
}

const CableRunCharts = ({ rows, cpu = [], statsOpen = false }: Props) => {
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
  const [cpuYLabelWidth, setCpuYLabelWidth] = useState(0)

  if (!rows.length) return <p className="lr-message">No samples for this run yet.</p>

  const times = rows.map((row) => toTime(row.at))
  const deltas = times.slice(1).map((time, index) => time - times[index])
  const bucketMs = deltas.length ? Math.min(...deltas) : DEFAULT_BUCKET_MS
  const bucketSeconds = bucketMs / 1000

  const chartLeft = Math.max(fanoutYLabelWidth, lagYLabelWidth, cpuYLabelWidth) + Y_LABEL_GAP
  const hasCpu = cpu.some((point) => point.average !== null)
  const hasLag = rows.some((row) => row.p50LagMs !== null || row.p99LagMs !== null)
  const from = times[0]
  const to = times[times.length - 1]

  let axisPanel: Panel = 'fanout'

  if (hasLag) {
    axisPanel = 'lag'
  }

  if (hasCpu) {
    axisPanel = 'cpu'
  }

  const detailTime = pinnedTime ?? hoveredTime
  let detailRow: CableCompareRow | null = null

  if (detailTime !== null) {
    detailRow = findNearestPoint(rows.map((row) => ({ time: toTime(row.at), row })), detailTime)?.row ?? null
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
      <div>
        <h3 className="lr-title">PriceChannel broadcast</h3>
        <p className="lr-subtitle">{bucketSeconds}s buckets</p>
      </div>

      <TimeSeriesChart
        title="Fan-out (frames/s)"
        lines={toFanoutLines(rows, bucketSeconds)}
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
        height={HEIGHT}
        strokeWidth={RUN_STROKE_WIDTH}
        tooltip
      />

      {hasLag && (
        <TimeSeriesChart
          title="Delivery lag (ms)"
          lines={toLagLines(rows)}
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
          height={HEIGHT}
          strokeWidth={RUN_STROKE_WIDTH}
          tooltip
        />
      )}

      {hasCpu && (
        <TimeSeriesChart
          title="CPU (%)"
          lines={toCpuLines(cpu)}
          from={from}
          to={to}
          yAxis="percent"
          curve={curveLinear}
          formatValue={formatPercent}
          hoveredTime={hoveredTime}
          setHoveredTime={setHoveredTime}
          pinnedTime={pinnedTime}
          setPinnedTime={setPinnedTime}
          showTimeLabels={axisPanel === 'cpu'}
          showHoverTime={false}
          hoverDetail={describeCpu(cpu, detailTime)}
          chartLeft={chartLeft}
          setYLabelWidth={setCpuYLabelWidth}
          height={HEIGHT}
          strokeWidth={RUN_STROKE_WIDTH}
          tooltip
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
