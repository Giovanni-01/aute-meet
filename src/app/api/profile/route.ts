import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const ProfileBody = z.object({
  full_name: z.string().min(1).max(200).optional(),
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Solo se permiten minúsculas, números y guiones")
    .optional(),
  bio: z.string().max(500).nullable().optional(),
  timezone: z.string().min(1).max(100).optional(),
})

/**
 * PATCH /api/profile
 * Updates the authenticated user's profile fields.
 * Validates username uniqueness before saving.
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let body: z.infer<typeof ProfileBody>
  try {
    body = ProfileBody.parse(await request.json())
  } catch (err) {
    return NextResponse.json({ error: "Datos inválidos", details: err }, { status: 400 })
  }

  // Check username uniqueness if being changed
  if (body.username) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", body.username)
      .neq("id", user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "Este nombre de usuario ya está en uso." },
        { status: 409 }
      )
    }
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.full_name !== undefined) update.full_name = body.full_name.trim()
  if (body.username !== undefined) update.username = body.username
  if (body.bio !== undefined) update.bio = body.bio?.trim() ?? null
  if (body.timezone !== undefined) update.timezone = body.timezone

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select()
    .single()

  if (error) {
    console.error("[profile/PATCH] error:", error)
    return NextResponse.json({ error: "Error al guardar el perfil" }, { status: 500 })
  }

  return NextResponse.json(data)
}
