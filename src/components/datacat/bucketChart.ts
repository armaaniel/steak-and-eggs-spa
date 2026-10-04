import type { MouseEvent } from 'react'
import { scaleTime, type ScaleTime } from 'd3-scale'
import type { ServiceBucket } from '../../lib/types.ts'

// What LatencyChart and RequestsChart have to agree on to line up bucket for bucket and hover together.

export interface ChartBucket {
  start: number
  end: number
  mid: number
  ok: number
  errors: number
  p50: number | null
  p99: number | null
  bucket: ServiceBucket
}

// Which chart the pointer is over and the bucket under it. Pages hold this so a hover on one chart shows on the other.
export interface Hover {
  chart: 'latency' | 'requests'
  index: number
}

// The bottom margin fits the time labels.
export const HEIGHT = 180
export const MARGIN = { top: 12, right: 12, bottom: 22, left: 56 }
export const PLOT_BOTTOM = HEIGHT - MARGIN.bottom

export const toChartBuckets = (buckets: ServiceBucket[]): ChartBucket[] =>
  buckets.map((bucket) => {
    const start = new Date(bucket.bucket).getTime()
    const end = Math.max(start, Math.min(new Date(bucket.bucketEnd).getTime(), Date.now()))
    return { start, end, mid: (start + end) / 2, ok: bucket.requests - bucket.errors, errors: bucket.errors, p50: bucket.p50, p99: bucket.p99, bucket }
  })

// scales time value to pixel position
export const timeScale = (chartBuckets: ChartBucket[], width: number) => {
  const firstBucket = chartBuckets[0]
  const lastBucket = chartBuckets[chartBuckets.length - 1]

  return scaleTime().domain([firstBucket.start, lastBucket.end]).range([MARGIN.left, width - MARGIN.right])
}

// The bucket under the pointer, or null outside the plot.
export const bucketAt = (e: MouseEvent<SVGSVGElement>, chartBuckets: ChartBucket[], x: ScaleTime<number, number>) => {
  const left = e.clientX - e.currentTarget.getBoundingClientRect().left
  const [lo, hi] = x.range()
  if (left < lo || left > hi) return null

  const time = +x.invert(left)
  const index = chartBuckets.findIndex((chartBucket) => time < chartBucket.end)
  return index === -1 ? chartBuckets.length - 1 : index
}
