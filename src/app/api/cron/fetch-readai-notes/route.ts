import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { fetchEventDescription } from "@/lib/google/calendar"

/**
 * Extracts Read AI summary and report URL from a Google Calendar event description.
 * Duplicated here to keep the cron self-contained (no shared import cycle).
 */
function parseReadAiContent(description: string): {
  readaiNotes: string | null
  readaiReportUrl: string | null
} {
  const urlMatch = description.match(/https?:\/\/app\.read\.ai\/[^\s)"'\n]+/)
  const readaiReportUrl = urlMatch?.[0] ?? null

  const hasReadAi =
    /read\.ai/i.test(description) ||
    /meeting summary/i.test(description)

  if (!hasReadAi && !readaiReportUrl) {
    return { readaiNotes: null, readaiReportUrl: null }
  }

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
 * GET /api/cron/fetch-readai-notes
 *
 * Vercel Cron — runs every hour.
 * Finds past confirmed bookings with a Google event but no Read AI notes yet
 * (within the last 7 days), fetches their calendar descriptions, and saves any
 * Read AI content found.
 *
 * Protected via CRON_SECRET environment variable.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  const db = createServiceClient()
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Find past bookings that need Read AI notes
  const { data: bookings, error } = await db
    .from("bookings")
    .select("id, host_user_id, google_event_id")
    .eq("status", "confirmed")
    .lt("end_time", now.toISOString())
    .gt("end_time", sevenDaysAgo.toISOString())
    .not("google_event_id", "is", null)
    .is("readai_notes", null)

  if (error) {
    console.error("[cron/fetch-readai-notes] query error:", error)
    return NextResponse.json({ error: "DB query failed" }, { status: 500 })
  }

  const pending = bookings ?? []
  let processed = 0
  let updated = 0

  // Group by host to batch connection lookups
  const hostIds = [...new Set(pending.map((b) => b.host_user_id as string))]

  // Load all relevant Google connections in one query
  const { data: connections } = await db
    .from("calendar_connections")
    .select("user_id, id, access_token, refresh_token, token_expires_at")
    .in("user_id", hostIds)
    .eq("provider", "google")
    .eq("is_primary", true)

  const connByHost = new Map(
    (connections ?? []).map((c) => [
      c.user_id as string,
      c as {
        id: string
        access_token: string
        refresh_token: string | null
        token_expires_at: string | null
      },
    ])
  )

  for (const booking of pending) {
    processed++
    const conn = connByHost.get(booking.host_user_id as string)
    if (!conn) continue

    try {
      const { description } = await fetchEventDescription(
        conn,
        booking.google_event_id as string
      )

      if (!description) continue

      const { readaiNotes, readaiReportUrl } = parseReadAiContent(description)
      if (!readaiNotes && !readaiReportUrl) continue

      await db
        .from("bookings")
        .update({
          readai_notes: readaiNotes,
          readai_report_url: readaiReportUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id)

      updated++
    } catch (err) {
      console.error(`[cron/fetch-readai-notes] booking ${booking.id} failed:`, err)
      // Continue — don't let one failure break the whole cron
    }
  }

  return NextResponse.json({ processed, updated })
}
