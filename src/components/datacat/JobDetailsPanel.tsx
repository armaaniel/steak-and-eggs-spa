import { useState, type CSSProperties } from 'react'
import useJobs, { isProblemDay, runSeconds, toDayLabel } from '../../hooks/useJobs.ts'
import { SENTRY_EVENT_SEARCH_URL, toBucketLabel, toDuration } from '../../lib/utils.ts'
import type { JobDay, JobDayState, JobRun } from '../../lib/types.ts'
import '../../stylesheets/datacat/uptime.css'

interface Props {
  name: string
}

const DAY_LABELS: Record<JobDayState, string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  missed: 'Missed',
  running: 'Running',
  upcoming: 'Scheduled',
  untracked: 'Not tracked',
}

const DAY_SWATCHES: Record<JobDayState, string> = {
  succeeded: 'good',
  failed: 'critical',
  missed: 'missed',
  running: 'pending',
  upcoming: 'none',
  untracked: 'none',
}

const EMPTY_DAY_NOTES: Record<JobDayState, string> = {
  succeeded: '',
  failed: '',
  missed: 'No run started',
  running: '',
  upcoming: "Hasn't run yet",
  untracked: 'Before runs were tracked',
}

const RUN_LABELS: Record<JobRun['status'], string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  running: 'Running',
}

const RUN_SWATCHES: Record<JobRun['status'], string> = {
  succeeded: 'good',
  failed: 'critical',
  running: 'pending',
}

const EDGE_CELLS = 5
const TOOLTIP_LIFT = 'calc(-100% - 6px)'

function findOpeningDay(days: JobDay[]) {
  for (let index = days.length - 1; index >= 0; index--) {
    if (isProblemDay(days[index])) {
      return days[index]
    }
  }

  for (let index = days.length - 1; index >= 0; index--) {
    if (days[index].runs.length > 0) {
      return days[index]
    }
  }

  return days[days.length - 1]
}

function formatSchedule(dueAt: string) {
  return `Daily ${new Date(dueAt).toLocaleTimeString('en-us', { hour: 'numeric', minute: '2-digit' })}`
}

function describeRunTime(run: JobRun) {
  if (run.finishedAt !== null) {
    return toDuration(runSeconds(run))
  }

  if (run.status === 'running') {
    return 'Still running'
  }

  return 'Never finished'
}

function findTooltipStyle(index: number, cellCount: number): CSSProperties {
  if (index < EDGE_CELLS) {
    return { left: `${(index / cellCount) * 100}%`, transform: `translateY(${TOOLTIP_LIFT})` }
  }

  if (index >= cellCount - EDGE_CELLS) {
    return { right: `${((cellCount - index - 1) / cellCount) * 100}%`, transform: `translateY(${TOOLTIP_LIFT})` }
  }

  return { left: `${((index + 0.5) / cellCount) * 100}%`, transform: `translate(-50%, ${TOOLTIP_LIFT})` }
}

function renderRun(run: JobRun) {
  return (
    <div key={run.id}>
      <p className="dc-detail-item">
        <span className="uptime-job-entry">
          <span className={`uptime-swatch ${RUN_SWATCHES[run.status]}`} />
          {toBucketLabel(run.startedAt)}
        </span>
        <span>{RUN_LABELS[run.status]}</span>
      </p>
      <p className="dc-detail-muted">
        {describeRunTime(run)}
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

function renderEmptyDay(day: JobDay) {
  return (
    <div>
      <p className="dc-detail-item">
        <span className="uptime-job-entry">
          <span className={`uptime-swatch ${DAY_SWATCHES[day.state]}`} />
          {toBucketLabel(day.dueAt)}
        </span>
        <span>{DAY_LABELS[day.state]}</span>
      </p>
      <p className="dc-detail-muted">{EMPTY_DAY_NOTES[day.state]}</p>
    </div>
  )
}

function renderTooltip(day: JobDay) {
  const latestRun = day.runs[day.runs.length - 1]

  if (latestRun === undefined) {
    return (
      <>
        <p className="dc-tooltip-time">{toBucketLabel(day.dueAt)}</p>
        <p>{DAY_LABELS[day.state]}</p>
      </>
    )
  }

  return (
    <>
      <p className="dc-tooltip-time">{toBucketLabel(latestRun.startedAt)}</p>
      <p>
        {DAY_LABELS[day.state]} · {describeRunTime(latestRun)}
      </p>
    </>
  )
}

const JobDetailsPanel = ({ name }: Props) => {
  const { error, jobs } = useJobs()
  const [picked, setPicked] = useState<{ name: string; bucket: string } | null>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const job = jobs?.find((summary) => summary.name === name)

  if (job === undefined || job.days.length === 0) {
    let message = null

    if (error) {
      message = <p className="uptime-message">Unable to load runs, please try again</p>
    }

    return <div className="sidebar-button-container two">{message}</div>
  }

  const days = job.days
  let selectedDay = findOpeningDay(days)

  if (picked !== null && picked.name === name) {
    selectedDay = days.find((day) => day.bucket === picked.bucket) ?? selectedDay
  }

  let hoveredDay: JobDay | null = null

  if (hoveredIndex !== null) {
    hoveredDay = days[hoveredIndex] ?? null
  }

  function renderCell(day: JobDay, index: number) {
    const isSelected = day.bucket === selectedDay.bucket

    return (
      <button
        key={day.bucket}
        type="button"
        className={`job-strip-cell ${day.state} ${isSelected ? 'selected' : ''}`}
        onClick={() => setPicked({ name, bucket: day.bucket })}
        onPointerEnter={() => setHoveredIndex(index)}
        aria-pressed={isSelected}
        aria-label={`${toBucketLabel(day.dueAt)}: ${DAY_LABELS[day.state]}`}
      />
    )
  }

  let selectedDetails = renderEmptyDay(selectedDay)

  if (selectedDay.runs.length > 0) {
    selectedDetails = <div className="dc-detail-list">{selectedDay.runs.map(renderRun)}</div>
  }

  return (
    <div className="sidebar-button-container two">
      <div className="trace-details">
        <p className="dc-detail-muted">
          {formatSchedule(days[days.length - 1].dueAt)} · rake {name}
        </p>

        <div className="job-strip-container">
          <div className="job-strip" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} onPointerLeave={() => setHoveredIndex(null)}>
            {days.map(renderCell)}
          </div>

          {hoveredDay !== null && hoveredIndex !== null && (
            <div className="dc-tooltip job-strip-tooltip" style={findTooltipStyle(hoveredIndex, days.length)}>
              {renderTooltip(hoveredDay)}
            </div>
          )}

          <div className="job-strip-labels">
            <span>{toDayLabel(days[0].dueAt)}</span>
            <span>{toDayLabel(days[days.length - 1].dueAt)}</span>
          </div>
        </div>

        <hr className="dc-detail-divider" />

        {selectedDetails}
      </div>
    </div>
  )
}

export default JobDetailsPanel
