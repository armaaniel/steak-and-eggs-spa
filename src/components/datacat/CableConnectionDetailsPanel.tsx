import type { ConnectionWithID } from '../../lib/types.ts'

interface Props {
  connection: ConnectionWithID
}

const CableConnectionDetailsPanel = ({ connection }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p>Started At: {new Date(connection.startedAt).toLocaleString()}</p>
        <p>Alive?: {connection.connectionState}</p>

        {connection.subscriptions.length > 0 && (
          <div>
            <p>Subscriptions:</p>
            <div className="trace-breakdown">
              {connection.subscriptions.map((sub, index) => (
                <div key={index}>
                  <p>channel: {sub.channel}</p>
                  <p>symbol: {sub.symbol}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CableConnectionDetailsPanel
