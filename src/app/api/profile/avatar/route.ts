import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

/**
 * POST /api/profile/avatar
 * Accepts multipart/form-data with a single "avatar" file field.
 * Uploads to the Supabase Storage "avatars" bucket (service role, upsert)
 * and updates profiles.avatar_url with the resulting public URL.
 *
 * Requires a public "avatars" bucket created in the Supabase Storage dashboard.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const file = formData.get("avatar")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa JPG, PNG, WebP o GIF." },
      { status: 415 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "El archivo supera el límite de 2 MB." },
      { status: 413 }
    )
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  // Use a timestamp to bust the CDN/browser cache on every upload
  const storagePath = `${user.id}/avatar-${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const db = createServiceClient()

  const { error: uploadError } = await db.storage
    .from("avatars")
    .upload(storagePath, bytes, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error("[profile/avatar] storage upload error:", uploadError)
    return NextResponse.json(
      { error: "Error al subir la imagen. Inténtalo de nuevo." },
      { status: 500 }
    )
  }

  const {
    data: { publicUrl },
  } = db.storage.from("avatars").getPublicUrl(storagePath)

  const { error: updateError } = await db
    .from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id)

  if (updateError) {
    console.error("[profile/avatar] profile update error:", updateError)
    return NextResponse.json(
      { error: "Imagen subida pero no se pudo guardar en el perfil." },
      { status: 500 }
    )
  }

  return NextResponse.json({ avatar_url: publicUrl })
}
