import type { RunMetricPoint } from '../../lib/types.ts'

interface LabelProps {
  x?: number | string
  y?: number | string
  index?: number
  value?: number | string | boolean | null
}

export const ms = (v: number | null | undefined) =>
  v === null || v === undefined ? '-' : `${Math.round(v).toLocaleString()} ms`

export const endLabel = (last: number, show: boolean) => ({ x, y, index, value }: LabelProps) => {
  if (!show || index !== last || value === null || value === undefined || x === undefined || y === undefined) return <g />

  return <text x={Number(x) - 8} y={Number(y) - 10} textAnchor="end" className="lr-mark-label">{ms(Number(value))}</text>
}

const clock = (t: number) => new Date(t).toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' })

export const axis = {
  type: 'number' as const,
  dataKey: 't',
  domain: ['dataMin', 'dataMax'] as [string, string]
}

export const ticked = { minTickGap: 48, tickLine: false, tick: { fontSize: 11 }, tickFormatter: clock }

export const legendText = (value: string) => <span className="lr-legend-text">{value}</span>

export const toCpuLookup = (cpu: RunMetricPoint[]) => {
  const cpuByTime = new Map(cpu.map((point) => [new Date(point.at).getTime(), point]))

  return (t: number) => {
    const point = cpuByTime.get(Math.floor(t / 60000) * 60000)
    const cpuBand: [number, number] | null = point && point.minimum !== null && point.maximum !== null ? [point.minimum, point.maximum] : null

    return { cpuAvg: point?.average ?? null, cpuBand }
  }
}
