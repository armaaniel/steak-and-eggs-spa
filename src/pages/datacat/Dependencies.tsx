import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useMemo } from 'react'
import DependencyMap from '../../components/datacat/DependencyMap'
import useTransition from '../../hooks/useTransition.ts'
import type { DependencyNode, IngesterSpan, OutletContextType, PolygonCalls, ServiceBucket } from '../../lib/types.ts'

const GET_DEPENDENCIES = gql`
  query getDependencies($range: String!, $from: ISO8601DateTime!, $to: ISO8601DateTime!) {
    serviceNow: serviceTimeseries(range: "10m") {
      requests
      errors
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
  points: { at: string; value: number }[]
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

const NOT_INSTRUMENTED = 'Not instrumented'

const GB = 1024 ** 3

const RANK: Record<Status, number> = { none: 0, good: 1, warn: 2, critical: 3 }

const worst = (a: Status, b: Status) => (RANK[a] >= RANK[b] ? a : b)

const formatReading = ({ unit, now, peak, total }: DependencyReading) => {
  if (total !== null) return Math.round(total).toLocaleString()
  if (now === null) return '-'
  if (unit === 'bytes') return `${(now / GB).toFixed(1)} GB`
  if (unit === 'percent') return `${now.toFixed(1)}% now, ${(peak ?? now).toFixed(1)}% peak`
  return `${Math.round(now)} now, ${Math.round(peak ?? now)} peak`
}

const cloudwatch = (health: DependencyHealth | undefined) => {
  if (!health) return { status: 'none' as Status, metrics: [], note: 'CloudWatch data is unavailable right now.' }
  if (!health.configured) return { status: 'none' as Status, metrics: [], note: 'Not configured yet.' }

  const metrics = health.readings.map((reading) => ({
    label: reading.label,
    value: formatReading(reading),
    points: reading.points.length > 0 ? reading.points : undefined,
    color: reading.key === 'memory' ? 'var(--dc-series-2)' : 'var(--dc-series-1)',
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

const buildNodes = (data: DependencyData | undefined, now: number): DependencyNode[] => {
  const recent = data?.serviceNow ?? []
  const requests = total(recent, 'requests')
  const errors = total(recent, 'errors')
  const railsStatus: Status = !data ? 'none' : errors > 0 ? 'warn' : 'good'

  const spans = data?.ingesterSpans ?? []
  const lastSpan = spans.reduce<(typeof spans)[number] | null>((newest, span) => (!newest || span.at > newest.at ? span : newest), null)
  const state = lastSpan?.state
  const ingesterStatus: Status = !state ? 'none' : state === 'streaming' || state === 'idle' ? 'good' : 'critical'

  const healthFor = (id: string) => (data?.dependencyHealth ?? []).find((health) => health.id === id)
  const alb = cloudwatch(healthFor('alb'))
  const railsTask = cloudwatch(healthFor('rails'))
  const ingesterTask = cloudwatch(healthFor('ingester'))
  const postgres = cloudwatch(healthFor('postgres'))
  const redis = cloudwatch(healthFor('redis'))

  const polygonNow = data?.polygonNow
  const polygonStatus: Status = !polygonNow || polygonNow.calls === 0 ? 'none' : polygonNow.failures === polygonNow.calls ? 'critical' : polygonNow.failures > 0 ? 'warn' : 'good'

  return [
    makeNode('vercel', 'Vercel', 'Static hosting', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('browser', 'Browser', 'React SPA', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('mobile', 'React Native', 'Mobile app', 'none', { note: NOT_INSTRUMENTED }),
    makeNode('canary', 'Canary', 'Synthetic (k6)', 'none', { note: 'See Uptime' }),
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
    fetchPolicy: 'no-cache',
  })

  const isLoaded = useTransition(loading, data || error)

  const nodes = buildNodes(data, timeWindow.at)
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
