import { useState } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { CableCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  rows: CableCompareRow[]
  cpu?: RunMetricPoint[]
  statsOpen?: boolean
}

interface Mark {
  t: number
  expected: number | null
  delivered: number | null
  shortfall: [number, number] | null
  meanLag: number | null
  p99Lag: number | null
  lagBand: [number, number] | null
  cpuAvg: number | null
  cpuBand: [number, number] | null
  row: CableCompareRow | null
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Mark }[]
}

interface LabelProps {
  x?: number | string
  y?: number | string
  index?: number
  value?: number | string | boolean | null
}

type Panel = 'fanout' | 'lag' | 'cpu'

const DEFAULT_BUCKET_MS = 5000

const ms = (v: number | null | undefined) =>
  v === null || v === undefined ? '-' : `${Math.round(v).toLocaleString()} ms`

const rate = (v: number | null) => (v === null ? '-' : `${Math.round(v).toLocaleString()}/s`)

const count = (v: number | null | undefined) => (v === null || v === undefined ? '-' : v.toLocaleString())

const CableTooltip = ({ active, payload }: TooltipProps) => {
  const mark = payload?.[0]?.payload
  const row = mark?.row

  if (!active || !mark || !row) return null

  const dropped = row.expected === null || row.received === null ? null : row.expected - row.received

  return (
    <div className="lr-tooltip">
      <p className="lr-tooltip-time">{new Date(row.at).toLocaleTimeString()}</p>
      <p>
        <strong>{count(row.published)}</strong> published<span className="lr-dim"> · {count(row.clients)} of {count(row.peakClients)} reporting</span>
      </p>
      <p>
        <span className="lr-key lr-key-2" />
        <strong>{rate(mark.expected)}</strong> expected<span className="lr-dim"> · {count(row.expected)} frames</span>
      </p>
      <p>
        <span className="lr-key lr-key-1" />
        <strong>{rate(mark.delivered)}</strong> delivered<span className="lr-dim"> · {count(row.received)} frames</span>
      </p>
      {dropped !== null && (
        <p><strong>{dropped.toLocaleString()}</strong> dropped</p>
      )}
      {mark.p99Lag !== null && (
        <p><strong>{ms(mark.p99Lag)}</strong> lag p99<span className="lr-dim"> · mean {ms(mark.meanLag)}</span></p>
      )}
      {mark.cpuAvg !== null && (
        <p><strong>{mark.cpuAvg.toFixed(1)}%</strong> cpu<span className="lr-dim">{mark.cpuBand ? ` · ${mark.cpuBand[0].toFixed(1)}–${mark.cpuBand[1].toFixed(1)} range` : ''}</span></p>
      )}
    </div>
  )
}

const endLabel = (last: number, show: boolean) => ({ x, y, index, value }: LabelProps) => {
  if (!show || index !== last || value === null || value === undefined || x === undefined || y === undefined) return <g />

  return <text x={Number(x) - 8} y={Number(y) - 10} textAnchor="end" className="lr-mark-label">{ms(Number(value))}</text>
}

