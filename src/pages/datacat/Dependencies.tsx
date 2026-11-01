import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useMemo, useState } from 'react'
import DependencyMap from '../../components/datacat/DependencyMap'
import SegmentedToggle from '../../components/datacat/SegmentedToggle'
import useTransition from '../../hooks/useTransition.ts'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import type { DependencyNode, DependencyView, IngesterSpan, OutletContextType, PolygonCalls, ServiceBucket, SyntheticBucket } from '../../lib/types.ts'

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

const NO_CHANGE = 'No change'

const SCALED_NODES: DependencyNode[] = [
  makeNode('vercel', 'Vercel', 'Static hosting', 'none', { statusLabel: NO_CHANGE }),
  makeNode('browser', 'Browser', 'Web app', 'none', { statusLabel: NO_CHANGE }),
  makeNode('mobile', 'React Native', 'Mobile app', 'none', { statusLabel: NO_CHANGE }),
  makeNode('canary', 'Canary', 'Synthetic checks', 'none', { statusLabel: NO_CHANGE }),
  makeNode('alb', 'ALB', 'Routes by path', 'none', {
    statusLabel: 'One new routing rule',
    metrics: [
      { label: 'Change', value: '/cable goes to the ActionCable service, every other path to the API' },
      { label: 'Clients', value: 'Same host and paths, so the web and mobile apps stay as they are' },
      { label: 'Draining', value: 'API deploys finish in seconds, since only cable targets hold WebSockets for up to 300 s' },
    ],
  }),
  makeNode('api', 'Rails API', 'HTTP requests', 'none', {
    statusLabel: 'Second task planned',
    metrics: [
      { label: 'Change', value: 'desired_count = 2, one task in each zone' },
      { label: 'Code changes', value: 'None. Auth is a JWT, and the cache and pub/sub already live in Valkey' },
      { label: 'Next limit', value: 'Postgres connections, since each task can open up to 10' },
    ],
    jobs: RAILS_JOBS,
  }),
  makeNode('cable', 'ActionCable', 'WebSockets', 'none', {
    statusLabel: 'Not built yet',
    metrics: [
      { label: 'Change', value: 'Its own ECS service, running the same image behind its own target group' },
      { label: 'Why', value: 'On Oct 17 a cable load test overloaded the one Rails task: a signup took 79 s, the health check failed, and ECS replaced the task' },
      { label: 'Scales on', value: 'Connections and frames per second. One task topped out around 3,500–4,000 frames/s' },
    ],
  }),
  makeNode('redis', 'ElastiCache Valkey', 'Primary + replica', 'none', {
    statusLabel: 'Replica planned',
    metrics: [
      { label: 'Change', value: 'A replica in the other zone, with automatic failover' },
      { label: 'At scale', value: 'The ingester publishes each price once, and Valkey sends it to every cable task' },
      { label: 'Cost', value: 'About $30/month, together with the Postgres standby' },
    ],
  }),
  makeNode('postgres', 'RDS Postgres', 'Primary + standby', 'none', {
    statusLabel: 'Standby planned',
    metrics: [
      { label: 'Change', value: "Multi-AZ, with a standby in the other zone that takes over if the primary's zone fails" },
      { label: 'Next limit', value: "Connections. AWS's formula caps a db.t4g.micro at roughly 100, and today's peak is 5–6" },
      { label: 'Cost', value: 'About $30/month, together with the Valkey replica' },
    ],
  }),
  makeNode('polygon', 'Polygon.io', 'Market data', 'none', { statusLabel: NO_CHANGE }),
  makeNode('ingester', 'Ingester', 'No scaling', 'none', {
    statusLabel: 'Stays at one task',
    metrics: [
      { label: 'Why', value: 'Polygon allows one WebSocket per API key, so a second copy would be rejected' },
      { label: 'Deploys', value: 'Stop-first, so each deploy loses 63–80 s of prices' },
    ],
  }),
]

