"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { ALLOWED_EMAIL_DOMAINS } from "@/lib/auth/allowed-domains"

/**
 * Auto-fires Google OAuth with `prompt=none` to attempt a transparent SSO
 * via the user's existing Google session. If the user is already signed in
 * to Google with an allowed @aute.website account, they land authenticated
 * without a single click — no consent screen, no account picker.
 *
 * If silent auth is not possible (Google has no session, account is the
 * wrong domain, etc.), Google returns ?error=login_required to the callback,
 * which then redirects back to /login?manual=1 to render the regular button.
 */
export function SilentAuth() {
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          prompt: "none",
          hd: ALLOWED_EMAIL_DOMAINS[0],
        },
        redirectTo: `${window.location.origin}/auth/callback?silent=1`,
      },
    })
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#64797C] border-t-transparent" />
        <p className="text-sm text-[#8A9F9F]">Iniciando sesión…</p>
      </div>
    </main>
  )
}
