import React from 'react'
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis } from 'recharts'
import type { ChartData } from '../lib/types.ts'

interface Props {
  chartData: ChartData[]
  onHover?: (point: ChartData | null) => void
}

const Chart = React.memo(({ chartData, onHover }: Props) => {
  return (
    <ResponsiveContainer width="100%" height={'100%'}>
      <LineChart
        data={chartData}
        onMouseMove={(state) => {
          // recharts v3 hands activeTooltipIndex over as a string ("3"), not a number.
          const rawIndex = state?.activeTooltipIndex
          const index = rawIndex == null ? -1 : Number(rawIndex)
          const isHovering = state?.isTooltipActive === true && index >= 0
          onHover?.(isHovering ? chartData[index] ?? null : null)
        }}
        onMouseLeave={() => onHover?.(null)}
      >
        <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={false} />
        {/* Renders nothing, but keeps Recharts tracking the active point so the
            line still shows its hover dot. The value is displayed in the header. */}
        <Tooltip cursor={false} content={() => null} />
        <YAxis domain={[(dataMin) => dataMin * 0.95, (dataMax) => dataMax * 1.05]} hide={true} />
      </LineChart>
    </ResponsiveContainer>
  )
})

export default Chart
