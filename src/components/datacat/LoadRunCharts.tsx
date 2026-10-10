import { useState } from 'react'
import { curveLinear } from 'd3-shape'
import TimeSeriesChart, { type ChartLine } from './TimeSeriesChart'
import { findNearestPoint } from './timeSeries'
import { HEIGHT, Y_LABEL_GAP } from './bucketChart'
import { RUN_STROKE_WIDTH, SERIES_ONE, describeCpu, formatMs, formatPercent, formatWhole, toCpuLines, toTime } from './runCharts'
import type { LoadCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

const MEMORY_COLOR = '#C3507C'

interface Props {
  rows: LoadCompareRow[]
  route: string
  step?: number
  cpu?: RunMetricPoint[]
  statsOpen?: boolean
}

function toRpsLines(rows: LoadCompareRow[]): ChartLine[] {
  return [{ key: 'rps', label: 'rps', color: SERIES_ONE, points: rows.map((row) => ({ time: toTime(row.bucket), value: row.rps })), fill: true }]
}

function toLatencyLines(rows: LoadCompareRow[]): ChartLine[] {
  return [
    { key: 'client', label: 'client p99', color: MEMORY_COLOR, points: rows.map((row) => ({ time: toTime(row.bucket), value: row.clientP99 })), fill: true },
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

const LoadRunCharts = ({ rows, route, step = 15, cpu = [], statsOpen = false }: Props) => {
  const [showTable, setShowTable] = useState(false)
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
  const [cpuYLabelWidth, setCpuYLabelWidth] = useState(0)

  if (!rows.length) return <p className="lr-message">No samples for this route yet.</p>

  const chartLeft = Math.max(rpsYLabelWidth, latencyYLabelWidth, cpuYLabelWidth) + Y_LABEL_GAP
  const hasCpu = cpu.some((point) => point.average !== null)
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
      <div className="lr-head">
        <div>
          <h3 className="lr-title">{route}</h3>
          <p className="lr-subtitle">{step}s buckets</p>
        </div>
        <button type="button" className="lr-toggle" onClick={() => setShowTable(!showTable)}>
          {showTable ? 'Show charts' : 'Show table'}
        </button>
      </div>

      {showTable ? (
        <div className="lr-table-scroll">
          <table className="lr-table">
            <thead>
              <tr>
                <th>Bucket</th><th>rps</th><th>Sent</th><th>Traced</th><th>Untraced</th><th>Errors</th>
                <th>Client p50</th><th>Client p99</th><th>Server p50</th><th>Server p99</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bucket}>
                  <td>{new Date(row.bucket).toLocaleTimeString()}</td>
                  <td>{row.rps.toLocaleString()}</td>
                  <td>{row.sent.toLocaleString()}</td>
                  <td>{row.traced.toLocaleString()}</td>
                  <td>{row.gap.toLocaleString()}</td>
                  <td>{row.errors.toLocaleString()}</td>
                  <td>{Math.round(row.clientP50).toLocaleString()}</td>
                  <td>{Math.round(row.clientP99).toLocaleString()}</td>
                  <td>{Math.round(row.serverP50).toLocaleString()}</td>
                  <td>{Math.round(row.serverP99).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
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
            showTimeLabels={!hasCpu}
            showHoverTime={false}
            hoverDetail={detailRow ? describeLatency(detailRow) : undefined}
            chartLeft={chartLeft}
            setYLabelWidth={setLatencyYLabelWidth}
            height={HEIGHT}
            strokeWidth={RUN_STROKE_WIDTH}
            tooltip
          />

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
              showTimeLabels
              showHoverTime={false}
              hoverDetail={describeCpu(cpu, detailTime)}
              chartLeft={chartLeft}
              setYLabelWidth={setCpuYLabelWidth}
              height={HEIGHT}
              strokeWidth={RUN_STROKE_WIDTH}
              tooltip
            />
          )}

        </>
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
