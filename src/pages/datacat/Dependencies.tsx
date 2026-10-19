import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useMemo } from 'react'
import DependencyMap from '../../components/datacat/DependencyMap'
import useTransition from '../../hooks/useTransition.ts'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import type { DependencyNode, IngesterSpan, OutletContextType, PolygonCalls, ServiceBucket, SyntheticBucket } from '../../lib/types.ts'

const GET_DEPENDENCIES = gql`
  query getDependencies($range: String!, $from: ISO8601DateTime!, $to: ISO8601DateTime!) {
    serviceNow: serviceTimeseries(range: "10m") {
      requests
      errors
    }
    canaryNow: syntheticBuckets(range: "10m") {
      bucketEnd
      started
      completed
      failures
      expected
    }
    polygonNow: polygonCalls(range: "10m") {
      calls
      failures
      lastSuccessAt
    }
    ingesterSpans(from: $from, to: $to) {
      at
      state
      seconds
    }
    dependencyHealth(range: $range) {
      id
      configured
      status
      readings {
        key
        label
        unit
        now
        peak
        total
        points {
          at
          value
        }
      }
    }
  }
`

type CanaryBucket = Pick<SyntheticBucket, 'bucketEnd' | 'started' | 'completed' | 'failures' | 'expected'>

interface DependencyData {
  serviceNow: Pick<ServiceBucket, 'requests' | 'errors'>[]
  canaryNow: CanaryBucket[]
  polygonNow: PolygonCalls
  ingesterSpans: Pick<IngesterSpan, 'at' | 'state' | 'seconds'>[]
  dependencyHealth: DependencyHealth[]
}

interface DependencyReading {
  key: string
  label: string
  unit: 'percent' | 'count' | 'bytes'
  now: number | null
  peak: number | null
  total: number | null
}

interface DependencyHealth {
  id: string
  configured: boolean
  status: Status
  readings: DependencyReading[]
}

type Status = DependencyNode['status']

const HOUR_MS = 60 * 60 * 1000

const STATUS_LABELS: Record<Status, string> = {
  good: 'Healthy',
  warn: 'Degraded',
  critical: 'Down',
  none: 'No health signal yet',
}

const NOT_MONITORED = 'Not monitored'

const GB = 1024 ** 3

const RAILS_WARN_ERRORS = 3

const MONDAY = 1
const SATURDAY = 6

const windowTime = new Intl.DateTimeFormat('en-us', { hour: 'numeric', minute: '2-digit' })
const weeklyWindowTime = new Intl.DateTimeFormat('en-us', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

function findUtcTime(utcHour: number, utcWeekday: number | null) {
  const now = new Date()
  const time = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), utcHour))

  if (utcWeekday !== null) {
    const daysAhead = (utcWeekday - time.getUTCDay() + 7) % 7
    time.setUTCDate(time.getUTCDate() + daysAhead)
  }

  return time
}

function formatDailyTime(utcHour: number) {
  return `Daily ${windowTime.format(findUtcTime(utcHour, null))}`
}

function formatDailyWindow(utcHour: number) {
  const start = findUtcTime(utcHour, null)

  return `Daily ${windowTime.formatRange(start, new Date(start.getTime() + HOUR_MS))}`
}

function formatWeeklyWindow(utcWeekday: number, utcHour: number) {
  const start = findUtcTime(utcHour, utcWeekday)

  return weeklyWindowTime.formatRange(start, new Date(start.getTime() + HOUR_MS))
}

const TASK_SIZE = '0.25 vCPU · 512 MB · ARM64'

const ALB_SETUP = [
  { label: 'Listeners', value: 'HTTPS (TLS 1.3), HTTP redirects to HTTPS' },
  { label: 'Health check', value: 'GET / every 30 s' },
  { label: 'Unhealthy after', value: '5 failed checks, about 2.5 min' },
]

const RAILS_SETUP = [
  { label: 'Task size', value: TASK_SIZE },
  { label: 'Tasks', value: '1 on Fargate' },
  { label: 'Deploys', value: 'Rolling, no downtime' },
]

const RAILS_JOBS = [
  { label: 'tickers', value: `${formatDailyTime(4)} · adds new listings, flags delistings` },
  { label: 'record', value: `${formatDailyTime(5)} · snapshots portfolio values` },
  { label: 'prune_traces', value: `${formatDailyTime(6)} · deletes traces and ingester samples older than 30 days` },
]

