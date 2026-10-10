import useStoredRange from './useStoredRange'

export const DATACAT_RANGES = ['1h', '12h', '24h', '7d', '14d', '30d'] as const

export type DatacatRange = (typeof DATACAT_RANGES)[number]

export const DATACAT_RANGE_OPTIONS = DATACAT_RANGES.map((range) => ({ value: range, label: range }))

const HOUR_MS = 60 * 60 * 1000

export const DATACAT_RANGE_MS: Record<DatacatRange, number> = {
  '1h': HOUR_MS,
  '12h': 12 * HOUR_MS,
  '24h': 24 * HOUR_MS,
  '7d': 7 * 24 * HOUR_MS,
  '14d': 14 * 24 * HOUR_MS,
  '30d': 30 * 24 * HOUR_MS,
}

export const DATACAT_RANGE_LABELS: Record<DatacatRange, string> = {
  '1h': 'Past 1 Hour',
  '12h': 'Past 12 Hours',
  '24h': 'Past 24 Hours',
  '7d': 'Past 7 Days',
  '14d': 'Past 14 Days',
  '30d': 'Past 30 Days',
}

const useDatacatRange = () => useStoredRange<DatacatRange>('datacat.range', DATACAT_RANGES, '24h')

export default useDatacatRange