const CableRunCharts = ({ rows, cpu = [], statsOpen = false }: Props) => {
  const [showTable, setShowTable] = useState(false)
  const [hovered, setHovered] = useState<Panel | null>(null)

  if (!rows.length) return <p className="lr-message">No samples for this run yet.</p>

  const times = rows.map((row) => new Date(row.at).getTime())
  const deltas = times.slice(1).map((time, index) => time - times[index])
  const bucketMs = deltas.length ? Math.min(...deltas) : DEFAULT_BUCKET_MS
  const bucketSeconds = bucketMs / 1000
  const gapMs = bucketMs * 2

  const cpuByTime = new Map(cpu.map((point) => [new Date(point.at).getTime(), point]))
  const hasCpu = cpu.some((point) => point.average !== null)
  const hasLag = rows.some((row) => row.meanLagMs !== null || row.p99LagMs !== null)

  const series: Mark[] = []

  rows.forEach((row, index) => {
    const t = times[index]
    const previousAt = times[index - 1]

    if (previousAt !== undefined && t - previousAt > gapMs) {
      series.push({ t: previousAt + 1, expected: null, delivered: null, shortfall: null, meanLag: null, p99Lag: null, lagBand: null, cpuAvg: null, cpuBand: null, row: null })
    }

    const point = cpuByTime.get(Math.floor(t / 60000) * 60000)
    const expected = row.expected === null ? null : row.expected / bucketSeconds
    const delivered = row.received === null ? null : row.received / bucketSeconds
    const bothLags = row.meanLagMs !== null && row.p99LagMs !== null

    series.push({
      t,
      expected,
      delivered,
      shortfall: expected !== null && delivered !== null ? [delivered, expected] : null,
      meanLag: row.meanLagMs,
      p99Lag: row.p99LagMs,
      lagBand: bothLags ? [row.meanLagMs!, row.p99LagMs!] : null,
      cpuAvg: point?.average ?? null,
      cpuBand: point && point.minimum !== null && point.maximum !== null ? [point.minimum, point.maximum] : null,
      row
    })
  })

  const clock = (t: number) => new Date(t).toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' })
  const last = series.length - 1
  const tail = series[last]
  const spread = Math.max(...rows.map((row) => row.p99LagMs ?? 0))
  const labelEnds = tail.meanLag !== null && tail.p99Lag !== null && Math.abs(tail.p99Lag - tail.meanLag) > spread * 0.08

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

  const axis = {
    type: 'number' as const,
    dataKey: 't',
    domain: ['dataMin', 'dataMax'] as [string, string]
  }

  const ticked = { minTickGap: 48, tickLine: false, tick: { fontSize: 11 }, tickFormatter: clock }

  const axisPanel: Panel = hasCpu ? 'cpu' : hasLag ? 'lag' : 'fanout'
  const axisFor = (panel: Panel) => (panel === axisPanel ? ticked : { hide: true })
  const chartClass = (panel: Panel) => `lr-chart ${panel === axisPanel ? 'lr-chart-axis' : ''}`

  const legendText = (value: string) => <span className="lr-legend-text">{value}</span>

  const readout = (panel: Panel) => (hovered === panel ? <CableTooltip /> : () => null)

  const dot = (panel: Panel) => (hovered === panel ? { r: 4, strokeWidth: 0 } : false)

  const watch = (panel: Panel) => ({
    onPointerMove: () => setHovered((current) => (current === panel ? current : panel)),
    onPointerLeave: () => setHovered((current) => (current === panel ? null : current))
  })

  return (
    <div className="lr-panels">
      <div className="lr-head">
        <div>
          <h3 className="lr-title">PriceChannel broadcast</h3>
          <p className="lr-subtitle">{bucketSeconds}s buckets · shaded band is the fan-out shortfall, frames the publisher sent that no client reported</p>
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
                <th>Bucket</th><th>Published</th><th>Reporting</th><th>Expected</th><th>Delivered</th><th>Dropped</th>
                <th>Mean lag</th><th>p99 lag</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.at}>
                  <td>{new Date(row.at).toLocaleTimeString()}</td>
                  <td>{count(row.published)}</td>
                  <td>{count(row.clients)}</td>
                  <td>{count(row.expected)}</td>
                  <td>{count(row.received)}</td>
                  <td>{row.expected === null || row.received === null ? '-' : (row.expected - row.received).toLocaleString()}</td>
                  <td>{row.meanLagMs === null ? '-' : Math.round(row.meanLagMs).toLocaleString()}</td>
                  <td>{row.p99LagMs === null ? '-' : Math.round(row.p99LagMs).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <p className="lr-panel-label">Fan-out (frames/s)</p>
          <div className={chartClass('fanout')} {...watch('fanout')}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} syncId="cable-run" margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
                <XAxis {...axis} {...axisFor('fanout')} />
                <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip content={readout('fanout')} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                <Area type="monotone" dataKey="shortfall" stroke="none" fill="var(--dc-series-2)" fillOpacity={0.1} legendType="none" tooltipType="none" activeDot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="expected" name="expected" stroke="var(--dc-series-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={dot('fanout')} isAnimationActive={false} />
                <Line type="monotone" dataKey="delivered" name="delivered" stroke="var(--dc-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={dot('fanout')} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {hasLag && (
            <>
              <p className="lr-panel-label">Delivery lag (ms)</p>
              <div className={chartClass('lag')} {...watch('lag')}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} syncId="cable-run" margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
                    <XAxis {...axis} {...axisFor('lag')} />
                    <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip content={readout('lag')} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                    <Area type="monotone" dataKey="lagBand" stroke="none" fill="var(--dc-series-2)" fillOpacity={0.1} legendType="none" tooltipType="none" activeDot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="p99Lag" name="p99" stroke="var(--dc-series-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={dot('lag')} isAnimationActive={false} label={endLabel(last, labelEnds)} />
                    <Line type="monotone" dataKey="meanLag" name="mean" stroke="var(--dc-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={dot('lag')} isAnimationActive={false} label={endLabel(last, labelEnds)} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {hasCpu && (
            <>
              <p className="lr-panel-label">CPU (%)</p>
              <div className={chartClass('cpu')} {...watch('cpu')}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} syncId="cable-run" margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
                    <XAxis {...axis} {...axisFor('cpu')} />
                    <YAxis width={56} domain={[0, (max: number) => Math.max(100, Math.ceil(max))]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                    <Tooltip content={readout('cpu')} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="cpuBand" stroke="none" fill="var(--dc-series-1)" fillOpacity={0.1} connectNulls activeDot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="cpuAvg" name="cpu" stroke="var(--dc-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} connectNulls activeDot={dot('cpu')} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </>
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
          <p className="lr-stat-label">Delivered</p>
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
