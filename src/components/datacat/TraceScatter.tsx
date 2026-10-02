import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ms } from './runCharts'
import type { ScatterPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

interface Props {
  points: ScatterPoint[]
  from: number
  to: number
  selectedId: string | null
  onSelect: (point: ScatterPoint) => void
}

interface Mark {
  t: number
  duration: number
  point: ScatterPoint
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Mark }[]
}

interface DotProps {
  cx?: number
  cy?: number
  payload?: Mark
}

const ScatterTooltip = ({ active, payload }: TooltipProps) => {
  const point = payload?.[0]?.payload.point

  if (!active || !point) return null

  return (
    <div className="lr-tooltip">
      <p className="lr-tooltip-time">{new Date(point.at).toLocaleString()}</p>
      <p><strong>{point.duration < 1 ? '<1 ms' : ms(point.duration)}</strong> · {point.status ?? '-'}</p>
      {point.count > 1 && <p className="lr-dim">slowest of {point.count.toLocaleString()} requests here</p>}
    </div>
  )
}

const DOT_OPACITY = 0.55

const density = (count: number) => 1 - (1 - DOT_OPACITY) ** count

const TraceScatter = ({ points, from, to, selectedId, onSelect }: Props) => {
  const marks: Mark[] = points.map((point) => ({ t: new Date(point.at).getTime(), duration: Math.max(point.duration, 1), point }))

  const top = Math.max(1, ...marks.map((mark) => mark.duration)) * 1.2
  const ticks = Array.from({ length: Math.floor(Math.log10(top)) + 1 }, (_, power) => 10 ** power)

  const dot = ({ cx, cy, payload }: DotProps) => {
    if (cx == null || cy == null || !payload) return <g />

    const selected = payload.point.id === selectedId
    const fill = (payload.point.status ?? 0) >= 500 ? 'var(--dc-status-critical)' : 'var(--dc-series-1)'

    return <circle cx={cx} cy={cy} r={selected ? 5 : 3} fill={fill} fillOpacity={selected ? 1 : density(payload.point.count)} stroke={selected ? 'var(--dc-text)' : 'none'} style={{ cursor: 'pointer' }} />
  }

  return (
    <>
      <p className="lr-panel-label">Latency (ms, log scale)</p>
      <div className="lr-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} horizontalValues={ticks} stroke="var(--dc-border)" strokeDasharray="none" />
            <XAxis type="number" dataKey="t" domain={[from, to]} hide />
            <YAxis type="number" dataKey="duration" scale="log" domain={[1, top]} ticks={ticks} width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} allowDataOverflow />
            <Tooltip content={<ScatterTooltip />} cursor={false} isAnimationActive={false} />
            <Scatter data={marks} shape={dot} isAnimationActive={false} onClick={(mark: { payload?: Mark }) => mark.payload && onSelect(mark.payload.point)} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export default TraceScatter
