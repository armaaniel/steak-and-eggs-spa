import DetailRows from './DetailRows'
import { toDuration, toShortTime } from '../../lib/utils.ts'
import type { IngesterConnection, IngesterDetail, IngesterTransition } from '../../lib/types.ts'

interface Props {
  detail: IngesterDetail
}

const toValue = (value: unknown) => (value !== null && typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value))

const byTime = (a: { at: string }, b: { at: string }) => new Date(a.at).getTime() - new Date(b.at).getTime()

const formatTime = (at: string | null) => (at ? new Date(at).toLocaleString() : 'none')

const ConnectionList = ({ connections }: { connections: IngesterConnection[] }) => (
  <div className="dc-detail-list">
    <p className="dc-detail-label">Connections</p>
    {[...connections].sort((a, b) => byTime({ at: a.spawnedAt }, { at: b.spawnedAt })).map((connection) => (
      <div key={connection.connectionId}>
        <p className="dc-detail-item">
          <span>{toShortTime(connection.spawnedAt)}</span>
          <span>{toDuration(connection.durationSeconds)}</span>
        </p>
        <p className="dc-detail-muted">{connection.endedBy}</p>
      </div>
    ))}
  </div>
)

const TransitionList = ({ transitions }: { transitions: IngesterTransition[] }) => (
  <div className="dc-detail-list">
    <p className="dc-detail-label">Transitions</p>
    {[...transitions].sort(byTime).map((transition) => (
      <div key={transition.id}>
        <p className="dc-detail-item">
          <span>{transition.cause ?? '-'}</span>
          <span>{toShortTime(transition.at)}</span>
        </p>
        {Object.entries(transition.detail || {}).map(([key, value]) => (
          <p key={key} className="dc-detail-muted ing-detail-value">
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
            <DetailRows
              rows={[
                { label: 'Started', value: formatTime(detail.boot.startedAt) },
                { label: 'Last seen', value: formatTime(detail.boot.lastSeenAt) },
                { label: 'Lifetime', value: toDuration(detail.boot.durationSeconds) },
                { label: 'Reconnects', value: detail.boot.reconnects },
                { label: 'Exit', value: detail.boot.exitState === 'none' ? 'no sigterm' : detail.boot.exitState },
              ]}
              inline
            />

            {detail.connections.length > 0 && <ConnectionList connections={detail.connections} />}
            {detail.transitions.length > 0 && <TransitionList transitions={detail.transitions} />}

            <DetailRows rows={[{ label: 'Boot ID', value: detail.boot.bootId }]} />
          </>
        )}

        {detail.kind === 'connection' && (
          <>
            <DetailRows
              rows={[
                { label: 'Started', value: formatTime(detail.connection.spawnedAt) },
                { label: 'First message', value: formatTime(detail.connection.firstMessageAt) },
                { label: 'Last message', value: formatTime(detail.connection.lastMessageAt) },
                { label: 'Last seen', value: formatTime(detail.connection.lastSeenAt) },
                { label: 'Lifetime', value: toDuration(detail.connection.durationSeconds) },
                { label: 'Events', value: Number(detail.connection.events ?? 0).toLocaleString() },
                { label: 'p99 mean lag', value: detail.connection.p99MeanExcessMs === null ? '-' : `${detail.connection.p99MeanExcessMs.toLocaleString()} ms` },
                { label: 'State', value: detail.connection.state },
                { label: 'Exit', value: detail.connection.endedBy },
              ]}
              inline
            />

            {detail.transitions.length > 0 && <TransitionList transitions={detail.transitions} />}

            <DetailRows
              rows={[
                { label: 'Connection ID', value: detail.connection.connectionId },
                { label: 'Boot ID', value: detail.connection.bootId },
              ]}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default IngesterDetailsPanel
