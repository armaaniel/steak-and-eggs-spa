import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import type { SyntheticRun, Trace } from '../../lib/types.ts'

const GET_RUN_TRACES = gql`
  query getSyntheticRunTraces($runId: ID!) {
    syntheticRunTraces(runId: $runId) {
      id
      createdAt
      endpoint
      duration
      controller
      action
      status
      dbRuntime
      viewRuntime
      breakdown
    }
  }
`

interface TracesData {
  syntheticRunTraces: Trace[]
}

interface Props {
  run: SyntheticRun
  selectedTrace: Trace | null
  setSelectedTrace: React.Dispatch<React.SetStateAction<Trace | null>>
}

const SyntheticRunRow = ({ run, selectedTrace, setSelectedTrace }: Props) => {
  const [isOpen, setIsOpen] = useState(false)

	const status = run.result === 'pass' ? 'good' : run.result === 'fail' ? 'critical' : 'warn'
	const label  = run.result === 'pass' ? 'Passed' : run.result === 'fail' ? 'Failed' : 'No verdict'

  // only an expanded run pays for its traces — a 30d bucket holds 288 of them
  const { error, data } = useQuery<TracesData>(GET_RUN_TRACES, {
    variables: { runId: run.runId },
    skip: !isOpen,
  })

  const traces = data?.syntheticRunTraces || []

  return (
    <div className="uptime-run">
      <button type="button" className="uptime-run-trigger" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        <span className={`uptime-swatch ${status}`} />
        <span className="uptime-run-status">{label}</span>
        <span className="uptime-run-time">{new Date(run.startedAt).toLocaleTimeString()}</span>
        <span>{run.requestCount} requests</span>
        <span>{run.failures} failed</span>

        <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stats-v uptime-run-chevron ${isOpen ? 'open' : ''}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={`uptime-run-details ${isOpen ? 'open' : ''}`}>
        <p>Run: {run.runId}</p>
        <p>Started: {new Date(run.startedAt).toLocaleString()}</p>
        <p>Reached teardown: {run.completed ? 'yes' : 'no'}</p>

        <div className="uptime-requests">
          {error ? (
            <p>Unable to load requests, please try again</p>
          ) : (
            traces.map((trace) => (
              <button key={trace.id} type="button" className={`uptime-request ${selectedTrace?.id === trace.id ? 'selected' : ''}`} onClick={() => setSelectedTrace(trace)}>
                <span className={`uptime-swatch ${trace.status >= 500 ? 'critical' : 'good'}`} />
                <span className="uptime-request-status">{trace.status}</span>
                <span className="uptime-request-endpoint">{trace.endpoint}</span>
                <span className="uptime-run-time">{new Date(trace.createdAt).toLocaleTimeString()}</span>
                <span>{trace.duration?.toFixed(0)} ms</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default SyntheticRunRow
