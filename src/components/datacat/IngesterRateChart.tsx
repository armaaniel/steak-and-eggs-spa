import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { INGESTER_SYNC, nearestTick, panelHeight, timeTick } from './ingesterTime'
import type { IngesterRatePoint } from '../../lib/types.ts'

interface Props {
  points: IngesterRatePoint[]
  from: number
  to: number
  axis: boolean
  readout: boolean
}

interface Mark {
  t: number
  eventsPerSec: number | null
  framesPerSec: number | null
  point: IngesterRatePoint
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Mark }[]
}

const RateTooltip = ({ active, payload }: TooltipProps) => {
  const point = payload?.[0]?.payload.point

  if (!active || !point) return null

  return (
    <div className="ing-tooltip">
      <p className="ing-tooltip-time">{new Date(point.at).toLocaleString()}</p>
      <p>{point.framesPerSec?.toFixed(1) ?? '-'} frames/sec</p>
      <p>{point.eventsPerSec?.toFixed(1) ?? '-'} events/sec</p>
      <p>{point.meanExcessMs === null ? '-' : `${Math.round(point.meanExcessMs).toLocaleString()} ms mean lag`}</p>
      <p>{point.meanProcessMs === null ? '-' : `${point.meanProcessMs.toFixed(2)} ms process/frame`}</p>
      <p>{point.meanIdleMs === null ? '-' : `${point.meanIdleMs.toFixed(2)} ms idle/frame`}</p>
      <p>{point.symbols ?? '-'} symbols</p>
    </div>
  )
}

const IngesterRateChart = ({ points, from, to, axis, readout }: Props) => {
  const series: Mark[] = points.map((point) => ({ t: new Date(point.at).getTime(), eventsPerSec: point.eventsPerSec, framesPerSec: point.framesPerSec, point }))

  return (
    <div className="ing-panel">
      <ResponsiveContainer width="100%" height={panelHeight(axis)}>
        <LineChart data={series} syncId={INGESTER_SYNC} syncMethod={nearestTick} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" dataKey="t" domain={[from, to]} hide={!axis} minTickGap={48} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={timeTick(from, to)} />
          <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip content={readout ? <RateTooltip /> : () => null} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="eventsPerSec" name="events/sec" stroke="var(--dc-series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="framesPerSec" name="frames/sec" stroke="var(--dc-series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IngesterRateChart
