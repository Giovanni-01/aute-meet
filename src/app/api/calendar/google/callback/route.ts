import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { consumeOAuthState } from "@/lib/oauth-state"
import { exchangeCodeForTokens } from "@/lib/google/oauth"
import { encrypt } from "@/lib/crypto"

/**
 * Handles the OAuth callback from Google for Calendar connections.
 *
 * Flow:
 * 1. Reject if Google returned an error (user denied permission).
 * 2. Verify the Supabase session is still valid.
 * 3. Consume the CSRF nonce — reject if it doesn't match.
 * 4. Exchange the authorization code for tokens.
 * 5. Encrypt tokens and upsert into calendar_connections via service_role.
 * 6. Redirect to /dashboard with a success signal.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state") ?? ""
  const oauthError = searchParams.get("error")

  // Google returned an error (e.g. user clicked "Cancel")
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/dashboard?calendar_error=oauth_denied`
    )
  }

  // Verify Supabase session
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // CSRF check — consume is always called to delete the cookie regardless
  const stateValid = await consumeOAuthState(state)
  if (!stateValid) {
    return NextResponse.redirect(
      `${origin}/dashboard?calendar_error=invalid_state`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/dashboard?calendar_error=invalid_state`
    )
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    const encryptedAccess = encrypt(tokens.accessToken)
    const encryptedRefresh = tokens.refreshToken
      ? encrypt(tokens.refreshToken)
      : null

    // Use service_role to bypass RLS on insert — the session check above
    // already ensures we are writing for the correct user.
    const serviceClient = createServiceClient()
    const { error: upsertError } = await serviceClient
      .from("calendar_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "google",
          provider_account_email: tokens.accountEmail,
          access_token: encryptedAccess,
          refresh_token: encryptedRefresh,
          token_expires_at: tokens.expiresAt?.toISOString() ?? null,
          scope: tokens.scope,
          is_primary: true,
        },
        {
          onConflict: "user_id,provider,provider_account_email",
        }
      )

    if (upsertError) {
      console.error("[calendar/callback] upsert error:", upsertError)
      return NextResponse.redirect(
        `${origin}/dashboard?calendar_error=db_error`
      )
    }
  } catch (err) {
    console.error("[calendar/callback] token exchange error:", err)
    return NextResponse.redirect(
      `${origin}/dashboard?calendar_error=token_exchange_failed`
    )
  }

  return NextResponse.redirect(`${origin}/dashboard?calendar_connected=1`)
}
