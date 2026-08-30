import { useState, useRef, useEffect } from 'react'
import { toRange } from '../../lib/utils.ts'
import '../../stylesheets/datacat/daterange.css'
import type { DateRange } from '../../lib/types.ts'

interface Props {
  preset: number | 'custom'
  range: DateRange
  loaded: boolean
  onApply: (preset: number | 'custom', range: DateRange) => void
}

interface Draft {
  startDate: string
  startTime: string
  endDate: string
  endTime: string
}

const windows = [
  { hours: 1, label: '1 hour' },
  { hours: 3, label: '3 hours' },
  { hours: 6, label: '6 hours' },
  { hours: 12, label: '12 hours' },
  { hours: 24, label: '24 hours' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
]

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const DATE_PATTERN = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/
const TIME_PATTERN = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/

const MARKET_ZONE = 'America/New_York'
const MARKET_OPEN_MINUTE = 9 * 60 + 30
const MARKET_CLOSE_MINUTE = 16 * 60

const pad = (value: number) => String(value).padStart(2, '0')

const toDateText = (ms: number) => {
  if (!Number.isFinite(ms)) return ''

  const at = new Date(ms)
  return `${at.getFullYear()}/${pad(at.getMonth() + 1)}/${pad(at.getDate())}`
}

const toTimeText = (ms: number) => {
  if (!Number.isFinite(ms)) return ''

  const at = new Date(ms)
  return `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
}

const toMilliseconds = (date: string, time: string) => {
  const dateParts = DATE_PATTERN.exec(date.trim())
  const timeParts = TIME_PATTERN.exec(time.trim() || '00:00:00')

  if (!dateParts || !timeParts) return NaN

  const [year, month, day] = dateParts.slice(1).map(Number)
  const [hours, minutes, seconds] = timeParts.slice(1).map(Number)

  if (hours > 23 || minutes > 59 || seconds > 59) return NaN

  const at = new Date(year, month - 1, day, hours, minutes, seconds)

  if (at.getMonth() !== month - 1 || at.getDate() !== day) return NaN

  return at.getTime()
}

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

const toMarketInstant = (year: number, month: number, day: number, minute: number) => {
  const naive = Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60, 0)
  return naive - marketOffset(naive - marketOffset(naive))
}

const startOfDay = (ms: number) => {
  const at = new Date(ms)
  return new Date(at.getFullYear(), at.getMonth(), at.getDate()).getTime()
}

const addMonths = (ms: number, count: number) => {
  const at = new Date(ms)
  return new Date(at.getFullYear(), at.getMonth() + count, 1).getTime()
}

const toDraft = (range: DateRange): Draft => ({
  startDate: toDateText(range.from),
  startTime: toTimeText(range.from),
  endDate: toDateText(range.to),
  endTime: toTimeText(range.to),
})

const toPresetLabel = (preset: number | 'custom', range: DateRange) => {
  if (preset === 'custom') return `${toDateText(range.from)} ${toTimeText(range.from)} → ${toDateText(range.to)} ${toTimeText(range.to)}`

  const match = windows.find((option) => option.hours === preset)
  return match ? `Last ${match.label}` : 'Custom range'
}

const buildMonth = (cursor: number) => {
  const at = new Date(cursor)
  const year = at.getFullYear()
  const month = at.getMonth()
  const leading = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: leading }, () => null)

  for (let day = 1; day <= total; day += 1) {
    cells.push(new Date(year, month, day).getTime())
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return { year, month, cells }
}

const DateRangePicker = ({ preset, range, loaded, onApply }: Props) => {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'absolute' | 'relative'>(preset === 'custom' ? 'absolute' : 'relative')
  const [draft, setDraft] = useState<Draft>(() => toDraft(range))
  const [cursor, setCursor] = useState(() => addMonths(range.to, 0))
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const draftFrom = toMilliseconds(draft.startDate, draft.startTime)
  const draftTo = toMilliseconds(draft.endDate, draft.endTime)
  const isDraftValid = Number.isFinite(draftFrom) && Number.isFinite(draftTo) && draftFrom < draftTo

  const today = startOfDay(Date.now())
  const month = buildMonth(cursor)
  const canGoForward = cursor < addMonths(Date.now(), 0)

  const openPanel = () => {
    setDraft(toDraft(range))
    setMode(preset === 'custom' ? 'absolute' : 'relative')
    setCursor(addMonths(range.to, 0))
    setOpen(true)
  }

  const changeDraft = (field: keyof Draft, value: string) => setDraft((current) => ({ ...current, [field]: value }))

  const selectDay = (ms: number) => {
    const text = toDateText(ms)
    const hasStart = Number.isFinite(toMilliseconds(draft.startDate, draft.startTime))
    const isSecondClick = hasStart && !draft.endDate && ms >= toMilliseconds(draft.startDate, '00:00:00')

    if (isSecondClick) {
      setDraft((current) => ({ ...current, endDate: text, endTime: current.endTime || '23:59:59' }))
      return
    }

    setDraft((current) => ({ ...current, startDate: text, startTime: current.startTime || '00:00:00', endDate: '', endTime: '' }))
  }

  const clearDraft = () => setDraft({ startDate: '', startTime: '', endDate: '', endTime: '' })

  const applyMarketTime = (edge: 'start' | 'end', minute: number) => {
    const dateField = edge === 'start' ? 'startDate' : 'endDate'
    const timeField = edge === 'start' ? 'startTime' : 'endTime'
    const dateText = draft[dateField] || toDateText(Date.now())
    const parts = DATE_PATTERN.exec(dateText.trim())

    if (!parts) return

    const [year, month, day] = parts.slice(1).map(Number)
    const instant = toMarketInstant(year, month, day, minute)

    setDraft((current) => ({ ...current, [dateField]: dateText, [timeField]: toTimeText(instant) }))
  }

  const applyAbsolute = () => {
    if (!isDraftValid) return

    onApply('custom', { from: draftFrom, to: draftTo })
    setOpen(false)
  }

  const applyRelative = (hours: number) => {
    onApply(hours, toRange(hours))
    setOpen(false)
  }

  const renderMonth = (built: ReturnType<typeof buildMonth>) => (
    <table className="dc-cal-table">
      <thead>
        <tr>
          {weekdays.map((weekday) => (
            <th key={weekday} className="dc-cal-weekday" scope="col">
              {weekday}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {Array.from({ length: built.cells.length / 7 }, (_, week) => (
          <tr key={week}>
            {built.cells.slice(week * 7, week * 7 + 7).map((ms, index) => {
              if (ms === null) return <td key={index} className="dc-cal-cell empty" />

              const isFuture = ms > today
              const isStart = toDateText(ms) === draft.startDate
              const isEnd = toDateText(ms) === draft.endDate
              const inRange = Number.isFinite(draftFrom) && Number.isFinite(draftTo) && ms >= startOfDay(draftFrom) && ms <= startOfDay(draftTo)

              return (
                <td key={index} className={`dc-cal-cell ${inRange ? 'in-range' : ''} ${isStart || isEnd ? 'edge' : ''}`}>
                  <button type="button" className="dc-cal-day" disabled={isFuture} onClick={() => selectDay(ms)}>
                    {new Date(ms).getDate()}
                  </button>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="dc-range-wrapper" ref={panelRef}>
      <button type="button" className={`dc-range-trigger ${loaded ? 'loaded' : ''}`} onClick={() => (open ? setOpen(false) : openPanel())}>
        <span className="dc-range-value">{toPresetLabel(preset, range)}</span>

        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
          <rect x="2" y="3" width="12" height="11" rx="1.5" />
          <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
        </svg>
      </button>

      {open && (
        <div className="dc-range-panel">
          <div className="dc-range-modes">
            <button type="button" className={`dc-range-mode ${mode === 'absolute' ? 'selected' : ''}`} onClick={() => setMode('absolute')}>
              Absolute
            </button>

            <button type="button" className={`dc-range-mode ${mode === 'relative' ? 'selected' : ''}`} onClick={() => setMode('relative')}>
              Relative
            </button>
          </div>

          {mode === 'relative' ? (
            <div className="dc-range-presets">
              {windows.map((option) => (
                <button key={option.hours} type="button" className={`dc-range-preset ${preset === option.hours ? 'selected' : ''}`} onClick={() => applyRelative(option.hours)}>
                  Last {option.label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="dc-cal-month">
                <div className="dc-cal-bar">
                  <button type="button" className="dc-cal-nav" onClick={() => setCursor(addMonths(cursor, -1))} aria-label="Previous month">
                    <svg width="14" height="14" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M6.5 2L3.5 5l3 3" />
                    </svg>
                  </button>

                  <p className="dc-cal-heading">
                    {months[month.month]} {month.year}
                  </p>

                  <button type="button" className="dc-cal-nav" onClick={() => setCursor(addMonths(cursor, 1))} disabled={!canGoForward} aria-label="Next month">
                    <svg width="14" height="14" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3.5 2l3 3-3 3" />
                    </svg>
                  </button>
                </div>

                {renderMonth(month)}
              </div>

              <div className="dc-range-fields">
                <div className="dc-range-pair">
                  <div className="dc-range-field">
                    <label htmlFor="start-date">Start date</label>
                    <input id="start-date" value={draft.startDate} placeholder="YYYY/MM/DD" onChange={(e) => changeDraft('startDate', e.target.value)} />
                  </div>

                  <div className="dc-range-field">
                    <div className="dc-range-field-head">
                      <label htmlFor="start-time">Start time</label>

                      <button type="button" className="dc-range-market" onClick={() => applyMarketTime('start', MARKET_OPEN_MINUTE)}>
                        Market open
                      </button>
                    </div>

                    <input id="start-time" value={draft.startTime} placeholder="hh:mm:ss" onChange={(e) => changeDraft('startTime', e.target.value)} />
                  </div>

                  <p className="dc-range-hint">For date, use YYYY/MM/DD. For time, use hh:mm:ss 24 hr format.</p>
                </div>

                <div className="dc-range-pair">
                  <div className="dc-range-field">
                    <label htmlFor="end-date">End date</label>
                    <input id="end-date" value={draft.endDate} placeholder="YYYY/MM/DD" onChange={(e) => changeDraft('endDate', e.target.value)} />
                  </div>

                  <div className="dc-range-field">
                    <div className="dc-range-field-head">
                      <label htmlFor="end-time">End time</label>

                      <button type="button" className="dc-range-market" onClick={() => applyMarketTime('end', MARKET_CLOSE_MINUTE)}>
                        Market close
                      </button>
                    </div>

                    <input id="end-time" value={draft.endTime} placeholder="hh:mm:ss" onChange={(e) => changeDraft('endTime', e.target.value)} />
                  </div>

                  <p className="dc-range-hint">For date, use YYYY/MM/DD. For time, use hh:mm:ss 24 hr format.</p>
                </div>
              </div>

              <div className="dc-range-footer">
                <button type="button" className="dc-range-clear" onClick={clearDraft}>
                  Clear
                </button>

                <div className="dc-range-actions">
                  <button type="button" className="dc-range-cancel" onClick={() => setOpen(false)}>
                    Cancel
                  </button>

                  <button type="button" className="dc-range-apply" disabled={!isDraftValid} onClick={applyAbsolute}>
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default DateRangePicker
