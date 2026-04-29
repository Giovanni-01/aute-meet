import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getCalendarClient } from "@/lib/google/calendar"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/bookings/[id]
 * Cancels a booking: sets status → "cancelled" and deletes the Google Calendar
 * event with sendUpdates: "all" so the attendee receives a cancellation email.
 */
export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params

  // Verify authentication with the cookie-based client
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  // Use service client for data access (bypasses RLS to read calendar_connections)
  const db = createServiceClient()

  // Load the booking and verify ownership
  const { data: booking } = await db
    .from("bookings")
    .select("id, host_user_id, google_event_id, status")
    .eq("id", id)
    .eq("host_user_id", user.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "La reserva ya está cancelada" }, { status: 409 })
  }

  // Cancel the Google Calendar event if one exists
  if (booking.google_event_id) {
    const { data: conn } = await db
      .from("calendar_connections")
      .select("id, access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_primary", true)
      .maybeSingle()

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
        await calendar.events.delete({
          calendarId: "primary",
          eventId: booking.google_event_id,
          sendUpdates: "all",
        })
      } catch (err) {
        console.error("[bookings/cancel] calendar event delete failed:", err)
        // Continue — we still cancel in the DB even if the calendar call fails
      }
    }
  }

  // Update status to cancelled
  const { error: updateError } = await db
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id)

  if (updateError) {
    console.error("[bookings/cancel] update error:", updateError)
    return NextResponse.json({ error: "Error al cancelar la reserva" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