const BOX_NODES: DependencyNode[] = [
  makeNode('vercel', 'Vercel', 'Static hosting', 'none', { statusLabel: NO_CHANGE }),
  makeNode('browser', 'Browser', 'Web app', 'none', { statusLabel: NO_CHANGE }),
  makeNode('mobile', 'React Native', 'Mobile app', 'none', { statusLabel: NO_CHANGE }),
  makeNode('canary', 'Canary', 'Synthetic checks', 'none', { statusLabel: NO_CHANGE }),
  makeNode('ec2', 'EC2', 't4g.small · us-west-1a', 'none', {
    statusLabel: 'Alternative, not built',
    metrics: [
      { label: 'Cost', value: 'About $40–55/month, against about $83 for the Fargate setup' },
      { label: 'Shared fate', value: 'Rails, the ingester and Valkey share one machine in one zone, so if it fails, the API, live prices and the cache go down together' },
      { label: 'CPU', value: '2 vCPUs in bursts, 0.4 sustained. The two Fargate tasks have 0.5 between them' },
      { label: 'Upkeep', value: 'OS updates and disk space become yours. AWS can restart the instance on new hardware if its host fails' },
    ],
  }),
  makeNode('proxy', 'kamal-proxy', 'TLS + deploys', 'none', {
    statusLabel: 'Replaces the ALB',
    metrics: [
      { label: 'TLS', value: "Gets and renews its own Let's Encrypt certificate on ports 80 and 443" },
      { label: 'Deploys', value: 'Starts the new Rails container, waits for its health check, then moves traffic over from the old one' },
      { label: 'Monitoring', value: "DataCat's ALB and ECS panels go blank, since nothing publishes those CloudWatch metrics anymore" },
    ],
  }),
  makeNode('rails', 'Rails app', 'API + ActionCable', 'none', {
    statusLabel: 'Same image, run by Kamal',
    metrics: [
      { label: 'Change', value: 'The same image runs as a Docker container on the box instead of an ECS task' },
      { label: 'Nightly jobs', value: 'Run from cron on the box instead of EventBridge Scheduler' },
      { label: 'Scaling out', value: 'Needs a load balancer back and Valkey moved off the box, which is most of the way back to Fargate' },
    ],
    jobs: RAILS_JOBS,
  }),
  makeNode('redis', 'Valkey', 'Cache + live prices', 'none', {
    statusLabel: 'Moves onto the box',
    metrics: [
      { label: 'Change', value: 'A Kamal accessory container instead of ElastiCache' },
      { label: 'Connection', value: "Traffic never leaves the box, so TLS goes, and the ingester's hard-coded ssl: true changes with it" },
      { label: 'Monitoring', value: "DataCat's Valkey panel reads ElastiCache metrics, so it goes blank" },
    ],
  }),
  makeNode('ingester', 'Ingester', 'Price stream', 'none', {
    statusLabel: 'Moves onto the box',
    metrics: [
      { label: 'Deploys', value: 'Kamal boots new app containers before stopping the old ones, which would open a second Polygon socket. As an accessory it restarts stop-first' },
    ],
  }),
  makeNode('postgres', 'RDS Postgres', 'Stays managed', 'none', {
    statusLabel: NO_CHANGE,
    metrics: [
      { label: 'Why it stays off the box', value: "Backups and restores stay AWS's job, and the data outlives the box" },
    ],
  }),
  makeNode('polygon', 'Polygon.io', 'Market data', 'none', { statusLabel: NO_CHANGE }),
]

const PLAN_NODES: Record<Exclude<DependencyView, 'live'>, DependencyNode[]> = {
  scaled: SCALED_NODES,
  box: BOX_NODES,
}

const VIEW_OPTIONS: { value: DependencyView; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'box', label: 'One box' },
  { value: 'scaled', label: 'Scaled' },
]

const LEGEND: Status[] = ['good', 'warn', 'critical']

function Dependencies() {
  const { detail, setDetail, range } = useOutletContext<OutletContextType>()
  const [view, setView] = useState<DependencyView>('live')

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

  const nodesFor = (next: DependencyView) => (next === 'live' ? buildNodes(data, timeWindow.at, range) : PLAN_NODES[next])
  const nodes = nodesFor(view)
  const selectedId = detail?.kind === 'dependency' ? detail.node.id : null
  const selectNode = (node: DependencyNode) => setDetail({ kind: 'dependency', node })

  const changeView = (next: DependencyView) => {
    setView(next)
    if (detail?.kind !== 'dependency') return

    const match = nodesFor(next).find((node) => node.id === detail.node.id)
    setDetail(match ? { kind: 'dependency', node: match } : null)
  }

  return (
    <div className={`positions-container dep-card ${isLoaded && !loading ? 'loaded' : ''}`} data-ready={isLoaded}>
      {error && view === 'live' && <p className="dep-message">Unable to load health data, please try again</p>}

      <DependencyMap view={view} nodes={nodes} selectedId={selectedId} onSelect={selectNode} />

      <div className="dep-footer">
        <div className="dep-legend">
          {view === 'live' &&
            LEGEND.map((status) => (
              <span key={status} className="dep-legend-item">
                <span className={`dep-dot ${status}`} />
                {STATUS_LABELS[status]}
              </span>
            ))}
        </div>

        <SegmentedToggle label="View" value={view} onChange={changeView} options={VIEW_OPTIONS} loaded={isLoaded} />
      </div>
    </div>
  )
}

export default Dependencies
