import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import '../../stylesheets/datacat/dependencies.css'

interface Point {
  at: string
  value: number
}

interface Props {
  points: Point[]
  color: string
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Point }[]
}

const SparkTooltip = ({ active, payload }: TooltipProps) => {
  const point = payload?.[0]?.payload

  if (!active || !point) return null

  return (
    <div className="dep-spark-tooltip">
      {new Date(point.at).toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' })} · {point.value.toFixed(1)}%
    </div>
  )
}

const Sparkline = ({ points, color }: Props) => {
  return (
    <div className="dep-spark">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <XAxis dataKey="at" hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip content={<SparkTooltip />} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default Sparkline
