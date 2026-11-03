import useJobs, { JOBS } from '../../hooks/useJobs.ts'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import type { JobSummary } from '../../lib/types.ts'

interface Props {
  range: DatacatRange
  selectedName: string | null
  selectJob: (job: JobSummary) => void
}

const STATE_LABELS: Record<JobSummary['state'], string> = {
  good: 'all good',
  warn: 'running',
  critical: 'failed or missed',
}

const JobBoxes = ({ range, selectedName, selectJob }: Props) => {
  const { jobs } = useJobs(range)

  if (jobs === undefined) {
    return (
      <div className="uptime-jobs" aria-hidden="true">
        <p className="uptime-slo-label">Scheduled jobs</p>
        <div className="uptime-job-row">
          {JOBS.map((job) => (
            <div key={job.name} className="uptime-job" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="uptime-jobs">
      <p className="uptime-slo-label">Scheduled jobs</p>
      <div className="uptime-job-row">
        {jobs.map((job) => (
          <button
            key={job.name}
            type="button"
            className={`uptime-job ${job.state} ${selectedName === job.name ? 'selected' : ''}`}
            onClick={() => selectJob(job)}
            aria-pressed={selectedName === job.name}
            aria-label={`${job.label}: ${STATE_LABELS[job.state]}`}
            title={job.label}
          />
        ))}
      </div>
    </div>
  )
}

export default JobBoxes
