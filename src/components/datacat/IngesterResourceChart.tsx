import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { INGESTER_SYNC, nearestTick, timeTick } from './ingesterTime'
import type { ResourcePoint } from '../../lib/types.ts'

interface Props {
  points: ResourcePoint[]
  from: number
  to: number
  axis: boolean
  readout: boolean
}

interface Mark {
  t: number
  cpu: number | null
  memory: number | null
  point: ResourcePoint | null
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Mark }[]
}

const percent = (value: number | null) => (value === null ? '-' : `${value.toFixed(1)}%`)

const ResourceTooltip = ({ active, payload }: TooltipProps) => {
  const point = payload?.[0]?.payload.point

  if (!active || !point) return null

  return (
    <div className="ing-tooltip">
      <p className="ing-tooltip-time">{new Date(point.at).toLocaleString()}</p>
      <p>{percent(point.cpu)} cpu</p>
      <p>{percent(point.memory)} memory</p>
    </div>
  )
}

const IngesterResourceChart = ({ points, from, to, axis, readout }: Props) => {
  const times = points.map((point) => new Date(point.at).getTime())
  const step = Math.min(...times.slice(1).map((t, index) => t - times[index]))

  const series: Mark[] = []

  points.forEach((point, index) => {
    if (index > 0 && times[index] - times[index - 1] > step * 2) {
      series.push({ t: times[index - 1] + 1, cpu: null, memory: null, point: null })
    }

    series.push({ t: times[index], cpu: point.cpu, memory: point.memory, point })
  })

  return (
    <div className={`ing-panel ${axis ? 'axis' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} syncId={INGESTER_SYNC} syncMethod={nearestTick} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" dataKey="t" domain={[from, to]} hide={!axis} minTickGap={48} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={timeTick(from, to)} />
          <YAxis width={56} domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={readout ? <ResourceTooltip /> : () => null} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          <Line type="linear" dataKey="cpu" name="cpu" stroke="var(--dc-series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line type="linear" dataKey="memory" name="memory" stroke="var(--dc-series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IngesterResourceChart
