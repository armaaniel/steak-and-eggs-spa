import { useState } from 'react'
import type { IngesterTransition } from '../../lib/types.ts'

interface Props {
  transition: IngesterTransition
}

// detail is written by the ingester and its shape varies by cause — an error pair, a ticker
// count, a join_timed_out flag. Printing whatever keys are there beats special-casing each
// cause, which would quietly stop covering new ones.
const toValue = (value: unknown) => (value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value))

const IngesterTransitionRow = ({ transition }: Props) => {
  const [isOpen, setIsOpen] = useState(false)

  const entries = Object.entries(transition.detail || {})
  const hasDetail = entries.length > 0

  return (
    <div className="ing-transition">
      <button type="button" className="ing-transition-trigger" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen} disabled={!hasDetail}>
        <span className="ing-transition-time">{new Date(transition.at).toLocaleString()}</span>
        <span className="ing-transition-cause">{transition.cause ?? '-'}</span>
        <span>{transition.state}</span>

        {hasDetail && (
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stats-v ing-transition-chevron ${isOpen ? 'open' : ''}`}>
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className={`ing-transition-detail ${isOpen ? 'open' : ''}`}>
        {entries.map(([key, value]) => (
          <p key={key}>
            {key}: {toValue(value)}
          </p>
        ))}
      </div>
    </div>
  )
}

export default IngesterTransitionRow
