import type { RunMetricPoint } from '../../lib/types.ts'
import type { ChartLine } from './TimeSeriesChart'

export const SERIES_ONE = 'var(--dc-series-1)'
export const SERIES_TWO = 'var(--dc-series-2)'
const MEMORY_COLOR = 'var(--dc-memory)'
export const RUN_STROKE_WIDTH = 2
const CPU_CAP_MS = 250

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

export function formatMsPerSecond(value: number) {
  return `${Math.round(value).toLocaleString()} ms/s`
}

export function toCpuLines(cpu: RunMetricPoint[]): ChartLine[] {
  return [{ key: 'cpu', label: 'cpu', color: SERIES_ONE, points: cpu.map((point) => ({ time: toTime(point.at), value: point.average })), formatValue: formatPercent }]
}

function toCpuUsedLines(cpuUsed: RunMetricPoint[]): ChartLine[] {
  return [{ key: 'cpu', label: 'cpu', color: SERIES_ONE, points: cpuUsed.map((point) => ({ time: toTime(point.at), value: point.average === null ? null : (point.average / CPU_CAP_MS) * 100 })), formatValue: formatPercent }]
}

export function toMemoryLines(memory: RunMetricPoint[]): ChartLine[] {
  return [{ key: 'memory', label: 'memory', color: MEMORY_COLOR, points: memory.map((point) => ({ time: toTime(point.at), value: point.average })), formatValue: formatPercent }]
}

function hasAverage(points: RunMetricPoint[]) {
  return points.some((point) => point.average !== null)
}

export function toResourceLines(cpu: RunMetricPoint[], memory: RunMetricPoint[], cpuUsed: RunMetricPoint[] = []): ChartLine[] {
  const lines: ChartLine[] = []

  if (hasAverage(cpuUsed)) {
    lines.push(...toCpuUsedLines(cpuUsed))
  } else if (hasAverage(cpu)) {
    lines.push(...toCpuLines(cpu))
  }

  if (hasAverage(memory)) {
    lines.push(...toMemoryLines(memory))
  }

  return lines
}

export function describeMajorGcs(gcMajor: RunMetricPoint[], start: number, seconds: number) {
  const end = start + seconds * 1000
  let count = 0

  for (const point of gcMajor) {
    const time = toTime(point.at)

    if (time >= start && time < end) {
      count += point.average ?? 0
    }
  }

  return `${count} major GC${count === 1 ? '' : 's'}`
}

export function toPressureLines(pressure: RunMetricPoint[], gcTime: RunMetricPoint[]): ChartLine[] {
  if (!hasAverage(pressure)) {
    return []
  }

  return [
    { key: 'pressure', label: 'cpu pressure', color: SERIES_TWO, points: pressure.map((point) => ({ time: toTime(point.at), value: point.average })), fill: true, formatValue: formatMsPerSecond },
    { key: 'gc', label: 'peak gc time', color: SERIES_ONE, points: gcTime.map((point) => ({ time: toTime(point.at), value: point.maximum })), formatValue: formatMsPerSecond },
  ]
}
