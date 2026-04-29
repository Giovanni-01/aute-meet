import { google } from "googleapis"

/** Scopes requested for the Calendar OAuth connection (separate from Supabase login). */
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
] as const

/** Creates a fresh OAuth2 client using env credentials. Call per-request, not as a singleton. */
export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/google/callback`
  )
}

/**
 * Generates the Google authorization URL.
 * Always requests `access_type=offline` and `prompt=consent` to ensure Google
 * returns a refresh_token on every authorization (not just the first).
 */
export function getAuthorizationUrl(state: string): string {
  const client = getOAuthClient()
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_CALENDAR_SCOPES],
    state,
  })
}

export interface CalendarTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scope: string
  accountEmail: string
}

/**
 * Exchanges a one-time authorization code for access + refresh tokens,
 * then fetches the email address of the connected Google account.
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<CalendarTokens> {
  const client = getOAuthClient()
  const { tokens } = await client.getToken(code)

  if (!tokens.access_token) {
    throw new Error("Google did not return an access token")
  }

  // Attach credentials so we can call the userinfo endpoint
  client.setCredentials(tokens)
  const oauth2 = google.oauth2({ version: "v2", auth: client })
  const { data: userInfo } = await oauth2.userinfo.get()

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope ?? GOOGLE_CALENDAR_SCOPES.join(" "),
    accountEmail: userInfo.email ?? "",
  }
}
