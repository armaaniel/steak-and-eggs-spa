import { useState } from 'react'
import { AreaChart, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { LoadCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  rows: LoadCompareRow[]
  route: string
  step?: number
  cpu?: RunMetricPoint[]
  statsOpen?: boolean
}

interface Mark {
  t: number
  rps: number | null
  clientP99: number | null
  serverP99: number | null
  // the vertical distance between the two p99 lines — time the request existed but
  // Rails wasn't working on it yet. Recharts draws a [low, high] pair as a band.
  band: [number, number] | null
  gap: number | null
  errors: number | null
  cpuAvg: number | null
  cpuBand: [number, number] | null
  row: LoadCompareRow | null
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Mark }[]
}

// recharts hands its label renderers x/y as either number or string, and wants a
// element back rather than null — an empty <g> is how a label opts out of drawing.
interface LabelProps {
  x?: number | string
  y?: number | string
  index?: number
  value?: number | string | boolean | null
}

const ms = (v: number | null | undefined) =>
  v === null || v === undefined ? '-' : `${Math.round(v).toLocaleString()} ms`

// One readout for all three panels: they share a syncId, so whichever panel the pointer
// is over, the reader gets every measure for that bucket rather than the one they hit.
const RunTooltip = ({ active, payload }: TooltipProps) => {
  const mark = payload?.[0]?.payload
  const row = mark?.row

  if (!active || !mark || !row) return null

  return (
    <div className="lr-tooltip">
      <p className="lr-tooltip-time">{new Date(row.bucket).toLocaleTimeString()}</p>
      <p><strong>{row.rps.toLocaleString()}</strong> rps<span className="lr-dim"> · {row.sent.toLocaleString()} sent</span></p>
      <p>
        <span className="lr-key lr-key-client" />
        <strong>{ms(row.clientP99)}</strong> client p99<span className="lr-dim"> · p50 {ms(row.clientP50)}</span>
      </p>
      <p>
        <span className="lr-key lr-key-server" />
        <strong>{ms(row.serverP99)}</strong> server p99<span className="lr-dim"> · p50 {ms(row.serverP50)}</span>
      </p>
      <p><strong>{ms(row.queueP99)}</strong> queued<span className="lr-dim"> (p99 client − p99 server)</span></p>
      <p><strong>{row.gap.toLocaleString()}</strong> untraced<span className="lr-dim"> · {row.errors.toLocaleString()} errors</span></p>
      {mark.cpuAvg !== null && (
        <p><strong>{mark.cpuAvg.toFixed(1)}%</strong> cpu<span className="lr-dim">{mark.cpuBand ? ` · ${mark.cpuBand[0].toFixed(1)}–${mark.cpuBand[1].toFixed(1)} range` : ''}</span></p>
      )}
    </div>
  )
}

// Direct labels ride the marks, but only where they say something: the end of each
// latency line, and the single worst failure column. A number on every bucket is noise.
const endLabel = (last: number, show: boolean) => ({ x, y, index, value }: LabelProps) => {
  if (!show || index !== last || value === null || value === undefined || x === undefined || y === undefined) return <g />

  return <text x={Number(x) - 8} y={Number(y) - 10} textAnchor="end" className="lr-mark-label">{ms(Number(value))}</text>
}

type Panel = 'rps' | 'latency' | 'cpu'

