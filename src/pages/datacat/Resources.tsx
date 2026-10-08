import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useMemo, useState } from 'react'
import { curveLinear } from 'd3-shape'
import TimeSeriesChart, { type ChartLine } from '../../components/datacat/TimeSeriesChart'
import { toTimePoint } from '../../components/datacat/timeSeries'
import useTransition from '../../hooks/useTransition.ts'
import { DATACAT_RANGE_MS } from '../../hooks/useDatacatRange'
import type { OutletContextType } from '../../lib/types.ts'
import '../../stylesheets/datacat/charts.css'

const GET_RESOURCES = gql`
  query getResources($range: String!) {
    dependencyHealth(range: $range) {
      id
      configured
      readings {
        key
        label
        points {
          at
          value
        }
      }
    }
  }
`

interface ResourceReading {
  key: string
  label: string
  points: { at: string; value: number }[]
}

interface ResourceHealth {
  id: string
  configured: boolean
  readings: ResourceReading[]
}

interface ResourcesData {
  dependencyHealth: ResourceHealth[]
}

const RESOURCE_ROWS = [
  { id: 'rails', title: 'Rails task' },
  { id: 'ingester', title: 'Ingester task' },
  { id: 'postgres', title: 'RDS Postgres' },
  { id: 'redis', title: 'ElastiCache Redis' },
]

function findLineColor(reading: ResourceReading) {
  if (reading.key === 'memory') {
    return 'var(--dc-latency-p50)'
  }

  return 'var(--dc-latency-p99)'
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function toResourceLines(health: ResourceHealth | undefined): ChartLine[] {
  if (health === undefined) {
    return []
  }

  const lines: ChartLine[] = []

  for (const reading of health.readings) {
    if (reading.points.length > 0) {
      lines.push({ key: reading.key, label: reading.label, color: findLineColor(reading), points: reading.points.map(toTimePoint) })
    }
  }

  return lines
}

function findNote(health: ResourceHealth | undefined, lines: ChartLine[]) {
  if (health === undefined) {
    return 'No CloudWatch data right now.'
  }

  if (!health.configured) {
    return 'Not configured.'
  }

  if (lines.length === 0) {
    return 'No CloudWatch data in this range.'
  }

  return undefined
}

function Resources() {
  const { range } = useOutletContext<OutletContextType>()
  const [hoveredTime, setHoveredTime] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const timeWindow = useMemo(() => {
    const to = Date.now()
    return { from: to - DATACAT_RANGE_MS[range], to }
  }, [range])

  const { loading, error, data } = useQuery<ResourcesData>(GET_RESOURCES, {
    variables: { range },
    skip: !isOpen,
  })

  const isLoaded = useTransition(loading, data || error)

  function toggleOpen() {
    setIsOpen(!isOpen)
  }

  function renderRow(row: (typeof RESOURCE_ROWS)[number], index: number) {
    function isThisResource(health: ResourceHealth) {
      return health.id === row.id
    }

    const health = data?.dependencyHealth.find(isThisResource)
    const lines = toResourceLines(health)

    return (
      <div key={row.id} className="lr-panels">
        <TimeSeriesChart
          title={row.title}
          lines={lines}
          from={timeWindow.from}
          to={timeWindow.to}
          yAxis="percent"
          curve={curveLinear}
          formatValue={formatPercent}
          hoveredTime={hoveredTime}
          setHoveredTime={setHoveredTime}
          showTimeLabels={index === RESOURCE_ROWS.length - 1}
          showHoverTime={index === 0}
          note={data ? findNote(health, lines) : undefined}
        />
      </div>
    )
  }

  return (
    <div className="positions-container loaded">
      <button type="button" className="dc-collapse-trigger" onClick={toggleOpen} aria-expanded={isOpen}>
        <span className="lr-panel-label">Resources</span>
        <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stats-v ${isOpen ? 'open' : ''}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div className={`dc-collapse-body table-fade ${isLoaded && !loading ? 'loaded' : ''}`}>
          {error && <p className="dep-message">Unable to load resource data, please try again</p>}
          {RESOURCE_ROWS.map(renderRow)}
        </div>
      )}
    </div>
  )
}

export default Resources
