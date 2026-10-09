import type { Trace } from '../../lib/types.ts'

interface Props {
  trace: Trace
}

const SENTRY_EVENT_SEARCH_URL = 'https://armaaniel.sentry.io/issues/?query='

const TraceDetailsPanel = ({ trace }: Props) => {
  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p>Endpoint: {trace.endpoint}</p>
        <p>
          Controller Method: {trace.controller}#{trace.action}
        </p>
        <p>Status: {trace.status}</p>
        {trace.errorClass && <p>Error Class: {trace.errorClass}</p>}
        {trace.errorLocation && <p>Error Location: {trace.errorLocation}</p>}
        {trace.sentryEventId && (
          <p>
            Sentry Event Link: <a href={`${SENTRY_EVENT_SEARCH_URL}${trace.sentryEventId}`} target="_blank" rel="noreferrer">{trace.sentryEventId}</a>
          </p>
        )}
        <p>Duration: {trace.duration.toFixed(0)}ms</p>
        <p>DB Runtime: {trace.dbRuntime.toFixed(0)}ms</p>
        <p>Created At: {new Date(trace.createdAt).toLocaleString()}</p>

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
                {data.error_class !== undefined && <p>{`error_class: ${data.error_class}`}</p>}
              </div>
            ))}
          </div>
        )}
        <p>ID: {trace.id}</p>
      </div>
    </div>
  )
}

export default TraceDetailsPanel
