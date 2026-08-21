import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import UptimeChart from '../../components/datacat/UptimeChart'
import SyntheticRunRow from '../../components/datacat/SyntheticRunRow'
import useTransition from '../../hooks/useTransition.ts'
import { toBucketLabel } from '../../lib/utils.ts'
import '../../stylesheets/datacat/uptime.css'
import type { SyntheticBucket, SyntheticRun, OutletContextType } from '../../lib/types.ts'

const GET_BUCKETS = gql`
  query getSyntheticBuckets($range: String!) {
    syntheticBuckets(range: $range) {
      bucket
      started
      completed
      failures
      expected
    }
  }
`

const GET_RUNS = gql`
  query getSyntheticRuns($range: String!, $bucket: ISO8601DateTime!) {
    syntheticRuns(range: $range, bucket: $bucket) {
      userId
      startedAt
      requestCount
      failures
      completed
    }
  }
`

interface BucketsData {
  syntheticBuckets: SyntheticBucket[]
}

interface RunsData {
  syntheticRuns: SyntheticRun[]
}

const ranges = ['1h', '12h', '24h', '7d', '14d', '30d']

function Uptime() {
  const { selectedTrace, setSelectedTrace } = useOutletContext<OutletContextType>()

  const [range, setRange] = useState('1h')
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)

  const { loading, error, data } = useQuery<BucketsData>(GET_BUCKETS, {
    variables: { range },
  })

  const {
    loading: runsLoading,
    error: runsError,
    data: runsData,
  } = useQuery<RunsData>(GET_RUNS, {
    variables: { range, bucket: selectedBucket },
    skip: !selectedBucket,
  })

  const isLoaded = useTransition(loading, data || error)
  const runsLoaded = useTransition(runsLoading, runsData || runsError)

  const buckets = data?.syntheticBuckets || []
  const runs = runsData?.syntheticRuns || []

  const changeRange = (value: string) => {
    setSelectedBucket(null) // the bucket boundaries move with the range, so the selection can't survive it
    setRange(value)
  }

  return (
    <>
      <div className="uptime-header">
        <div className={`status-div ${isLoaded ? 'loaded' : ''}`}>
          <label htmlFor="range-select" className="status-label">
            Range
          </label>

          <select id="range-select" value={range} onChange={(e) => changeRange(e.target.value)}>
            {ranges.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <div className="select-svg-div">
            <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className={`positions-container ${isLoaded ? 'loaded' : ''}`}>
        {error ? <p className="uptime-message">Unable to load uptime data, please try again</p> : <UptimeChart buckets={buckets} selectedBucket={selectedBucket} onSelect={setSelectedBucket} />}
      </div>

      {selectedBucket && (
        <div className={`positions-container ${runsLoaded ? 'loaded' : ''}`}>
          <p className="uptime-runs-title">Runs from {toBucketLabel(selectedBucket)}</p>

          {runsError ? (
            <p className="uptime-message">Unable to load runs, please try again</p>
          ) : runs.length === 0 ? (
            <p className="uptime-message">No runs in this bucket</p>
          ) : (
            <div className="uptime-runs">
              {runs.map((run) => (
                <SyntheticRunRow key={run.userId} run={run} selectedTrace={selectedTrace} setSelectedTrace={setSelectedTrace} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default Uptime