const REDIS_SETUP = [
  { label: 'Engine', value: 'Valkey 8.2' },
  { label: 'Instance', value: 'cache.t4g.micro, 1 node' },
  { label: 'Maintenance', value: formatWeeklyWindow(SATURDAY, 4) },
]

const POSTGRES_SETUP = [
  { label: 'Engine', value: 'Postgres 17' },
  { label: 'Instance', value: 'db.t4g.micro, burstable' },
  { label: 'Storage', value: '20 GB gp3' },
  { label: 'Backups', value: `${formatDailyWindow(3)}, kept 7 days` },
  { label: 'Maintenance', value: formatWeeklyWindow(MONDAY, 4) },
]

const INGESTER_SETUP = [
  { label: 'Task size', value: TASK_SIZE },
  { label: 'Tasks', value: '1 on Fargate' },
  { label: 'Deploys', value: 'Recreate, brief downtime' },
]

const RANK: Record<Status, number> = { none: 0, good: 1, warn: 2, critical: 3 }

const worst = (a: Status, b: Status) => (RANK[a] >= RANK[b] ? a : b)

const formatReading = ({ unit, now, peak, total }: DependencyReading, range: DatacatRange) => {
  if (total !== null) return `${Math.round(total).toLocaleString()} (${range})`
  if (now === null) return '-'
  if (unit === 'bytes') return `${(now / GB).toFixed(1)} GB`
  if (unit === 'percent') return `${now.toFixed(1)}% now · ${(peak ?? now).toFixed(1)}% peak (${range})`
  return `${Math.round(now)} now · ${Math.round(peak ?? now)} peak (${range})`
}

const cloudwatch = (health: DependencyHealth | undefined, range: DatacatRange) => {
  if (!health) return { status: 'none' as Status, metrics: [], note: 'CloudWatch data is unavailable right now.' }
  if (!health.configured) return { status: 'none' as Status, metrics: [], note: 'Not configured yet.' }

  const metrics = health.readings.map((reading) => ({
    label: reading.label,
    value: formatReading(reading, range),
  }))
  const note = health.status === 'none' ? 'No CloudWatch data.' : undefined

  return { status: health.status, metrics, note }
}

const makeNode = (id: string, title: string, role: string, status: Status, rest: Partial<DependencyNode> = {}): DependencyNode => ({
  id,
  title,
  role,
  status,
  statusLabel: STATUS_LABELS[status],
  metrics: [],
  ...rest,
})

