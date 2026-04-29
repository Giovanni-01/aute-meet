import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Handles sign-out requests.
 *
 * Accepts both POST (from the dashboard logout form) and GET (from the
 * proxy redirect when a domain-blocked user is detected mid-session).
 * An optional `next` query param controls the redirect destination.
 */
async function handleSignOut(request: Request): Promise<NextResponse> {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const { origin, searchParams } = new URL(request.url)
  const next = searchParams.get("next") ?? "/"
  // Ensure `next` is a relative path to prevent open-redirect attacks
  const destination = next.startsWith("/") ? next : "/"
  return NextResponse.redirect(`${origin}${destination}`, { status: 302 })
}

export async function POST(request: Request) {
  return handleSignOut(request)
}

export async function GET(request: Request) {
  return handleSignOut(request)
}
