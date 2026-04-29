import { google } from "googleapis"
import { getOAuthClient } from "./oauth"
import { decrypt, encrypt } from "@/lib/crypto"
import { createServiceClient } from "@/lib/supabase/service"

export interface StoredConnection {
  id: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
}

/**
 * Creates an authenticated Google Calendar API client from a stored (encrypted)
 * calendar connection. If the access token has expired, the googleapis library
 * will automatically refresh it using the refresh token; the `tokens` listener
 * below then persists the new encrypted token back to the database.
 */
export async function getCalendarClient(connection: StoredConnection) {
  const accessToken = decrypt(connection.access_token)
  const refreshToken = connection.refresh_token
    ? decrypt(connection.refresh_token)
    : null

  const oauth2Client = getOAuthClient()
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.token_expires_at
      ? new Date(connection.token_expires_at).getTime()
      : undefined,
  })

  // Persist refreshed tokens whenever the library auto-rotates them
  oauth2Client.on("tokens", (newTokens) => {
    const updates: Record<string, string | null> = {}

    if (newTokens.access_token) {
      updates.access_token = encrypt(newTokens.access_token)
    }
    if (newTokens.refresh_token) {
      updates.refresh_token = encrypt(newTokens.refresh_token)
    }
    if (newTokens.expiry_date) {
      updates.token_expires_at = new Date(newTokens.expiry_date).toISOString()
    }

    if (Object.keys(updates).length > 0) {
      // Fire-and-forget — we don't want to block the API response
      createServiceClient()
        .from("calendar_connections")
        .update(updates)
        .eq("id", connection.id)
        .then(({ error }) => {
          if (error) {
            console.error("[calendar] token refresh persist error:", error)
          }
        })
    }
  })

  return google.calendar({ version: "v3", auth: oauth2Client })
}

/**
 * Returns busy time windows for the given UTC time range from the host's
 * primary Google Calendar. Returns an empty array if the request fails
 * (so slots are still returned without conflict-checking against Google).
 */
export async function getBusyPeriods(
  connection: StoredConnection,
  timeMin: Date,
  timeMax: Date
): Promise<Array<{ start: string; end: string }>> {
  try {
    const calendar = await getCalendarClient(connection)
    const { data } = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: "primary" }],
      },
    })
    const busy = data.calendars?.primary?.busy ?? []
    return busy
      .filter((b) => b.start && b.end)
      .map((b) => ({ start: b.start!, end: b.end! }))
  } catch (err) {
    console.error("[calendar] freebusy query failed:", err)
    return []
  }
}
