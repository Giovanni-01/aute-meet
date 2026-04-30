import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { fetchEventDescription } from "@/lib/google/calendar"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Extracts Read AI summary and report URL from a Google Calendar event description.
 * Read AI appends its summary below the original content, typically after a separator.
 */
function parseReadAiContent(description: string): {
  readaiNotes: string | null
  readaiReportUrl: string | null
} {
  // Extract Read AI report URL
  const urlMatch = description.match(/https?:\/\/app\.read\.ai\/[^\s)"'\n]+/)
  const readaiReportUrl = urlMatch?.[0] ?? null

  // Check if there's any Read AI content at all
  const hasReadAi =
    /read\.ai/i.test(description) ||
    /meeting summary/i.test(description)

  if (!hasReadAi && !readaiReportUrl) {
    return { readaiNotes: null, readaiReportUrl: null }
  }

  // Find where the Read AI section starts
  const lines = description.split("\n")
  let readAiLineIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (
      /^-{3,}$/.test(line) ||
      /^meeting summary/i.test(line) ||
      /^read ai/i.test(line) ||
      (/read\.ai/i.test(line) && line.length < 200)
    ) {
      readAiLineIndex = i
      break
    }
  }

  const readaiNotes =
    readAiLineIndex !== -1
      ? lines.slice(readAiLineIndex).join("\n").trim()
      : description.trim()

  return { readaiNotes: readaiNotes || null, readaiReportUrl }
}

/**
 * POST /api/bookings/[id]/fetch-notes
 *
 * Fetches the Google Calendar event description for a past booking,
 * parses any Read AI content, and saves it to the booking record.
 * Requires the authenticated user to be the host of the booking.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const db = createServiceClient()

  // Load booking and verify ownership
  const { data: booking } = await db
    .from("bookings")
    .select("id, host_user_id, google_event_id, status")
    .eq("id", id)
    .eq("host_user_id", user.id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 })
  }

  if (!booking.google_event_id) {
    return NextResponse.json(
      { error: "Esta reserva no tiene evento de Google Calendar vinculado" },
      { status: 422 }
    )
  }

  // Load Google Calendar connection
  const { data: conn } = await db
    .from("calendar_connections")
    .select("id, access_token, refresh_token, token_expires_at")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .eq("is_primary", true)
    .maybeSingle()

  if (!conn) {
    return NextResponse.json(
      { error: "No hay calendario de Google conectado" },
      { status: 422 }
    )
  }

  // Fetch event description from Google Calendar
  let description: string | null
  try {
    const result = await fetchEventDescription(
      conn as {
        id: string
        access_token: string
        refresh_token: string | null
        token_expires_at: string | null
      },
      booking.google_event_id as string
    )
    description = result.description
  } catch (err) {
    console.error("[fetch-notes] fetchEventDescription failed:", err)
    return NextResponse.json(
      { error: "No se pudo leer el evento de Google Calendar" },
      { status: 502 }
    )
  }

  if (!description) {
    return NextResponse.json({ readaiNotes: null, readaiReportUrl: null })
  }

  const { readaiNotes, readaiReportUrl } = parseReadAiContent(description)

  // Save parsed notes to booking
  await db
    .from("bookings")
    .update({
      readai_notes: readaiNotes,
      readai_report_url: readaiReportUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  return NextResponse.json({ readaiNotes, readaiReportUrl })
}
