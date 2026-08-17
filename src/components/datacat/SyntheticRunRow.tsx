import { useState } from 'react'
import type { SyntheticRun } from '../../lib/types.ts'

interface Props {
  run: SyntheticRun
}

const SyntheticRunRow = ({ run }: Props) => {
  const [isOpen, setIsOpen] = useState(false)

  // a run still inside the filling bucket reads as incomplete until its teardown lands
  const status = run.failures > 0 ? 'critical' : !run.completed ? 'warn' : 'good'
  const label = run.failures > 0 ? 'Failed' : !run.completed ? 'Incomplete' : 'Passed'

  return (
    <div className="uptime-run">
      <button type="button" className="uptime-run-trigger" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        <span className={`uptime-swatch ${status}`} />
        <span className="uptime-run-status">{label}</span>
        <span className="uptime-run-time">{new Date(run.startedAt).toLocaleTimeString()}</span>
        <span>{run.requestCount} requests</span>

        <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stats-v uptime-run-chevron ${isOpen ? 'open' : ''}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className={`uptime-run-details ${isOpen ? 'open' : ''}`}>
        <p>User: {run.userId}</p>
        <p>Started: {new Date(run.startedAt).toLocaleString()}</p>
        <p>Requests: {run.requestCount}</p>
        <p>Failed requests: {run.failures}</p>
        <p>Reached teardown: {run.completed ? 'yes' : 'no'}</p>
      </div>
    </div>
  )
}

export default SyntheticRunRow
