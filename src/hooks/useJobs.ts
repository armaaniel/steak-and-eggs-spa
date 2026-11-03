import { gql, useQuery, type WatchQueryFetchPolicy } from '@apollo/client'
import { useMemo, useState } from 'react'
import { toDuration } from '../lib/utils.ts'
import type { JobBucket, JobDay, JobDayState, JobRun, JobSummary } from '../lib/types.ts'

export const JOBS = [
  { name: 'tickers:sync', label: 'Ticker sync', key: 'tickersSync' },
  { name: 'record', label: 'Record', key: 'record' },
  { name: 'prune_traces', label: 'Prune traces', key: 'pruneTraces' },
] as const

type Job = (typeof JOBS)[number]

type JobsData = { jobBuckets: JobBucket[] } & Record<Job['key'], JobRun[]>

const GET_JOBS = gql`
  fragment JobRunFields on JobRun {
    id
    name
    startedAt
    finishedAt
    errorClass
    sentryEventId
    status
  }

  query getJobs($from: ISO8601DateTime!, $to: ISO8601DateTime!) {
    jobBuckets {
      name
      bucket
      bucketEnd
      dueAt
      started
      completed
      failures
      expected
    }
    tickersSync: jobRuns(name: "tickers:sync", bucket: $from, bucketEnd: $to) {
      ...JobRunFields
    }
    record: jobRuns(name: "record", bucket: $from, bucketEnd: $to) {
      ...JobRunFields
    }
    pruneTraces: jobRuns(name: "prune_traces", bucket: $from, bucketEnd: $to) {
      ...JobRunFields
    }
  }
`

const DAY_MS = 24 * 60 * 60 * 1000
const TRACKED_DAYS = 30

const PROBLEM_LABELS: Partial<Record<JobDayState, string>> = {
  failed: 'Failed',
  missed: 'Missed',
}

export function toDayLabel(at: string) {
  return new Date(at).toLocaleDateString('en-us', { month: 'short', day: 'numeric' })
}

export function runSeconds(run: JobRun) {
  if (run.finishedAt === null) {
    return null
  }

  return (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000
}

export function isProblemDay(day: JobDay) {
  return day.state === 'failed' || day.state === 'missed'
}

function findWindow(now: number) {
  const today = Math.floor(now / DAY_MS) * DAY_MS
  return { from: today - (TRACKED_DAYS - 1) * DAY_MS, to: today + DAY_MS }
}

function findDayState(bucket: JobBucket, now: number): JobDayState {
  if (bucket.failures > 0) {
    return 'failed'
  }

  if (bucket.expected > bucket.started) {
    return 'missed'
  }

  if (bucket.completed > 0) {
    return 'succeeded'
  }

  if (bucket.started > 0) {
    return 'running'
  }

  if (Date.parse(bucket.bucketEnd) > now) {
    return 'upcoming'
  }

  return 'untracked'
}

function toJobDay(bucket: JobBucket, runs: JobRun[], now: number): JobDay {
  const start = Date.parse(bucket.bucket)
  const end = Date.parse(bucket.bucketEnd)

  function startedThatDay(run: JobRun) {
    const startedAt = Date.parse(run.startedAt)
    return startedAt >= start && startedAt < end
  }

  return { bucket: bucket.bucket, dueAt: bucket.dueAt, state: findDayState(bucket, now), runs: runs.filter(startedThatDay) }
}

function describeLatestRun(run: JobRun) {
  if (run.status === 'running') {
    return 'Running now'
  }

  return `Ran ${toDayLabel(run.startedAt)} · ${toDuration(runSeconds(run))}`
}

function summarize(job: Job, data: JobsData, now: number): JobSummary {
  const runs = data[job.key]

  function isThisJob(bucket: JobBucket) {
    return bucket.name === job.name
  }

  function toDay(bucket: JobBucket) {
    return toJobDay(bucket, runs, now)
  }

  const days = data.jobBuckets.filter(isThisJob).map(toDay)
  const problemDays = days.filter(isProblemDay)
  const summary = { name: job.name, label: job.label, days }

  if (problemDays.length > 0) {
    const latestProblem = problemDays[problemDays.length - 1]
    let note = `${PROBLEM_LABELS[latestProblem.state]} ${toDayLabel(latestProblem.dueAt)}`

    if (problemDays.length > 1) {
      note = `${note} · ${problemDays.length} in ${TRACKED_DAYS} days`
    }

    return { ...summary, state: 'critical', note }
  }

  const latestRun = runs[runs.length - 1]

  if (latestRun === undefined) {
    return { ...summary, state: 'good', note: 'No runs yet' }
  }

  return { ...summary, state: 'good', note: describeLatestRun(latestRun) }
}

const useJobs = (fetchPolicy: WatchQueryFetchPolicy = 'network-only') => {
  const [timeWindow] = useState(() => findWindow(Date.now()))

  const { loading, error, data, previousData } = useQuery<JobsData>(GET_JOBS, {
    variables: { from: new Date(timeWindow.from).toISOString(), to: new Date(timeWindow.to).toISOString() },
    fetchPolicy,
  })

  const source = data ?? previousData

  const jobs = useMemo(() => {
    if (source === undefined) {
      return undefined
    }

    const now = Date.now()

    return JOBS.map((job) => summarize(job, source, now))
  }, [source])

  return { loading, error, jobs }
}

export default useJobs
