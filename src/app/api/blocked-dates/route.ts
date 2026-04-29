import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const BlockedDateBody = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD"),
  reason: z.string().max(200).optional().nullable(),
})

/**
 * GET /api/blocked-dates
 * Returns all blocked date ranges for the authenticated user.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("blocked_dates")
    .select("id, start_date, end_date, reason, created_at")
    .eq("user_id", user.id)
    .order("start_date", { ascending: true })

  if (error) {
    return NextResponse.json({ error: "Error al cargar" }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

/**
 * POST /api/blocked-dates
 * Creates a new blocked date range.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: z.infer<typeof BlockedDateBody>
  try {
    body = BlockedDateBody.parse(await request.json())
  } catch (err) {
    return NextResponse.json({ error: "Datos inválidos", details: err }, { status: 400 })
  }

  if (body.end_date < body.start_date) {
    return NextResponse.json(
      { error: "La fecha de fin no puede ser anterior a la de inicio." },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from("blocked_dates")
    .insert({
      user_id: user.id,
      start_date: body.start_date,
      end_date: body.end_date,
      reason: body.reason ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error("[blocked-dates/POST] error:", error)
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
