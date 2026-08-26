import React, { useLayoutEffect, useRef, useState } from 'react'
import { LineChart, Line, Tooltip, ResponsiveContainer, YAxis, usePlotArea } from 'recharts'
import '../stylesheets/chart.css'
import type { ChartData } from '../lib/types.ts'

interface Props {
  chartData: ChartData[]
  onHover?: (point: ChartData | null) => void
}

const ChartLabel = ({ date, x }: { date: string; x: number }) => {
  const plotArea = usePlotArea()
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    if (ref.current) setWidth(ref.current.offsetWidth)
  }, [date])

  const half = width / 2
  const leftLimit = (plotArea?.x ?? 0) + half
  const rightLimit = (plotArea?.x ?? 0) + (plotArea?.width ?? 0) - half
  const shift = Math.min(Math.max(x, leftLimit), rightLimit) - x

  return (
    <div ref={ref} className="chart-label" style={{ transform: `translateX(calc(-50% + ${shift}px))` }}>
      {date}
    </div>
  )
}

const Chart = React.memo(({ chartData, onHover }: Props) => {
  return (
    <ResponsiveContainer width="100%" height={'100%'}>
      <LineChart
        data={chartData}
        margin={{ top: 28, right: 5, bottom: 5, left: 5 }}
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
        <Tooltip
          cursor={{ strokeWidth: 1 }}
          isAnimationActive={false}
          offset={0}
          position={{ y: 0 }}
          allowEscapeViewBox={{ x: true }}
          content={({ active, payload, coordinate }) => {
            if (!active || !payload?.length || coordinate?.x == null) return null
            const point = payload[0].payload as ChartData
            return <ChartLabel date={point.date} x={coordinate.x} />
          }}
        />
        <YAxis domain={[(dataMin) => dataMin * 0.95, (dataMax) => dataMax * 1.05]} hide={true} />
      </LineChart>
    </ResponsiveContainer>
  )
})

export default Chart
