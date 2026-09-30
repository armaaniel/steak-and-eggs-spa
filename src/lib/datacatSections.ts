export const DATACAT_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'uptime', label: 'Uptime' },
  { id: 'traces', label: 'Traces' },
] as const

export type DatacatSection = (typeof DATACAT_SECTIONS)[number]['id']
