import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/calendar/apple/disconnect
 * Body: { connection_id: string }
 *
 * Deletes the Apple CalDAV connection for the authenticated user.
 * The WHERE clause includes both id and user_id so a user can never
 * delete another user's connection.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let connectionId: string | undefined
  try {
    const body = await request.json()
    connectionId = body?.connection_id
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!connectionId) {
    return NextResponse.json({ error: "connection_id is required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId)
    .eq("user_id", user.id)
    .eq("provider", "apple")

  if (error) {
    console.error("[apple/disconnect] delete error:", error)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
