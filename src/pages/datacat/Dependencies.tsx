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

interface DependencyData {
  serviceNow: Pick<ServiceBucket, 'requests' | 'errors'>[]
  canaryNow: Pick<SyntheticBucket, 'completed' | 'failures' | 'expected'>[]
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

const RANK: Record<Status, number> = { none: 0, good: 1, warn: 2, critical: 3 }

const worst = (a: Status, b: Status) => (RANK[a] >= RANK[b] ? a : b)

const formatReading = ({ unit, now, peak, total }: DependencyReading, range: DatacatRange) => {
  if (total !== null) return `${Math.round(total).toLocaleString()} in the last ${range}`
  if (now === null) return '-'
  if (unit === 'bytes') return `${(now / GB).toFixed(1)} GB`
  if (unit === 'percent') return `${now.toFixed(1)}% now, ${(peak ?? now).toFixed(1)}% peak in the last ${range}`
  return `${Math.round(now)} now, ${Math.round(peak ?? now)} peak in the last ${range}`
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

const sum = (values: number[]) => values.reduce((runningTotal, value) => runningTotal + value, 0)

const buildNodes = (data: DependencyData | undefined, now: number, range: DatacatRange): DependencyNode[] => {
  const recent = data?.serviceNow ?? []
  const requests = total(recent, 'requests')
  const errors = total(recent, 'errors')
  const railsStatus: Status = !data ? 'none' : errors >= RAILS_WARN_ERRORS ? 'warn' : 'good'

  const canaryRuns = data?.canaryNow ?? []
  const canaryExpected = sum(canaryRuns.map((bucket) => bucket.expected))
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
    makeNode('browser', 'Browser', 'React SPA', 'none', { statusLabel: NOT_MONITORED }),
    makeNode('mobile', 'React Native', 'Mobile app', 'none', { statusLabel: NOT_MONITORED }),
    makeNode('canary', 'Canary', 'Synthetic (k6)', canaryStatus, {
      metrics: data
        ? [
            { label: 'Runs passed, last 10 min', value: `${canaryPassed} / ${canaryExpected}` },
            { label: 'Failed, last 10 min', value: canaryFailed.toLocaleString() },
          ]
        : [],
      note: 'See Uptime',
    }),
    makeNode('alb', 'ALB', 'TLS termination', alb.status, { metrics: alb.metrics, note: alb.note }),
    makeNode('rails', 'Rails app', 'ECS Fargate · API + cable', worst(railsStatus, railsTask.status), {
      metrics: data
        ? [
            { label: 'Requests, last 10 min', value: requests.toLocaleString() },
            { label: 'Errors', value: errors.toLocaleString() },
            ...railsTask.metrics,
          ]
        : [],
    }),
    makeNode('redis', 'ElastiCache Redis', 'Cache + pub/sub', redis.status, { metrics: redis.metrics, note: redis.note }),
    makeNode('postgres', 'RDS Postgres', 'Persistent storage', postgres.status, { metrics: postgres.metrics, note: postgres.note }),
    makeNode('polygon', 'Polygon.io', 'Market data provider', polygonStatus, {
      metrics: polygonNow
        ? [
            { label: 'Last successful call', value: polygonNow.lastSuccessAt ? ago(polygonNow.lastSuccessAt, now) : 'none in the last day' },
            { label: 'Calls, last 10 min', value: polygonNow.calls.toLocaleString() },
            { label: 'Failed, last 10 min', value: polygonNow.failures.toLocaleString() },
          ]
        : [],
    }),
    makeNode('ingester', 'Ingester', 'ECS Fargate · prices', worst(ingesterStatus, ingesterTask.status), {
      metrics: data
        ? [
            { label: 'State', value: state ?? '-' },
            ...ingesterTask.metrics,
          ]
        : [],
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
    <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
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
