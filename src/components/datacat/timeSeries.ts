export interface TimePoint {
  time: number
  value: number | null
}

const GAP_STEPS = 2

export function toTimePoint(point: { at: string; value: number }): TimePoint {
  return { time: new Date(point.at).getTime(), value: point.value }
}

export function findTypicalStep(timePoints: { time: number }[]) {
  const steps = []

  for (let index = 1; index < timePoints.length; index += 1) {
    steps.push(timePoints[index].time - timePoints[index - 1].time)
  }

  steps.sort(function (a, b) {
    return a - b
  })

  return steps[Math.floor(steps.length / 2)] ?? 0
}

export function breakAtGaps(timePoints: TimePoint[]) {
  const typicalStep = findTypicalStep(timePoints)
  const withGaps: TimePoint[] = []

  for (let index = 0; index < timePoints.length; index += 1) {
    const previous = timePoints[index - 1]
    const current = timePoints[index]

    if (previous !== undefined && current.time - previous.time > typicalStep * GAP_STEPS) {
      withGaps.push({ time: previous.time + typicalStep, value: null })
    }

    withGaps.push(current)
  }

  return withGaps
}

export function findNearestPoint<T extends { time: number }>(timePoints: T[], time: number) {
  const typicalStep = findTypicalStep(timePoints)

  let nearestPoint: T | null = null
  let nearestDistance = Infinity

  for (const timePoint of timePoints) {
    const distance = Math.abs(timePoint.time - time)

    if (distance < nearestDistance) {
      nearestPoint = timePoint
      nearestDistance = distance
    }
  }

  if (nearestPoint === null || nearestDistance > typicalStep) {
    return null
  }

  return nearestPoint
}

export function formatHoverTime(time: number) {
  return new Date(time).toLocaleString('en-us', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
}
