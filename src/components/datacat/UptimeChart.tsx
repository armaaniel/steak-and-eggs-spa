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
const FAILING_COLOR = 'var(--dc-status-critical)'

const UPTIME_SERIES: BarSeries[] = [
  { key: 'healthy', label: 'healthy', color: HEALTHY_COLOR, hoverColor: HEALTHY_HOVER_COLOR },
  { key: 'incomplete', label: 'incomplete', color: INCOMPLETE_COLOR },
  { key: 'failing', label: 'failing', color: FAILING_COLOR }
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

function toUptimeBar(bucket: SyntheticBucket): ChartBar {
  const start = new Date(bucket.bucket).getTime()
  const end = new Date(bucket.bucketEnd).getTime()

  let segments: Record<string, number> = { healthy: bucket.started }

  if (bucket.started < bucket.expected) {
    segments = { incomplete: bucket.started }
  }

  if (bucket.failures > 0) {
    segments = { failing: bucket.started }
  }

  const missingRuns = Math.max(0, bucket.expected - bucket.started)
  const hoverText = formatHoverTime(new Date(start))
  const legendValues = { healthy: bucket.completed, incomplete: missingRuns, failing: bucket.failures }

  return { start, end, segments, hoverText, legendValues }
}

const UptimeChart = ({ buckets, hover, setHover, chartLeft, setYLabelWidth, selectedBucket, selectBucket }: Props) => {
  const bars = buckets.map(toUptimeBar)

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
    />
  )
}

export default UptimeChart