const ago = (at: string, now: number) => {
  const minutes = Math.round((now - new Date(at).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.floor(minutes / 60)} hr ago`
}

const total = (buckets: { requests: number; errors: number }[], key: 'requests' | 'errors') => buckets.reduce((sum, bucket) => sum + bucket[key], 0)

const expectedRuns = (bucket: CanaryBucket, now: number) => {
  if (new Date(bucket.bucketEnd).getTime() > now) return bucket.completed + bucket.failures
  return Math.max(bucket.expected, bucket.started)
}

const sum = (values: number[]) => values.reduce((runningTotal, value) => runningTotal + value, 0)

const buildNodes = (data: DependencyData | undefined, now: number, range: DatacatRange): DependencyNode[] => {
  const recent = data?.serviceNow ?? []
  const requests = total(recent, 'requests')
  const errors = total(recent, 'errors')
  const railsStatus: Status = !data ? 'none' : errors >= RAILS_WARN_ERRORS ? 'warn' : 'good'

  const canaryRuns = data?.canaryNow ?? []
  const canaryExpected = sum(canaryRuns.map((bucket) => expectedRuns(bucket, now)))
  const canaryPassed = sum(canaryRuns.map((bucket) => bucket.completed))
  const canaryFailed = sum(canaryRuns.map((bucket) => bucket.failures))
  const canaryStatus: Status = !data || canaryExpected === 0 ? 'none' : canaryPassed === 0 ? 'critical' : canaryFailed > 0 || canaryPassed < canaryExpected ? 'warn' : 'good'

  const spans = data?.ingesterSpans ?? []
  const lastSpan = spans.reduce<(typeof spans)[number] | null>((newest, span) => (!newest || span.at > newest.at ? span : newest), null)
  const state = lastSpan?.state
  const ingesterStatus: Status = !state ? 'none' : state === 'streaming' || state === 'idle' ? 'good' : 'critical'

  const healthFor = (id: string) => (data?.dependencyHealth ?? []).find((health) => health.id === id)
  const alb = cloudwatch(healthFor('alb'), range)
  const railsTask = cloudwatch(healthFor('rails'), range)
  const ingesterTask = cloudwatch(healthFor('ingester'), range)
  const postgres = cloudwatch(healthFor('postgres'), range)
  const redis = cloudwatch(healthFor('redis'), range)

  const polygonNow = data?.polygonNow
  const polygonStatus: Status = !polygonNow || polygonNow.calls === 0 ? 'none' : polygonNow.failures === polygonNow.calls ? 'critical' : polygonNow.failures > 0 ? 'warn' : 'good'

  return [
    makeNode('vercel', 'Vercel', 'Static hosting', 'none', { statusLabel: NOT_MONITORED }),
    makeNode('browser', 'Browser', 'Web app', 'none', { statusLabel: NOT_MONITORED }),
    makeNode('mobile', 'React Native', 'Mobile app', 'none', { statusLabel: NOT_MONITORED }),
    makeNode('canary', 'Canary', 'Synthetic checks', canaryStatus, {
      metrics: data
        ? [
            { label: 'Runs passed, last 10 min', value: `${canaryPassed} / ${canaryExpected}` },
            { label: 'Failed, last 10 min', value: canaryFailed.toLocaleString() },
          ]
        : [],
      note: 'See Uptime',
    }),
    makeNode('alb', 'ALB', 'TLS termination', alb.status, { metrics: alb.metrics, note: alb.note, setup: ALB_SETUP }),
    makeNode('rails', 'Rails app', 'API + ActionCable', worst(railsStatus, railsTask.status), {
      metrics: data
        ? [
            { label: 'Requests, last 10 min', value: requests.toLocaleString() },
            { label: 'Errors', value: errors.toLocaleString() },
            ...railsTask.metrics,
          ]
        : [],
      setup: RAILS_SETUP,
      jobs: RAILS_JOBS,
    }),
    makeNode('redis', 'ElastiCache Valkey', 'Cache + live prices', redis.status, { metrics: redis.metrics, note: redis.note, setup: REDIS_SETUP }),
    makeNode('postgres', 'RDS Postgres', 'Persistent storage', postgres.status, { metrics: postgres.metrics, note: postgres.note, setup: POSTGRES_SETUP }),
    makeNode('polygon', 'Polygon.io', 'Market data', polygonStatus, {
      metrics: polygonNow
        ? [
            { label: 'Last successful call', value: polygonNow.lastSuccessAt ? ago(polygonNow.lastSuccessAt, now) : 'none in the last day' },
            { label: 'Calls, last 10 min', value: polygonNow.calls.toLocaleString() },
            { label: 'Failed, last 10 min', value: polygonNow.failures.toLocaleString() },
          ]
        : [],
    }),
    makeNode('ingester', 'Ingester', 'Price stream', worst(ingesterStatus, ingesterTask.status), {
      metrics: data
        ? [
            { label: 'State', value: state ?? '-' },
            ...ingesterTask.metrics,
          ]
        : [],
      setup: INGESTER_SETUP,
    }),
  ]
}

const LEGEND: Status[] = ['good', 'warn', 'critical']

function Dependencies() {
  const { detail, setDetail, range } = useOutletContext<OutletContextType>()

  const timeWindow = useMemo(() => {
    const at = Date.now()
    return {
      at,
      variables: {
        range,
        from: new Date(at - HOUR_MS).toISOString(),
        to: new Date(at).toISOString(),
      },
    }
  }, [range])

  const { loading, error, data } = useQuery<DependencyData>(GET_DEPENDENCIES, {
    variables: timeWindow.variables,
    fetchPolicy: 'network-only',
  })

  const isLoaded = useTransition(loading, data || error)

  const nodes = buildNodes(data, timeWindow.at, range)
  const selectedId = detail?.kind === 'dependency' ? detail.node.id : null
  const selectNode = (node: DependencyNode) => setDetail({ kind: 'dependency', node })

  return (
    <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`} data-ready={isLoaded}>
      {error && <p className="dep-message">Unable to load health data, please try again</p>}

      <DependencyMap nodes={nodes} selectedId={selectedId} onSelect={selectNode} />

      <div className="dep-legend">
        {LEGEND.map((status) => (
          <span key={status} className="dep-legend-item">
            <span className={`dep-dot ${status}`} />
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    </div>
  )
}

export default Dependencies
