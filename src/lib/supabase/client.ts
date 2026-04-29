import { createBrowserClient } from "@supabase/ssr"

/**
 * Creates a Supabase client for use in Client Components (browser).
 * Call this inside a component or hook — not at module level — so that
 * each render gets a fresh client tied to the current auth state.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
