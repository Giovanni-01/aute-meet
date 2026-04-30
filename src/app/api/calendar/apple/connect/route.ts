import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { encrypt } from "@/lib/crypto"
import { fetchAppleCalendars } from "@/lib/apple/caldav"

const Body = z.object({
  apple_id: z.string().email(),
  app_password: z.string().min(1),
  /** Present in step 2 — saves the connection with the chosen calendar. */
  calendar_url: z.string().url().optional(),
})

/**
 * POST /api/calendar/apple/connect
 *
 * Two-step flow in a single endpoint:
 *
 * Step 1 — { apple_id, app_password }
 *   Validates credentials against caldav.icloud.com and returns the list of
 *   available calendars: { calendars: [{ displayName, url }] }
 *   Nothing is saved to the database yet.
 *
 * Step 2 — { apple_id, app_password, calendar_url }
 *   Encrypts both credentials and stores them in calendar_connections along
 *   with the chosen calendar_url.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await request.json())
  } catch (err) {
    return NextResponse.json({ error: "Datos inválidos", details: err }, { status: 400 })
  }

  // Fetch calendars from iCloud — validates credentials implicitly
  let calendars: Array<{ displayName: string; url: string }>
  try {
    calendars = await fetchAppleCalendars(body.apple_id, body.app_password)
    if (!calendars.length) throw new Error("no calendars")
  } catch {
    return NextResponse.json(
      {
        error:
          "Credenciales inválidas. Comprueba tu Apple ID y la contraseña de aplicación.",
      },
      { status: 400 }
    )
  }

  // ── Step 1: return calendar list ───────────────────────────────────────────
  if (!body.calendar_url) {
    return NextResponse.json({ calendars })
  }

  // ── Step 2: save the connection ────────────────────────────────────────────
  // Verify the chosen URL belongs to this account
  const validUrl = calendars.some((c) => c.url === body.calendar_url)
  if (!validUrl) {
    return NextResponse.json({ error: "Calendario no válido." }, { status: 400 })
  }

  // Remove any existing Apple connection before inserting the new one
  await supabase
    .from("calendar_connections")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "apple")

  const { error } = await supabase.from("calendar_connections").insert({
    user_id: user.id,
    provider: "apple",
    provider_account_email: body.apple_id,
    access_token: encrypt(body.apple_id),
    refresh_token: encrypt(body.app_password),
    token_expires_at: null,
    is_primary: false,
    scope: "caldav",
    calendar_url: body.calendar_url,
  })

  if (error) {
    console.error("[apple/connect] insert error:", error)
    return NextResponse.json({ error: "Error al guardar la conexión" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
