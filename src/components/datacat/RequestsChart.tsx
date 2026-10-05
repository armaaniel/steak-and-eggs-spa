import BucketBarChart from './BucketBarChart'
import { toChartBuckets, type BarSeries, type ChartBar, type ChartBucket, type Hover } from './bucketChart'
import type { ServiceBucket } from '../../lib/types.ts'

interface Props {
  buckets: ServiceBucket[]
  hover: Hover | null
  setHover: (hover: Hover | null) => void
  chartLeft: number
  setYLabelWidth: (width: number) => void
  selectedBucket: ServiceBucket | null
  selectBucket: (bucket: ServiceBucket) => void
}

const OK_COLOR = '#8E87C2'
const ERROR_COLOR = 'var(--dc-status-critical)'
const HOVER_COLOR = 'var(--dc-latency-p99)'

const REQUEST_SERIES: BarSeries[] = [
  { key: 'ok', label: 'ok', color: OK_COLOR, hoverColor: HOVER_COLOR },
  { key: 'errors', label: 'errors', color: ERROR_COLOR }
]

function toRequestBar(chartBucket: ChartBucket): ChartBar {
  return {
    start: chartBucket.start,
    end: chartBucket.end,
    segments: { ok: chartBucket.ok, errors: chartBucket.errors }
  }
}

const RequestsChart = ({ buckets, hover, setHover, chartLeft, setYLabelWidth, selectedBucket, selectBucket }: Props) => {
  const bars = toChartBuckets(buckets).map(toRequestBar)

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
      title="Requests"
      emptyMessage="No requests in this range."
      bars={bars}
      series={REQUEST_SERIES}
      chartName="requests"
      hover={hover}
      setHover={setHover}
      chartLeft={chartLeft}
      setYLabelWidth={setYLabelWidth}
      selectedIndex={selectedIndex}
      selectBar={selectBar}
    />
  )
}

export default RequestsChart
