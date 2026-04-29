import { addMinutes, isBefore, isAfter, parseISO, getDay } from "date-fns"
import { fromZonedTime } from "date-fns-tz"

export interface AvailabilityRule {
  day_of_week: number // 0 = Sunday, 1 = Monday … 6 = Saturday
  start_time: string // "HH:MM:SS" (Postgres time type)
  end_time: string
}

export interface TimePeriod {
  start: string // ISO string (UTC)
  end: string
}

export interface Slot {
  start: string // ISO string (UTC)
  end: string
}

/** Minimum booking notice in minutes (2 hours). */
const MIN_NOTICE_MINUTES = 120

/**
 * Determines whether [candidateStart, candidateEnd) overlaps with any period
 * in the given list.
 */
function overlapsAny(
  candidateStart: Date,
  candidateEnd: Date,
  periods: Array<{ start: string; end: string }>
): boolean {
  return periods.some((p) => {
    const pStart = parseISO(p.start)
    const pEnd = parseISO(p.end)
    // Overlap condition: candidateStart < pEnd AND candidateEnd > pStart
    return isBefore(candidateStart, pEnd) && isAfter(candidateEnd, pStart)
  })
}

/**
 * Parses a Postgres "HH:MM:SS" time string and returns { hours, minutes }.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(":").map(Number)
  return { hours: h, minutes: m }
}

interface CalculateSlotsInput {
  /** "YYYY-MM-DD" in any timezone — the day from the attendee's perspective. */
  date: string
  /** IANA timezone identifier of the host (e.g. "Europe/Madrid"). */
  timezone: string
  availabilityRules: AvailabilityRule[]
  durationMinutes: number
  bufferBefore: number
  bufferAfter: number
  busyPeriods: TimePeriod[]
  existingBookings: TimePeriod[]
}

/**
 * Calculates the list of bookable slots for a given date.
 *
 * All inputs/outputs use UTC ISO strings internally; display formatting
 * (to the host's or attendee's timezone) is the responsibility of the caller.
 */
export function calculateSlots(input: CalculateSlotsInput): Slot[] {
  const {
    date,
    timezone,
    availabilityRules,
    durationMinutes,
    bufferBefore,
    bufferAfter,
    busyPeriods,
    existingBookings,
  } = input

  // Earliest allowed slot start (now + MIN_NOTICE)
  const minStart = addMinutes(new Date(), MIN_NOTICE_MINUTES)

  // Determine the day-of-week for `date` in the host's timezone.
  // Use noon to avoid any DST edge-cases at midnight.
  const noonUtc = fromZonedTime(`${date}T12:00:00`, timezone)
  const dayOfWeek = getDay(noonUtc) // 0 = Sunday

  // Filter rules that apply to this day
  const rulesForDay = availabilityRules.filter(
    (r) => r.day_of_week === dayOfWeek
  )

  const blockedPeriods = [...busyPeriods, ...existingBookings]
  const slots: Slot[] = []

  for (const rule of rulesForDay) {
    const { hours: startH, minutes: startM } = parseTime(rule.start_time)
    const { hours: endH, minutes: endM } = parseTime(rule.end_time)

    // Convert rule start/end to UTC
    const windowStart = fromZonedTime(
      `${date}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`,
      timezone
    )
    const windowEnd = fromZonedTime(
      `${date}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`,
      timezone
    )

    let cursor = windowStart

    while (true) {
      const slotEnd = addMinutes(cursor, durationMinutes)

      // Stop if slot would extend beyond the availability window
      if (isAfter(slotEnd, windowEnd)) break

      // Enforce min notice
      if (isAfter(cursor, minStart)) {
        // Expand by buffers for conflict detection
        const bufferedStart = addMinutes(cursor, -bufferBefore)
        const bufferedEnd = addMinutes(slotEnd, bufferAfter)

        if (!overlapsAny(bufferedStart, bufferedEnd, blockedPeriods)) {
          slots.push({
            start: cursor.toISOString(),
            end: slotEnd.toISOString(),
          })
        }
      }

      cursor = addMinutes(cursor, durationMinutes)
    }
  }

  return slots
}
