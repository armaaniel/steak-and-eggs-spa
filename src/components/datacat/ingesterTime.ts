export const INGESTER_SYNC = 'ingester'

export const timeTick = (from: number, to: number) => (t: number) =>
  new Date(t).toLocaleString('en-us', to - from <= 24 * 60 * 60 * 1000 ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric' })

export const nearestTick = (ticks: ReadonlyArray<{ value: unknown; index: number }>, data: { activeLabel?: string | number }) => {
  const target = Number(data.activeLabel)
  let best = -1
  let gap = Infinity

  ticks.forEach((tick) => {
    const distance = Math.abs(Number(tick.value) - target)
    if (distance < gap) {
      gap = distance
      best = tick.index
    }
  })

  return best
}
