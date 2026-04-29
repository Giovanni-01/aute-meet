import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Creates a Supabase client for use in Server Components and Route Handlers.
 * Reads and writes cookies via the Next.js `cookies()` API so that the auth
 * session is properly forwarded to Supabase on every server request.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // `setAll` can be called from a Server Component during rendering;
            // that throws but is harmless — the middleware handles cookie refresh.
          }
        },
      },
    }
  )
}
