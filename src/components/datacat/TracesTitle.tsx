import { useState } from 'react'
import { toBucketLabel } from '../../lib/utils.ts'
import type { ServiceBucket } from '../../lib/types.ts'
import '../../stylesheets/datacat/overview.css'

interface Props {
  bucket: ServiceBucket | null
  className?: string
}

const TracesTitle = ({ bucket, className = '' }: Props) => {
  const [shownBucket, setShownBucket] = useState<ServiceBucket | null>(null)

  if (bucket !== null && bucket !== shownBucket) {
    setShownBucket(bucket)
  }

  return (
    <div className={`ov-traces-heading ${bucket ? 'open' : ''}`}>
      <div className="ov-traces-heading-inner">
        {shownBucket && <p className={`ov-traces-title ${className}`}>Traces from {toBucketLabel(shownBucket.bucket)}</p>}
      </div>
    </div>
  )
}

export default TracesTitle
