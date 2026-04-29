import { createClient } from "@supabase/supabase-js"

/**
 * Creates a Supabase client authenticated as service_role.
 * Bypasses Row Level Security — use only in server-side Route Handlers
 * where you need to write data on behalf of a user whose session you have
 * already verified independently.
 *
 * Never expose this client to the browser or share it across requests.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  )
}
