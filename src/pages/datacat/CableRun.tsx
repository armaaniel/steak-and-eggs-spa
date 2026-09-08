import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import CableRunCharts from '../../components/datacat/CableRunCharts'
import LoadNav from '../../components/datacat/LoadNav'
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
  query getCableCompare($runId: ID!) {
    cableCompare(runId: $runId) {
      at
      published
      received
      clients
      expected
      peakClients
      meanLagMs
      p99LagMs
    }
  }
`

const GET_RUN_METRICS = gql`
  query getRunMetrics($runId: ID!) {
    runMetrics(runId: $runId) {
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
  runMetrics: RunMetricPoint[]
}

const CableRun = () => {
  const [selected, setSelected] = useState<string | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)

  const { error: runsError, data: runsData } = useQuery<RunsData>(GET_CABLE_RUNS)

  const runs = runsData?.cableRuns || []
  const current = runs.find((run) => run.runId === selected) || runs[0] || null

  const { loading, error, data } = useQuery<CompareData>(GET_CABLE_COMPARE, {
    variables: { runId: current?.runId },
    skip: !current,
  })

  const { data: metricsData } = useQuery<MetricsData>(GET_RUN_METRICS, {
    variables: { runId: current?.runId },
    skip: !current,
  })

  const isLoaded = useTransition(loading, data || error)
  const rows = data?.cableCompare || []
  const cpu = metricsData?.runMetrics || []

  const label = (run: CableRunSummary) => {
    const started = new Date(run.startedAt).toLocaleString('en-us', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    const seconds = Math.round((new Date(run.endedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)

    return `${started} · ${seconds}s · ${run.samples.toLocaleString()}`
  }

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
        <div className={`status-div ${isLoaded ? 'loaded' : ''}`}>
          <label htmlFor="run-select" className="status-label">
            Run
          </label>

          <select id="run-select" value={current?.runId || ''} onChange={(e) => setSelected(e.target.value)}>
            {runs.map((run) => (
              <option key={run.runId} value={run.runId}>
                {label(run)}
              </option>
            ))}
          </select>

          <div className="select-svg-div">
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        <LoadNav />

        <button type="button" className={`lr-stats-toggle ${isLoaded ? 'loaded' : ''}`} onClick={() => setStatsOpen(!statsOpen)} aria-expanded={statsOpen} aria-label="Toggle run totals">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`lr-v ${statsOpen ? 'open' : ''}`}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
        {error ? (
          <p className="lr-message">Unable to load this run, please try again</p>
        ) : (
          <CableRunCharts rows={rows} cpu={cpu} statsOpen={statsOpen} />
        )}
      </div>
    </>
  )
}

export default CableRun
