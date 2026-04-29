import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateEventType } from "@/lib/validations/event-type"
import type { EventTypeInput } from "@/lib/validations/event-type"

/**
 * GET /api/event-types
 * Returns all event types for the authenticated user.
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
    .from("event_types")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[event-types/GET] error:", error)
    return NextResponse.json({ error: "Error al obtener tipos de evento" }, { status: 500 })
  }

  return NextResponse.json(data)
}

/**
 * POST /api/event-types
 * Creates a new event type for the authenticated user.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: Partial<EventTypeInput>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 })
  }

  const errors = validateEventType(body as Partial<EventTypeInput>)
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 422 })
  }

  // Check slug uniqueness for this user
  const { data: existing } = await supabase
    .from("event_types")
    .select("id")
    .eq("user_id", user.id)
    .eq("slug", body.slug!)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { errors: [{ field: "slug", message: "Ya tienes un tipo de evento con este slug." }] },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from("event_types")
    .insert({
      user_id: user.id,
      title: body.title!.trim(),
      slug: body.slug!,
      description: body.description?.trim() ?? null,
      duration_minutes: body.duration_minutes!,
      buffer_before_minutes: body.buffer_before_minutes ?? 0,
      buffer_after_minutes: body.buffer_after_minutes ?? 0,
      color: body.color ?? "#1F3A68",
      is_active: body.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error("[event-types/POST] error:", error)
    return NextResponse.json({ error: "Error al crear tipo de evento" }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
