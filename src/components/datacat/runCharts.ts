import type { RunMetricPoint } from '../../lib/types.ts'
import type { ChartLine } from './TimeSeriesChart'

export const SERIES_ONE = 'var(--dc-series-1)'
export const SERIES_TWO = 'var(--dc-series-2)'
const MEMORY_COLOR = 'var(--dc-memory)'
export const RUN_STROKE_WIDTH = 2

export function toTime(at: string) {
  return new Date(at).getTime()
}

export function formatMs(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '-'
  }

  return `${Math.round(value).toLocaleString()} ms`
}

export function formatWhole(value: number) {
  return Math.round(value).toLocaleString()
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

export function toCpuLines(cpu: RunMetricPoint[]): ChartLine[] {
  return [{ key: 'cpu', label: 'cpu', color: SERIES_ONE, points: cpu.map((point) => ({ time: toTime(point.at), value: point.average })), formatValue: formatPercent }]
}

export function toMemoryLines(memory: RunMetricPoint[]): ChartLine[] {
  return [{ key: 'memory', label: 'memory', color: MEMORY_COLOR, points: memory.map((point) => ({ time: toTime(point.at), value: point.average })), formatValue: formatPercent }]
}

function hasAverage(points: RunMetricPoint[]) {
  return points.some((point) => point.average !== null)
}

export function toResourceLines(cpu: RunMetricPoint[], memory: RunMetricPoint[]): ChartLine[] {
  const lines: ChartLine[] = []

  if (hasAverage(cpu)) {
    lines.push(...toCpuLines(cpu))
  }

  if (hasAverage(memory)) {
    lines.push(...toMemoryLines(memory))
  }

  return lines
}
