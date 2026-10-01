import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import { INGESTER_SYNC, nearestTick, panelHeight, timeTick } from './ingesterTime'
import type { IngesterLagPoint } from '../../lib/types.ts'

interface Props {
  points: IngesterLagPoint[]
  from: number
  to: number
  axis: boolean
  readout: boolean
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

const IngesterLagChart = ({ points, from, to, axis, readout }: Props) => {

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

  return (
    <div className="ing-panel">
      <ResponsiveContainer width="100%" height={panelHeight(axis)}>
        <LineChart data={series} syncId={INGESTER_SYNC} syncMethod={nearestTick} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" dataKey="t" domain={[from, to]} hide={!axis} minTickGap={48} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={timeTick(from, to)} />
          <YAxis width={56} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
          <Tooltip content={readout ? <LagTooltip /> : () => null} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
          <ReferenceLine y={0} stroke="var(--dc-border-strong)" strokeWidth={1} />
          <Line type="monotone" dataKey="meanExcessMs" name="mean lag (ms)" stroke="var(--dc-series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default IngesterLagChart
