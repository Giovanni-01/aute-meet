import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getBusyPeriods } from "@/lib/google/calendar"
import { getAppleBusyPeriods } from "@/lib/apple/caldav"
import { calculateSlots } from "@/lib/booking/slots"
import { fromZonedTime } from "date-fns-tz"
import { addDays, startOfDay } from "date-fns"

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * GET /api/booking/slots?username=X&slug=Y&date=YYYY-MM-DD
 *
 * Returns bookable time slots for the given host + event type + date.
 * Public endpoint — no authentication required.
 *
 * Using flat query params avoids a dynamic-segment conflict with the
 * root-level /[username] page route.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username") ?? ""
  const slug = searchParams.get("slug") ?? ""
  const date = searchParams.get("date") ?? ""

  if (!username || !slug) {
    return NextResponse.json(
      { error: "username and slug are required" },
      { status: 400 }
    )
  }
  if (!DATE_REGEX.test(date)) {
    return NextResponse.json(
      { error: "date param must be YYYY-MM-DD" },
      { status: 400 }
    )
  }

  const db = createServiceClient()

  // ── 1. Fetch host profile ──────────────────────────────────────────────────
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id, timezone")
    .eq("username", username)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const timezone: string =
    (profile as { id: string; timezone: string }).timezone ?? "Europe/Madrid"
  const hostId = (profile as { id: string; timezone: string }).id

  // ── 2. Fetch event type ────────────────────────────────────────────────────
  const { data: et, error: etError } = await db
    .from("event_types")
    .select("id, duration_minutes, buffer_before_minutes, buffer_after_minutes, min_notice_minutes")
    .eq("user_id", hostId)
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (etError || !et) {
    return NextResponse.json({ error: "Event type not found" }, { status: 404 })
  }

  const eventType = et as {
    id: string
    duration_minutes: number
    buffer_before_minutes: number
    buffer_after_minutes: number
    min_notice_minutes: number
  }

  // ── 3. Validate date is within the 30-day booking window ──────────────────
  const todayUtc = startOfDay(new Date())
  const requestedDay = fromZonedTime(`${date}T00:00:00`, timezone)
  const maxDay = addDays(todayUtc, 30)

  if (requestedDay < todayUtc || requestedDay > maxDay) {
    return NextResponse.json({ slots: [], timezone })
  }

  // ── 4. Fetch availability rules ────────────────────────────────────────────
  const { data: rules } = await db
    .from("availability_rules")
    .select("day_of_week, start_time, end_time")
    .eq("user_id", hostId)

  const availabilityRules = (rules ?? []) as Array<{
    day_of_week: number
    start_time: string
    end_time: string
  }>

  // ── 5. Day boundaries in UTC ───────────────────────────────────────────────
  const dayStartUtc = fromZonedTime(`${date}T00:00:00`, timezone)
  const dayEndUtc = fromZonedTime(`${date}T23:59:59`, timezone)

  // ── 6. Calendar busy times (Google + Apple, in parallel) ─────────────────
  const [{ data: googleConn }, { data: appleConn }] = await Promise.all([
    db
      .from("calendar_connections")
      .select("id, access_token, refresh_token, token_expires_at")
      .eq("user_id", hostId)
      .eq("provider", "google")
      .eq("is_primary", true)
      .maybeSingle(),
    db
      .from("calendar_connections")
      .select("access_token, refresh_token")
      .eq("user_id", hostId)
      .eq("provider", "apple")
      .maybeSingle(),
  ])

  const [googleBusy, appleBusy] = await Promise.all([
    googleConn
      ? getBusyPeriods(
          googleConn as {
            id: string
            access_token: string
            refresh_token: string | null
            token_expires_at: string | null
          },
          dayStartUtc,
          dayEndUtc
        )
      : Promise.resolve([]),
    appleConn
      ? getAppleBusyPeriods(
          (appleConn as { access_token: string; refresh_token: string | null })
            .access_token,
          (appleConn as { access_token: string; refresh_token: string | null })
            .refresh_token ?? "",
          dayStartUtc,
          dayEndUtc
        )
      : Promise.resolve([]),
  ])

  const busyPeriods = [...googleBusy, ...appleBusy]

  // ── 7. Check blocked dates ─────────────────────────────────────────────────
  const { data: blockedDates } = await db
    .from("blocked_dates")
    .select("id")
    .eq("user_id", hostId)
    .lte("start_date", date)
    .gte("end_date", date)
    .limit(1)

  if (blockedDates && blockedDates.length > 0) {
    return NextResponse.json({ slots: [], timezone })
  }

  // ── 8. Existing confirmed bookings for that day ────────────────────────────
  const { data: bookings } = await db
    .from("bookings")
    .select("start_time, end_time")
    .eq("event_type_id", eventType.id)
    .eq("status", "confirmed")
    .gte("start_time", dayStartUtc.toISOString())
    .lte("start_time", dayEndUtc.toISOString())

  const bookingPeriods = (bookings ?? []).map(
    (b: { start_time: string; end_time: string }) => ({
      start: b.start_time,
      end: b.end_time,
    })
  )

  // ── 9. Calculate free slots ───────────────────────────────────────────────
  const slots = calculateSlots({
    date,
    timezone,
    availabilityRules,
    durationMinutes: eventType.duration_minutes,
    bufferBefore: eventType.buffer_before_minutes ?? 0,
    bufferAfter: eventType.buffer_after_minutes ?? 0,
    busyPeriods,
    existingBookings: bookingPeriods,
    minNoticeMinutes: eventType.min_notice_minutes ?? 120,
  })

  return NextResponse.json({ slots, timezone })
}
