import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateAvailabilityRules } from "@/lib/validations/availability"
import type { AvailabilityRule } from "@/lib/validations/availability"

/**
 * GET /api/availability
 * Returns all availability rules for the authenticated user.
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
    .from("availability_rules")
    .select("id, day_of_week, start_time, end_time")
    .eq("user_id", user.id)
    .order("day_of_week")
    .order("start_time")

  if (error) {
    console.error("[availability/GET] error:", error)
    return NextResponse.json(
      { error: "Error al obtener disponibilidad" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

/**
 * PUT /api/availability
 * Replaces all availability rules for the authenticated user.
 * Expects { rules: AvailabilityRule[] } in the body.
 */
export async function PUT(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: { rules: AvailabilityRule[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  if (!body.rules) {
    return NextResponse.json(
      { error: "Se requiere el campo 'rules'" },
      { status: 400 }
    )
  }

  const errors = validateAvailabilityRules(body.rules)
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 422 })
  }

  // Delete all existing rules, then insert the new set (atomic replace)
  const { error: deleteError } = await supabase
    .from("availability_rules")
    .delete()
    .eq("user_id", user.id)

  if (deleteError) {
    console.error("[availability/PUT] delete error:", deleteError)
    return NextResponse.json(
      { error: "Error al actualizar disponibilidad" },
      { status: 500 }
    )
  }

  if (body.rules.length === 0) {
    return NextResponse.json([])
  }

  const rows = body.rules.map((rule) => ({
    user_id: user.id,
    day_of_week: rule.day_of_week,
    start_time: rule.start_time,
    end_time: rule.end_time,
  }))

  const { data, error: insertError } = await supabase
    .from("availability_rules")
    .insert(rows)
    .select("id, day_of_week, start_time, end_time")

  if (insertError) {
    console.error("[availability/PUT] insert error:", insertError)
    return NextResponse.json(
      { error: "Error al guardar disponibilidad" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
