import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { setOAuthState } from "@/lib/oauth-state"
import { getAuthorizationUrl } from "@/lib/google/oauth"

/**
 * Initiates the Google Calendar OAuth flow.
 *
 * 1. Verifies the user is logged in via Supabase Auth.
 * 2. Generates a CSRF nonce and stores it in an httpOnly cookie.
 * 3. Redirects the user to Google's authorization page.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/login`)
  }

  const state = await setOAuthState()
  const authUrl = getAuthorizationUrl(state)

  return NextResponse.redirect(authUrl)
}
