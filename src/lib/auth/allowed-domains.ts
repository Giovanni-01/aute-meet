/** Domains whose users are allowed to access Aute Meet. */
export const ALLOWED_EMAIL_DOMAINS = ["aute.website"] as const

/**
 * Returns true if the given email belongs to one of the allowed domains.
 * Comparison is case-insensitive. Returns false for null/undefined/empty values.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  return ALLOWED_EMAIL_DOMAINS.some((domain) => lower.endsWith(`@${domain}`))
}
