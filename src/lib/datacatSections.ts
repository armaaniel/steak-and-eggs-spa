export const DATACAT_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'uptime', label: 'Uptime' },
  { id: 'latent', label: 'Most Latent' },
] as const

export type DatacatSection = (typeof DATACAT_SECTIONS)[number]['id']
