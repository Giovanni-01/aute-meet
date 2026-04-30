import { createDAVClient } from "tsdav"
import { decrypt } from "@/lib/crypto"
import { fromZonedTime } from "date-fns-tz"

// ─── iCal helpers ─────────────────────────────────────────────────────────────

/** Formats a Date to iCal UTC string: "20260430T090000Z" */
function toICalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/**
 * Parses DTSTART or DTEND from a raw iCal string.
 * Handles UTC (Z suffix), TZID, and all-day (DATE) formats.
 */
function parseICalDt(ical: string, field: "DTSTART" | "DTEND"): Date | null {
  // TZID format: DTSTART;TZID=Europe/Madrid:20260430T110000
  const tzidMatch = ical.match(
    new RegExp(`^${field};TZID=([^:\\r\\n]+):([0-9T]+)`, "m")
  )
  if (tzidMatch) {
    const [, tzid, val] = tzidMatch
    const y = val.slice(0, 4), mo = val.slice(4, 6), d = val.slice(6, 8)
    const h = val.slice(9, 11), mi = val.slice(11, 13), s = val.slice(13, 15)
    try {
      return fromZonedTime(`${y}-${mo}-${d}T${h}:${mi}:${s}`, tzid)
    } catch {
      return null
    }
  }

  // Plain or VALUE=DATE: DTSTART:20260430T090000Z  or  DTSTART;VALUE=DATE:20260430
  const plain = ical.match(new RegExp(`^${field}(?:;[^:]*)?:([0-9TZ]+)`, "m"))
  if (!plain) return null
  const raw = plain[1].trim()

  // All-day: YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8)
    return new Date(`${y}-${mo}-${d}T00:00:00Z`)
  }

  // UTC: YYYYMMDDTHHMMSSz
  if (raw.endsWith("Z") && raw.length >= 16) {
    const y = raw.slice(0, 4), mo = raw.slice(4, 6), d = raw.slice(6, 8)
    const h = raw.slice(9, 11), mi = raw.slice(11, 13), s = raw.slice(13, 15)
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`)
  }

  return null
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches the list of CalDAV calendars from iCloud.
 * Throws if credentials are invalid or the connection fails.
 * Returns [{displayName, url}] for each calendar that has both fields.
 */
export async function fetchAppleCalendars(
  appleId: string,
  appPassword: string
): Promise<Array<{ displayName: string; url: string }>> {
  const client = await createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username: appleId, password: appPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  })
  const calendars = await client.fetchCalendars()
  return calendars
    .filter((c) => c.url && c.displayName)
    .map((c) => ({ displayName: c.displayName as string, url: c.url }))
}

/**
 * Validates Apple CalDAV credentials by attempting to fetch calendars.
 * Returns true if the connection succeeds and at least one calendar exists.
 */
export async function validateAppleCredentials(
  appleId: string,
  appPassword: string
): Promise<boolean> {
  try {
    const cals = await fetchAppleCalendars(appleId, appPassword)
    return cals.length > 0
  } catch {
    return false
  }
}

/**
 * Returns busy time windows from the host's iCloud calendar for a given day.
 * Accepts encrypted credentials (as stored in calendar_connections).
 * Returns an empty array on any error (graceful degradation).
 */
export async function getAppleBusyPeriods(
  encryptedAppleId: string,
  encryptedAppPassword: string,
  start: Date,
  end: Date,
  calendarUrl?: string | null
): Promise<Array<{ start: string; end: string }>> {
  try {
    const appleId = decrypt(encryptedAppleId)
    const appPassword = decrypt(encryptedAppPassword)

    const client = await createDAVClient({
      serverUrl: "https://caldav.icloud.com",
      credentials: { username: appleId, password: appPassword },
      authMethod: "Basic",
      defaultAccountType: "caldav",
    })

    const calendars = await client.fetchCalendars()
    if (!calendars.length) return []

    const calendar =
      (calendarUrl && calendars.find((c) => c.url === calendarUrl)) ||
      calendars[0]

    const objects = await client.fetchCalendarObjects({
      calendar,
      timeRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    })

    const busy: Array<{ start: string; end: string }> = []
    for (const obj of objects) {
      if (!obj.data) continue
      const data = obj.data as string
      const dtStart = parseICalDt(data, "DTSTART")
      const dtEnd = parseICalDt(data, "DTEND")
      if (dtStart && dtEnd) {
        busy.push({ start: dtStart.toISOString(), end: dtEnd.toISOString() })
      }
    }
    return busy
  } catch (err) {
    console.error("[apple/caldav] getAppleBusyPeriods failed:", err)
    return []
  }
}

/**
 * Creates a calendar event in the host's primary iCloud calendar.
 * Accepts encrypted credentials (as stored in calendar_connections).
 * Throws on failure — callers should catch and handle gracefully.
 */
export async function createAppleEvent(params: {
  encryptedAppleId: string
  encryptedAppPassword: string
  calendarUrl?: string | null
  bookingId: string
  summary: string
  startAt: Date
  endAt: Date
  description: string
  attendeeEmails: string[]
}): Promise<void> {
  const appleId = decrypt(params.encryptedAppleId)
  const appPassword = decrypt(params.encryptedAppPassword)

  const client = await createDAVClient({
    serverUrl: "https://caldav.icloud.com",
    credentials: { username: appleId, password: appPassword },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  })

  const calendars = await client.fetchCalendars()
  if (!calendars.length) return

  const calendar =
    (params.calendarUrl && calendars.find((c) => c.url === params.calendarUrl)) ||
    calendars[0]

  const attendeeLines = params.attendeeEmails
    .map((e) => `ATTENDEE:mailto:${e}`)
    .join("\r\n")

  // Escape special iCal characters in text fields
  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

  const iCalString = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aute Meet//EN",
    "BEGIN:VEVENT",
    `UID:aute-meet-${params.bookingId}@autemeet`,
    `DTSTART:${toICalDate(params.startAt)}`,
    `DTEND:${toICalDate(params.endAt)}`,
    `SUMMARY:${escape(params.summary)}`,
    `DESCRIPTION:${escape(params.description)}`,
    attendeeLines || null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n")

  await client.createCalendarObject({
    calendar,
    filename: `aute-meet-${params.bookingId}.ics`,
    iCalString,
  })
}
