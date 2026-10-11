import DetailRows from './DetailRows'
import { toShortTime } from '../../lib/utils.ts'
import type { ConnectionWithID } from '../../lib/types.ts'

interface Props {
  connection: ConnectionWithID
}

const CableConnectionDetailsPanel = ({ connection }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <DetailRows
          rows={[
            { label: 'Started', value: toShortTime(connection.startedAt) },
            { label: 'State', value: connection.connectionState === 'true' ? 'open' : 'closed' },
          ]}
          inline
        />

        {connection.subscriptions.length > 0 && (
          <div className="dc-detail-list">
            <p className="dc-detail-label">Subscriptions</p>
            {connection.subscriptions.map((sub, index) => (
              <p key={index}>
                {sub.channel} · {sub.symbol}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CableConnectionDetailsPanel
