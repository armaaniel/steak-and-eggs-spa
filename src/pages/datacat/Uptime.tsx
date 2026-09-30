import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useState } from 'react'
import UptimeChart from '../../components/datacat/UptimeChart'
import SyntheticRunRow from '../../components/datacat/SyntheticRunRow'
import useTransition from '../../hooks/useTransition.ts'
import type { DatacatRange } from '../../hooks/useDatacatRange'
import { toBucketLabel } from '../../lib/utils.ts'
import '../../stylesheets/datacat/uptime.css'
import type { SyntheticBucket, SyntheticRun, OutletContextType, Trace, CanarySlo } from '../../lib/types.ts'

const GET_BUCKETS = gql`
  query getSyntheticBuckets($range: String!) {
    syntheticBuckets(range: $range) {
      bucket
      bucketEnd
      started
      completed
      failures
      expected
    }
    canarySlo(range: $range) {
      target
      good
      expected
      periodGood
      periodExpected
      budgetAllowed
      budgetUsed
    }
  }
`

const GET_RUNS = gql`
  query getSyntheticRuns($bucket: ISO8601DateTime!, $bucketEnd: ISO8601DateTime!) {
    syntheticRuns(bucket: $bucket, bucketEnd: $bucketEnd) {
      runId
      startedAt
      requestCount
      failures
      result
    }
  }
`

interface BucketsData {
  syntheticBuckets: SyntheticBucket[]
  canarySlo: CanarySlo
}

interface RunsData {
  syntheticRuns: SyntheticRun[]
}

function Uptime() {
  const { detail, setDetail, range } = useOutletContext<OutletContextType>()
  const selectedTrace = detail?.kind === 'trace' ? detail.trace : null
  const selectTrace = (trace: Trace) => setDetail({ kind: 'trace', trace })

  const [picked, setPicked] = useState<{ range: DatacatRange; bucket: SyntheticBucket } | null>(null)
  const selectedBucket = picked?.range === range ? picked.bucket : null
  const selectBucket = (bucket: SyntheticBucket) => setPicked(selectedBucket?.bucket === bucket.bucket ? null : { range, bucket })

  const { loading, error, data } = useQuery<BucketsData>(GET_BUCKETS, {
    variables: { range },
  })

  const {
    loading: runsLoading,
    error: runsError,
    data: runsData,
  } = useQuery<RunsData>(GET_RUNS, {
    variables: { bucket: selectedBucket?.bucket, bucketEnd: selectedBucket?.bucketEnd },
    skip: !selectedBucket,
  })

  const isLoaded = useTransition(loading, data || error)
  const runsLoaded = useTransition(runsLoading, runsData || runsError)

  const buckets = data?.syntheticBuckets || []
  const runs = runsData?.syntheticRuns || []

  const slo = data?.canarySlo
  const sli = slo && slo.expected > 0 ? (slo.good / slo.expected) * 100 : null
  const belowTarget = slo !== undefined && sli !== null && sli < slo.target * 100
  const periodSli = slo && slo.periodExpected > 0 ? (slo.periodGood / slo.periodExpected) * 100 : null
  const periodBelowTarget = slo !== undefined && periodSli !== null && periodSli < slo.target * 100
  const budgetLeft = slo && slo.budgetAllowed > 0 ? Math.max(0, 1 - slo.budgetUsed / slo.budgetAllowed) * 100 : null
  const budgetSpent = slo !== undefined && slo.budgetUsed > slo.budgetAllowed

  return (
    <>
      {slo && (
        <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
          <div className="uptime-slo">
            <div>
              <p className="uptime-slo-label">Last {range}</p>
              <p className={`uptime-slo-value ${belowTarget ? 'critical' : ''}`}>{sli === null ? '-' : `${sli.toFixed(2)}%`}</p>
              <p className="uptime-slo-detail">{slo.good.toLocaleString()} / {slo.expected.toLocaleString()} runs passed</p>
            </div>

            <div>
              <p className="uptime-slo-label">SLO: {(slo.target * 100).toFixed(1)}% over 30 days</p>
              <p className={`uptime-slo-value ${periodBelowTarget ? 'critical' : ''}`}>{periodSli === null ? '-' : `${periodSli.toFixed(2)}%`}</p>
              <p className="uptime-slo-detail">{slo.periodGood.toLocaleString()} / {slo.periodExpected.toLocaleString()} runs passed</p>
            </div>

            <div>
              <p className="uptime-slo-label">Error budget</p>
              <p className={`uptime-slo-value ${budgetSpent ? 'critical' : ''}`}>{budgetLeft === null ? '-' : `${budgetLeft.toFixed(0)}% left`}</p>
              <p className="uptime-slo-detail">{slo.budgetUsed.toLocaleString()} of {slo.budgetAllowed.toLocaleString()} bad runs used, last 30 days</p>
            </div>
          </div>
        </div>
      )}

      <div className={`positions-container ${isLoaded && !loading ? 'loaded' : ''}`}>
        {error ? 
					<p className="uptime-message">Unable to load uptime data, please try again</p> 
					: 
				<UptimeChart buckets={buckets} selectedBucket={selectedBucket} onSelect={selectBucket} />}
      </div>

      {selectedBucket && (
        <div className={`positions-container ${runsLoaded && !runsLoading ? 'loaded' : ''}`}>
          <p className="uptime-runs-title">Runs from {toBucketLabel(selectedBucket.bucket)}</p>

          {runsError ? (
            <p className="uptime-message">Unable to load runs, please try again</p>
          ) : runs.length === 0 ? (
            <p className="uptime-message">No runs in this bucket</p>
          ) : (
            <div className="uptime-runs">
              {runs.map((run) => (
                <SyntheticRunRow key={run.runId} run={run} selectedTrace={selectedTrace} setSelectedTrace={selectTrace} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default Uptime