const LoadRunCharts = ({ rows, route, step = 15, cpu = [], statsOpen = false }: Props) => {
  const [showTable, setShowTable] = useState(false)
  // the panels share a syncId so one pointer moves every crosshair, but that also gives
  // every panel its own tooltip at once — only the one under the pointer gets to speak
  const [hovered, setHovered] = useState<Panel | null>(null)

  if (!rows.length) return <p className="lr-message">No samples for this route yet.</p>

  // A bucket with no samples isn't returned at all, so a paused or crashed generator
  // would otherwise get a straight line ruled across the hole. A null breaks it instead.
  const gapMs = step * 2000
  const series: Mark[] = []

  const cpuByTime = new Map(cpu.map((point) => [new Date(point.at).getTime(), point]))
  const hasCpu = cpu.some((point) => point.average !== null)

  rows.forEach((row, index) => {
    const t = new Date(row.bucket).getTime()
    const previous = rows[index - 1]

    if (previous) {
      const previousAt = new Date(previous.bucket).getTime()

      if (t - previousAt > gapMs) {
        series.push({ t: previousAt + 1, rps: null, clientP99: null, serverP99: null, band: null, gap: null, errors: null, cpuAvg: null, cpuBand: null, row: null })
      }
    }

    const point = cpuByTime.get(Math.floor(t / 60000) * 60000)

    series.push({
      t,
      cpuAvg: point?.average ?? null,
      cpuBand: point && point.minimum !== null && point.maximum !== null ? [point.minimum, point.maximum] : null,
      rps: row.rps,
      clientP99: row.clientP99,
      serverP99: row.serverP99,
      band: [row.serverP99, row.clientP99],
      gap: row.gap,
      errors: row.errors,
      row
    })
  })

  const clock = (t: number) => new Date(t).toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' })
  const last = series.length - 1
  const tail = series[last]
  const spread = Math.max(...rows.map((r) => r.clientP99))

  // When the two lines finish on top of each other, two end labels land on top of each
  // other too. Leave them off and let the legend and tooltip carry it.
  const labelEnds = !!tail.row && Math.abs(tail.row.clientP99 - tail.row.serverP99) > spread * 0.08

  const totals = rows.reduce(
    (sum, row) => ({
      sent: sum.sent + row.sent,
      traced: sum.traced + row.traced,
      gap: sum.gap + row.gap,
      errors: sum.errors + row.errors
    }),
    { sent: 0, traced: 0, gap: 0, errors: 0 }
  )

  const axis = {
    type: 'number' as const,
    dataKey: 't',
    domain: ['dataMin', 'dataMax'] as [string, string]
  }

  const ticked = { minTickGap: 48, tickLine: false, tick: { fontSize: 11 }, tickFormatter: clock }

  // recharts paints legend text in the series color by default; identity belongs to the
  // mark beside the label, so the text goes back to the ordinary ink token
  const legendText = (value: string) => <span className="lr-legend-text">{value}</span>

  const readout = (panel: Panel) => (hovered === panel ? <RunTooltip /> : () => null)

  const dot = (panel: Panel) => (hovered === panel ? { r: 4, strokeWidth: 0 } : false)

  // native pointer events on the wrapper: recharts 3 doesn't forward onMouseMove from the
  // chart, and pointermove (rather than pointerenter) still fires if the panel re-renders
  // under a pointer that is already sitting inside it
  const watch = (panel: Panel) => ({
    onPointerMove: () => setHovered((current) => (current === panel ? current : panel)),
    onPointerLeave: () => setHovered((current) => (current === panel ? null : current))
  })

  return (
    <div className="lr-panels">
      <div className="lr-head">
        <div>
          <h3 className="lr-title">{route}</h3>
          <p className="lr-subtitle">{step}s buckets · shaded band is queue delay, the p99 the client waited that Rails never saw</p>
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
                <th>Client p50</th><th>Client p99</th><th>Server p50</th><th>Server p99</th><th>Queued p99</th>
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
                  <td>{Math.round(row.queueP99).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Offered load. Its own panel because rps and milliseconds cannot share a y-axis. */}
          <p className="lr-panel-label">Throughput (rps)</p>
          <div className="lr-chart" {...watch('rps')}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} syncId="load-run" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
                <XAxis {...axis} hide />
                <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip content={readout('rps')} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="rps" stroke="var(--dc-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="var(--dc-series-1)" fillOpacity={0.1} dot={false} activeDot={dot('rps')} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="lr-panel-label">p99 latency (ms)</p>
          <div className={`lr-chart ${hasCpu ? '' : 'lr-chart-axis'}`} {...watch('latency')}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} syncId="load-run" margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
                <XAxis {...axis} {...(hasCpu ? { hide: true } : ticked)} />
                <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
                <Tooltip content={readout('latency')} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
                <Area type="monotone" dataKey="band" stroke="none" fill="var(--dc-series-2)" fillOpacity={0.1} legendType="none" tooltipType="none" activeDot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="clientP99" name="client p99" stroke="var(--dc-series-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={dot('latency')} isAnimationActive={false} label={endLabel(last, labelEnds)} />
                <Line type="monotone" dataKey="serverP99" name="server p99" stroke="var(--dc-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={dot('latency')} isAnimationActive={false} label={endLabel(last, labelEnds)} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {hasCpu && (
            <>
              <p className="lr-panel-label">CPU (%) · band is min to max</p>
              <div className="lr-chart lr-chart-axis" {...watch('cpu')}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} syncId="load-run" margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
                    <XAxis {...axis} {...ticked} />
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
