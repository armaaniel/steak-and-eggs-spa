import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import LoadRunCharts from '../../components/datacat/LoadRunCharts'
import LoadNav from '../../components/datacat/LoadNav'
import Select from '../../components/datacat/Select'
import SegmentedToggle from '../../components/datacat/SegmentedToggle'
import useTransition from '../../hooks/useTransition.ts'
import type { LoadRunSummary, LoadCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

const GET_LOAD_RUNS = gql`
  query getLoadRuns {
    loadRuns {
      runId
      route
      startedAt
      endedAt
      samples
    }
  }
`

const GET_LOAD_COMPARE = gql`
  query getLoadCompare($runId: ID!, $route: String!, $step: Int!) {
    loadCompare(runId: $runId, route: $route, step: $step) {
      bucket
      rps
      sent
      traced
      gap
      errors
      clientP50
      clientP99
      serverP50
      serverP99
    }
  }
`

const GET_RUN_METRICS = gql`
  query getRunMetrics($runId: ID!, $step: Int!) {
    cpu: runMetrics(runId: $runId, kind: "load", metric: "cpu") {
      at
      minimum
      maximum
      average
    }
    memory: runMetrics(runId: $runId, kind: "load", metric: "memory") {
      at
      minimum
      maximum
      average
    }
    cpuUsed: runMetrics(runId: $runId, kind: "load", metric: "cpu_used", step: $step) {
      at
      minimum
      maximum
      average
    }
    pressure: runMetrics(runId: $runId, kind: "load", metric: "cpu_pressure", step: $step) {
      at
      minimum
      maximum
      average
    }
    gcTime: runMetrics(runId: $runId, kind: "load", metric: "gc_time", step: $step) {
      at
      minimum
      maximum
      average
    }
    gcMajor: runMetrics(runId: $runId, kind: "load", metric: "gc_major") {
      at
      minimum
      maximum
      average
    }
  }
`

interface RunsData {
  loadRuns: LoadRunSummary[]
}

interface MetricsData {
  cpu: RunMetricPoint[]
  memory: RunMetricPoint[]
  cpuUsed: RunMetricPoint[]
  pressure: RunMetricPoint[]
  gcTime: RunMetricPoint[]
  gcMajor: RunMetricPoint[]
}

interface CompareData {
  loadCompare: LoadCompareRow[]
}

const stepOptions = [
  { value: 5, label: '5s' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
]

const keyOf = (run: LoadRunSummary) => `${run.runId}|${run.route}`

const LoadRun = () => {
  const [selected, setSelected] = useState<string | null>(null)
  const [step, setStep] = useState(15)
  const [statsOpen, setStatsOpen] = useState(false)

  const { error: runsError, data: runsData } = useQuery<RunsData>(GET_LOAD_RUNS)

  const runs = runsData?.loadRuns || []
  const current = runs.find((run) => keyOf(run) === selected) || runs[0] || null

  const { loading, error, data } = useQuery<CompareData>(GET_LOAD_COMPARE, {
    variables: { runId: current?.runId, route: current?.route, step },
    skip: !current,
  })

  const { data: metricsData } = useQuery<MetricsData>(GET_RUN_METRICS, {
    variables: { runId: current?.runId, step },
    skip: !current,
  })

  const isLoaded = useTransition(loading, data || error)
  const rows = data?.loadCompare || []
  const cpu = metricsData?.cpu || []
  const memory = metricsData?.memory || []
  const cpuUsed = metricsData?.cpuUsed || []
  const pressure = metricsData?.pressure || []
  const gcTime = metricsData?.gcTime || []
  const gcMajor = metricsData?.gcMajor || []

  const label = (run: LoadRunSummary) => `${run.route} · ${run.samples.toLocaleString()}`

  const runOptions = runs.map((run) => ({ value: keyOf(run), label: label(run) }))

  if (runsError) {
    return (
      <div className="positions-container loaded">
        <p className="lr-message">Unable to load runs, please try again</p>
      </div>
    )
  }

  if (runsData && !runs.length) {
    return (
      <div className="positions-container loaded">
        <p className="lr-message">No load runs recorded yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="lr-header">
        <Select label="Run" value={current ? keyOf(current) : ''} onChange={setSelected} options={runOptions} loaded={isLoaded} />

        <SegmentedToggle label="Bucket" value={step} onChange={setStep} options={stepOptions} loaded={isLoaded} />

        <LoadNav />

        <button type="button" className={`lr-stats-toggle ${isLoaded ? 'loaded' : ''}`} onClick={() => setStatsOpen(!statsOpen)} aria-expanded={statsOpen} aria-label="Toggle run totals">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`lr-v ${statsOpen ? 'open' : ''}`}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
        {error ? (
          <p className="lr-message">Unable to load this run, please try again</p>
        ) : (
          <LoadRunCharts rows={rows} route={current?.route || ''} step={step} cpu={cpu} memory={memory} cpuUsed={cpuUsed} pressure={pressure} gcTime={gcTime} gcMajor={gcMajor} statsOpen={statsOpen} />
        )}
      </div>
    </>
  )
}

export default LoadRun
