import { randomBytes, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "oauth_state"
const NONCE_BYTES = 32
const MAX_AGE_SECONDS = 600 // 10 minutes — long enough for slow OAuth flows

/**
 * Generates a random CSRF nonce, stores it in an httpOnly cookie, and returns it.
 * The nonce must be passed as `state` to the OAuth provider and verified on callback.
 */
export async function setOAuthState(): Promise<string> {
  const nonce = randomBytes(NONCE_BYTES).toString("hex")
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  })
  return nonce
}

/**
 * Reads the stored CSRF nonce, deletes the cookie (one-time use), and returns
 * whether `receivedState` matches using a constant-time comparison.
 */
export async function consumeOAuthState(
  receivedState: string
): Promise<boolean> {
  const cookieStore = await cookies()
  const stored = cookieStore.get(COOKIE_NAME)?.value ?? ""

  // Always delete — prevents replay even on failed comparisons
  cookieStore.delete(COOKIE_NAME)

  if (!stored || !receivedState) return false

  const bufA = Buffer.from(stored)
  const bufB = Buffer.from(receivedState)

  // Lengths must match for timingSafeEqual; mismatched lengths leak no timing info
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
