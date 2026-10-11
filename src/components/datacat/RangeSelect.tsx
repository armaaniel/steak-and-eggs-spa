import Select, { type Option } from './Select'
import { DATACAT_RANGES, DATACAT_RANGE_LABELS, type DatacatRange } from '../../hooks/useDatacatRange'

interface Props {
  value: DatacatRange
  onChange: (range: DatacatRange) => void
  loaded: boolean
  session?: boolean
  onSession?: () => void
}

type RangeValue = DatacatRange | 'session'

const RANGE_OPTIONS: Option<RangeValue>[] = DATACAT_RANGES.map((range) => ({ value: range, pill: range, label: DATACAT_RANGE_LABELS[range] }))
const SESSION_OPTION: Option<RangeValue> = { value: 'session', pill: 'Session', label: 'Last Session' }

const RangeSelect = ({ value, onChange, loaded, session = false, onSession }: Props) => {
  const options = onSession ? [SESSION_OPTION, ...RANGE_OPTIONS] : RANGE_OPTIONS

  const handleChange = (picked: RangeValue) => {
    if (picked === 'session') {
      onSession?.()
      return
    }

    onChange(picked)
  }

  return <Select label="Range" value={session ? 'session' : value} onChange={handleChange} options={options} loaded={loaded} align="right" />
}

export default RangeSelect
