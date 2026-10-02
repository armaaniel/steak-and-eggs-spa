import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ms } from './runCharts'
import type { Trace } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  traces: Trace[]
  from: number
  to: number
  selectedId: string | null
  onSelect: (trace: Trace) => void
}

interface Point {
  t: number
  duration: number
  trace: Trace
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Point }[]
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: Point
}

const ScatterTooltip = ({ active, payload }: TooltipProps) => {
  const trace = payload?.[0]?.payload.trace

  if (!active || !trace) return null

  return (
    <div className="lr-tooltip">
      <p className="lr-tooltip-time">{new Date(trace.createdAt).toLocaleString()}</p>
      <p><strong>{trace.duration < 1 ? '<1 ms' : ms(trace.duration)}</strong> · {trace.status}</p>
      <p>{trace.endpoint}</p>
    </div>
  )
}

const TraceScatter = ({ traces, from, to, selectedId, onSelect }: Props) => {
  const points: Point[] = traces
    .map((trace) => ({ t: new Date(trace.createdAt).getTime(), duration: Math.max(trace.duration, 1), trace }))
    .filter((point) => point.t >= from && point.t < to)

  const top = 10 ** Math.ceil(Math.log10(Math.max(10, ...points.map((point) => point.duration))))
  const ticks = Array.from({ length: Math.log10(top) + 1 }, (_, power) => 10 ** power)

  const dot = ({ cx, cy, payload }: DotProps) => {
    if (cx == null || cy == null || !payload) return <g />

    const selected = payload.trace.id === selectedId
    const fill = payload.trace.status >= 500 ? 'var(--dc-status-critical)' : 'var(--dc-series-1)'

    return <circle cx={cx} cy={cy} r={selected ? 5 : 3} fill={fill} fillOpacity={selected ? 1 : 0.55} stroke={selected ? 'var(--dc-text)' : 'none'} style={{ cursor: 'pointer' }} />
  }

  return (
    <>
      <p className="lr-panel-label">Latency (ms, log scale) · one dot per request</p>
      <div className="lr-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
            <XAxis type="number" dataKey="t" domain={[from, to]} hide />
            <YAxis type="number" dataKey="duration" scale="log" domain={[1, top]} ticks={ticks} width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} allowDataOverflow />
            <Tooltip content={<ScatterTooltip />} cursor={false} isAnimationActive={false} />
            <Scatter data={points} shape={dot} isAnimationActive={false} onClick={(point: { payload?: Point }) => point.payload && onSelect(point.payload.trace)} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export default TraceScatter
