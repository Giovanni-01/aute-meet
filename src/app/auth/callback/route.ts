import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isEmailAllowed } from "@/lib/auth/allowed-domains"

/**
 * OAuth callback handler.
 * Supabase redirects here after the user authorises with Google.
 * We exchange the one-time `code` for a session, enforce the domain allowlist,
 * and redirect to /dashboard (or /login with an error if rejected).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // `next` lets us redirect to a specific page after login (optional)
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Domain allowlist check — runs immediately after session creation
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!isEmailAllowed(user?.email)) {
        // Revoke the session for the unauthorised user before redirecting
        await supabase.auth.signOut()
        return NextResponse.redirect(
          `${origin}/login?error=domain_not_allowed`
        )
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — redirect to login with an error flag
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
