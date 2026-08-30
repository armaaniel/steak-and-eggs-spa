import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { IngesterRatePoint } from '../../lib/types.ts'

interface Props {
  points: IngesterRatePoint[]
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: IngesterRatePoint }[]
}

// symbols ride in the tooltip rather than on the plot: a symbol count is not a
// per-second rate, and a second y-scale to fit it would misstate both series
const RateTooltip = ({ active, payload }: TooltipProps) => {
  if (!active || !payload?.length) return null

  const point = payload[0].payload

  return (
    <div className="ing-tooltip">
      <p className="ing-tooltip-time">{new Date(point.at).toLocaleString()}</p>
      <p>{point.eventsPerSec?.toFixed(1) ?? '-'} events/sec</p>
      <p>{point.framesPerSec?.toFixed(1) ?? '-'} frames/sec</p>
      <p>{point.symbols ?? '-'} symbols</p>
    </div>
  )
}

const IngesterRateChart = ({ points }: Props) => {
  return (
    <div className="ing-chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="at" minTickGap={48} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(at) => new Date(at).toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' })} />
          <YAxis width={44} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <Tooltip content={<RateTooltip />} cursor={false} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="eventsPerSec" name="events/sec" stroke="var(--dc-series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
          <Line type="monotone" dataKey="framesPerSec" name="frames/sec" stroke="var(--dc-series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IngesterRateChart
