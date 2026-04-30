import { NextResponse } from "next/server"
import { z } from "zod"
import { createServiceClient } from "@/lib/supabase/service"
import { getCalendarClient } from "@/lib/google/calendar"
import { calculateSlots } from "@/lib/booking/slots"
import { fromZonedTime } from "date-fns-tz"
import { parseISO } from "date-fns"

const BookingBody = z.object({
  username: z.string().min(1),
  slug: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/), // "HH:MM"
  attendee_name: z.string().min(1).max(200),
  attendee_email: z.string().email(),
  attendee_notes: z.string().max(2000).optional(),
  guest_emails: z.array(z.string().email()).max(10).optional(),
})

/**
 * POST /api/booking
 * Body: { username, slug, date, start_time, attendee_name, attendee_email, attendee_notes? }
 *
 * Creates a booking and a Google Calendar event with a Meet link.
 * Public endpoint.
 *
 * Using a flat route avoids a dynamic-segment conflict with /[username].
 */
export async function POST(request: Request) {
  // ── 1. Validate body ───────────────────────────────────────────────────────
  let body: z.infer<typeof BookingBody>
  try {
    body = BookingBody.parse(await request.json())
  } catch (err) {
    return NextResponse.json(
      { error: "Datos inválidos", details: err },
      { status: 400 }
    )
  }

  const { username, slug } = body
  const db = createServiceClient()

  // ── 2. Load host profile ───────────────────────────────────────────────────
  const { data: profile } = await db
    .from("profiles")
    .select("id, timezone, full_name")
    .eq("username", username)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const p = profile as { id: string; timezone: string; full_name: string }
  const timezone = p.timezone ?? "Europe/Madrid"

  // ── 3. Load event type ────────────────────────────────────────────────────
  const { data: et } = await db
    .from("event_types")
    .select("id, title, duration_minutes, buffer_before_minutes, buffer_after_minutes, min_notice_minutes, description")
    .eq("user_id", p.id)
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (!et) {
    return NextResponse.json({ error: "Event type not found" }, { status: 404 })
  }

  const eventType = et as {
    id: string
    title: string
    duration_minutes: number
    buffer_before_minutes: number
    buffer_after_minutes: number
    min_notice_minutes: number
    description: string | null
  }

  // ── 4. Compute slot boundaries in UTC ─────────────────────────────────────
  const startAt = fromZonedTime(`${body.date}T${body.start_time}:00`, timezone)
  const endAt = new Date(startAt.getTime() + eventType.duration_minutes * 60_000)

  // ── 5. Race-condition check ────────────────────────────────────────────────
  const { data: rules } = await db
    .from("availability_rules")
    .select("day_of_week, start_time, end_time")
    .eq("user_id", p.id)

  const { data: existingRaw } = await db
    .from("bookings")
    .select("start_time, end_time")
    .eq("event_type_id", eventType.id)
    .eq("status", "confirmed")
    .gte("start_time", `${body.date}T00:00:00Z`)
    .lte("start_time", `${body.date}T23:59:59Z`)

  const existingBookings = (existingRaw ?? []).map(
    (b: { start_time: string; end_time: string }) => ({
      start: b.start_time,
      end: b.end_time,
    })
  )

  const availableSlots = calculateSlots({
    date: body.date,
    timezone,
    availabilityRules: (rules ?? []) as Array<{
      day_of_week: number
      start_time: string
      end_time: string
    }>,
    durationMinutes: eventType.duration_minutes,
    bufferBefore: eventType.buffer_before_minutes ?? 0,
    bufferAfter: eventType.buffer_after_minutes ?? 0,
    busyPeriods: [],
    existingBookings,
    minNoticeMinutes: eventType.min_notice_minutes ?? 120,
  })

  const slotStillAvailable = availableSlots.some(
    (s) => parseISO(s.start).getTime() === startAt.getTime()
  )

  if (!slotStillAvailable) {
    return NextResponse.json(
      { error: "Este horario ya no está disponible. Por favor, elige otro." },
      { status: 409 }
    )
  }

  // ── 6. Create Google Calendar event with Meet link ─────────────────────────
  const { data: conn } = await db
    .from("calendar_connections")
    .select("id, access_token, refresh_token, token_expires_at, provider_account_email")
    .eq("user_id", p.id)
    .eq("provider", "google")
    .eq("is_primary", true)
    .maybeSingle()

  let googleEventId: string | null = null
  let meetLink: string | null = null

  if (conn) {
    try {
      const calendar = await getCalendarClient(
        conn as {
          id: string
          access_token: string
          refresh_token: string | null
          token_expires_at: string | null
        }
      )

      const hostEmail = (conn as { provider_account_email: string })
        .provider_account_email

      const descriptionParts: string[] = []
      if (body.attendee_notes) {
        descriptionParts.push(`Notas del asistente:\n${body.attendee_notes}`)
      }
      descriptionParts.push("Agendado a través de Aute Meet")

      const guestEmails = body.guest_emails ?? []

      const guestNames = guestEmails.map((e) => e.split("@")[0]).join(", ")
      const summary = guestNames
        ? `${eventType.title} — ${p.full_name} y ${body.attendee_name}, ${guestNames}`
        : `${eventType.title} — ${p.full_name} y ${body.attendee_name}`

      const event = await calendar.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1,
        sendUpdates: "all",
        requestBody: {
          summary,
          description: descriptionParts.join("\n\n"),
          start: { dateTime: startAt.toISOString(), timeZone: timezone },
          end: { dateTime: endAt.toISOString(), timeZone: timezone },
          attendees: [
            { email: hostEmail },
            { email: body.attendee_email, displayName: body.attendee_name },
            ...guestEmails.map((e) => ({ email: e })),
          ],
          conferenceData: {
            createRequest: {
              requestId: `aute-meet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: "email", minutes: 24 * 60 },
              { method: "popup", minutes: 10 },
            ],
          },
        },
      })

      googleEventId = event.data.id ?? null
      meetLink =
        event.data.conferenceData?.entryPoints?.find(
          (ep) => ep.entryPointType === "video"
        )?.uri ?? null
    } catch (err) {
      console.error("[booking] calendar event creation failed:", err)
    }
  }

  // ── 7. Save booking ────────────────────────────────────────────────────────
  const { data: booking, error: insertError } = await db
    .from("bookings")
    .insert({
      event_type_id: eventType.id,
      host_user_id: p.id,
      attendee_name: body.attendee_name,
      attendee_email: body.attendee_email,
      attendee_notes: body.attendee_notes ?? null,
      guest_emails: body.guest_emails ?? [],
      start_time: startAt.toISOString(),
      end_time: endAt.toISOString(),
      google_event_id: googleEventId,
      meet_link: meetLink,
      status: "confirmed",
    })
    .select("id, start_time, end_time, meet_link")
    .single()

  if (insertError) {
    console.error("[booking] insert error:", insertError)
    return NextResponse.json(
      { error: "Error al guardar la reserva" },
      { status: 500 }
    )
  }

  return NextResponse.json({ booking, meetLink, timezone }, { status: 201 })
}
