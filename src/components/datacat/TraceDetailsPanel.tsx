import type { Trace } from '../../lib/types.ts'

interface Props {
  trace: Trace
}

const TraceDetailsPanel = ({ trace }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p>ID: {trace.id}</p>
        <p>Endpoint: {trace.endpoint}</p>
        <p>Duration: {trace.duration.toFixed(0)}ms</p>
        <p>DB Runtime: {trace.dbRuntime.toFixed(0)}ms</p>
        <p>View Runtime: {trace.viewRuntime?.toFixed(0) ?? '0'}ms</p>
        <p>Status: {trace.status}</p>
        <p>Created At: {new Date(trace.createdAt).toLocaleString()}</p>
        <p>
          Controller Method: {trace.controller}#{trace.action}
        </p>

        {trace.breakdown && Object.keys(trace.breakdown).length > 0 && (
          <div className='call-breakdown'>
            <p>Service call:</p>
            {Object.entries(trace.breakdown).map(([serviceName, data]) => (
              <div key={serviceName}>{serviceName}
                <p>duration: {`${data.duration.toFixed(2)}ms`}</p>
                {data.used_redis !== undefined && <p>{`used_redis: ${data.used_redis}`}</p>}
                {data.used_db !== undefined && <p>{`used_db: ${data.used_db}`}</p>}
                {data.used_api !== undefined && <p>{`used_api: ${data.used_api}`}</p>}
                {data.operation !== undefined && <p>{`operation: ${data.operation}`}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default TraceDetailsPanel
