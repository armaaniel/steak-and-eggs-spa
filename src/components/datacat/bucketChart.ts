import type { MouseEvent } from 'react'
import { scaleTime, type ScaleTime } from 'd3-scale'
import type { ServiceBucket } from '../../lib/types.ts'

// What LatencyChart and RequestsChart have to agree on to line up bucket for bucket and hover together.

export interface ChartBucket {
  start: number
  end: number
  requests: number
  ok: number
  errors: number
  p50: number | null
  p99: number | null
  bucket: ServiceBucket
}

export interface TimeSpan {
  start: number
  end: number
}

export interface ChartBar extends TimeSpan {
  segments: Record<string, number>
  hoverText?: string
  legendValues?: Record<string, number>
}

export interface BarSeries {
  key: string
  label: string
  color: string
  hoverColor?: string
}

export interface XLabel {
  x: number
  text: string
}

// Which chart the pointer is over and the bucket under it. Pages hold this so a hover on one chart shows on the other.
export interface Hover {
  chart: 'latency' | 'requests' | 'uptime'
  index: number
}

// The bottom margin fits the time labels.
export const HEIGHT = 180
export const MARGIN = { top: 12, right: 12, bottom: 22 }
export const PLOT_BOTTOM = HEIGHT - MARGIN.bottom
export const Y_LABEL_GAP = 2

export function findWidestYLabel(labels: string[]) {
  const context = document.createElement('canvas').getContext('2d')

  if (context === null) {
    return 0
  }

  const fontFamily = getComputedStyle(document.documentElement).getPropertyValue('--font-ui')
  context.font = `11px ${fontFamily}`

  let widest = 0

  for (const label of labels) {
    widest = Math.max(widest, context.measureText(label).width)
  }

  return Math.ceil(widest)
}

export function formatXAxisTime(date: Date) {
  // Any time other than midnight: "18:00"
  if (date.getHours() !== 0 || date.getMinutes() !== 0) {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Midnight: "Sep 27"
  return date.toLocaleDateString('en-us', { month: 'short', day: 'numeric' })
}

const BUCKET_SETTLE_MS = 60 * 1000

export const bucketFetchPolicy = (bucket: ServiceBucket | null) => {
  if (bucket !== null && new Date(bucket.bucketEnd).getTime() + BUCKET_SETTLE_MS <= Date.now()) {
    return 'cache-first'
  }

  return 'no-cache'
}

export const dropEmptyBucketInProgress = (buckets: ServiceBucket[]) =>
  buckets.filter((bucket) => bucket.requests > 0 || new Date(bucket.bucketEnd).getTime() <= Date.now())

export const toChartBuckets = (buckets: ServiceBucket[]): ChartBucket[] =>
  buckets.map((bucket) => {
    const start = new Date(bucket.bucket).getTime()
    const bucketEnd = new Date(bucket.bucketEnd).getTime()
    const end = Math.max(start, Math.min(bucketEnd, Date.now()))
    return { start, end, requests: bucket.requests, ok: bucket.requests - bucket.errors, errors: bucket.errors, p50: bucket.p50, p99: bucket.p99, bucket }
  })

// scales time value to pixel position
export const timeScale = (chartBuckets: TimeSpan[], chartLeft: number, chartRight: number) => {
  const firstBucket = chartBuckets[0]
  const lastBucket = chartBuckets[chartBuckets.length - 1]

  const halfBucket = (firstBucket.end - firstBucket.start) / 2

  return scaleTime().domain([firstBucket.start - halfBucket, lastBucket.start + halfBucket]).range([chartLeft, chartRight])
}

export function findXLabels(chartBuckets: TimeSpan[], xScale: ScaleTime<number, number>, plotWidth: number) {
  const labelCount = Math.min(chartBuckets.length, Math.max(2, Math.floor(plotWidth / 100)))
  const labelledBuckets = new Set<TimeSpan>()
  const xLabels: XLabel[] = []

  for (const date of xScale.ticks(labelCount)) {
    const time = date.getTime()

    function containsTime(chartBucket: TimeSpan) {
      return chartBucket.start <= time && time < chartBucket.end
    }

    const chartBucket = chartBuckets.find(containsTime)

    if (chartBucket === undefined || labelledBuckets.has(chartBucket)) {
      continue
    }

    labelledBuckets.add(chartBucket)
    xLabels.push({ x: xScale(chartBucket.start), text: formatXAxisTime(date) })
  }

  return xLabels
}

// The bucket under the pointer, or null outside the plot.
export const bucketAt = (e: MouseEvent<SVGSVGElement>, chartBuckets: TimeSpan[], x: ScaleTime<number, number>) => {
  const left = e.clientX - e.currentTarget.getBoundingClientRect().left
  const [lo, hi] = x.range()
  if (left < lo || left > hi) return null

  const time = +x.invert(left)
  const halfBucket = (chartBuckets[0].end - chartBuckets[0].start) / 2
  const index = chartBuckets.findIndex((chartBucket) => time < chartBucket.start + halfBucket)
  return index === -1 ? chartBuckets.length - 1 : index
}
