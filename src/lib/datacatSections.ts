export const DATACAT_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'uptime', label: 'Uptime' },
] as const

export type DatacatSection = (typeof DATACAT_SECTIONS)[number]['id']
