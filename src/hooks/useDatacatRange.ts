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

const useDatacatRange = () => useStoredRange<DatacatRange>('datacat.range', DATACAT_RANGES, '24h')

export default useDatacatRange
