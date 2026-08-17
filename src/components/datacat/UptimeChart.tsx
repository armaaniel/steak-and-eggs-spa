import { toBucketLabel } from '../../lib/utils.ts'
import type { SyntheticBucket } from '../../lib/types.ts'

interface Props {
  buckets: SyntheticBucket[]
  selectedBucket: string | null
  onSelect: (bucket: string) => void
}

// A bucket is judged only on what it can be judged on. `completed` lags `started` across
// bucket boundaries — a run that signs up at 2:59 tears down inside the next bucket — so a
// bucket is never called incomplete for it; the tooltip reports the count and leaves it there.
const bucketStatus = (bucket: SyntheticBucket) => {
  if (bucket.started === 0) return 'empty'
  if (bucket.failures > 0) return 'critical'
  if (bucket.started < bucket.expected) return 'warn'
  return 'good'
}

const UptimeChart = ({ buckets, selectedBucket, onSelect }: Props) => {
  const oldest = buckets[0]
  const newest = buckets[buckets.length - 1]

  return (
    <>
      <div className="uptime-chart-body">
        <div className="uptime-chart">
          {buckets.map((bucket) => {
            const status = bucketStatus(bucket)
            const isSelected = selectedBucket === bucket.bucket
            const ratio = bucket.expected > 0 ? Math.min(bucket.started / bucket.expected, 1) : 0

            return (
              <button key={bucket.bucket} type="button" className={`uptime-bar ${isSelected ? 'selected' : ''}`} onClick={() => onSelect(bucket.bucket)} aria-pressed={isSelected}>
                {status !== 'empty' && <span className={`uptime-bar-fill ${status}`} style={{ height: `${ratio * 100}%` }} />}

                <span className="uptime-tooltip">
                  <span className="uptime-tooltip-time">{toBucketLabel(bucket.bucket)}</span>
                  <span>
                    {bucket.started} / {bucket.expected} started
                  </span>
                  <span>{bucket.completed} completed</span>
                  <span>{bucket.failures} failed</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="uptime-axis">
          <span>{oldest && toBucketLabel(oldest.bucket)}</span>
          <span>{newest && toBucketLabel(newest.bucket)}</span>
        </div>
      </div>

      <div className="uptime-legend">
        <span className="uptime-legend-item">
          <span className="uptime-swatch good" />
          Healthy
        </span>

        <span className="uptime-legend-item">
          <span className="uptime-swatch warn" />
          Incomplete
        </span>

        <span className="uptime-legend-item">
          <span className="uptime-swatch critical" />
          Failing
        </span>

        <span className="uptime-legend-item">
          <span className="uptime-swatch" />
          No runs
        </span>
      </div>
    </>
  )
}

export default UptimeChart
