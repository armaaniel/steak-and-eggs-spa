import DetailRows from './DetailRows'
import useJobs from '../../hooks/useJobs.ts'
import { DATACAT_RANGE_LABELS, type DatacatRange } from '../../hooks/useDatacatRange'
import { SENTRY_EVENT_SEARCH_URL, toBucketLabel, toDuration } from '../../lib/utils.ts'
import type { JobRun } from '../../lib/types.ts'
import '../../stylesheets/datacat/uptime.css'

interface Props {
  name: string
  range: DatacatRange
}

const STATUS_LABELS: Record<JobRun['status'], string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  running: 'Running',
}

const STATUS_CLASSES: Record<JobRun['status'], string> = {
  succeeded: 'good',
  failed: 'critical',
  running: 'warn',
}

type Entry = { at: string; run: JobRun | null }

function runSeconds(run: JobRun) {
  return run.finishedAt === null ? null : (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000
}

function toDayLabel(bucket: string) {
  return new Date(bucket).toLocaleDateString('en-us', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function renderEntry({ at, run }: Entry) {
  if (run === null) {
    return (
      <div key={at}>
        <p className="dc-detail-item">
          <span className="uptime-job-entry">
            <span className="uptime-swatch critical" />
            {toDayLabel(at)}
          </span>
          <span>Missed</span>
        </p>
        <p className="dc-detail-muted">No run started that day</p>
      </div>
    )
  }

  return (
    <div key={run.id}>
      <p className="dc-detail-item">
        <span className="uptime-job-entry">
          <span className={`uptime-swatch ${STATUS_CLASSES[run.status]}`} />
          {toBucketLabel(run.startedAt)}
        </span>
        <span>{STATUS_LABELS[run.status]}</span>
      </p>
      <p className="dc-detail-muted">
        {toDuration(runSeconds(run))}
        {run.errorClass && ` · ${run.errorClass}`}
      </p>
      {run.sentryEventId && (
        <a className="dc-detail-muted" href={`${SENTRY_EVENT_SEARCH_URL}${run.sentryEventId}`} target="_blank" rel="noreferrer">
          View in Sentry
        </a>
      )}
    </div>
  )
}

const JobDetailsPanel = ({ name, range }: Props) => {
  const { error, jobs } = useJobs(range)
  const job = jobs?.find((summary) => summary.name === name)

  if (error) {
    return (
      <div className="sidebar-button-container two">
        <p className="uptime-message">Unable to load runs, please try again</p>
      </div>
    )
  }

  if (job === undefined) {
    return <div className="sidebar-button-container two" />
  }

  const entries: Entry[] = [
    ...job.runs.map((run) => ({ at: run.startedAt, run })),
    ...job.missed.map((bucket) => ({ at: bucket, run: null })),
  ].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))

  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <div>
          <p>{name}</p>
          <p className="dc-detail-muted">{DATACAT_RANGE_LABELS[range]}</p>
        </div>

        <DetailRows
          rows={[
            { label: 'Succeeded', value: job.succeeded },
            { label: 'Failed', value: job.failed },
            { label: 'Missed', value: job.missed.length },
          ]}
          inline
        />

        <hr className="dc-detail-divider" />

        {entries.length === 0 ? (
          <p className="dc-detail-muted">No runs in this range</p>
        ) : (
          <div className="dc-detail-list">{entries.map(renderEntry)}</div>
        )}
      </div>
    </div>
  )
}

export default JobDetailsPanel
