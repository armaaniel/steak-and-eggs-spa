import BucketBarChart from './BucketBarChart'
import type { BarSeries, ChartBar, Hover } from './bucketChart'
import type { SyntheticBucket } from '../../lib/types.ts'

interface Props {
  buckets: SyntheticBucket[]
  hover: Hover | null
  setHover: (hover: Hover | null) => void
  chartLeft: number
  setYLabelWidth: (width: number) => void
  selectedBucket: SyntheticBucket | null
  selectBucket: (bucket: SyntheticBucket) => void
}

const HEALTHY_COLOR = 'var(--dc-healthy)'
const HEALTHY_HOVER_COLOR = '#95BA78'
const INCOMPLETE_COLOR = 'var(--dc-status-warn)'
const FAILING_COLOR = 'var(--dc-series-2)'
const PENDING_COLOR = 'color-mix(in srgb, var(--dc-healthy) 30%, transparent)'

const UPTIME_SERIES: BarSeries[] = [
  { key: 'healthy', label: 'healthy', color: HEALTHY_COLOR, hoverColor: HEALTHY_HOVER_COLOR },
  { key: 'incomplete', label: 'incomplete', color: INCOMPLETE_COLOR },
  { key: 'failing', label: 'failing', color: FAILING_COLOR },
  { key: 'pending', label: 'pending', color: PENDING_COLOR, hideInLegend: true }
]

function formatHoverTime(date: Date) {
  return date.toLocaleString('en-us', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
}

function isInProgress(bucket: SyntheticBucket) {
  return new Date(bucket.bucketEnd).getTime() > Date.now()
}

function findRunsPerBucket(buckets: SyntheticBucket[]) {
  for (let index = buckets.length - 1; index >= 0; index--) {
    if (!isInProgress(buckets[index])) {
      return buckets[index].expected
    }
  }

  return 0
}

function toUptimeBar(bucket: SyntheticBucket, runsPerBucket: number): ChartBar {
  const start = new Date(bucket.bucket).getTime()
  const end = new Date(bucket.bucketEnd).getTime()

  const height = Math.max(bucket.started, bucket.expected)

  let segments: Record<string, number> = { healthy: height }

  if (bucket.started < bucket.expected) {
    segments = { incomplete: height }
  }

  if (bucket.failures > 0) {
    segments = { failing: height }
  }

  if (runsPerBucket === 1 && bucket.started === 0 && isInProgress(bucket)) {
    segments = { pending: 1 }
  }

  const missingRuns = Math.max(0, bucket.expected - bucket.started)
  const hoverText = formatHoverTime(new Date(start))
  const legendValues = { healthy: bucket.completed, incomplete: missingRuns, failing: bucket.failures }

  return { start, end, segments, hoverText, legendValues }
}

const UptimeChart = ({ buckets, hover, setHover, chartLeft, setYLabelWidth, selectedBucket, selectBucket }: Props) => {
  const runsPerBucket = findRunsPerBucket(buckets)

  function toBar(bucket: SyntheticBucket) {
    return toUptimeBar(bucket, runsPerBucket)
  }

  const bars = buckets.map(toBar)

  let selectedIndex: number | null = null

  if (selectedBucket !== null) {
    selectedIndex = buckets.findIndex(function (bucket) {
      return bucket.bucket === selectedBucket.bucket
    })
  }

  function selectBar(index: number) {
    selectBucket(buckets[index])
  }

  return (
    <BucketBarChart
      title="Uptime"
      emptyMessage="No runs in this range."
      bars={bars}
      series={UPTIME_SERIES}
      chartName="uptime"
      hover={hover}
      setHover={setHover}
      chartLeft={chartLeft}
      setYLabelWidth={setYLabelWidth}
      selectedIndex={selectedIndex}
      selectBar={selectBar}
      showTimeLabels
      tooltipKeys={['healthy']}
    />
  )
}

export default UptimeChart
