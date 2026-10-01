export const DATACAT_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'uptime', label: 'Uptime' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'routes', label: 'Routes' },
] as const

export type DatacatSection = (typeof DATACAT_SECTIONS)[number]['id']
