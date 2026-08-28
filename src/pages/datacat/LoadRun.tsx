import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import LoadRunCharts from '../../components/datacat/LoadRunCharts'
import useTransition from '../../hooks/useTransition.ts'
import type { LoadRunSummary, LoadCompareRow } from '../../lib/types.ts'
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
      queueP99
    }
  }
`

interface RunsData {
  loadRuns: LoadRunSummary[]
}

interface CompareData {
  loadCompare: LoadCompareRow[]
}

const steps = [
  { step: 5, label: '5s buckets' },
  { step: 15, label: '15s buckets' },
  { step: 30, label: '30s buckets' },
  { step: 60, label: '1m buckets' },
]

// a run and a route together are what the charts are scoped to, so they travel as one value
const keyOf = (run: LoadRunSummary) => `${run.runId}|${run.route}`

const LoadRun = () => {
  const [selected, setSelected] = useState<string | null>(null)
  const [step, setStep] = useState(15)

  const { error: runsError, data: runsData } = useQuery<RunsData>(GET_LOAD_RUNS)

  const runs = runsData?.loadRuns || []
  // nothing is selected until the reader picks one; until then the newest run is the answer
  const current = runs.find((run) => keyOf(run) === selected) || runs[0] || null

  const { loading, error, data } = useQuery<CompareData>(GET_LOAD_COMPARE, {
    variables: { runId: current?.runId, route: current?.route, step },
    skip: !current,
  })

  const isLoaded = useTransition(loading, data || error)
  const rows = data?.loadCompare || []

  // a run is identified by when it started, so the date leads — but the full locale string
  // spends its width on seconds and a four-digit year and pushes the count out of the box
  const label = (run: LoadRunSummary) =>
    `${new Date(run.startedAt).toLocaleString('en-us', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · ${run.route} · ${run.samples.toLocaleString()}`

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
      {/* one filter row above everything it scopes — both selects re-render every panel */}
      <div className="lr-header">
        <div className={`status-div ${isLoaded ? 'loaded' : ''}`}>
          <label htmlFor="run-select" className="status-label">
            Run
          </label>

          <select id="run-select" value={current ? keyOf(current) : ''} onChange={(e) => setSelected(e.target.value)}>
            {runs.map((run) => (
              <option key={keyOf(run)} value={keyOf(run)}>
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

        <div className={`status-div ${isLoaded ? 'loaded' : ''}`}>
          <label htmlFor="step-select" className="status-label">
            Bucket
          </label>

          <select id="step-select" value={step} onChange={(e) => setStep(Number(e.target.value))}>
            {steps.map((option) => (
              <option key={option.step} value={option.step}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="select-svg-div">
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
        {error ? (
          <p className="lr-message">Unable to load this run, please try again</p>
        ) : (
          <LoadRunCharts rows={rows} route={current?.route || ''} step={step} />
        )}
      </div>
    </>
  )
}

export default LoadRun
