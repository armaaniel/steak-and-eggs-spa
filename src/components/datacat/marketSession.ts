import { toRange } from '../../lib/utils.ts'
import type { DateRange } from '../../lib/types.ts'

const MARKET_ZONE = 'America/New_York'
export const SESSION_START_MINUTE = 9 * 60 + 30
export const SESSION_END_MINUTE = 16 * 60 + 30
const DAYS_TO_SEARCH = 7

const marketOffset = (ms: number) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MARKET_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms))

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)

  return Date.UTC(read('year'), read('month') - 1, read('day'), read('hour') % 24, read('minute'), read('second')) - ms
}

export const toMarketInstant = (year: number, month: number, day: number, minute: number) => {
  const naive = Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60, 0)
  return naive - marketOffset(naive - marketOffset(naive))
}

const toMarketDate = (ms: number) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MARKET_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms))

  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value)

  return { year: read('year'), month: read('month'), day: read('day') }
}

export const findLastSession = (now: number): DateRange => {
  const today = toMarketDate(now)

  for (let daysBack = 0; daysBack < DAYS_TO_SEARCH; daysBack += 1) {
    const day = new Date(Date.UTC(today.year, today.month - 1, today.day - daysBack))
    const weekday = day.getUTCDay()

    if (weekday === 0 || weekday === 6) continue

    const year = day.getUTCFullYear()
    const month = day.getUTCMonth() + 1
    const date = day.getUTCDate()
    const from = toMarketInstant(year, month, date, SESSION_START_MINUTE)

    if (from > now) continue

    const to = Math.min(toMarketInstant(year, month, date, SESSION_END_MINUTE), now)
    return { from, to }
  }

  return toRange(24)
}
