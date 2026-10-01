import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ResourcePoint } from '../../lib/types.ts'

interface Props {
  points: ResourcePoint[]
  from: number
  to: number
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

const IngesterResourceChart = ({ points, from, to }: Props) => {
  const times = points.map((point) => new Date(point.at).getTime())
  const step = Math.min(...times.slice(1).map((t, index) => t - times[index]))

  const series: Mark[] = []

  points.forEach((point, index) => {
    if (index > 0 && times[index] - times[index - 1] > step * 2) {
      series.push({ t: times[index - 1] + 1, cpu: null, memory: null, point: null })
    }

    series.push({ t: times[index], cpu: point.cpu, memory: point.memory, point })
  })

  const sameDay = to - from <= 24 * 60 * 60 * 1000

  return (
    <div className="ing-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            type="number"
            dataKey="t"
            domain={[from, to]}
            minTickGap={48}
            tickLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(t) => new Date(t).toLocaleString('en-us', sameDay ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric' })}
          />
          <YAxis width={56} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<ResourceTooltip />} cursor={false} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          <Line type="linear" dataKey="cpu" name="cpu" stroke="var(--dc-series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line type="linear" dataKey="memory" name="memory" stroke="var(--dc-series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IngesterResourceChart
