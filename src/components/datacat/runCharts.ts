import type { RunMetricPoint } from '../../lib/types.ts'
import type { ChartLine } from './TimeSeriesChart'
import { findNearestPoint } from './timeSeries'

export const SERIES_ONE = 'var(--dc-series-1)'
export const SERIES_TWO = 'var(--dc-series-2)'
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

export function formatCount(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '-'
  }

  return value.toLocaleString()
}

export function formatWhole(value: number) {
  return Math.round(value).toLocaleString()
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

export function toCpuLines(cpu: RunMetricPoint[], color = SERIES_ONE): ChartLine[] {
  return [{ key: 'cpu', label: 'cpu', color, points: cpu.map((point) => ({ time: toTime(point.at), value: point.average })) }]
}

export function describeCpu(cpu: RunMetricPoint[], hoveredTime: number | null) {
  if (hoveredTime === null) {
    return undefined
  }

  const nearest = findNearestPoint(cpu.map((point) => ({ time: toTime(point.at), point })), hoveredTime)

  if (nearest === null || nearest.point.minimum === null || nearest.point.maximum === null) {
    return undefined
  }

  return `${nearest.point.minimum.toFixed(1)}–${nearest.point.maximum.toFixed(1)}% range`
}
