import { gql, useQuery } from '@apollo/client'
import { useMemo } from 'react'
import { DATACAT_RANGE_MS, type DatacatRange } from './useDatacatRange'
import type { JobBucket, JobRun, JobSummary } from '../lib/types.ts'

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

const MINUTE_MS = 60 * 1000

function summarize(job: Job, data: JobsData, from: number, to: number): JobSummary {
  const runs = data[job.key]
    .filter((run) => Date.parse(run.startedAt) >= from && Date.parse(run.startedAt) < to)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))

  const missed = data.jobBuckets
    .filter((bucket) => bucket.name === job.name && bucket.expected > bucket.started)
    .filter((bucket) => Date.parse(bucket.bucketEnd) > from && Date.parse(bucket.bucket) < to)
    .map((bucket) => bucket.bucket)

  const succeeded = runs.filter((run) => run.status === 'succeeded').length
  const failed = runs.filter((run) => run.status === 'failed').length
  const running = runs.length - succeeded - failed

  const state = failed + missed.length > 0 ? 'critical' : running > 0 ? 'warn' : 'good'

  return { name: job.name, label: job.label, runs, missed, succeeded, failed, state }
}

const useJobs = (range: DatacatRange) => {
  const timeWindow = useMemo(() => {
    const to = Math.ceil(Date.now() / MINUTE_MS) * MINUTE_MS
    return { from: to - DATACAT_RANGE_MS[range], to }
  }, [range])

  const { loading, error, data, previousData } = useQuery<JobsData>(GET_JOBS, {
    variables: { from: new Date(timeWindow.from).toISOString(), to: new Date(timeWindow.to).toISOString() },
  })

  const source = data ?? previousData

  const jobs = useMemo(() => {
    if (source === undefined) {
      return undefined
    }

    return JOBS.map((job) => summarize(job, source, timeWindow.from, timeWindow.to))
  }, [source, timeWindow])

  return { loading, error, jobs }
}

export default useJobs
