import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import CableRunCharts from '../../components/datacat/CableRunCharts'
import LoadNav from '../../components/datacat/LoadNav'
import Select from '../../components/datacat/Select'
import SegmentedToggle from '../../components/datacat/SegmentedToggle'
import { STEP_OPTIONS } from '../../components/datacat/runCharts'
import useTransition from '../../hooks/useTransition.ts'
import type { CableRunSummary, CableCompareRow, RunMetricPoint } from '../../lib/types.ts'
import '../../stylesheets/datacat/loadrun.css'

const GET_CABLE_RUNS = gql`
  query getCableRuns {
    cableRuns {
      runId
      startedAt
      endedAt
      samples
    }
  }
`

const GET_CABLE_COMPARE = gql`
  query getCableCompare($runId: ID!, $step: Int!) {
    cableCompare(runId: $runId, step: $step) {
      at
      published
      received
      clients
      expected
      peakClients
      p50LagMs
      p99LagMs
    }
  }
`

const GET_RUN_METRICS = gql`
  query getRunMetrics($runId: ID!, $step: Int!) {
    cpu: runMetrics(runId: $runId, kind: "cable", metric: "cpu") {
      at
      minimum
      maximum
      average
    }
    memory: runMetrics(runId: $runId, kind: "cable", metric: "memory") {
      at
      minimum
      maximum
      average
    }
    cpuUsed: runMetrics(runId: $runId, kind: "cable", metric: "cpu_used", step: $step) {
      at
      minimum
      maximum
      average
    }
    pressure: runMetrics(runId: $runId, kind: "cable", metric: "cpu_pressure", step: $step) {
      at
      minimum
      maximum
      average
    }
    gcTime: runMetrics(runId: $runId, kind: "cable", metric: "gc_time", step: $step) {
      at
      minimum
      maximum
      average
    }
    gcMajor: runMetrics(runId: $runId, kind: "cable", metric: "gc_major") {
      at
      minimum
      maximum
      average
    }
  }
`

interface RunsData {
  cableRuns: CableRunSummary[]
}

interface CompareData {
  cableCompare: CableCompareRow[]
}

interface MetricsData {
  cpu: RunMetricPoint[]
  memory: RunMetricPoint[]
  cpuUsed: RunMetricPoint[]
  pressure: RunMetricPoint[]
  gcTime: RunMetricPoint[]
  gcMajor: RunMetricPoint[]
}

const CableRun = () => {
  const [selected, setSelected] = useState<string | null>(null)
  const [step, setStep] = useState(15)
  const [statsOpen, setStatsOpen] = useState(false)

  const { error: runsError, data: runsData } = useQuery<RunsData>(GET_CABLE_RUNS)

  const runs = runsData?.cableRuns || []
  const current = runs.find((run) => run.runId === selected) || runs[0] || null

  const { loading, error, data } = useQuery<CompareData>(GET_CABLE_COMPARE, {
    variables: { runId: current?.runId, step },
    skip: !current,
  })

  const { data: metricsData } = useQuery<MetricsData>(GET_RUN_METRICS, {
    variables: { runId: current?.runId, step },
    skip: !current,
  })

  const isLoaded = useTransition(loading, data || error)
  const rows = data?.cableCompare || []
  const cpu = metricsData?.cpu || []
  const memory = metricsData?.memory || []
  const cpuUsed = metricsData?.cpuUsed || []
  const pressure = metricsData?.pressure || []
  const gcTime = metricsData?.gcTime || []
  const gcMajor = metricsData?.gcMajor || []

  const label = (run: CableRunSummary) => {
    const seconds = Math.round((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)

    return `${seconds}s · ${run.samples.toLocaleString()}`
  }

  const runOptions = runs.map((run) => ({ value: run.runId, label: label(run) }))

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
        <p className="lr-message">No cable runs recorded yet.</p>
      </div>
    )
  }

  return (
    <>
      <div className="lr-header">
        <Select label="Run" value={current?.runId || ''} onChange={setSelected} options={runOptions} loaded={isLoaded} />

        <SegmentedToggle label="Bucket" value={step} onChange={setStep} options={STEP_OPTIONS} loaded={isLoaded} />

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
          <CableRunCharts rows={rows} step={step} cpu={cpu} memory={memory} cpuUsed={cpuUsed} pressure={pressure} gcTime={gcTime} gcMajor={gcMajor} statsOpen={statsOpen} />
        )}
      </div>
    </>
  )
}

export default CableRun
