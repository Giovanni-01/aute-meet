import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/event-types/[id]/duplicate
 * Creates a copy of the event type with a unique slug (slug + "-copy"),
 * starts as inactive so the user can review before publishing.
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

  const { data: original } = await supabase
    .from("event_types")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (!original) {
    return NextResponse.json({ error: "Tipo de evento no encontrado" }, { status: 404 })
  }

  // Find an unused slug: "slug-copy", then "slug-copy-2", "slug-copy-3", …
  const baseSlug = `${original.slug}-copy`
  let slug = baseSlug
  let attempt = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: conflict } = await supabase
      .from("event_types")
      .select("id")
      .eq("user_id", user.id)
      .eq("slug", slug)
      .maybeSingle()

    if (!conflict) break
    attempt++
    slug = `${baseSlug}-${attempt}`
  }

  const { data: newEt, error } = await supabase
    .from("event_types")
    .insert({
      user_id: user.id,
      title: `${original.title} (copia)`,
      slug,
      description: original.description,
      duration_minutes: original.duration_minutes,
      buffer_before_minutes: original.buffer_before_minutes,
      buffer_after_minutes: original.buffer_after_minutes,
      color: original.color,
      is_active: false,
    })
    .select()
    .single()

  if (error) {
    console.error("[event-types/duplicate] error:", error)
    return NextResponse.json({ error: "Error al duplicar" }, { status: 500 })
  }

  return NextResponse.json(newEt, { status: 201 })
}
