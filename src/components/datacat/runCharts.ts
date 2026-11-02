import type { RunMetricPoint } from '../../lib/types.ts'
import type { ChartLine } from './TimeSeriesChart'
import { HEIGHT } from './bucketChart'

export const SERIES_ONE = 'var(--dc-series-1)'
export const SERIES_TWO = 'var(--dc-series-2)'
const MEMORY_COLOR = 'var(--dc-memory)'
export const RUN_STROKE_WIDTH = 2
export const PRESSURE_DRAWER_HEIGHT = HEIGHT + 40
const CPU_CAP_MS = 250
const MEMORY_LIMIT_MB = 512
const RUN_SETTLE_MS = 5 * 60 * 1000

export const STEP_OPTIONS = [
  { value: 5, label: '5s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
]

export function toTime(at: string) {
  return new Date(at).getTime()
}

export function runFetchPolicy(endedAt: string | undefined) {
  if (endedAt === undefined) {
    return 'network-only'
  }

  if (toTime(endedAt) + RUN_SETTLE_MS <= Date.now()) {
    return 'cache-first'
  }

  return 'network-only'
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

function toMemoryUsedLines(memoryUsed: RunMetricPoint[]): ChartLine[] {
  return [{ key: 'memory', label: 'memory', color: MEMORY_COLOR, points: memoryUsed.map((point) => ({ time: toTime(point.at), value: point.average === null ? null : (point.average / MEMORY_LIMIT_MB) * 100 })), formatValue: formatPercent }]
}

function hasAverage(points: RunMetricPoint[]) {
  return points.some((point) => point.average !== null)
}

export function toResourceLines(cpu: RunMetricPoint[], memory: RunMetricPoint[], cpuUsed: RunMetricPoint[] = [], memoryUsed: RunMetricPoint[] = []): ChartLine[] {
  const lines: ChartLine[] = []

  if (hasAverage(cpuUsed)) {
    lines.push(...toCpuUsedLines(cpuUsed))
  } else if (hasAverage(cpu)) {
    lines.push(...toCpuLines(cpu))
  }

  if (hasAverage(memoryUsed)) {
    lines.push(...toMemoryUsedLines(memoryUsed))
  } else if (hasAverage(memory)) {
    lines.push(...toMemoryLines(memory))
  }

  return lines
}

function countWithin(points: RunMetricPoint[], start: number, end: number) {
  let count = 0

  for (const point of points) {
    const time = toTime(point.at)

    if (time >= start && time < end) {
      count += point.average ?? 0
    }
  }

  return count
}

export function describeMajorGcs(gcMajor: RunMetricPoint[], gcMajorBy: Record<string, RunMetricPoint[]>, start: number, seconds: number) {
  const end = start + seconds * 1000
  const count = countWithin(gcMajor, start, end)
  const total = `${count} major GC${count === 1 ? '' : 's'}`
  const reasons = Object.entries(gcMajorBy).map(([reason, points]) => ({ reason, count: countWithin(points, start, end) })).filter((entry) => entry.count > 0)
  const known = reasons.reduce((sum, entry) => sum + entry.count, 0)

  if (!count) {
    return total
  }

  if (!known) {
    return `${total}, reason unknown`
  }

  if (reasons.length === 1 && known === count) {
    return `${total}, ${count === 1 ? '' : 'all '}${reasons[0].reason}`
  }

  if (known < count) {
    reasons.push({ reason: 'unknown', count: count - known })
  }

  return `${total}: ${reasons.map((entry) => `${entry.count} ${entry.reason}`).join(', ')}`
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
