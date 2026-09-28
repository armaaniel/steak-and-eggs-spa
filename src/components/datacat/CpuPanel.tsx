import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { axis, ticked } from './runCharts'

interface Props {
  series: object[]
  syncId: string
  tooltip: React.ComponentProps<typeof Tooltip>['content']
  activeDot: React.ComponentProps<typeof Line>['activeDot']
  pointerHandlers: { onPointerMove: () => void; onPointerLeave: () => void }
}

export const CpuReadout = ({ avg, band }: { avg: number | null; band: [number, number] | null }) => {
  if (avg === null) return null

  return (
    <p><strong>{avg.toFixed(1)}%</strong> cpu<span className="lr-dim">{band ? ` · ${band[0].toFixed(1)}–${band[1].toFixed(1)} range` : ''}</span></p>
  )
}

const CpuPanel = ({ series, syncId, tooltip, activeDot, pointerHandlers }: Props) => {
  return (
    <>
      <p className="lr-panel-label">CPU (%)</p>
      <div className="lr-chart lr-chart-axis" {...pointerHandlers}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} syncId={syncId} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--dc-border)" strokeDasharray="none" />
            <XAxis {...axis} {...ticked} />
            <YAxis width={56} domain={[0, (max: number) => Math.max(100, Math.ceil(max))]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip content={tooltip} cursor={{ stroke: 'var(--dc-border-strong)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="cpuBand" stroke="none" fill="var(--dc-series-1)" fillOpacity={0.1} connectNulls activeDot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="cpuAvg" name="cpu" stroke="var(--dc-series-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dot={false} connectNulls activeDot={activeDot} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export default CpuPanel
