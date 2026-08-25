import type { IngesterTransition } from '../../lib/types.ts'

interface Props {
  transition: IngesterTransition
}

// detail is written by the ingester and its shape varies by cause — an error pair, a ticker
// count, a join_timed_out flag. Printing whatever keys are there beats special-casing each
// cause, which would quietly stop covering new ones.
const toValue = (value: unknown) => (value !== null && typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))

const TransitionDetailsPanel = ({ transition }: Props) => {
  const entries = Object.entries(transition.detail || {})

  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p>Cause: {transition.cause ?? '-'}</p>
        <p>State: {transition.state}</p>
        <p>At: {new Date(transition.at).toLocaleString()}</p>
        <p>Boot: {transition.bootId}</p>
        <p>Connection: {transition.connectionId ?? '-'}</p>

        {entries.length > 0 && (
          <div className="call-breakdown">
            <p>Detail:</p>
            {entries.map(([key, value]) => (
              <div key={key}>
                {key}
                <p className="ing-detail-value">{toValue(value)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TransitionDetailsPanel
