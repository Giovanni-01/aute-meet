import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/blocked-dates/[id]
 * Removes a blocked date range owned by the authenticated user.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { error } = await supabase
    .from("blocked_dates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("[blocked-dates/DELETE] error:", error)
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
