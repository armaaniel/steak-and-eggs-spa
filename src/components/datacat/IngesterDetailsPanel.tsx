import { toDuration } from '../../lib/utils.ts'
import type { IngesterDetail, IngesterTransition } from '../../lib/types.ts'

interface Props {
  detail: IngesterDetail
}

// detail payloads are written by the ingester and their shape varies by cause, so whatever
// keys are present get printed rather than special-casing each one
const toValue = (value: unknown) => (value !== null && typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))

// the query returns newest-first for scanning; inside a panel these are a narrative, so
// they read forward. Copied rather than sorted in place — the array belongs to the page.
const byTime = (a: { at: string }, b: { at: string }) => new Date(a.at).getTime() - new Date(b.at).getTime()

const TransitionLines = ({ transitions }: { transitions: IngesterTransition[] }) => (
  <div className="call-breakdown">
    <p>Transitions:</p>
    {[...transitions].sort(byTime).map((transition) => (
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
                {[...detail.connections].sort((a, b) => byTime({ at: a.spawnedAt }, { at: b.spawnedAt })).map((connection) => (
                  <div key={connection.connectionId}>
                    {new Date(connection.spawnedAt).toLocaleString()}
                    <p>lifetime {toDuration(connection.durationSeconds)}, exit {connection.endedBy}</p>
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
            <p>Lifetime: {toDuration(detail.connection.durationSeconds)}</p>
            <p>Exit: {detail.connection.endedBy}</p>

            {detail.transitions.length > 0 && <TransitionLines transitions={detail.transitions} />}
          </>
        )}
      </div>
    </div>
  )
}

export default IngesterDetailsPanel
