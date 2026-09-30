import useStoredRange from './useStoredRange'

export const DATACAT_RANGES = ['1h', '12h', '24h', '7d', '14d', '30d'] as const

export type DatacatRange = (typeof DATACAT_RANGES)[number]

export const DATACAT_RANGE_OPTIONS = DATACAT_RANGES.map((range) => ({ value: range, label: range }))

const useDatacatRange = () => useStoredRange<DatacatRange>('datacat.range', DATACAT_RANGES, '24h')

export default useDatacatRange
