import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getCalendarClient } from "@/lib/google/calendar"
import { getBusyPeriods } from "@/lib/google/calendar"
import { calculateSlots } from "@/lib/booking/slots"
import { fromZonedTime } from "date-fns-tz"
import { addDays, startOfDay, parseISO } from "date-fns"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/bookings/[id]
 *
 * Body: { action?: "cancel" | "reschedule", date?: string, start_time?: string }
 *  - action defaults to "cancel" for backward compatibility (no body needed)
 *  - reschedule requires date (YYYY-MM-DD) and start_time (HH:MM)
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // Parse optional body — missing body means cancel
  let action = "cancel"
  let newDate: string | undefined
  let newStartTime: string | undefined
  let cancellationReason: string | undefined
  let hostNotes: string | undefined
  try {
    const body = await request.json()
    action = body.action ?? "cancel"
    newDate = body.date
    newStartTime = body.start_time
    cancellationReason = body.cancellation_reason
    hostNotes = body.host_notes
  } catch {
    // No body → cancel
  }

  const db = createServiceClient()

  // ── Load booking + verify ownership ───────────────────────────────────────
  const { data: booking } = await db
    .from("bookings")
    .select("id, host_user_id, event_type_id, google_event_id, status, start_time, end_time")
    .eq("id", id)
    .eq("host_user_id", user.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  if (booking.status === "cancelled" && action !== "update_notes") {
    return NextResponse.json({ error: "La reserva ya está cancelada" }, { status: 409 })
  }

  // ── Calendar connection (shared by both actions) ───────────────────────────
  const { data: conn } = await db
    .from("calendar_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .eq("is_primary", true)
    .maybeSingle()

  const calendarConn = conn as {
    id: string
    access_token: string
    refresh_token: string | null
    token_expires_at: string | null
  } | null

  // ════════════════════════════════════════════════════════════
  // CANCEL
  // ════════════════════════════════════════════════════════════
  if (action === "cancel") {
    if (booking.google_event_id && calendarConn) {
      try {
        const calendar = await getCalendarClient(calendarConn)
        await calendar.events.delete({
          calendarId: "primary",
          eventId: booking.google_event_id,
          sendUpdates: "all",
        })
      } catch (err) {
        console.error("[bookings/cancel] calendar delete failed:", err)
      }
    }

    const { error: updateError } = await db
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_reason: cancellationReason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: "Error al cancelar" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // ════════════════════════════════════════════════════════════
  // UPDATE NOTES
  // ════════════════════════════════════════════════════════════
  if (action === "update_notes") {
    const { error: updateError } = await db
      .from("bookings")
      .update({ host_notes: hostNotes ?? null, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: "Error al guardar notas" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }

  // ════════════════════════════════════════════════════════════
  // RESCHEDULE
  // ════════════════════════════════════════════════════════════
  if (action === "reschedule") {
    if (!newDate || !newStartTime) {
      return NextResponse.json(
        { error: "date y start_time son obligatorios para reprogramar" },
        { status: 400 }
      )
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^\d{2}:\d{2}$/.test(newStartTime)) {
      return NextResponse.json({ error: "Formato de fecha u hora inválido" }, { status: 400 })
    }

    // Load event type + host timezone in parallel
    const [etResult, profileResult] = await Promise.all([
      db
        .from("event_types")
        .select("id, title, duration_minutes, buffer_before_minutes, buffer_after_minutes, min_notice_minutes")
        .eq("id", booking.event_type_id)
        .single(),
      db
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .single(),
    ])

    if (!etResult.data || !profileResult.data) {
      return NextResponse.json({ error: "Datos no encontrados" }, { status: 500 })
    }

    const et = etResult.data as {
      id: string
      title: string
      duration_minutes: number
      buffer_before_minutes: number
      buffer_after_minutes: number
      min_notice_minutes: number
    }
    const timezone: string = (profileResult.data as { timezone: string }).timezone ?? "Europe/Madrid"

    // Validate the new date is within the 30-day booking window
    const todayUtc = startOfDay(new Date())
    const requestedDay = fromZonedTime(`${newDate}T00:00:00`, timezone)
    if (requestedDay < todayUtc || requestedDay > addDays(todayUtc, 60)) {
      return NextResponse.json({ error: "Fecha fuera del rango permitido" }, { status: 422 })
    }

    // Check blocked dates
    const { data: blocked } = await db
      .from("blocked_dates")
      .select("id")
      .eq("user_id", user.id)
      .lte("start_date", newDate)
      .gte("end_date", newDate)
      .limit(1)

    if (blocked && blocked.length > 0) {
      return NextResponse.json({ error: "Este día está bloqueado" }, { status: 422 })
    }

    // Compute new UTC start/end
    const newStartAt = fromZonedTime(`${newDate}T${newStartTime}:00`, timezone)
    const newEndAt = new Date(newStartAt.getTime() + et.duration_minutes * 60_000)

    // Load availability rules + existing bookings (excluding current) in parallel
    const dayStartUtc = fromZonedTime(`${newDate}T00:00:00`, timezone)
    const dayEndUtc = fromZonedTime(`${newDate}T23:59:59`, timezone)

    const [rulesResult, existingResult] = await Promise.all([
      db.from("availability_rules").select("day_of_week, start_time, end_time").eq("user_id", user.id),
      db
        .from("bookings")
        .select("start_time, end_time")
        .eq("event_type_id", et.id)
        .eq("status", "confirmed")
        .neq("id", id) // exclude current booking being rescheduled
        .gte("start_time", dayStartUtc.toISOString())
        .lte("start_time", dayEndUtc.toISOString()),
    ])

    const busyPeriods = calendarConn
      ? await getBusyPeriods(calendarConn, dayStartUtc, dayEndUtc)
      : []

    const existingBookings = (existingResult.data ?? []).map(
      (b: { start_time: string; end_time: string }) => ({ start: b.start_time, end: b.end_time })
    )

    // Validate the slot is still available (minNotice = 0 for host-initiated reschedule)
    const availableSlots = calculateSlots({
      date: newDate,
      timezone,
      availabilityRules: (rulesResult.data ?? []) as Array<{
        day_of_week: number
        start_time: string
        end_time: string
      }>,
      durationMinutes: et.duration_minutes,
      bufferBefore: et.buffer_before_minutes ?? 0,
      bufferAfter: et.buffer_after_minutes ?? 0,
      busyPeriods,
      existingBookings,
      minNoticeMinutes: 0,
    })

    const slotAvailable = availableSlots.some(
      (s) => parseISO(s.start).getTime() === newStartAt.getTime()
    )

    if (!slotAvailable) {
      return NextResponse.json(
        { error: "El horario seleccionado ya no está disponible." },
        { status: 409 }
      )
    }

    // Update Google Calendar event
    if (booking.google_event_id && calendarConn) {
      try {
        const calendar = await getCalendarClient(calendarConn)
        await calendar.events.patch({
          calendarId: "primary",
          eventId: booking.google_event_id,
          sendUpdates: "all",
          requestBody: {
            start: { dateTime: newStartAt.toISOString(), timeZone: timezone },
            end: { dateTime: newEndAt.toISOString(), timeZone: timezone },
          },
        })
      } catch (err) {
        console.error("[bookings/reschedule] calendar patch failed:", err)
        // Continue — we still update DB even if calendar update fails
      }
    }

    // Update booking in DB
    const { error: updateError } = await db
      .from("bookings")
      .update({
        start_time: newStartAt.toISOString(),
        end_time: newEndAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)

    if (updateError) {
      console.error("[bookings/reschedule] update error:", updateError)
      return NextResponse.json({ error: "Error al reprogramar" }, { status: 500 })
    }

    return NextResponse.json({ success: true, start_time: newStartAt.toISOString(), end_time: newEndAt.toISOString() })
  }

  return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 })
}
