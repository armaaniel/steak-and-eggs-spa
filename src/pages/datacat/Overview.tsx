import { useOutletContext } from 'react-router-dom'
import { gql, useQuery } from '@apollo/client'
import { useEffect, useState } from 'react'
import LatencyChart, { type Percentile, type Pin } from '../../components/datacat/LatencyChart'
import RequestsChart from '../../components/datacat/RequestsChart'
import Traces from './Traces'
import useTransition from '../../hooks/useTransition.ts'
import { Y_LABEL_GAP, dropEmptyBucketInProgress, type Hover } from '../../components/datacat/bucketChart'
import type { ServiceBucket, OutletContextType } from '../../lib/types.ts'
import '../../stylesheets/datacat/endpoint.css'
import '../../stylesheets/datacat/overview.css'

const GET_OVERVIEW = gql`
  query getOverview($range: String!) {
    serviceTimeseries(range: $range, includePartial: true) {
      bucket
      bucketEnd
      requests
      errors
      p50
      p95
      p99
    }
  }
`

interface OverviewData {
  serviceTimeseries: ServiceBucket[]
}

function findPinLine(bucket: ServiceBucket): Percentile | null {
  if (bucket.p99 !== null) {
    return 'p99'
  }

  if (bucket.p50 !== null) {
    return 'p50'
  }

  return null
}

function Overview() {
  const { range } = useOutletContext<OutletContextType>()

  const [selectedBucket, setSelectedBucket] = useState<ServiceBucket | null>(null)
  const [hover, setHover] = useState<Hover | null>(null)
  const [pin, setPin] = useState<Pin | null>(null)
  const [selectionRange, setSelectionRange] = useState(range)

  // a selection and its pin belong to the range they were made in, so switching ranges drops both instead of restoring them on the way back
  if (range !== selectionRange) {
    setSelectionRange(range)
    setSelectedBucket(null)
    setPin(null)
  }

  const closeBucket = () => {
    setSelectedBucket(null)
    setPin(null)
  }

  const hasSelection = pin !== null || selectedBucket !== null

  useEffect(() => {
    if (!hasSelection) {
      return
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSelectedBucket(null)
        setPin(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)

    return function stopListening() {
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [hasSelection])

  const selectBucket = (bucket: ServiceBucket) => {
    if (selectedBucket?.bucket === bucket.bucket) {
      closeBucket()
      return
    }

    setSelectedBucket(bucket)

    if (pin === null || pin.bucket.bucket !== bucket.bucket) {
      setPin({ bucket, line: findPinLine(bucket), y: null })
    }
  }

  const [latencyYLabelWidth, setLatencyYLabelWidth] = useState(0)
  const [requestsYLabelWidth, setRequestsYLabelWidth] = useState(0)
  const chartLeft = Math.max(latencyYLabelWidth, requestsYLabelWidth) + Y_LABEL_GAP

  const { loading, error, data, previousData } = useQuery<OverviewData>(GET_OVERVIEW, {
    variables: { range },
  })

  if (loading && hover !== null) {
    setHover(null)
  }

  const isLoaded = useTransition(loading, data || error)

  const buckets = dropEmptyBucketInProgress((data ?? previousData)?.serviceTimeseries || [])

  function hasBucket(pinnedBucket: ServiceBucket) {
    return buckets.some(function (bucket) {
      return bucket.bucket === pinnedBucket.bucket
    })
  }

  if (pin !== null && !hasBucket(pin.bucket)) {
    setPin(null)
  }

  let pinnedBucket: ServiceBucket | null = null

  if (pin !== null) {
    pinnedBucket = pin.bucket
  }

  return (
    <>
      <div className={`positions-container chart-card ${isLoaded ? 'loaded' : ''}`} data-ready={isLoaded}>
        {error ? (
          <p className="ov-message">Unable to load the overview, please try again</p>
        ) : (
          <>
            <div className={`lr-panels chart-fade ${loading ? 'dimmed' : ''}`}>
              <LatencyChart buckets={buckets} hover={hover} setHover={setHover} chartLeft={chartLeft} setYLabelWidth={setLatencyYLabelWidth} selectedBucket={selectedBucket} pin={pin} setPin={setPin} closeBucket={closeBucket} />
            </div>
            <div className={`lr-panels chart-fade ${loading ? 'dimmed' : ''}`}>
              <RequestsChart buckets={buckets} hover={hover} setHover={setHover} chartLeft={chartLeft} setYLabelWidth={setRequestsYLabelWidth} selectedBucket={selectedBucket} selectBucket={selectBucket} pinnedBucket={pinnedBucket} closeBucket={closeBucket} />
            </div>
          </>
        )}
      </div>

      <Traces bucket={selectedBucket} />
    </>
  )
}

export default Overview
