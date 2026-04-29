import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/bookings?filter=upcoming|past|cancelled
 * Returns bookings for the authenticated host, joined with event_types.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") ?? "upcoming"
  const now = new Date().toISOString()

  let query = supabase
    .from("bookings")
    .select(
      "id, attendee_name, attendee_email, attendee_notes, start_time, end_time, google_event_id, meet_link, status, created_at, event_types(id, title, duration_minutes, color)"
    )
    .eq("host_user_id", user.id)

  if (filter === "upcoming") {
    query = query.eq("status", "confirmed").gte("start_time", now)
    query = query.order("start_time", { ascending: true })
  } else if (filter === "past") {
    query = query.eq("status", "confirmed").lt("start_time", now)
    query = query.order("start_time", { ascending: false })
  } else {
    // cancelled
    query = query.eq("status", "cancelled")
    query = query.order("start_time", { ascending: false })
  }

  const { data, error } = await query

  if (error) {
    console.error("[bookings/GET] error:", error)
    return NextResponse.json({ error: "Error al cargar reservas" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
