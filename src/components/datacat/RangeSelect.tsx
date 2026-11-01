import Select, { type Option } from './Select'
import { DATACAT_RANGES, DATACAT_RANGE_LABELS, type DatacatRange } from '../../hooks/useDatacatRange'

interface Props {
  value: DatacatRange
  onChange: (range: DatacatRange) => void
  loaded: boolean
  ranges?: readonly DatacatRange[]
  sessionsBack?: number | null
  onSession?: (sessionsBack: number) => void
}

type SessionValue = 'lastSession' | 'secondLastSession'
type RangeValue = DatacatRange | SessionValue

const SESSION_VALUES: SessionValue[] = ['lastSession', 'secondLastSession']

const toRangeOption = (range: DatacatRange): Option<RangeValue> => ({ value: range, pill: range, label: DATACAT_RANGE_LABELS[range] })

const SESSION_OPTIONS: Option<RangeValue>[] = [
  { value: 'lastSession', pill: 'Session', label: 'Last Session' },
  { value: 'secondLastSession', pill: '2S', label: '2nd Last Session' },
]

function isSessionValue(value: RangeValue): value is SessionValue {
  return value === 'lastSession' || value === 'secondLastSession'
}

const RangeSelect = ({ value, onChange, loaded, ranges = DATACAT_RANGES, sessionsBack = null, onSession }: Props) => {
  let options = ranges.map(toRangeOption)

  if (onSession) {
    options = [...SESSION_OPTIONS, ...options]
  }

  const handleChange = (picked: RangeValue) => {
    if (isSessionValue(picked)) {
      onSession?.(SESSION_VALUES.indexOf(picked))
      return
    }

    onChange(picked)
  }

  let selected: RangeValue = value

  if (sessionsBack !== null) {
    selected = SESSION_VALUES[sessionsBack]
  }

  return <Select label="Range" value={selected} onChange={handleChange} options={options} loaded={loaded} align="right" />
}

export default RangeSelect
