import useJobs, { JOBS } from '../../hooks/useJobs.ts'
import type { JobSummary } from '../../lib/types.ts'

interface Props {
  selectedName: string | null
  selectJob: (job: JobSummary) => void
}

const JobBoxes = ({ selectedName, selectJob }: Props) => {
  const { jobs } = useJobs()

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

  function renderJob(job: JobSummary) {
    const isSelected = selectedName === job.name

    return (
      <button
        key={job.name}
        type="button"
        className={`uptime-job ${job.state} ${isSelected ? 'selected' : ''}`}
        onClick={() => selectJob(job)}
        aria-pressed={isSelected}
        aria-label={`${job.label}: ${job.note}`}
      />
    )
  }

  return (
    <div className="uptime-jobs">
      <p className="uptime-slo-label">Scheduled jobs</p>
      <div className="uptime-job-row">{jobs.map(renderJob)}</div>
    </div>
  )
}

export default JobBoxes
