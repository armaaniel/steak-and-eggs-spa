import { toDuration } from '../../lib/utils.ts'
import type { IngesterDetail, IngesterTransition } from '../../lib/types.ts'

interface Props {
  detail: IngesterDetail
}

// detail payloads are written by the ingester and their shape varies by cause, so whatever
// keys are present get printed rather than special-casing each one
const toValue = (value: unknown) => (value !== null && typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))

const TransitionLines = ({ transitions }: { transitions: IngesterTransition[] }) => (
  <div className="call-breakdown">
    <p>Transitions:</p>
    {transitions.map((transition) => (
      <div key={transition.id}>
        {transition.cause ?? '-'}
        <p>{new Date(transition.at).toLocaleString()}</p>
        {Object.entries(transition.detail || {}).map(([key, value]) => (
          <p key={key} className="ing-detail-value">
            {key}: {toValue(value)}
          </p>
        ))}
      </div>
    ))}
  </div>
)

const IngesterDetailsPanel = ({ detail }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        {detail.kind === 'boot' && (
          <>
            <p>Boot: {detail.boot.bootId}</p>
            <p>Started: {new Date(detail.boot.startedAt).toLocaleString()}</p>
            <p>Last seen: {new Date(detail.boot.lastSeenAt).toLocaleString()}</p>
            <p>Lifetime: {toDuration(detail.boot.durationSeconds)}</p>
            <p>Reconnects: {detail.boot.reconnects}</p>
            <p>Events: {Number(detail.boot.events ?? 0).toLocaleString()}</p>
            <p>Peak lag: {detail.boot.peakLagMs === null ? '-' : `${detail.boot.peakLagMs} ms`}</p>
            <p>Exit: {detail.boot.exitState === 'none' ? 'no sigterm' : detail.boot.exitState}</p>

            {detail.connections.length > 0 && (
              <div className="call-breakdown">
                <p>Connections:</p>
                {detail.connections.map((connection) => (
                  <div key={connection.connectionId}>
                    {new Date(connection.spawnedAt).toLocaleString()}
                    <p>held {toDuration(connection.durationSeconds)}, ended {connection.endedBy}</p>
                  </div>
                ))}
              </div>
            )}

            {detail.transitions.length > 0 && <TransitionLines transitions={detail.transitions} />}
          </>
        )}

        {detail.kind === 'connection' && (
          <>
            <p>Connection: {detail.connection.connectionId}</p>
            <p>Boot: {detail.connection.bootId}</p>
            <p>Started: {new Date(detail.connection.spawnedAt).toLocaleString()}</p>
            <p>First message: {detail.connection.firstMessageAt ? new Date(detail.connection.firstMessageAt).toLocaleString() : 'none'}</p>
            <p>Last seen: {new Date(detail.connection.lastSeenAt).toLocaleString()}</p>
            <p>Held: {toDuration(detail.connection.durationSeconds)}</p>
            <p>Ended: {detail.connection.endedBy}</p>

            {detail.transitions.length > 0 && <TransitionLines transitions={detail.transitions} />}
          </>
        )}

        {detail.kind === 'transition' && (
          <>
            <p>Cause: {detail.transition.cause ?? '-'}</p>
            <p>State: {detail.transition.state}</p>
            <p>At: {new Date(detail.transition.at).toLocaleString()}</p>
            <p>Boot: {detail.transition.bootId}</p>
            <p>Connection: {detail.transition.connectionId ?? '-'}</p>

            {Object.entries(detail.transition.detail || {}).length > 0 && (
              <div className="call-breakdown">
                <p>Detail:</p>
                {Object.entries(detail.transition.detail || {}).map(([key, value]) => (
                  <div key={key}>
                    {key}
                    <p className="ing-detail-value">{toValue(value)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default IngesterDetailsPanel
