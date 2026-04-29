import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateEventType } from "@/lib/validations/event-type"
import type { EventTypeInput } from "@/lib/validations/event-type"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/event-types/[id]
 * Updates an existing event type. Only provided fields are updated.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params

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

  const errors = validateEventType(body, true)
  if (errors.length > 0) {
    return NextResponse.json({ errors }, { status: 422 })
  }

  // If slug is being changed, check uniqueness
  if (body.slug) {
    const { data: existing } = await supabase
      .from("event_types")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", body.slug)
      .neq("id", id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { errors: [{ field: "slug", message: "Ya tienes un tipo de evento con este slug." }] },
        { status: 409 }
      )
    }
  }

  // Build update object with only provided fields
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) update.title = body.title.trim()
  if (body.slug !== undefined) update.slug = body.slug
  if (body.description !== undefined) update.description = body.description?.trim() ?? null
  if (body.duration_minutes !== undefined) update.duration_minutes = body.duration_minutes
  if (body.buffer_before_minutes !== undefined) update.buffer_before_minutes = body.buffer_before_minutes
  if (body.buffer_after_minutes !== undefined) update.buffer_after_minutes = body.buffer_after_minutes
  if (body.color !== undefined) update.color = body.color
  if (body.is_active !== undefined) update.is_active = body.is_active

  const { data, error } = await supabase
    .from("event_types")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id) // RLS + explicit check
    .select()
    .single()

  if (error) {
    console.error("[event-types/PATCH] error:", error)
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: "Tipo de evento no encontrado" }, { status: 404 })
  }

  return NextResponse.json(data)
}

/**
 * DELETE /api/event-types/[id]
 * Deletes an event type owned by the authenticated user.
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

  const { error, count } = await supabase
    .from("event_types")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("[event-types/DELETE] error:", error)
    return NextResponse.json({ error: "Error al eliminar" }, { status: 500 })
  }

  if (count === 0) {
    return NextResponse.json({ error: "Tipo de evento no encontrado" }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
