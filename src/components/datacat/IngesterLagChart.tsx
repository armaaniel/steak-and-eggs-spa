import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { IngesterLagPoint } from '../../lib/types.ts'

interface Props {
  points: IngesterLagPoint[]
  from: number
  to: number
}

interface Mark {
  t: number
  meanExcessMs: number | null
  point: IngesterLagPoint | null
}

interface TooltipProps {
  active?: boolean
  payload?: { payload: Mark }[]
}

// the ingester samples once a minute; anything past two and a half intervals is a
// stretch where it wasn't streaming, not a slow tick
const GAP_MS = 150_000

const LagTooltip = ({ active, payload }: TooltipProps) => {
  const point = payload?.[0]?.payload.point

  if (!active || !point) return null

  return (
    <div className="ing-tooltip">
      <p className="ing-tooltip-time">{new Date(point.at).toLocaleString()}</p>
      <p>{point.meanExcessMs === null ? '-' : `${Math.round(point.meanExcessMs).toLocaleString()} ms mean`}</p>
      <p>{point.sampledEvents?.toLocaleString() ?? '-'} events</p>
      <p>{point.symbols ?? '-'} symbols</p>
    </div>
  )
}

const IngesterLagChart = ({ points, from, to }: Props) => {

  // The resolver keeps any sample that carried events, so overnights and outages —
  // stretches where nothing arrived at all — leave holes. A null between them breaks
  // the line there rather than ruling a straight edge across a weekend as though the
  // feed had been running the whole time.
  const series: Mark[] = []

  points.forEach((point, index) => {
    const at = new Date(point.at).getTime()
    const previous = points[index - 1]

    if (previous) {
      const previousAt = new Date(previous.at).getTime()

      if (at - previousAt > GAP_MS) {
        series.push({ t: previousAt + 1, meanExcessMs: null, point: null })
      }
    }

    series.push({ t: at, meanExcessMs: point.meanExcessMs, point })
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
          <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
          <Tooltip content={<LagTooltip />} cursor={false} />
          {/* zero is the feed's baseline delay — below it, events beat the baseline */}
          <ReferenceLine y={0} stroke="var(--dc-border-strong)" strokeWidth={1} />
          <Line type="monotone" dataKey="meanExcessMs" name="mean lag (ms)" stroke="var(--dc-series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IngesterLagChart
