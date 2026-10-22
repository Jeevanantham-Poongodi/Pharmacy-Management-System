// URL path of each flow's page.
export const FLOW_PATHS: Record<number, string> = {
  1: 'procurement',
  2: 'ward-indent',
  3: 'dispensing',
  4: 'expiry',
  5: 'recall',
}

export function flowFromPath(path: string | undefined): number | undefined {
  const entry = Object.entries(FLOW_PATHS).find(([, p]) => p === path)
  return entry ? Number(entry[0]) : undefined
}
